// En-têtes de sécurité de base, appliqués à toutes les réponses de l'API.
function applySecurityHeaders(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
}

const ALLOWED_CATEGORIES = ['offensive', 'defensive', 'devsecops'];

function isValidCategory(cat) {
  return cat === undefined || cat === null || cat === '' || ALLOWED_CATEGORIES.includes(cat);
}

// Tronque/valide les longueurs pour éviter les payloads abusifs.
const LIMITS = {
  title: 200,
  short: 300,       // description courte, résumé, nom d'outil, version...
  url: 500,
  content: 50000,   // corps Markdown d'un writeup
};

function tooLong(value, max) {
  return typeof value === 'string' && value.length > max;
}

// Ne jamais renvoyer le détail brut d'une erreur serveur au public :
// on logge côté serveur (visible dans les logs Vercel) et on renvoie un message générique.
function safeServerError(res, err, context) {
  console.error(`[${context}]`, { code: err?.code || 'INTERNAL' });
  res.status(500).json({ error: 'Erreur serveur. Réessaie plus tard.' });
}

module.exports = {
  applySecurityHeaders,
  isValidCategory,
  ALLOWED_CATEGORIES,
  LIMITS,
  tooLong,
  safeServerError,
};
