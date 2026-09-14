const { Pool } = require('pg');

// Vercel's Postgres integration (via Neon) exposes DATABASE_URL, not the old
// POSTGRES_URL used by the now-deprecated @vercel/postgres package.
function connectionString() {
  if (!process.env.DATABASE_URL) return undefined;
  const url = new URL(process.env.DATABASE_URL);
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
