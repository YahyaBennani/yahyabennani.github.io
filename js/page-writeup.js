const { termbar, nav, footer } = renderShell("writeups.html");
document.getElementById("termbar-slot").replaceWith(termbar);
document.getElementById("nav-slot").replaceWith(nav);
document.getElementById("footer-slot").replaceWith(footer);

async function loadWriteup() {
  const container = document.getElementById("writeup-content");
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  if (!slug) {
    container.innerHTML = `<p class="empty">// aucun writeup spécifié.</p>`;
    return;
  }
  try {
    const w = await api.get(`/api/writeups/${encodeURIComponent(slug)}`);
    document.title = `[visitor@portfolio ~]$ ${w.title}`;
    container.innerHTML = `
      <h1>${escapeHtml(w.title)}</h1>
      <p class="meta muted">
        ${w.ctf_name ? `${escapeHtml(w.ctf_name)} · ` : ""}${escapeHtml(w.category)} ${w.difficulty ? "· " + escapeHtml(w.difficulty) : ""}
        ${w.published_at ? " · " + new Date(w.published_at).toLocaleDateString("fr-FR") : ""}
      </p>
      <div>
        ${(w.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
      </div>
      ${safeUrl(w.external_link) ? `<p><a href="${safeUrl(w.external_link)}" target="_blank" rel="noopener">source du challenge →</a></p>` : ""}
      <hr style="border-color: var(--border); margin: 1.5rem 0;">
      <div class="md-body">${DOMPurify.sanitize(marked.parse(w.content_markdown || ""))}</div>
    `;
  } catch (err) {
    container.innerHTML = `<p class="empty">// writeup introuvable ou erreur : ${err.message}</p>`;
  }
}
loadWriteup();
