const { termbar, menubar, tabbar, statusbar } = renderShell("writeups.html");
document.getElementById("termbar-slot").replaceWith(termbar);
document.getElementById("menubar-slot").replaceWith(menubar);
document.getElementById("tabbar-slot").replaceWith(tabbar);
document.getElementById("statusbar-slot").replaceWith(statusbar);

async function loadWriteups() {
  const tbody = document.querySelector("#writeups-table tbody");
  try {
    const writeups = await api.get("/api/writeups");
    if (writeups.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty">No writeups yet. Check back soon.</td></tr>`;
      return;
    }
    tbody.innerHTML = writeups.map((w) => `
      <tr>
        <td><a href="writeup.html?slug=${encodeURIComponent(w.slug)}">${escapeHtml(w.title)}</a><br><span class="muted" style="font-size:11px;">${escapeHtml(w.summary)}</span></td>
        <td>${escapeHtml(w.ctf_name)}</td>
        <td>${w.category ? `<span class="tag">${escapeHtml(w.category)}</span>` : ""}</td>
        <td>${escapeHtml(w.difficulty)}</td>
        <td>${w.published_at ? new Date(w.published_at).toLocaleDateString("en-US") : ""}</td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Loading error: ${err.message}. Check API_BASE_URL in js/config.js.</td></tr>`;
  }
}
loadWriteups();
