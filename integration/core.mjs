// Shared by the server worker and dependency-free Node tests.
export function senderAddress(from = '') {
  const value = from.trim();
  const match = value.match(/^(?:[^<>]*<)?([a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+)>?$/i);
  return match ? match[1].toLowerCase() : null;
}

export function expedientes(text = '') {
  // No substring lookup, inferred year, client-name fallback or file-name numbers.
  const found = new Map();
  const re = /\bexp(?:ediente|te)?\.?\s*(?:n(?:ro|[úu]mero)?\.?\s*[°º:]?\s*)?(\d{1,6})\s*[/-]\s*(20\d{2})\b/gi;
  for (const m of text.matchAll(re)) found.set(`${Number(m[1])}/${m[2]}`, { numero: Number(m[1]), anio: Number(m[2]) });
  return [...found.values()];
}

export function resolveMapping(subject, mappings) {
  const refs = expedientes(subject);
  if (refs.length !== 1) return { review: refs.length ? 'multiple_expedientes' : 'missing_expediente' };
  const ref = refs[0];
  const matches = mappings.filter(m => m.numero === ref.numero && m.anio === ref.anio && m.validado && m.carpeta_id);
  return matches.length === 1 ? { mapping: matches[0] } : { review: matches.length ? 'ambiguous_mapping' : 'unmapped_expediente' };
}

export function attachments(part, path = '0') {
  if (!part) return [];
  const own = part.filename ? [{ key: part.partId || path, name: part.filename, mime: part.mimeType, body: part.body }] : [];
  return own.concat((part.parts || []).flatMap((p, i) => attachments(p, `${path}.${i}`)));
}

export function decodeBase64(value) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}

export function safeFilename(name) {
  const cleaned = name.normalize('NFC').replace(/[\/\\\x00-\x1f\x7f]/g, '_').replace(/[. ]+$/g, '');
  if (!cleaned || cleaned === '.' || cleaned === '..' || cleaned.length > 200) throw new Error('invalid_filename');
  return cleaned;
}

export async function contentHash(bytes) {
  const chunks = [];
  for (let offset = 0; offset < bytes.length; offset += 4 * 1024 * 1024) {
    chunks.push(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.slice(offset, offset + 4 * 1024 * 1024))));
  }
  const joined = new Uint8Array(chunks.length * 32);
  chunks.forEach((chunk, i) => joined.set(chunk, i * 32));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', joined));
  return [...digest].map(n => n.toString(16).padStart(2, '0')).join('');
}

export function retryDelay(attempt) { return Math.min(3600, 30 * 2 ** Math.min(attempt, 7)); }

// Dropbox and Postgres cannot commit together. The deterministic path and hash
// allow recovery after upload succeeded but recording its result failed.
export async function archiveAttachment({ name, bytes, folder, drive, save }) {
  const hash = await contentHash(bytes);
  const filename = safeFilename(name);
  const original = `${folder}/${filename}`;
  let path = original;
  let metadata = await drive.metadata(path);
  if (metadata && metadata.content_hash !== hash) {
    const dot = filename.lastIndexOf('.');
    const alternate = dot > 0 ? `${filename.slice(0, dot)}__${hash}${filename.slice(dot)}` : `${filename}__${hash}`;
    path = `${folder}/${alternate}`;
    metadata = await drive.metadata(path);
  }
  if (metadata && metadata.content_hash !== hash) throw new Error('destination_conflict');
  if (!metadata) {
    try { metadata = await drive.upload(path, bytes); }
    catch (error) {
      // An upload may have committed before its response was lost.
      metadata = await drive.metadata(path);
      if (!metadata || metadata.content_hash !== hash) throw error;
    }
  }
  if (metadata.content_hash !== hash || !metadata.id) throw new Error('upload_verification_failed');
  await save({ hash, path, dropbox_id: metadata.id, revision: metadata.rev });
  return metadata;
}
