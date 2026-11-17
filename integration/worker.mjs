import { senderAddress, resolveMapping, attachments, decodeBase64, archiveAttachment, retryDelay } from './core.mjs';
import { decryptToken } from './oauth-crypto.mjs';

// No provider response bodies or credentials are included in logs/errors.
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    const error = new Error(`provider_http_${response.status}`); error.status = response.status;
    try { error.detail = await response.json(); } catch { /* never log raw responses */ }
    throw error;
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export function createDatabase(url, key) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const call = (path, method = 'GET', body, extra = {}) => request(`${url}/rest/v1/${path}`, {
    method, headers: { ...headers, ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return {
    get: path => call(path),
    patch: (table, filter, value) => call(`${table}?${filter}`, 'PATCH', value),
    remove: (table, filter) => call(`${table}?${filter}`, 'DELETE'),
    upsert: (table, value, conflict, ignore = false) => call(`${table}?on_conflict=${conflict}`, 'POST', value, {
      Prefer: `resolution=${ignore ? 'ignore' : 'merge'}-duplicates,return=minimal`
    }),
    rpc: (name, value) => call(`rpc/${name}`, 'POST', value)
  };
}

async function refreshToken(provider, env, db) {
  const google = provider === 'GOOGLE';
  let refresh = env(`${provider}_REFRESH_TOKEN`, false);
  if (google && !refresh) {
    const [stored] = await db.get('integration_credentials?provider=eq.google&select=encrypted_token');
    if (!stored) throw new Error('missing_google_connection');
    refresh = await decryptToken(stored.encrypted_token, env('OAUTH_TOKEN_ENCRYPTION_KEY'));
  }
  if (!refresh) throw new Error('missing_refresh_token');
  const values = { grant_type: 'refresh_token', refresh_token: refresh,
    client_id: env(`${provider}_CLIENT_ID`), client_secret: env(`${provider}_CLIENT_SECRET`) };
  const result = await request(google ? 'https://oauth2.googleapis.com/token' : 'https://api.dropboxapi.com/oauth2/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(values).toString()
  });
  if (!result.access_token) throw new Error('missing_access_token');
  return result.access_token;
}

export async function runWorker({ db, env, now = () => new Date(), budgetMs = 50000 }) {
  const started = Date.now(); const owner = crypto.randomUUID();
  if (!await db.rpc('integration_acquire', { p_owner: owner })) return { status: 'disabled_or_busy' };
  const controlFilter = `id=eq.true&lease_owner=eq.${owner}`;
  try {
    const [control] = await db.get('integration_control?id=eq.true');
    const token = await refreshToken('GOOGLE', env, db);
    const gmail = path => request(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { headers: { Authorization: `Bearer ${token}` } });
    const profile = await gmail('profile');
    if (profile.emailAddress.toLowerCase() !== control.mailbox.toLowerCase()) throw new Error('wrong_google_account');
    const senders = await db.get('integration_senders?select=*');
    if (!senders.length) throw new Error('missing_sender_allowlist');
    // Snapshot the upper bound before listing. Advance only when every listed ID
    // has been durably queued. Overlap catches Gmail indexing delays.
    const upper = control.cycle_started_at || now().toISOString();
    const lower = Math.floor(new Date(control.watermark).getTime() / 1000) - 86400;
    const query = `{${senders.map(s => `from:${s.email}`).join(' ')}} after:${lower} before:${Math.ceil(new Date(upper).getTime() / 1000)}`;
    await db.patch('integration_control', controlFilter, { cycle_started_at: upper });
    const params = new URLSearchParams({ q: query, maxResults: '50' });
    if (control.page_token) params.set('pageToken', control.page_token);
    let page;
    try { page = await gmail(`messages?${params}`); }
    catch (error) {
      if (control.page_token && error.status === 400) await db.patch('integration_control', controlFilter, { page_token: null });
      throw error;
    }
    for (const item of page.messages || []) {
      await db.upsert('integration_messages', { mailbox: control.mailbox, gmail_id: item.id }, 'mailbox,gmail_id', true);
    }
    await db.patch('integration_control', controlFilter, page.nextPageToken ? { page_token: page.nextPageToken } : {
      page_token: null, cycle_started_at: null, watermark: upper
    });
    const queued = await db.get(`integration_messages?mailbox=eq.${encodeURIComponent(control.mailbox)}&status=in.(queued,retry)&next_attempt_at=lte.${encodeURIComponent(now().toISOString())}&order=next_attempt_at.asc&limit=5`);
    let done = 0; let errors = 0;
    let dropbox;
    for (const item of queued) {
      if (Date.now() - started > budgetMs) break;
      const filter = `id=eq.${item.id}`;
      try {
        const message = await gmail(`messages/${item.gmail_id}?format=full`);
        const header = name => message.payload?.headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
        const sender = senderAddress(header('From')); const subject = header('Subject');
        const allowed = senders.find(s => s.email === sender);
        if (!allowed) { await db.patch('integration_messages', filter, { status: 'ignored', reason: 'sender_not_allowed' }); continue; }
        await db.patch('integration_messages', filter, { subject, sender, received_at: new Date(Number(message.internalDate)).toISOString() });
        const maps = await db.get(`integration_expedientes?municipio=eq.${encodeURIComponent(allowed.municipio)}&validado=eq.true`);
        // An operator may explicitly bind a reviewed message to a validated map.
        const resolved = item.mapping_id ? { mapping: maps.find(m => m.id === item.mapping_id) } : resolveMapping(subject, maps);
        if (!resolved.mapping) {
          await db.patch('integration_messages', filter, { status: 'review', reason: resolved.review || 'invalid_manual_mapping' }); continue;
        }
        const mapping = resolved.mapping;
        await db.patch('integration_messages', filter, { mapping_id: mapping.id });
        const files = attachments(message.payload);
        if (!files.length) {
          await db.patch('integration_messages', filter, { status: 'review', reason: 'no_attachments' }); continue;
        }
        if (!dropbox) {
          const dbToken = await refreshToken('DROPBOX', env, db);
          const headers = { Authorization: `Bearer ${dbToken}`, 'Content-Type': 'application/json' };
          const root = env('DROPBOX_ROOT_NAMESPACE_ID', false);
          if (root) headers['Dropbox-API-Path-Root'] = JSON.stringify({ '.tag': 'root', root });
          const api = (method, body) => request(`https://api.dropboxapi.com/2/files/${method}`, { method: 'POST', headers, body: JSON.stringify(body) });
          dropbox = {
            folder: id => api('get_metadata', { path: id }),
            metadata: async path => {
              try { return await api('get_metadata', { path }); }
              catch (e) {
                if (e.status === 409 && e.detail?.error?.['.tag'] === 'path' && e.detail.error.path?.['.tag'] === 'not_found') return null;
                throw e;
              }
            },
            upload: (path, bytes) => request('https://content.dropboxapi.com/2/files/upload', {
              method: 'POST', headers: { ...headers, 'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify({ path, mode: 'add', autorename: false, strict_conflict: true }).replace(/[\u007f-\uffff]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`) }, body: bytes
            })
          };
        }
        const folder = await dropbox.folder(mapping.carpeta_id);
        if (folder['.tag'] !== 'folder' || !folder.path_display) throw new Error('invalid_dropbox_folder');
        for (const file of files) {
          if (Date.now() - started > budgetMs) throw new Error('budget_exhausted');
          if (file.body?.size > 20 * 1024 * 1024) throw new Error('attachment_too_large');
          const body = file.body?.attachmentId ? await gmail(`messages/${item.gmail_id}/attachments/${file.body.attachmentId}`) : file.body;
          if (!body?.data) throw new Error('missing_attachment_bytes');
          const bytes = decodeBase64(body.data);
          if (bytes.length > 20 * 1024 * 1024 || (file.body.size != null && bytes.length !== file.body.size)) throw new Error('invalid_attachment_size');
          await archiveAttachment({ name: file.name, bytes, folder: folder.path_display, drive: dropbox,
            save: result => db.upsert('integration_documents', { message_id: item.id, attachment_key: file.key, filename: file.name, content_hash: result.hash,
              dropbox_id: result.dropbox_id, revision: result.revision, path: result.path }, 'message_id,attachment_key') });
        }
        const link = `https://www.dropbox.com/home${folder.path_display.split('/').map(encodeURIComponent).join('/')}`;
        // Source text is not interpreted as an instruction or used to change state.
        const source = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(control.mailbox)}#all/${item.gmail_id}`;
        await db.rpc('integration_finish', { p_message: item.id, p_link: link,
          p_note: `Correo municipal: ${subject}. Expediente ${mapping.numero}/${mapping.anio} (${mapping.tipo}). Se archivaron ${files.length} adjuntos originales. Revisar las acciones requeridas. Origen: ${source}` });
        done++;
      } catch (error) {
        errors++;
        const attempts = item.attempts + 1;
        const reason = /^[a-z_]+(?:_\d+)?$/.test(error.message) ? error.message : 'processing_failed';
        await db.patch('integration_messages', filter, { status: attempts >= 8 ? 'dead' : 'retry', attempts, reason,
          next_attempt_at: new Date(now().getTime() + retryDelay(attempts) * 1000).toISOString(), updated_at: now().toISOString() });
      }
    }
    await db.patch('integration_control', controlFilter, { last_success_at: now().toISOString(), last_error: errors ? 'messages_need_attention' : null });
    return { status: 'ok', done, errors };
  } catch (error) {
    await db.patch('integration_control', controlFilter, { last_error: /^[a-z_]+(?:_\d+)?$/.test(error.message) ? error.message : 'worker_failed' });
    throw new Error('integration_run_failed');
  } finally { await db.patch('integration_control', controlFilter, { lease_owner: null, lease_until: null }); }
}
