import { randomHex, digest, challenge, encryptToken } from './oauth-crypto.mjs';
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const COOKIE = '__Secure-tekton-google-oauth';
const COOKIE_PATH = '/functions/v1/municipal-google-oauth';

function reply(message, status = 200, headers = {}) {
  return new Response(message, { status, headers: {
    'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", ...headers
  } });
}

async function provider(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('provider_failed');
  return response.json();
}

// GET /start initiates consent for one fixed mailbox. The callback authenticates
// state + HttpOnly browser cookie, consumes them once, uses PKCE and verifies the
// actual Gmail account before storing anything. No token reaches the browser.
export async function handleGoogleOAuth(request, { env, db, now = () => new Date() }) {
  if (request.method !== 'GET') return reply('Metodo no permitido.', 405);
  const url = new URL(request.url);
  if (!url.pathname.endsWith('/municipal-google-oauth') && !url.pathname.endsWith('/municipal-google-oauth/start')) return reply('No encontrado.', 404);
  try {
    const clientId = env('GOOGLE_CLIENT_ID');
    const secret = env('GOOGLE_CLIENT_SECRET');
    const encryptionKey = env('OAUTH_TOKEN_ENCRYPTION_KEY');
    if (!clientId || !secret || !/^[a-f0-9]{64}$/i.test(encryptionKey || '')) return reply('Falta completar la configuracion segura del servidor.', 503);
    const callback = `${env('SUPABASE_URL')}/functions/v1/municipal-google-oauth`;
    const [control] = await db.get('integration_control?id=eq.true&select=mailbox');
    if (!control?.mailbox) return reply('Falta definir la cuenta de Tekton.', 503);
    const clearCookie = `${COOKIE}=; Path=${COOKIE_PATH}; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
    if (url.pathname.endsWith('/start')) {
      const state = randomHex(); const browser = randomHex(); const verifier = randomHex();
      await db.remove('integration_oauth_sessions', `expires_at=lt.${encodeURIComponent(now().toISOString())}`);
      await db.upsert('integration_oauth_sessions', {
        state_hash: await digest(state), cookie_hash: await digest(browser), verifier,
        expires_at: new Date(now().getTime() + 10 * 60 * 1000).toISOString()
      }, 'state_hash');
      const params = new URLSearchParams({ client_id: clientId, redirect_uri: callback, response_type: 'code',
        scope: SCOPE, access_type: 'offline', prompt: 'consent select_account', login_hint: control.mailbox,
        state, code_challenge: await challenge(verifier), code_challenge_method: 'S256' });
      return reply('', 302, { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
        'Set-Cookie': `${COOKIE}=${browser}; Path=${COOKIE_PATH}; Secure; HttpOnly; SameSite=Lax; Max-Age=600` });
    }
    const state = url.searchParams.get('state') || '';
    const cookie = (request.headers.get('cookie') || '').split(';').map(p => p.trim()).find(p => p.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || '';
    if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(cookie)) return reply('Autorizacion no valida o vencida. Volve a iniciar la conexion.', 400);
    const [session] = await db.rpc('integration_consume_oauth', { p_state_hash: await digest(state), p_cookie_hash: await digest(cookie) });
    if (!session) return reply('Autorizacion vencida o ya utilizada. Volve a iniciar la conexion.', 400, { 'Set-Cookie': clearCookie });
    if (url.searchParams.has('error')) return reply('No se autorizo la conexion. No se modifico la cuenta conectada.', 400, { 'Set-Cookie': clearCookie });
    const code = url.searchParams.get('code');
    if (!code || code.length > 4096) return reply('Falta el codigo de autorizacion.', 400, { 'Set-Cookie': clearCookie });
    const tokens = await provider('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: secret, redirect_uri: callback, grant_type: 'authorization_code', code, code_verifier: session.verifier }).toString()
    });
    if (!tokens.access_token || !tokens.refresh_token || !tokens.scope?.split(' ').includes(SCOPE)) throw new Error('missing_offline_scope');
    const profile = await provider('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    if (profile.emailAddress?.toLowerCase() !== control.mailbox.toLowerCase()) return reply(`La cuenta seleccionada no es la cuenta de Tekton. Volve a iniciar y elegi ${control.mailbox}.`, 400, { 'Set-Cookie': clearCookie });
    await db.upsert('integration_credentials', { provider: 'google', mailbox: profile.emailAddress.toLowerCase(),
      encrypted_token: await encryptToken(tokens.refresh_token, encryptionKey), scope: tokens.scope,
      connected_at: now().toISOString() }, 'provider');
    return reply('Gmail de Tekton conectado correctamente. La automatizacion sigue desactivada hasta terminar las pruebas. Podes cerrar esta pestana.', 200, { 'Set-Cookie': clearCookie });
  } catch {
    return reply('No se pudo completar la conexion. No compartas la URL de esta pagina. Volve a iniciar o revisa la configuracion del servidor.', 503);
  }
}
