const { guardResource, validateBody } = require('../../lib/validation');
const { sql } = require('../../lib/db');
const { applyCors } = require('../../lib/cors');
const { requireAuth } = require('../../lib/auth');
const { LIMITS, tooLong, safeServerError } = require('../../lib/security');

module.exports = async (req, res) => {
  if (await applyCors(req, res)) return;
  if (guardResource(req, res, 'writeups', true)) return;
  const { id } = req.query;
  const isNumeric = /^\d+$/.test(id);

  if (req.method === 'GET') {
    try {
      const { rows } = isNumeric
        ? await sql`SELECT * FROM writeups WHERE id = ${id};`
        : await sql`SELECT * FROM writeups WHERE slug = ${id};`;
      if (rows.length === 0) {
        res.status(404).json({ error: 'Writeup introuvable' });
        return;
      }
      res.status(200).json(rows[0]);
    } catch (err) {
      safeServerError(res, err, 'GET /api/writeups/[id]');
    }
    return;
  }

  if (req.method === 'PUT') {
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
      if (tooLong(title, LIMITS.title) || tooLong(summary, LIMITS.short * 4) ||
          tooLong(content_markdown, LIMITS.content) || tooLong(external_link, LIMITS.url)) {
        res.status(400).json({ error: 'Un des champs dépasse la longueur autorisée.' });
        return;
      }
      const { rows } = await sql`
        UPDATE writeups SET
          title = COALESCE(${title}, title),
          ctf_name = COALESCE(${ctf_name}, ctf_name),
          category = COALESCE(${category}, category),
          difficulty = COALESCE(${difficulty}, difficulty),
          summary = COALESCE(${summary}, summary),
          content_markdown = COALESCE(${content_markdown}, content_markdown),
          tags = COALESCE(${tags}, tags),
          external_link = COALESCE(${external_link}, external_link),
          published_at = COALESCE(${published_at}, published_at),
          updated_at = now()
        WHERE id = ${id}
        RETURNING *;
      `;
      if (rows.length === 0) {
        res.status(404).json({ error: 'Writeup introuvable' });
        return;
      }
      res.status(200).json(rows[0]);
    } catch (err) {
      safeServerError(res, err, 'PUT /api/writeups/[id]');
    }
    return;
  }

  if (req.method === 'DELETE') {
    if (!(await requireAuth(req, res))) return;
    if (['POST','PUT'].includes(req.method)) {
      const error = validateBody('writeups', req.body, req.method === 'POST');
      if (error) return res.status(400).json({ error });
    }
    try {
      await sql`DELETE FROM writeups WHERE id = ${id};`;
      res.status(200).json({ ok: true });
    } catch (err) {
      safeServerError(res, err, 'DELETE /api/writeups/[id]');
    }
    return;
  }

  res.status(405).json({ error: 'Méthode non autorisée' });
};
