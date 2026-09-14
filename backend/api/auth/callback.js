const { timingSafeEqual } = require('node:crypto');
const { signSession, buildSessionCookie, parseCookies } = require('../../lib/auth');
const { applySecurityHeaders } = require('../../lib/security');
const { rateLimitOrReject } = require('../../lib/rateLimit');

module.exports = async (req, res) => {
  applySecurityHeaders(res);
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Méthode non autorisée.' }); }
  if (await rateLimitOrReject(req, res, { key: 'auth-callback', limit: 15, windowMs: 900_000 })) return;
  const { code, state } = req.query;
  if (typeof code !== 'string' || !/^[a-zA-Z0-9_-]{1,512}$/.test(code)) {
    res.status(400).send('Code OAuth manquant.');
    return;
  }

  // Vérifie le paramètre "state" contre le cookie posé par /api/auth/login
  // (protection CSRF sur le flux OAuth).
  const cookies = parseCookies(req);
  const expectedState = cookies.oauth_state;
  const clearStateCookie = 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
  if (typeof state !== 'string' || !/^[a-f0-9]{32}$/.test(state) || typeof expectedState !== 'string' || !/^[a-f0-9]{32}$/.test(expectedState) || !timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))) {
    res.setHeader('Set-Cookie', clearStateCookie);
    res.status(403).send('Requête OAuth invalide (state manquant ou incorrect). Relance la connexion.');
    return;
  }

  res.setHeader('Set-Cookie', clearStateCookie);
  try {
    if (!process.env.GITHUB_OWNER_USERNAME || !process.env.GITHUB_CLIENT_SECRET || !process.env.FRONTEND_URL) throw new Error('OAuth configuration missing');
    // 1. Exchange code for an access token
    const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      signal: AbortSignal.timeout(3500),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.BACKEND_URL}/api/auth/callback`,
      }),
    });
    const tokenData = await tokenResp.json();

    if (!tokenResp.ok || typeof tokenData.access_token !== 'string' || !tokenData.access_token) {
      res.setHeader('Set-Cookie', clearStateCookie);
      res.status(401).send('Échec de l\'authentification GitHub.');
      return;
    }

    // 2. Fetch the GitHub user profile
    const userResp = await fetch('https://api.github.com/user', {
      signal: AbortSignal.timeout(3500),
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const githubUser = await userResp.json();

    // 3. Only the configured owner is allowed to get a session
    if (!userResp.ok || typeof githubUser.login !== 'string' || githubUser.login !== process.env.GITHUB_OWNER_USERNAME) {
      res.setHeader('Set-Cookie', clearStateCookie);
      res.status(403).send('Accès refusé : ce compte GitHub n\'est pas autorisé.');
      return;
    }

    // 4. Issue session cookie (and clear the one-time state cookie), redirect to admin page
    const token = signSession(githubUser.login);
    res.setHeader('Set-Cookie', [clearStateCookie, buildSessionCookie(token)]);
    res.writeHead(302, { Location: `${process.env.FRONTEND_URL}/admin.html` });
    res.end();
  } catch (err) {
    res.setHeader('Set-Cookie', clearStateCookie);
    res.status(500).send('Erreur serveur pendant l\'authentification.');
  }
};
