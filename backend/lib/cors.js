const { applySecurityHeaders } = require('./security');
const { rateLimitOrReject } = require('./rateLimit');
function frontendOrigin() {
  try {
    const url = new URL(process.env.FRONTEND_URL);
    return ['https:', 'http:'].includes(url.protocol) ? url.origin : null;
  } catch { return null; }
}
function hasTrustedOrigin(req) {
  const origin = frontendOrigin();
  return !!origin && req.headers.origin === origin;
}
async function applyCors(req, res) {
  applySecurityHeaders(res);
  res.setHeader('Vary', 'Origin');
  if (await rateLimitOrReject(req, res, { key: 'api', limit: 120, windowMs: 60000 })) return true;
  const origin = frontendOrigin();
  if (req.headers.origin && req.headers.origin !== origin) {
    res.status(403).json({ error: 'Origine non autorisée.' });
    return true;
  }
  if (origin && req.headers.origin === origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining');
  }
  if (req.method === 'OPTIONS') {
    if (!hasTrustedOrigin(req) || !['GET','POST','PUT','DELETE'].includes(req.headers['access-control-request-method']) ||
        (req.headers['access-control-request-headers'] || '').split(',').some(h => h.trim() && h.trim().toLowerCase() !== 'content-type')) {
      res.status(403).json({ error: 'Pré-vérification non autorisée.' });
    } else { res.setHeader('Access-Control-Max-Age', '600'); res.status(204).end(); }
    return true;
  }
  return false;
}
module.exports = { applyCors, frontendOrigin, hasTrustedOrigin };
