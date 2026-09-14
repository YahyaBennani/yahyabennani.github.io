const { termbar, menubar, tabbar, statusbar } = renderShell("admin.html");
document.getElementById("termbar-slot").replaceWith(termbar);
document.getElementById("menubar-slot").replaceWith(menubar);
document.getElementById("tabbar-slot").replaceWith(tabbar);
document.getElementById("statusbar-slot").replaceWith(statusbar);

let editingProjectId = null;
let editingWriteupId = null;

function showMsg(text, isError) {
  const box = document.getElementById("msg-box");
  box.innerHTML = `<div class="${isError ? "error-box" : "ok-box"}">${escapeHtml(text)}</div>`;
  setTimeout(() => { box.innerHTML = ""; }, 4000);
}

// ---- Auth gate ----
async function checkAuth() {
  const status = await api.me();
  if (status.authenticated) {
    document.getElementById("login-gate").style.display = "none";
    document.getElementById("admin-panel").style.display = "block";
    document.getElementById("whoami-tag").textContent = `(signed in as ${status.user})`;
    loadProjectsAdmin();
    loadWriteupsAdmin();
    loadToolsAdmin();
    loadEducationAdmin();
  } else {
    document.getElementById("login-gate").style.display = "block";
    document.getElementById("admin-panel").style.display = "none";
  }
}

document.getElementById("login-btn").addEventListener("click", () => {
  window.location.href = `${API_BASE_URL}/api/auth/login`;
});
document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    await api.post('/api/auth/logout');
    await checkAuth();
  } catch (err) { showMsg(err.message, true); }
});

// ---- Tabs ----
document.querySelectorAll(".tab-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelectorAll(".tab-link").forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
    const tab = link.dataset.tab;
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.style.display = panel.id === `tab-${tab}` ? "block" : "none";
    });
  });
});

// ---- Projects CRUD ----
async function loadProjectsAdmin() {
  const tbody = document.querySelector("#projects-admin-table tbody");
  try {
    const projects = await api.get("/api/projects");
    tbody.innerHTML = projects.length
      ? projects.map((p) => `
        <tr>
          <td>${escapeHtml(p.title)}${p.featured ? '<span class="badge-featured">FEATURED</span>' : ""}</td>
          <td>${escapeHtml(p.category)}</td>
          <td><button data-edit="${p.id}">Edit</button><button data-delete="${p.id}" class="danger">Delete</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="3" class="empty">No projects.</td></tr>`;

    tbody.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => editProject(projects.find((p) => p.id == btn.dataset.edit)))
    );
    tbody.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", () => deleteProject(btn.dataset.delete))
    );
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function editProject(p) {
  editingProjectId = p.id;
  document.getElementById("p-title").value = p.title || "";
  document.getElementById("p-description").value = p.description || "";
  document.getElementById("p-tech").value = (p.tech_stack || []).join(", ");
  document.getElementById("p-repo").value = p.repo_url || "";
  document.getElementById("p-demo").value = p.demo_url || "";
  document.getElementById("p-category").value = p.category || "offensive";
  document.getElementById("p-featured").checked = !!p.featured;
  document.getElementById("p-submit").textContent = "Update Project";
  document.getElementById("p-cancel").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("p-cancel").addEventListener("click", () => {
  editingProjectId = null;
  document.getElementById("project-form").reset();
  document.getElementById("p-submit").textContent = "Create Project";
  document.getElementById("p-cancel").style.display = "none";
});

document.getElementById("project-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById("p-title").value,
    description: document.getElementById("p-description").value,
    tech_stack: document.getElementById("p-tech").value.split(",").map((s) => s.trim()).filter(Boolean),
    repo_url: document.getElementById("p-repo").value,
    demo_url: document.getElementById("p-demo").value,
    category: document.getElementById("p-category").value,
    featured: document.getElementById("p-featured").checked,
  };
  try {
    if (editingProjectId) {
      await api.put(`/api/projects/${editingProjectId}`, payload);
      showMsg("Project updated.", false);
    } else {
      await api.post("/api/projects", payload);
      showMsg("Project created.", false);
    }
    document.getElementById("project-form").reset();
    document.getElementById("p-cancel").click();
    loadProjectsAdmin();
  } catch (err) {
    showMsg(err.message, true);
  }
});

async function deleteProject(id) {
  if (!confirm("Delete this project?")) return;
  try {
    await api.del(`/api/projects/${id}`);
    showMsg("Project deleted.", false);
    loadProjectsAdmin();
  } catch (err) {
    showMsg(err.message, true);
  }
}

