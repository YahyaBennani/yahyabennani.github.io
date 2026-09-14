const schemas = {
  projects: { title: 200, description: 1200, tech_stack: 'array', repo_url: 'url', demo_url: 'url', category: 'projectCategory', featured: 'boolean' },
  writeups: { title: 200, ctf_name: 200, category: 100, difficulty: 'difficulty', summary: 1200, content_markdown: 50000, tags: 'array', external_link: 'url', published_at: 'date' },
  tools: { name: 300, version: 50, category: 'toolCategory', description: 300, sort_order: 'integer' },
};
function validUrl(value) {
  if (typeof value !== 'string' || value.length > 1000 || /[\u0000-\u0020\u007f]/.test(value)) return false;
  if (!value) return true;
  try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; }
}
function validId(id, allowSlug = false) {
  if (typeof id !== 'string' || id.length > 200) return false;
  if (/^\d+$/.test(id)) return Number(id) > 0 && Number(id) <= 2147483647;
  return allowSlug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
}
function validateBody(resource, body, create) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Un objet JSON est requis.';
  const schema = schemas[resource];
  if (!schema) return null; // Education has its own document validator.
  for (const [key, value] of Object.entries(body)) {
    const rule = schema[key];
    if (!Object.hasOwn(schema, key)) return `Champ inconnu : ${key}.`;
    let valid;
    if (typeof rule === 'number') valid = typeof value === 'string' && value.length <= rule && !value.includes('\0');
    else if (rule === 'array') valid = Array.isArray(value) && value.length <= 30 && value.every(v => typeof v === 'string' && v.length <= 100 && !v.includes('\0'));
    else if (rule === 'url') valid = validUrl(value);
    else if (rule === 'boolean') valid = typeof value === 'boolean';
    else if (rule === 'integer') valid = Number.isInteger(value) && Math.abs(value) <= 100000;
    else if (rule === 'projectCategory') valid = ['', 'offensive', 'defensive', 'devsecops'].includes(value);
    else if (rule === 'toolCategory') valid = ['offensive', 'defensive', 'devsecops'].includes(value);
    else if (rule === 'difficulty') valid = ['', 'easy', 'medium', 'hard', 'insane'].includes(value);
    else if (rule === 'date') valid = value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value);
    if (!valid) return `Champ invalide : ${key}.`;
  }
  for (const key of resource === 'tools' ? ['name','category'] : resource === 'writeups' ? ['title','content_markdown'] : ['title']) {
    if ((create || Object.hasOwn(body, key)) && (typeof body[key] !== 'string' || !body[key].trim())) return `Champ requis : ${key}.`;
  }
  return null;
}
function guardResource(req, res, resource, item = false) {
  const methods = item ? ['GET','PUT','DELETE'] : ['GET','POST'];
  if (!methods.includes(req.method)) { res.setHeader('Allow', methods.join(', ')); res.status(405).json({ error: 'Méthode non autorisée.' }); return true; }
  if (item && !validId(req.query.id, req.method === 'GET' && ['projects','writeups'].includes(resource))) {
    res.status(400).json({ error: 'Identifiant invalide.' }); return true;
  }
  return false;
}
module.exports = { validUrl, validId, validateBody, guardResource };
