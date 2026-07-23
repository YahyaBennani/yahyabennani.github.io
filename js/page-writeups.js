const { termbar, nav, footer } = renderShell("writeups.html");
document.getElementById("termbar-slot").replaceWith(termbar);
document.getElementById("nav-slot").replaceWith(nav);
document.getElementById("footer-slot").replaceWith(footer);
document.getElementById("colorbar-slot").replaceWith(renderColorbar());

async function loadWriteups() {
  const container = document.getElementById("writeups-list");
  try {
    const writeups = await api.get("/api/writeups");
    if (writeups.length === 0) {
      container.innerHTML = `<p class="empty">// aucun writeup pour l'instant. Reviens bientôt.</p>`;
      return;
    }
    container.innerHTML = writeups.map((w) => `
      <div class="card">
        <div class="title">${escapeHtml(w.title)}</div>
        <div class="meta">
          ${w.ctf_name ? `${escapeHtml(w.ctf_name)} · ` : ""}${escapeHtml(w.difficulty)}
          ${w.published_at ? " · " + new Date(w.published_at).toLocaleDateString("fr-FR") : ""}
        </div>
        <div class="desc">${escapeHtml(w.summary)}</div>
        <div>
          ${w.category ? `<span class="tag">${escapeHtml(w.category)}</span>` : ""}
          ${(w.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        </div>
        <div class="card-links">
          <a href="writeup.html?slug=${encodeURIComponent(w.slug)}">lire le writeup →</a>
          ${safeUrl(w.external_link) ? `<a href="${safeUrl(w.external_link)}" target="_blank" rel="noopener">source du challenge →</a>` : ""}
        </div>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<p class="empty">// erreur de chargement : ${err.message}. Vérifie API_BASE_URL dans js/config.js.</p>`;
  }
}
loadWriteups();
