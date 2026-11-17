import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGoogleOAuth } from './google-oauth.mjs';
import { encryptToken, decryptToken } from './oauth-crypto.mjs';
const base = 'https://project.supabase.co/functions/v1/municipal-google-oauth';
const encryptionKey = 'ab'.repeat(32);
function fixture() {
  const sessions = new Map(); const credentials = [];
  const env = name => ({ GOOGLE_CLIENT_ID: 'client', GOOGLE_CLIENT_SECRET: 'secret', OAUTH_TOKEN_ENCRYPTION_KEY: encryptionKey, SUPABASE_URL: 'https://project.supabase.co' })[name] || '';
  const db = {
    get: async () => [{ mailbox: 'tekton@example.org' }],
    remove: async () => {},
    upsert: async (table, row) => table === 'integration_oauth_sessions' ? sessions.set(row.state_hash, row) : credentials.push(row),
    rpc: async (name, args) => {
      const row = sessions.get(args.p_state_hash);
      if (!row || row.cookie_hash !== args.p_cookie_hash || new Date(row.expires_at) <= new Date()) return [];
      sessions.delete(args.p_state_hash); return [row];
    }
  };
  return { env, db, sessions, credentials };
}
async function begin(f) {
  const response = await handleGoogleOAuth(new Request(`${base}/start`), f);
  const location = new URL(response.headers.get('location'));
  const cookie = response.headers.get('set-cookie').split(';')[0];
  return { response, location, cookie, callback: `${base}?state=${location.searchParams.get('state')}&code=test_code` };
}
test('requiere configuración y rechaza métodos inesperados', async () => {
  const f = fixture();
  assert.equal((await handleGoogleOAuth(new Request(base), { ...f, env: () => '' })).status, 503);
  assert.equal((await handleGoogleOAuth(new Request(base, { method: 'POST' }), f)).status, 405);
});
test('inicio fija cuenta, scope, offline, PKCE y cookie segura', async () => {
  const f = fixture(); const { response, location } = await begin(f);
  assert.equal(response.status, 302);
  assert.equal(location.origin, 'https://accounts.google.com');
  assert.equal(location.searchParams.get('redirect_uri'), base);
  assert.equal(location.searchParams.get('scope'), 'https://www.googleapis.com/auth/gmail.readonly');
  assert.equal(location.searchParams.get('access_type'), 'offline');
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(location.searchParams.get('login_hint'), 'tekton@example.org');
  assert.match(response.headers.get('set-cookie'), /Secure; HttpOnly; SameSite=Lax/);
  assert.equal(f.sessions.size, 1);
});
test('callback sin cookie o con cookie ajena no consume sesión', async () => {
  const f = fixture(); const { callback } = await begin(f);
  assert.equal((await handleGoogleOAuth(new Request(callback), f)).status, 400);
  assert.equal((await handleGoogleOAuth(new Request(callback, { headers: { cookie: `__Secure-tekton-google-oauth=${'f'.repeat(64)}` } }), f)).status, 400);
  assert.equal(f.sessions.size, 1); assert.equal(f.credentials.length, 0);
});
test('callback guarda cifrado, no muestra tokens y no se puede repetir', async () => {
  const f = fixture(); const { callback, cookie } = await begin(f); const original = globalThis.fetch;
  globalThis.fetch = async url => Response.json(url.includes('/token') ? { access_token: 'access_private', refresh_token: 'refresh_private', scope: 'https://www.googleapis.com/auth/gmail.readonly' } : { emailAddress: 'tekton@example.org' });
  try {
    const response = await handleGoogleOAuth(new Request(callback, { headers: { cookie } }), f);
    assert.equal(response.status, 200);
    assert.doesNotMatch(await response.text(), /access_private|refresh_private/);
    assert.equal(f.credentials.length, 1);
    assert.doesNotMatch(JSON.stringify(f.credentials), /refresh_private/);
    assert.equal(await decryptToken(f.credentials[0].encrypted_token, encryptionKey), 'refresh_private');
    assert.equal((await handleGoogleOAuth(new Request(callback, { headers: { cookie } }), f)).status, 400);
    assert.equal(f.credentials.length, 1);
  } finally { globalThis.fetch = original; }
});
test('rechaza otra cuenta de Gmail sin guardar credenciales', async () => {
  const f = fixture(); const { callback, cookie } = await begin(f); const original = globalThis.fetch;
  globalThis.fetch = async url => Response.json(url.includes('/token') ? { access_token: 'a', refresh_token: 'r', scope: 'https://www.googleapis.com/auth/gmail.readonly' } : { emailAddress: 'otra@example.org' });
  try {
    assert.equal((await handleGoogleOAuth(new Request(callback, { headers: { cookie } }), f)).status, 400);
    assert.equal(f.credentials.length, 0);
  } finally { globalThis.fetch = original; }
});
test('cancelación no pide tokens ni guarda credenciales', async () => {
  const f = fixture(); const { callback, cookie } = await begin(f);
  const response = await handleGoogleOAuth(new Request(callback.replace('code=test_code', 'error=access_denied'), { headers: { cookie } }), f);
  assert.equal(response.status, 400); assert.equal(f.credentials.length, 0);
});
test('cifrado autenticado usa IV diferente y detecta alteración', async () => {
  const a = await encryptToken('private', encryptionKey); const b = await encryptToken('private', encryptionKey);
  assert.notEqual(a.iv, b.iv); assert.notEqual(a.ciphertext, b.ciphertext);
  await assert.rejects(decryptToken({ ...a, ciphertext: `${a.ciphertext.slice(0,-2)}${a.ciphertext.endsWith('00') ? '01' : '00'}` }, encryptionKey));
  await assert.rejects(decryptToken(a, 'cd'.repeat(32)));
});
