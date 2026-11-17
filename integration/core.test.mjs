import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { expedientes, senderAddress, resolveMapping, attachments, safeFilename, contentHash, archiveAttachment } from './core.mjs';

test('expediente exacto, año y ambigüedad', () => {
  assert.deepEqual(expedientes('EXPEDIENTE 586/2026'), [{ numero: 586, anio: 2026 }]);
  assert.deepEqual(expedientes('Expte. Nº 1586-2025'), [{ numero: 1586, anio: 2025 }]);
  assert.deepEqual(expedientes('CARTEL 384-26; Exp. 586'), []);
  const maps = [{ numero: 586, anio: 2026, validado: true, carpeta_id: 'id:folder' }];
  assert.equal(resolveMapping('Exp. 1586/2026', maps).review, 'unmapped_expediente');
  assert.equal(resolveMapping('Exp. 586/2025', maps).review, 'unmapped_expediente');
  assert.equal(resolveMapping('Exp. 586/2026; Exp. 587/2026', maps).review, 'multiple_expedientes');
  assert.equal(resolveMapping('Exp. 586/2026', maps).mapping, maps[0]);
  assert.equal(resolveMapping('Exp. 586/2026', maps.concat(maps)).review, 'ambiguous_mapping');
});

test('remitente real y adjuntos MIME anidados', () => {
  assert.equal(senderAddress('Municipio <obrasparticulares@sanisidro.gob.ar>'), 'obrasparticulares@sanisidro.gob.ar');
  assert.equal(senderAddress('obras@sanisidro.gob.ar <intruso@example.org>'), 'intruso@example.org');
  assert.equal(senderAddress('a@b.com, c@d.com'), null);
  assert.equal(attachments({ parts: [{ parts: [{ filename: 'a.pdf', partId: '1.1', body: { attachmentId: 'a' } }] }] })[0].key, '1.1');
  assert.equal(safeFilename('../a\\b.pdf'), '.._a_b.pdf');
});

test('hash Dropbox usa bloques de 4 MiB, incluso archivos vacíos', async () => {
  for (const size of [0, 3, 4 * 1024 * 1024 + 1]) {
    const bytes = new Uint8Array(size).fill(7);
    const parts = [];
    for (let i = 0; i < size; i += 4194304) parts.push(createHash('sha256').update(bytes.slice(i, i + 4194304)).digest());
    assert.equal(await contentHash(bytes), createHash('sha256').update(Buffer.concat(parts)).digest('hex'));
  }
});

test('recupera subida confirmada si falla el registro en base, sin duplicar', async () => {
  const files = new Map(); let uploads = 0; let saves = 0;
  const drive = { metadata: async p => files.get(p), upload: async (p, bytes) => {
    uploads++; const metadata = { id: 'id:file', rev: '1', content_hash: await contentHash(bytes) }; files.set(p, metadata); return metadata;
  }};
  const args = { name: 'a.pdf', bytes: new Uint8Array([1, 2]), folder: '/cliente', drive,
    save: async () => { if (++saves === 1) throw new Error('database_down'); } };
  await assert.rejects(archiveAttachment(args), /database_down/);
  await archiveAttachment(args);
  assert.equal(uploads, 1); assert.equal(saves, 2);
});

test('conserva archivo diferente y recupera respuesta perdida', async () => {
  const files = new Map([['/cliente/a.pdf', { id: 'existing', content_hash: 'other' }]]);
  let uploads = 0;
  const drive = { metadata: async p => files.get(p), upload: async (p, bytes) => {
    uploads++; files.set(p, { id: 'new', content_hash: await contentHash(bytes) }); throw new Error('response_lost');
  }};
  const args = { name: 'a.pdf', bytes: new Uint8Array([3]), folder: '/cliente', drive, save: async () => {} };
  await archiveAttachment(args); await archiveAttachment(args);
  assert.equal(uploads, 1); assert.equal(files.size, 2); assert.equal(files.get('/cliente/a.pdf').id, 'existing');
});
