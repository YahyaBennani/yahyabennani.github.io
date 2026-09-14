const { guardResource, validateBody } = require('../../lib/validation');
const { sql } = require('../../lib/db');
const { applyCors } = require('../../lib/cors');
const { requireAuth } = require('../../lib/auth');
const { isValidCategory, ALLOWED_CATEGORIES, LIMITS, tooLong, safeServerError } = require('../../lib/security');

module.exports = async (req, res) => {
  if (await applyCors(req, res)) return;
  if (guardResource(req, res, 'tools')) return;

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT * FROM tools ORDER BY category, sort_order, name;
      `;
      res.status(200).json(rows);
    } catch (err) {
      safeServerError(res, err, 'GET /api/tools');
    }
    return;
  }

  if (req.method === 'POST') {
    if (!(await requireAuth(req, res))) return;
    if (['POST','PUT'].includes(req.method)) {
      const error = validateBody('tools', req.body, req.method === 'POST');
      if (error) return res.status(400).json({ error });
    }
    try {
      const { name, version, category, description, sort_order } = req.body || {};
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Le nom de l\'outil est requis.' });
        return;
      }
      if (!category || !ALLOWED_CATEGORIES.includes(category)) {
        res.status(400).json({ error: `Catégorie requise : ${ALLOWED_CATEGORIES.join(', ')}.` });
        return;
      }
      if (tooLong(name, LIMITS.short) || tooLong(version, 50) || tooLong(description, LIMITS.short)) {
        res.status(400).json({ error: 'Un des champs dépasse la longueur autorisée.' });
        return;
      }
      const { rows } = await sql`
        INSERT INTO tools (name, version, category, description, sort_order)
        VALUES (${name}, ${version || ''}, ${category}, ${description || ''}, ${sort_order || 0})
        RETURNING *;
      `;
      res.status(201).json(rows[0]);
    } catch (err) {
      safeServerError(res, err, 'POST /api/tools');
    }
    return;
  }

  res.status(405).json({ error: 'Méthode non autorisée' });
};
