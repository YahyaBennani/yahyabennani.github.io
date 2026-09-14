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
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Could not load tools (${escapeHtml(err.message)}). Check js/config.js.</td></tr>`;
  }
}
loadTools();

async function loadEducation() {
  const container = document.getElementById('education-list');
  try {
    const entries = await api.get('/api/education');
    container.innerHTML = entries.length ? entries.map((entry) => `<article class="education-card">
      <div class="education-kind">${entry.kind === 'education' ? 'Education' : 'Certification'}</div>
      <h3>${escapeHtml(entry.title)}</h3>
      ${entry.institution ? `<p>${escapeHtml(entry.institution)}</p>` : ''}
      ${entry.period ? `<p class="muted">${escapeHtml(entry.period)}</p>` : ''}
      ${entry.description ? `<p class="education-description">${escapeHtml(entry.description)}</p>` : ''}
      <div class="document-actions">${documentButtons(entry)}</div>
      ${safeUrl(entry.verification_url) ? `<a class="verification-link" href="${safeUrl(entry.verification_url)}" target="_blank" rel="noopener noreferrer">Verify credential ↗</a>` : ''}
    </article>`).join('') : '<p class="empty">No education or certifications published yet.</p>';
    bindDocumentButtons(container);
  } catch {
    container.innerHTML = '<p class="empty">Education and certifications could not be loaded.</p><button type="button">Retry</button>';
    container.querySelector('button').addEventListener('click', loadEducation);
  }
}
loadEducation();
