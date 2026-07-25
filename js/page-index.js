const { termbar, menubar, tabbar, statusbar } = renderShell("index.html");
document.getElementById("termbar-slot").replaceWith(termbar);
document.getElementById("menubar-slot").replaceWith(menubar);
document.getElementById("tabbar-slot").replaceWith(tabbar);
document.getElementById("statusbar-slot").replaceWith(statusbar);

initContactCards();

async function loadTools() {
  const tbody = document.querySelector("#tools-table tbody");
  try {
    const tools = await api.get("/api/tools");
    if (!tools.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty">No tools registered yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = tools.map((t) => `
      <tr>
        <td>${escapeHtml(t.name)}</td>
        <td>${escapeHtml(t.version)}</td>
        <td><span class="tag cat-${escapeHtml(t.category)}">${escapeHtml(t.category)}</span></td>
        <td>${escapeHtml(t.description)}</td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Could not load tools (${err.message}). Check js/config.js.</td></tr>`;
  }
}
loadTools();
