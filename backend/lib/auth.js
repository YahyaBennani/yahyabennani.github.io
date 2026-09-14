const jwt = require('jsonwebtoken');
const { rateLimitOrReject } = require('./rateLimit');
const { hasTrustedOrigin } = require('./cors');
const COOKIE_NAME = 'portfolio_session';
const SESSION_DURATION = 60 * 60 * 8;
const TOKEN_OPTIONS = { algorithm: 'HS256', issuer: 'portfolio-api', audience: 'portfolio-admin' };
function sessionSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET must contain at least 32 bytes');
  return secret;
}
function signSession(githubUsername) {
  if (typeof githubUsername !== 'string' || !githubUsername || githubUsername !== process.env.GITHUB_OWNER_USERNAME) throw new Error('Invalid session owner');
  return jwt.sign({ user: githubUsername }, sessionSecret(), { ...TOKEN_OPTIONS, expiresIn: SESSION_DURATION });
}
function buildSessionCookie(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${SESSION_DURATION}`;
}
function buildLogoutCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`;
}
function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = Object.create(null);
  if (typeof header !== 'string' || header.length > 8192) return cookies;
  for (const entry of header.split(';')) {
    const index = entry.indexOf('=');
    if (index < 1) continue;
    const key = entry.slice(0,index).trim();
    if (Object.hasOwn(cookies, key)) { cookies[key] = ''; continue; }
    try { cookies[key] = decodeURIComponent(entry.slice(index+1).trim()); } catch { cookies[key] = ''; }
  }
  return cookies;
}
function getSessionUser(req) {
  try {
    const token = parseCookies(req)[COOKIE_NAME];
    if (!token || token.length > 4096) return null;
    const payload = jwt.verify(token, sessionSecret(), { algorithms: ['HS256'], issuer: TOKEN_OPTIONS.issuer, audience: TOKEN_OPTIONS.audience, maxAge: SESSION_DURATION });
    return typeof payload.user === 'string' && payload.user === process.env.GITHUB_OWNER_USERNAME ? payload.user : null;
  } catch { return null; }
}
async function requireAuth(req, res) {
  if (await rateLimitOrReject(req, res, { key: 'write-op', limit: 30, windowMs: 60000 })) return null;
  if (!hasTrustedOrigin(req)) {
    res.status(403).json({ error: 'Origine de la requête non autorisée.' }); return null;
  }
  const user = getSessionUser(req);
  if (!user) {
    if (await rateLimitOrReject(req, res, { key: 'auth-failure', limit: 10, windowMs: 900000 })) return null;
    res.status(401).json({ error: 'Non authentifié. Reconnecte-toi via GitHub.' }); return null;
  }
  if (['POST','PUT'].includes(req.method) && !req.url?.startsWith('/api/auth/logout')) {
    if (!/^application\/json(?:\s*;.*)?$/i.test(req.headers['content-type'] || '') || (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity')) {
      res.status(415).json({ error: 'Un corps JSON non compressé est requis.' }); return null;
    }
    const maxBytes = /^\/api\/education(?:\/|\?|$)/.test(req.url || '') ? 3 * 1024 * 1024 : 64 * 1024;
    try {
      if (Number(req.headers['content-length']) > maxBytes || Buffer.byteLength(JSON.stringify(req.body) || '') > maxBytes) {
        res.status(413).json({ error: 'Requête trop volumineuse.' }); return null;
      }
    } catch { res.status(400).json({ error: 'Corps JSON invalide.' }); return null; }
  }
  return user;
}
module.exports = { COOKIE_NAME, SESSION_DURATION, signSession, buildSessionCookie, buildLogoutCookie, getSessionUser, requireAuth, parseCookies };
