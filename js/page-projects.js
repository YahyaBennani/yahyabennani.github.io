const { termbar, nav, footer } = renderShell("projects.html");
document.getElementById("termbar-slot").replaceWith(termbar);
document.getElementById("nav-slot").replaceWith(nav);
document.getElementById("footer-slot").replaceWith(footer);
document.getElementById("colorbar-slot").replaceWith(renderColorbar());

const catClass = (c) => {
  if (c === "offensive") return "cat-offensive";
  if (c === "defensive") return "cat-defensive";
  if (c === "devsecops") return "cat-devsecops";
  return "";
};

async function loadProjects() {
  const container = document.getElementById("projects-list");
  try {
    const projects = await api.get("/api/projects");
    if (projects.length === 0) {
      container.innerHTML = `<p class="empty">// aucun projet pour l'instant. Reviens bientôt.</p>`;
      return;
    }
    container.innerHTML = projects.map((p) => `
      <div class="card">
        <div class="title">${escapeHtml(p.title)}${p.featured ? '<span class="badge-featured">FEATURED</span>' : ""}</div>
        <div class="meta">${new Date(p.created_at).toLocaleDateString("fr-FR")}</div>
        <div class="desc">${escapeHtml(p.description)}</div>
        <div>
          ${p.category ? `<span class="tag ${catClass(p.category)}">${escapeHtml(p.category)}</span>` : ""}
          ${(p.tech_stack || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        </div>
        <div class="card-links">
          ${safeUrl(p.repo_url) ? `<a href="${safeUrl(p.repo_url)}" target="_blank" rel="noopener">code source →</a>` : ""}
          ${safeUrl(p.demo_url) ? `<a href="${safeUrl(p.demo_url)}" target="_blank" rel="noopener">demo →</a>` : ""}
        </div>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<p class="empty">// erreur de chargement : ${err.message}. Vérifie API_BASE_URL dans js/config.js.</p>`;
  }
}
loadProjects();
