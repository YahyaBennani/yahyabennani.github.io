const { guardResource, validateBody } = require('../../lib/validation');
const { sql } = require('../../lib/db');
const { applyCors } = require('../../lib/cors');
const { requireAuth } = require('../../lib/auth');
const { isValidCategory, LIMITS, tooLong, safeServerError } = require('../../lib/security');

module.exports = async (req, res) => {
  if (await applyCors(req, res)) return;
  if (guardResource(req, res, 'projects', true)) return;
  const { id } = req.query;
  const isNumeric = /^\d+$/.test(id);

  if (req.method === 'GET') {
    try {
      const { rows } = isNumeric
        ? await sql`SELECT * FROM projects WHERE id = ${id};`
        : await sql`SELECT * FROM projects WHERE slug = ${id};`;
      if (rows.length === 0) {
        res.status(404).json({ error: 'Projet introuvable' });
        return;
      }
      res.status(200).json(rows[0]);
    } catch (err) {
      safeServerError(res, err, 'GET /api/projects/[id]');
    }
    return;
  }

  if (req.method === 'PUT') {
    if (!(await requireAuth(req, res))) return;
    if (['POST','PUT'].includes(req.method)) {
      const error = validateBody('projects', req.body, req.method === 'POST');
      if (error) return res.status(400).json({ error });
    }
    try {
      const { title, description, tech_stack, repo_url, demo_url, category, featured } = req.body || {};
      if (tooLong(title, LIMITS.title) || tooLong(description, LIMITS.short * 4) ||
          tooLong(repo_url, LIMITS.url) || tooLong(demo_url, LIMITS.url)) {
        res.status(400).json({ error: 'Un des champs dépasse la longueur autorisée.' });
        return;
      }
      if (!isValidCategory(category)) {
        res.status(400).json({ error: 'Catégorie invalide (offensive, defensive, devsecops).' });
        return;
      }
      const { rows } = await sql`
        UPDATE projects SET
          title = COALESCE(${title}, title),
          description = COALESCE(${description}, description),
          tech_stack = COALESCE(${tech_stack}, tech_stack),
          repo_url = COALESCE(${repo_url}, repo_url),
          demo_url = COALESCE(${demo_url}, demo_url),
          category = COALESCE(${category}, category),
          featured = COALESCE(${featured}, featured),
          updated_at = now()
        WHERE id = ${id}
        RETURNING *;
      `;
      if (rows.length === 0) {
        res.status(404).json({ error: 'Projet introuvable' });
        return;
      }
      res.status(200).json(rows[0]);
    } catch (err) {
      safeServerError(res, err, 'PUT /api/projects/[id]');
    }
    return;
  }

  if (req.method === 'DELETE') {
    if (!(await requireAuth(req, res))) return;
    if (['POST','PUT'].includes(req.method)) {
      const error = validateBody('projects', req.body, req.method === 'POST');
      if (error) return res.status(400).json({ error });
    }
    try {
      await sql`DELETE FROM projects WHERE id = ${id};`;
      res.status(200).json({ ok: true });
    } catch (err) {
      safeServerError(res, err, 'DELETE /api/projects/[id]');
    }
    return;
  }

  res.status(405).json({ error: 'Méthode non autorisée' });
};