// ---- Writeups CRUD ----
async function loadWriteupsAdmin() {
  const tbody = document.querySelector("#writeups-admin-table tbody");
  try {
    const writeups = await api.get("/api/writeups");
    tbody.innerHTML = writeups.length
      ? writeups.map((w) => `
        <tr>
          <td>${escapeHtml(w.title)}</td>
          <td>${escapeHtml(w.ctf_name)}</td>
          <td>${escapeHtml(w.category)}</td>
          <td><button data-edit="${w.id}">Edit</button><button data-delete="${w.id}" class="danger">Delete</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="4" class="empty">No writeups.</td></tr>`;

    tbody.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const full = await api.get(`/api/writeups/${btn.dataset.edit}`);
        editWriteup(full);
      })
    );
    tbody.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", () => deleteWriteup(btn.dataset.delete))
    );
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function editWriteup(w) {
  editingWriteupId = w.id;
  document.getElementById("w-title").value = w.title || "";
  document.getElementById("w-ctf").value = w.ctf_name || "";
  document.getElementById("w-category").value = w.category || "";
  document.getElementById("w-difficulty").value = w.difficulty || "easy";
  document.getElementById("w-summary").value = w.summary || "";
  document.getElementById("w-content").value = w.content_markdown || "";
  document.getElementById("w-tags").value = (w.tags || []).join(", ");
  document.getElementById("w-link").value = w.external_link || "";
  document.getElementById("w-date").value = w.published_at ? w.published_at.substring(0, 10) : "";
  document.getElementById("w-submit").textContent = "Update Writeup";
  document.getElementById("w-cancel").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("w-cancel").addEventListener("click", () => {
  editingWriteupId = null;
  document.getElementById("writeup-form").reset();
  document.getElementById("w-submit").textContent = "Create Writeup";
  document.getElementById("w-cancel").style.display = "none";
});

document.getElementById("writeup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById("w-title").value,
    ctf_name: document.getElementById("w-ctf").value,
    category: document.getElementById("w-category").value,
    difficulty: document.getElementById("w-difficulty").value,
    summary: document.getElementById("w-summary").value,
    content_markdown: document.getElementById("w-content").value,
    tags: document.getElementById("w-tags").value.split(",").map((s) => s.trim()).filter(Boolean),
    external_link: document.getElementById("w-link").value,
    published_at: document.getElementById("w-date").value || null,
  };
  try {
    if (editingWriteupId) {
      await api.put(`/api/writeups/${editingWriteupId}`, payload);
      showMsg("Writeup updated.", false);
    } else {
      await api.post("/api/writeups", payload);
      showMsg("Writeup created.", false);
    }
    document.getElementById("writeup-form").reset();
    document.getElementById("w-cancel").click();
    loadWriteupsAdmin();
  } catch (err) {
    showMsg(err.message, true);
  }
});

async function deleteWriteup(id) {
  if (!confirm("Delete this writeup?")) return;
  try {
    await api.del(`/api/writeups/${id}`);
    showMsg("Writeup deleted.", false);
    loadWriteupsAdmin();
  } catch (err) {
    showMsg(err.message, true);
  }
}

// ---- Tools CRUD ----
let editingToolId = null;

async function loadToolsAdmin() {
  const tbody = document.querySelector("#tools-admin-table tbody");
  try {
    const tools = await api.get("/api/tools");
    tbody.innerHTML = tools.length
      ? tools.map((t) => `
        <tr>
          <td>${escapeHtml(t.name)}${t.version ? " — " + escapeHtml(t.version) : ""}</td>
          <td>${escapeHtml(t.category)}</td>
          <td><button data-edit="${t.id}">Edit</button><button data-delete="${t.id}" class="danger">Delete</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="3" class="empty">No tools yet.</td></tr>`;

    tbody.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => editTool(tools.find((t) => t.id == btn.dataset.edit)))
    );
    tbody.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", () => deleteTool(btn.dataset.delete))
    );
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function editTool(t) {
  editingToolId = t.id;
  document.getElementById("t-name").value = t.name || "";
  document.getElementById("t-version").value = t.version || "";
  document.getElementById("t-category").value = t.category || "offensive";
  document.getElementById("t-description").value = t.description || "";
  document.getElementById("t-sort").value = t.sort_order ?? 0;
  document.getElementById("t-submit").textContent = "Update Tool";
  document.getElementById("t-cancel").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("t-cancel").addEventListener("click", () => {
  editingToolId = null;
  document.getElementById("tool-form").reset();
  document.getElementById("t-submit").textContent = "Add Tool";
  document.getElementById("t-cancel").style.display = "none";
});

document.getElementById("tool-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById("t-name").value,
    version: document.getElementById("t-version").value,
    category: document.getElementById("t-category").value,
    description: document.getElementById("t-description").value,
    sort_order: parseInt(document.getElementById("t-sort").value, 10) || 0,
  };
  try {
    if (editingToolId) {
      await api.put(`/api/tools/${editingToolId}`, payload);
      showMsg("Tool updated.", false);
    } else {
      await api.post("/api/tools", payload);
      showMsg("Tool added.", false);
    }
    document.getElementById("tool-form").reset();
    document.getElementById("t-cancel").click();
    loadToolsAdmin();
  } catch (err) {
    showMsg(err.message, true);
  }
});

