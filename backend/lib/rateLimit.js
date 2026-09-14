const { createHmac } = require('node:crypto');
const { isIP } = require('node:net');
const buckets = new Map();
const MAX_BUCKETS = 10000;
function getClientIp(req) {
  // Trust proxy headers only inside Vercel's managed runtime.
  let ip = process.env.VERCEL === '1'
    ? req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for']
    : req.socket?.remoteAddress;
  if (typeof ip !== 'string' || !isIP(ip.trim())) return 'unknown';
  ip = ip.trim().toLowerCase();
  if (ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4) return ip.slice(7);
  // Canonicalize IPv6 and group /64 to prevent trivial address rotation.
  if (isIP(ip) === 6) {
    const normalized = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
    const [left, right = ''] = normalized.split('::');
    const a = left ? left.split(':') : [], b = right ? right.split(':') : [];
    const parts = normalized.includes('::') ? [...a, ...Array(8-a.length-b.length).fill('0'), ...b] : a;
    return parts.slice(0,4).map(x => x.padStart(4,'0')).join(':') + '::/64';
  }
  return ip;
}
function checkRateLimit(key, { limit, windowMs }, now = Date.now()) {
  for (const [k, entry] of buckets) if (entry.reset <= now) buckets.delete(k);
  let entry = buckets.get(key);
  if (!entry) {
    // Fail closed at capacity; do not evict active counters.
    if (buckets.size >= MAX_BUCKETS) return { allowed: false, remaining: 0, retryAfter: Math.ceil(windowMs / 1000) };
    entry = { count: 0, reset: now + windowMs };
    buckets.set(key, entry);
  }
  entry.count = Math.min(entry.count + 1, limit + 1);
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit-entry.count), retryAfter: Math.max(1, Math.ceil((entry.reset-now)/1000)) };
}
async function consumeShared(key, { limit, windowMs }) {
  const { sql } = require('./db');
  const { rows } = await sql`
    INSERT INTO rate_limit_buckets (bucket_key, hits, expires_at)
    VALUES (${key}, 1, clock_timestamp() + ${windowMs} * interval '1 millisecond')
    ON CONFLICT (bucket_key) DO UPDATE SET
      hits = CASE WHEN rate_limit_buckets.expires_at <= clock_timestamp() THEN 1 ELSE LEAST(rate_limit_buckets.hits + 1, ${limit + 1}) END,
      expires_at = CASE WHEN rate_limit_buckets.expires_at <= clock_timestamp() THEN clock_timestamp() + ${windowMs} * interval '1 millisecond' ELSE rate_limit_buckets.expires_at END
    RETURNING hits, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (expires_at - clock_timestamp())))) AS retry_after;
  `;
  // Bound cleanup work. Expired entries are also reused atomically above.
  if (Math.random() < 0.01) {
    await sql`DELETE FROM rate_limit_buckets WHERE expires_at < now() AND bucket_key IN
      (SELECT bucket_key FROM rate_limit_buckets WHERE expires_at < now() LIMIT 1000);`;
  }
  return { allowed: rows[0].hits <= limit, remaining: Math.max(0, limit - rows[0].hits), retryAfter: Number(rows[0].retry_after) };
}
async function rateLimitOrReject(req, res, policy) {
  try {
    const production = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    const secret = process.env.JWT_SECRET;
    if (production && (!secret || Buffer.byteLength(secret) < 32)) throw new Error('Missing rate limit key');
    const key = createHmac('sha256', secret || 'local-development-only').update(`${policy.key}:${getClientIp(req)}`).digest('hex');
    // Production always uses shared counters; no silent memory fallback.
    const result = production || process.env.DATABASE_URL
      ? await consumeShared(key, policy) : checkRateLimit(key, policy);
    res.setHeader('X-RateLimit-Limit', String(policy.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfter));
      res.status(429).json({ error: 'Trop de requêtes. Réessaie après le délai indiqué.', retry_after: result.retryAfter });
      return true;
    }
    return false;
  } catch {
    console.error('[rate-limit] Shared limiter unavailable or misconfigured');
    res.setHeader('Retry-After', '30');
    res.status(503).json({ error: 'Service temporairement indisponible.' });
    return true;
  }
}
module.exports = { getClientIp, checkRateLimit, consumeShared, rateLimitOrReject };
