const { applyCors } = require('../../lib/cors');
const { getSessionUser } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (await applyCors(req, res)) return;
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Méthode non autorisée.' }); }
  const user = getSessionUser(req);
  if (user && user === process.env.GITHUB_OWNER_USERNAME) {
    res.status(200).json({ authenticated: true, user });
  } else {
    res.status(200).json({ authenticated: false });
  }
};
