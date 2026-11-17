import test from 'node:test';
import assert from 'node:assert/strict';
import { runWorker, createDatabase } from './worker.mjs';
import { contentHash } from './core.mjs';

test('REST soporta respuestas vacías de PostgREST', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 201 });
  try { assert.equal(await createDatabase('https://example.org', 'test').upsert('a', {}, 'id'), null); }
  finally { globalThis.fetch = original; }
});

test('desactivado o bloqueado no consulta Gmail ni modifica datos', async () => {
  let calls = 0;
  assert.deepEqual(await runWorker({ db: { rpc: async () => { calls++; return false; } }, env: () => { throw Error('unexpected'); } }), { status: 'disabled_or_busy' });
  assert.equal(calls, 1);
});

test('no adelanta cursor si falla el guardado de IDs; libera bloqueo', async () => {
  const original = globalThis.fetch; const patches = [];
  globalThis.fetch = async url => Response.json(url.includes('oauth2') ? { access_token: 'test' } : url.endsWith('profile') ? { emailAddress: 'test@example.org' } : { messages: [{ id: 'new' }] });
  const db = { rpc: async () => true, get: async path => path.startsWith('integration_control') ? [{ mailbox: 'test@example.org', watermark: '2026-11-17T00:00:00Z' }] : [{ email: 'municipio@example.org', municipio: 'test' }],
    patch: async (...args) => patches.push(args), upsert: async () => { throw Error('database_down'); } };
  try {
    await assert.rejects(runWorker({ db, env: () => 'test' }), /integration_run_failed/);
    assert.equal(patches.some(p => p[2].watermark), false);
    assert.equal(patches.at(-1)[2].lease_owner, null);
  } finally { globalThis.fetch = original; }
});

test('paginación se conserva y los mensajes procesados no se sobrescriben', async () => {
  const original = globalThis.fetch; const patches = []; const inserts = [];
  globalThis.fetch = async url => Response.json(url.includes('oauth2') ? { access_token: 'test' } : url.endsWith('profile') ? { emailAddress: 'test@example.org' } : { messages: [{ id: 'already_done' }], nextPageToken: 'page2' });
  const db = { rpc: async () => true, get: async path => path.startsWith('integration_control') ? [{ mailbox: 'test@example.org', watermark: '2026-11-17T00:00:00Z' }] : path.startsWith('integration_senders') ? [{ email: 'municipio@example.org', municipio: 'test' }] : [],
    patch: async (...args) => patches.push(args), upsert: async (...args) => inserts.push(args) };
  try {
    assert.equal((await runWorker({ db, env: () => 'test' })).status, 'ok');
    assert.equal(inserts[0][3], true);
    assert.equal(patches.some(p => p[2].page_token === 'page2'), true);
    assert.equal(patches.some(p => p[2].watermark), false);
  } finally { globalThis.fetch = original; }
});

test('OAuth de otra cuenta se rechaza antes de leer mensajes', async () => {
  const original = globalThis.fetch; const patches = [];
  globalThis.fetch = async url => Response.json(url.includes('oauth2') ? { access_token: 'test' } : { emailAddress: 'other@example.org' });
  const db = { rpc: async () => true, get: async () => [{ mailbox: 'test@example.org' }], patch: async (...args) => patches.push(args) };
  try {
    await assert.rejects(runWorker({ db, env: () => 'test' }), /integration_run_failed/);
    assert.equal(patches.some(p => p[2].last_error === 'wrong_google_account'), true);
    assert.equal(patches.at(-1)[2].lease_owner, null);
  } finally { globalThis.fetch = original; }
});

test('ciclo completo simulado: archiva, registra, reejecuta sin duplicar y omite piloto', async () => {
  const original = globalThis.fetch;
  const messages = new Map([['completed_pilot', { gmail_id: 'completed_pilot', status: 'done' }]]);
  const files = new Map(); const documents = []; let uploads = 0; let movements = 0; let pilotReads = 0;
  const mapping = { id: 'mapping', numero: 123, anio: 2026, validado: true, carpeta_id: 'id:folder', tipo: 'Permiso' };
  const control = { mailbox: 'test@example.org', watermark: '2026-11-17T00:00:00Z' };
  const db = {
    rpc: async (name, body) => {
      if (name === 'integration_acquire') return true;
      const row = [...messages.values()].find(m => m.id === body.p_message);
      if (row.status !== 'done') { movements++; row.status = 'done'; }
    },
    get: async path => path.startsWith('integration_control') ? [control] : path.startsWith('integration_senders') ? [{ email: 'municipio@example.org', municipio: 'test' }] : path.startsWith('integration_expedientes') ? [mapping] : [...messages.values()].filter(m => ['queued','retry'].includes(m.status)),
    patch: async (table, filter, value) => {
      if (table === 'integration_control') Object.assign(control, value);
      else Object.assign([...messages.values()].find(m => `id=eq.${m.id}` === filter), value);
    },
    upsert: async (table, value, conflict, ignore) => {
      if (table === 'integration_documents') { documents.push(value); return; }
      if (ignore && messages.has(value.gmail_id)) return;
      messages.set(value.gmail_id, { ...value, id: 'message', status: 'queued', attempts: 0 });
    }
  };
  globalThis.fetch = async (url, options = {}) => {
    if (url.includes('oauth2')) return Response.json({ access_token: 'test' });
    if (url.endsWith('profile')) return Response.json({ emailAddress: control.mailbox });
    if (url.includes('messages?')) return Response.json({ messages: [{ id: 'completed_pilot' }, { id: 'new' }] });
    if (url.includes('/messages/completed_pilot')) { pilotReads++; throw Error('must_not_read_pilot'); }
    if (url.includes('/messages/new')) return Response.json({ internalDate: '1794916800000', payload: {
      headers: [{ name: 'From', value: 'Municipio <municipio@example.org>' }, { name: 'Subject', value: 'Expediente 123/2026' }],
      parts: [{ filename: 'plano.pdf', partId: '1', body: { size: 3, data: 'AQID' } }]
    }});
    if (url.endsWith('get_metadata')) {
      const { path } = JSON.parse(options.body);
      if (path === 'id:folder') return Response.json({ '.tag': 'folder', path_display: '/cliente' });
      return files.has(path) ? Response.json(files.get(path)) : Response.json({ error: { '.tag': 'path', path: { '.tag': 'not_found' } } }, { status: 409 });
    }
    if (url.endsWith('/upload')) {
      uploads++; const { path } = JSON.parse(options.headers['Dropbox-API-Arg']);
      const metadata = { id: 'id:file', rev: 'revision', content_hash: await contentHash(options.body) };
      files.set(path, metadata); return Response.json(metadata);
    }
    throw Error('unexpected_request');
  };
  try {
    assert.equal((await runWorker({ db, env: (name, required) => required === false ? '' : 'test' })).done, 1, JSON.stringify([...messages.values()]));
    assert.equal((await runWorker({ db, env: (name, required) => required === false ? '' : 'test' })).done, 0);
    assert.equal(uploads, 1); assert.equal(movements, 1); assert.equal(pilotReads, 0); assert.equal(documents.length, 1);
    assert.equal(messages.get('completed_pilot').status, 'done');
  } finally { globalThis.fetch = original; }
});
