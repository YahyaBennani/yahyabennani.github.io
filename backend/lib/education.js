const MAX_FILE_BYTES = 1024 * 1024;
function validateEducation(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Données invalides.');
  const out = {};
  for (const [key, max] of Object.entries({ title: 200, institution: 200, period: 100, description: 2000, verification_url: 1000 })) {
    const value = body[key] ?? '';
    if (typeof value !== 'string' || value.length > max) throw new Error(`Champ invalide : ${key}.`);
    out[key] = value.trim();
  }
  if (!out.title) throw new Error('Le titre est requis.');
  if (!['education', 'certification'].includes(body.kind)) throw new Error('Type invalide.');
  out.kind = body.kind;
  if (out.verification_url) {
    let url;
    try { url = new URL(out.verification_url); } catch { throw new Error('Lien de vérification invalide.'); }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Utilise un lien HTTP ou HTTPS.');
  }
  if (!Number.isInteger(body.sort_order) || Math.abs(body.sort_order) > 100000) throw new Error('Ordre invalide.');
  out.sort_order = body.sort_order;
  for (const key of ['image', 'pdf']) {
    const file = body[key];
    if (file === undefined) continue; // Preserve existing attachment on update.
    if (file === null) { out[key] = null; continue; }
    if (!file || typeof file.name !== 'string' || !file.name.trim() || file.name.length > 200 || typeof file.data !== 'string' || file.data.length > 4 * Math.ceil(MAX_FILE_BYTES / 3) || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.data)) throw new Error('Fichier invalide (1 Mo maximum par fichier).');
    const bytes = Buffer.from(file.data, 'base64');
    const valid = key === 'pdf'
      ? file.type === 'application/pdf' && bytes.subarray(0, 5).toString() === '%PDF-'
      : (file.type === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ||
        (file.type === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
        (file.type === 'image/webp' && bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP');
    if (!valid || !bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error('Format invalide : PNG, JPEG, WebP ou PDF, 1 Mo maximum.');
    out[key] = { name: file.name.trim(), type: file.type, data: file.data };
  }
  return out;
}
module.exports = { validateEducation };
