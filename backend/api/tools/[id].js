const { guardResource, validateBody } = require('../../lib/validation');
const { sql } = require('../../lib/db');
const { applyCors } = require('../../lib/cors');
const { requireAuth } = require('../../lib/auth');
const { ALLOWED_CATEGORIES, LIMITS, tooLong, safeServerError } = require('../../lib/security');

module.exports = async (req, res) => {
  if (await applyCors(req, res)) return;
  if (guardResource(req, res, 'tools', true)) return;
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT * FROM tools WHERE id = ${id};`;
      if (rows.length === 0) {
        res.status(404).json({ error: 'Outil introuvable' });
        return;
      }
      res.status(200).json(rows[0]);
    } catch (err) {
      safeServerError(res, err, 'GET /api/tools/[id]');
    }
    return;
  }

  if (req.method === 'PUT') {
    if (!(await requireAuth(req, res))) return;
    if (['POST','PUT'].includes(req.method)) {
      const error = validateBody('tools', req.body, req.method === 'POST');
      if (error) return res.status(400).json({ error });
    }
    try {
      const { name, version, category, description, sort_order } = req.body || {};
      if (category && !ALLOWED_CATEGORIES.includes(category)) {
        res.status(400).json({ error: `Catégorie invalide : ${ALLOWED_CATEGORIES.join(', ')}.` });
        return;
      }
      if (tooLong(name, LIMITS.short) || tooLong(version, 50) || tooLong(description, LIMITS.short)) {
        res.status(400).json({ error: 'Un des champs dépasse la longueur autorisée.' });
        return;
      }
      const { rows } = await sql`
        UPDATE tools SET
          name = COALESCE(${name}, name),
          version = COALESCE(${version}, version),
          category = COALESCE(${category}, category),
          description = COALESCE(${description}, description),
          sort_order = COALESCE(${sort_order}, sort_order),
          updated_at = now()
        WHERE id = ${id}
        RETURNING *;
      `;
      if (rows.length === 0) {
        res.status(404).json({ error: 'Outil introuvable' });
        return;
      }
      res.status(200).json(rows[0]);
    } catch (err) {
      safeServerError(res, err, 'PUT /api/tools/[id]');
    }
    return;
  }

  if (req.method === 'DELETE') {
    if (!(await requireAuth(req, res))) return;
    if (['POST','PUT'].includes(req.method)) {
      const error = validateBody('tools', req.body, req.method === 'POST');
      if (error) return res.status(400).json({ error });
    }
    try {
      await sql`DELETE FROM tools WHERE id = ${id};`;
      res.status(200).json({ ok: true });
    } catch (err) {
      safeServerError(res, err, 'DELETE /api/tools/[id]');
    }
    return;
  }

  res.status(405).json({ error: 'Méthode non autorisée' });
};
