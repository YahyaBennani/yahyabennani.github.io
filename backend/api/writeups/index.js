const { guardResource, validateBody } = require('../../lib/validation');
const { sql } = require('../../lib/db');
const { applyCors } = require('../../lib/cors');
const { requireAuth } = require('../../lib/auth');
const { LIMITS, tooLong, safeServerError } = require('../../lib/security');

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

module.exports = async (req, res) => {
  if (await applyCors(req, res)) return;
  if (guardResource(req, res, 'writeups')) return;

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT id, title, slug, ctf_name, category, difficulty, summary, tags, external_link, published_at
        FROM writeups ORDER BY published_at DESC NULLS LAST, created_at DESC;
      `;
      res.status(200).json(rows);
    } catch (err) {
      safeServerError(res, err, 'GET /api/writeups');
    }
    return;
  }

  if (req.method === 'POST') {
    if (!(await requireAuth(req, res))) return;
    if (['POST','PUT'].includes(req.method)) {
      const error = validateBody('writeups', req.body, req.method === 'POST');
      if (error) return res.status(400).json({ error });
    }
    try {
      const {
        title, ctf_name, category, difficulty, summary,
        content_markdown, tags, external_link, published_at,
      } = req.body || {};
      if (!title || typeof title !== 'string' || !content_markdown || typeof content_markdown !== 'string') {
        res.status(400).json({ error: 'Le titre et le contenu sont requis.' });
        return;
      }
      if (tooLong(title, LIMITS.title) || tooLong(summary, LIMITS.short * 4) ||
          tooLong(content_markdown, LIMITS.content) || tooLong(external_link, LIMITS.url)) {
        res.status(400).json({ error: 'Un des champs dépasse la longueur autorisée.' });
        return;
      }
      const slug = slugify(title);
      const { rows } = await sql`
        INSERT INTO writeups
          (title, slug, ctf_name, category, difficulty, summary, content_markdown, tags, external_link, published_at)
        VALUES
          (${title}, ${slug}, ${ctf_name || ''}, ${category || ''}, ${difficulty || ''}, ${summary || ''}, ${content_markdown}, ${tags || []}, ${external_link || ''}, ${published_at || null})
        RETURNING *;
      `;
      res.status(201).json(rows[0]);
    } catch (err) {
      safeServerError(res, err, 'POST /api/writeups');
    }
    return;
  }

  res.status(405).json({ error: 'Méthode non autorisée' });
};
