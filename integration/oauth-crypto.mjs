const encoder = new TextEncoder();
const hex = bytes => [...bytes].map(n => n.toString(16).padStart(2, '0')).join('');
export const randomHex = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest = async value => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
export async function challenge(verifier) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function key(value) {
  if (!/^[a-f0-9]{64}$/i.test(value || '')) throw new Error('invalid_encryption_key');
  return crypto.subtle.importKey('raw', Uint8Array.from(value.match(/../g), h => parseInt(h, 16)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encryptToken(token, keyHex) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode('tekton-google-refresh-v1') }, await key(keyHex), encoder.encode(token));
  return { iv: hex(iv), ciphertext: hex(new Uint8Array(data)) };
}
export async function decryptToken(envelope, keyHex) {
  const bytes = value => {
    if (!/^(?:[a-f0-9]{2})+$/i.test(value || '')) throw new Error('invalid_envelope');
    return Uint8Array.from(value.match(/../g), h => parseInt(h, 16));
  };
  const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(envelope.iv), additionalData: encoder.encode('tekton-google-refresh-v1') }, await key(keyHex), bytes(envelope.ciphertext));
  return new TextDecoder().decode(data);
}
