const { guardResource, validateBody } = require('../../lib/validation');
const { sql } = require('../../lib/db');
const { applyCors } = require('../../lib/cors');
const { requireAuth } = require('../../lib/auth');
const { safeServerError } = require('../../lib/security');
const { validateEducation } = require('../../lib/education');
module.exports = async (req, res) => {
  if (await applyCors(req, res)) return;
  if (guardResource(req, res, 'education')) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Méthode non autorisée' });
  if (req.method === 'POST' && !(await requireAuth(req, res))) return;
  let data;
  if (req.method === 'POST') {
    try { data = validateEducation(req.body); } catch (err) { return res.status(400).json({ error: err.message }); }
  }
  try {
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT id, title, kind, institution, period, description, verification_url, sort_order,
        image->>'name' AS image_name, pdf->>'name' AS pdf_name FROM education ORDER BY sort_order, id;`;
      return res.status(200).json(rows);
    }
    const d = data;
    const { rows } = await sql`INSERT INTO education (title, kind, institution, period, description, verification_url, sort_order, image, pdf)
      VALUES (${d.title}, ${d.kind}, ${d.institution}, ${d.period}, ${d.description}, ${d.verification_url}, ${d.sort_order}, ${d.image ? JSON.stringify(d.image) : null}, ${d.pdf ? JSON.stringify(d.pdf) : null}) RETURNING id;`;
    return res.status(201).json(rows[0]);
  } catch (err) { safeServerError(res, err, 'education'); }
};
