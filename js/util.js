// Échappe le texte avant insertion dans du HTML (protection XSS de base).
// À utiliser sur TOUT champ texte "libre" saisi via le CRUD (titre, description,
// résumé, tags, noms d'outils...) avant de le mettre dans du innerHTML.
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// N'autorise que les liens http(s) — bloque les URLs "javascript:" ou "data:"
// qui pourraient être utilisées pour de l'injection de script via un href.
function safeUrl(url) {
  if (!url) return "";
  const trimmed = String(url).trim();
  if (/^https?:\/\//i.test(trimmed)) return escapeHtml(trimmed);
  return "";
}
