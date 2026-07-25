const { termbar, menubar, tabbar, statusbar } = renderShell("writeups.html");
document.getElementById("termbar-slot").replaceWith(termbar);
document.getElementById("menubar-slot").replaceWith(menubar);
document.getElementById("tabbar-slot").replaceWith(tabbar);
document.getElementById("statusbar-slot").replaceWith(statusbar);

async function loadWriteup() {
  const container = document.getElementById("writeup-content");
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  if (!slug) {
    container.innerHTML = `<p class="empty">No writeup specified.</p>`;
    return;
  }
  try {
    const w = await api.get(`/api/writeups/${encodeURIComponent(slug)}`);
    document.title = `Portfolio — ${w.title}`;
    document.getElementById("writeup-title-bar").textContent = w.title;
    container.innerHTML = `
      <p class="muted">
        ${w.ctf_name ? `${escapeHtml(w.ctf_name)} · ` : ""}${escapeHtml(w.category)} ${w.difficulty ? "· " + escapeHtml(w.difficulty) : ""}
        ${w.published_at ? " · " + new Date(w.published_at).toLocaleDateString("en-US") : ""}
      </p>
      <div>${(w.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      ${safeUrl(w.external_link) ? `<p><a href="${safeUrl(w.external_link)}" target="_blank" rel="noopener">challenge source →</a></p>` : ""}
      <hr>
      <div class="md-body">${DOMPurify.sanitize(marked.parse(w.content_markdown || ""))}</div>
    `;
  } catch (err) {
    container.innerHTML = `<p class="empty">Writeup not found or error: ${err.message}</p>`;
  }
}
loadWriteup();
