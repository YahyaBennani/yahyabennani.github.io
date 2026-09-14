const { Pool } = require('pg');

// Vercel's Postgres integration (via Neon) exposes DATABASE_URL, not the old
// POSTGRES_URL used by the now-deprecated @vercel/postgres package.
function connectionString() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!raw) return undefined;
  const url = new URL(raw);
  // pg URL SSL parameters otherwise override the explicit verification policy below.
  for (const key of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  return url.toString();
}
const pool = new Pool({
  connectionString: connectionString(),
  ssl: process.env.DATABASE_SSL === 'disable' && process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1' ? false : { rejectUnauthorized: true },
  max: 5,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 10000,
  statement_timeout: 4000,
});
pool.on('error', () => console.error('[database] Idle connection error'));

// Wrapper en tagged template pour garder la même syntaxe `sql\`...\`` que
// dans le reste du code, mais basé sur `pg` (paramètres $1, $2... liés en sécurité).
function sql(strings, ...values) {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}` + strings[i + 1];
  }
  return pool.query(text, values);
}

module.exports = { sql, pool };