async function deleteTool(id) {
  if (!confirm("Delete this tool?")) return;
  try {
    await api.del(`/api/tools/${id}`);
    showMsg("Tool deleted.", false);
    loadToolsAdmin();
  } catch (err) {
    showMsg(err.message, true);
  }
}

checkAuth().catch(() => {
  document.getElementById('login-gate').style.display = 'block';
  document.querySelector('#login-gate p').textContent = 'Could not check your session. The service may be temporarily unavailable. Please reload the page.';
});

// ---- Education & Certifications CRUD ----
let editingEducationId = null;
const educationForm = document.getElementById('education-form');
const educationFields = ['title', 'kind', 'institution', 'period', 'description', 'verification_url', 'sort_order'];
function resetEducation() {
  editingEducationId = null;
  educationForm.reset();
  document.getElementById('e-heading').textContent = 'New Education / Certification';
  document.getElementById('e-submit').textContent = 'Add Entry';
  document.getElementById('e-cancel').hidden = true;
  for (const kind of ['image', 'pdf']) document.getElementById(`e-${kind}-current`).replaceChildren();
}
document.getElementById('e-cancel').addEventListener('click', resetEducation);
for (const kind of ['image', 'pdf']) {
  document.getElementById(`e-${kind}`).addEventListener('change', () => { document.getElementById(`e-${kind}-remove`).checked = false; });
  document.getElementById(`e-${kind}-remove`).addEventListener('change', (event) => {
    if (event.target.checked) document.getElementById(`e-${kind}`).value = '';
  });
}
async function loadEducationAdmin() {
  const tbody = document.querySelector('#education-admin-table tbody');
  try {
    const entries = await api.get('/api/education');
    tbody.innerHTML = entries.length ? entries.map((entry) => `<tr>
      <td>${escapeHtml(entry.title)}<br><span class="muted">${escapeHtml(entry.institution)}</span></td>
      <td>${escapeHtml(entry.kind)}<br>${escapeHtml(entry.period)}</td>
      <td>${documentButtons(entry) || 'No documents'}</td>
      <td><button data-edit="${entry.id}">Edit</button><button class="danger" data-delete="${entry.id}">Delete</button></td>
    </tr>`).join('') : '<tr><td colspan="4" class="empty">No entries yet.</td></tr>';
    bindDocumentButtons(tbody);
    tbody.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => {
      resetEducation();
      const entry = entries.find((item) => String(item.id) === button.dataset.edit);
      editingEducationId = entry.id;
      educationFields.forEach((key) => { document.getElementById(`e-${key}`).value = entry[key] ?? ''; });
      document.getElementById('e-heading').textContent = 'Edit Education / Certification';
      document.getElementById('e-submit').textContent = 'Save Changes';
      document.getElementById('e-cancel').hidden = false;
      for (const kind of ['image', 'pdf']) {
        const box = document.getElementById(`e-${kind}-current`);
        box.textContent = entry[`${kind}_name`] ? `Saved: ${entry[`${kind}_name`]} — kept unless replaced or removed.` : 'No saved document.';
      }
      document.getElementById('e-title').focus();
    }));
    tbody.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', async () => {
      if (!confirm('Delete this entry and its certificate documents?')) return;
      button.disabled = true;
      try {
        await api.del(`/api/education/${button.dataset.delete}`);
        if (String(editingEducationId) === button.dataset.delete) resetEducation();
        showMsg('Entry deleted.', false);
        await loadEducationAdmin();
      } catch (err) { showMsg(err.message, true); button.disabled = false; }
    }));
  } catch {
    tbody.innerHTML = '<tr><td colspan="4">Could not load entries. <button type="button" id="e-retry">Retry</button></td></tr>';
    document.getElementById('e-retry').addEventListener('click', loadEducationAdmin);
  }
}
function readCertificateFile(file, kind) {
  const types = kind === 'pdf' ? ['application/pdf'] : ['image/png', 'image/jpeg', 'image/webp'];
  if (!types.includes(file.type) || !file.size || file.size > 1024 * 1024) throw new Error('Use PNG, JPEG, WebP or PDF files, up to 1 MB each.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result.split(',')[1] });
    reader.readAsDataURL(file);
  });
}
educationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(educationFields.map((key) => [key, document.getElementById(`e-${key}`).value]));
  payload.sort_order = Number(payload.sort_order);
  const id = editingEducationId;
  const controls = [...educationForm.elements];
  controls.forEach((control) => { control.disabled = true; });
  try {
    for (const kind of ['image', 'pdf']) {
      const file = document.getElementById(`e-${kind}`).files[0];
      if (file) payload[kind] = await readCertificateFile(file, kind);
      else if (document.getElementById(`e-${kind}-remove`).checked) payload[kind] = null;
    }
    if (id) await api.put(`/api/education/${id}`, payload);
    else await api.post('/api/education', payload);
    resetEducation();
    showMsg(id ? 'Entry updated.' : 'Entry added.', false);
    await loadEducationAdmin();
  } catch (err) { showMsg(err.message, true); }
  finally { controls.forEach((control) => { control.disabled = false; }); }
});
