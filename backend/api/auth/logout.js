const { applyCors } = require('../../lib/cors');
const { buildLogoutCookie, requireAuth } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (await applyCors(req, res)) return;
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Méthode non autorisée.' }); }
  if (!(await requireAuth(req, res))) return;
  res.setHeader('Set-Cookie', buildLogoutCookie());
  res.status(200).json({ ok: true });
};
