const { guardResource, validateBody } = require('../../lib/validation');
const { sql } = require('../../lib/db');
const { applyCors } = require('../../lib/cors');
const { requireAuth } = require('../../lib/auth');
const { isValidCategory, LIMITS, tooLong, safeServerError } = require('../../lib/security');

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

module.exports = async (req, res) => {
  if (await applyCors(req, res)) return;
  if (guardResource(req, res, 'projects')) return;

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT * FROM projects ORDER BY featured DESC, created_at DESC;
      `;
      res.status(200).json(rows);
    } catch (err) {
      safeServerError(res, err, 'GET /api/projects');
    }
    return;
  }

  if (req.method === 'POST') {
    if (!(await requireAuth(req, res))) return;
    if (['POST','PUT'].includes(req.method)) {
      const error = validateBody('projects', req.body, req.method === 'POST');
      if (error) return res.status(400).json({ error });
    }
    try {
      const { title, description, tech_stack, repo_url, demo_url, category, featured } = req.body || {};
      if (!title || typeof title !== 'string') {
        res.status(400).json({ error: 'Le titre est requis.' });
        return;
      }
      if (tooLong(title, LIMITS.title) || tooLong(description, LIMITS.short * 4) ||
          tooLong(repo_url, LIMITS.url) || tooLong(demo_url, LIMITS.url)) {
        res.status(400).json({ error: 'Un des champs dépasse la longueur autorisée.' });
        return;
      }
      if (!isValidCategory(category)) {
        res.status(400).json({ error: 'Catégorie invalide (offensive, defensive, devsecops).' });
        return;
      }
      const slug = slugify(title);
      const { rows } = await sql`
        INSERT INTO projects (title, slug, description, tech_stack, repo_url, demo_url, category, featured)
        VALUES (${title}, ${slug}, ${description || ''}, ${tech_stack || []}, ${repo_url || ''}, ${demo_url || ''}, ${category || ''}, ${featured || false})
        RETURNING *;
      `;
      res.status(201).json(rows[0]);
    } catch (err) {
      safeServerError(res, err, 'POST /api/projects');
    }
    return;
  }

  res.status(405).json({ error: 'Méthode non autorisée' });
};
