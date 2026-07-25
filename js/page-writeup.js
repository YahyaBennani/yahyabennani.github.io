const { termbar, nav, footer, toolbar } = renderShell("writeups.html");
document.getElementById("termbar-slot").replaceWith(termbar);
document.getElementById("nav-slot").replaceWith(nav);
mountAscii3D("art-slot");
document.getElementById("footer-slot").replaceWith(footer);
document.getElementById("toolbar-slot").replaceWith(toolbar);
initFullscreenArt();

async function loadWriteup() {
  const container = document.getElementById("writeup-content");
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  if (!slug) {
    container.innerHTML = `<p class="empty">// no writeup specified.</p>`;
    return;
  }
  try {
    const w = await api.get(`/api/writeups/${encodeURIComponent(slug)}`);
    document.title = `[visitor@portfolio ~]$ ${w.title}`;
    container.innerHTML = `
      <h1>${escapeHtml(w.title)}</h1>
      <p class="meta muted">
        ${w.ctf_name ? `${escapeHtml(w.ctf_name)} · ` : ""}${escapeHtml(w.category)} ${w.difficulty ? "· " + escapeHtml(w.difficulty) : ""}
        ${w.published_at ? " · " + new Date(w.published_at).toLocaleDateString("en-US") : ""}
      </p>
      <div>
        ${(w.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
      </div>
      ${safeUrl(w.external_link) ? `<p><a href="${safeUrl(w.external_link)}" target="_blank" rel="noopener">challenge source →</a></p>` : ""}
      <hr style="border-color: var(--border); margin: 1.5rem 0;">
      <div class="md-body">${DOMPurify.sanitize(marked.parse(w.content_markdown || ""))}</div>
    `;
  } catch (err) {
    container.innerHTML = `<p class="empty">// writeup not found or error: ${err.message}</p>`;
  }
}
loadWriteup();
