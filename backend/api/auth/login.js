const { applySecurityHeaders } = require('../../lib/security');
const { rateLimitOrReject } = require('../../lib/rateLimit');
const crypto = require('crypto');

module.exports = async (req, res) => {
  applySecurityHeaders(res);
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Méthode non autorisée.' }); }
  if (await rateLimitOrReject(req, res, { key: 'auth-login', limit: 10, windowMs: 900_000 })) return;

  if (!process.env.GITHUB_CLIENT_ID || !process.env.BACKEND_URL || !process.env.FRONTEND_URL) return res.status(503).json({ error: 'Authentification indisponible.' });

  // Paramètre "state" anti-CSRF : valeur aléatoire stockée dans un cookie court,
  // renvoyée par GitHub dans le callback et vérifiée avant de créer une session.
  const state = crypto.randomBytes(16).toString('hex');
  res.setHeader('Set-Cookie', `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300`);

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.BACKEND_URL}/api/auth/callback`,
    scope: 'read:user',
    allow_signup: 'false',
    state,
  });
  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params.toString()}` });
  res.end();
};
