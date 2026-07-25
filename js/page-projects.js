const { termbar, menubar, tabbar, statusbar } = renderShell("projects.html");
document.getElementById("termbar-slot").replaceWith(termbar);
document.getElementById("menubar-slot").replaceWith(menubar);
document.getElementById("tabbar-slot").replaceWith(tabbar);
document.getElementById("statusbar-slot").replaceWith(statusbar);

async function loadProjects() {
  const tbody = document.querySelector("#projects-table tbody");
  try {
    const projects = await api.get("/api/projects");
    if (projects.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty">No projects yet. Check back soon.</td></tr>`;
      return;
    }
    tbody.innerHTML = projects.map((p) => `
      <tr>
        <td>${escapeHtml(p.title)}${p.featured ? '<span class="badge-featured">FEATURED</span>' : ""}<br><span class="muted" style="font-size:11px;">${escapeHtml(p.description)}</span></td>
        <td>${p.category ? `<span class="tag cat-${escapeHtml(p.category)}">${escapeHtml(p.category)}</span>` : ""}</td>
        <td>${(p.tech_stack || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(" ")}</td>
        <td>${new Date(p.created_at).toLocaleDateString("en-US")}</td>
        <td>
          ${safeUrl(p.repo_url) ? `<a href="${safeUrl(p.repo_url)}" target="_blank" rel="noopener">source</a>` : ""}
          ${safeUrl(p.demo_url) ? `<br><a href="${safeUrl(p.demo_url)}" target="_blank" rel="noopener">demo</a>` : ""}
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Loading error: ${err.message}. Check API_BASE_URL in js/config.js.</td></tr>`;
  }
}
loadProjects();
