const { guardResource, validateBody } = require('../../lib/validation');
const { sql } = require('../../lib/db');
const { applyCors } = require('../../lib/cors');
const { requireAuth } = require('../../lib/auth');
const { safeServerError } = require('../../lib/security');
const { rateLimitOrReject } = require('../../lib/rateLimit');
const { validateEducation } = require('../../lib/education');
module.exports = async (req, res) => {
  if (await applyCors(req, res)) return;
  if (guardResource(req, res, 'education', true)) return;
  if (!['GET', 'PUT', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Méthode non autorisée' });
  if (req.method !== 'GET' && !(await requireAuth(req, res))) return;
  const { id, asset } = req.query;
  if (!/^\d+$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) < 1 || Number(id) > 2147483647) return res.status(400).json({ error: 'Identifiant invalide.' });
  let d;
  if (req.method === 'PUT') {
    try { d = validateEducation(req.body); } catch (err) { return res.status(400).json({ error: err.message }); }
  }
  try {
    let result;
    if (req.method === 'GET') {
      if (await rateLimitOrReject(req, res, { key: 'document', limit: 20, windowMs: 60000 })) return;
      if (!['image', 'pdf'].includes(asset)) return res.status(400).json({ error: 'Fichier demandé invalide.' });
      result = await sql`SELECT CASE WHEN ${asset} = 'image' THEN image ELSE pdf END AS file FROM education WHERE id = ${id};`;
      if (!result.rows[0]?.file) return res.status(404).json({ error: 'Fichier introuvable.' });
      return res.status(200).json(result.rows[0].file);
    }
    if (req.method === 'DELETE') result = await sql`DELETE FROM education WHERE id = ${id} RETURNING id;`;
    else result = await sql`UPDATE education SET title=${d.title}, kind=${d.kind}, institution=${d.institution}, period=${d.period},
      description=${d.description}, verification_url=${d.verification_url}, sort_order=${d.sort_order},
      image=CASE WHEN ${d.image !== undefined} THEN ${d.image ? JSON.stringify(d.image) : null}::jsonb ELSE image END,
      pdf=CASE WHEN ${d.pdf !== undefined} THEN ${d.pdf ? JSON.stringify(d.pdf) : null}::jsonb ELSE pdf END,
      updated_at=now() WHERE id=${id} RETURNING id;`;
    if (!result.rows.length) return res.status(404).json({ error: 'Entrée introuvable.' });
    res.status(200).json(result.rows[0]);
  } catch (err) { safeServerError(res, err, 'education/[id]'); }
};
