  const { termbar, nav, footer } = renderShell("admin.html");
  document.getElementById("termbar-slot").replaceWith(termbar);
  document.getElementById("nav-slot").replaceWith(nav);
  document.getElementById("footer-slot").replaceWith(footer);

  let editingProjectId = null;
  let editingWriteupId = null;

  function showMsg(text, isError) {
    const box = document.getElementById("msg-box");
    box.innerHTML = `<div class="${isError ? "error-box" : "ok-box"}">${text}</div>`;
    setTimeout(() => { box.innerHTML = ""; }, 4000);
  }

  // ---- Auth gate ----
  async function checkAuth() {
    const status = await api.me();
    if (status.authenticated) {
      document.getElementById("login-gate").style.display = "none";
      document.getElementById("admin-panel").style.display = "block";
      document.getElementById("whoami-tag").textContent = `(connecté en tant que ${status.user})`;
      loadProjectsAdmin();
      loadWriteupsAdmin();
      loadToolsAdmin();
    } else {
      document.getElementById("login-gate").style.display = "block";
      document.getElementById("admin-panel").style.display = "none";
    }
  }

  document.getElementById("login-btn").addEventListener("click", () => {
    window.location.href = `${API_BASE_URL}/api/auth/login`;
  });
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
    checkAuth();
  });

  // ---- Tabs ----
  document.querySelectorAll(".tab-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".tab-link").forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      const tab = link.dataset.tab;
      document.getElementById("tab-projects").style.display = tab === "projects" ? "block" : "none";
      document.getElementById("tab-writeups").style.display = tab === "writeups" ? "block" : "none";
      document.getElementById("tab-tools").style.display = tab === "tools" ? "block" : "none";
    });
  });

  // ---- Projects CRUD ----
  async function loadProjectsAdmin() {
    const container = document.getElementById("projects-admin-list");
    try {
      const projects = await api.get("/api/projects");
      container.innerHTML = projects.length
        ? projects.map((p) => `
          <div class="card">
            <div class="title">${escapeHtml(p.title)}${p.featured ? '<span class="badge-featured">FEATURED</span>' : ""}</div>
            <div class="meta">${escapeHtml(p.category)} · id:${p.id}</div>
            <div class="desc">${escapeHtml(p.description)}</div>
            <button data-edit="${p.id}">éditer</button>
            <button data-delete="${p.id}" class="danger">supprimer</button>
          </div>
        `).join("")
        : `<p class="empty">// aucun projet.</p>`;

      container.querySelectorAll("[data-edit]").forEach((btn) =>
        btn.addEventListener("click", () => editProject(projects.find((p) => p.id == btn.dataset.edit)))
      );
      container.querySelectorAll("[data-delete]").forEach((btn) =>
        btn.addEventListener("click", () => deleteProject(btn.dataset.delete))
      );
    } catch (err) {
      container.innerHTML = `<p class="empty">// erreur : ${err.message}</p>`;
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
    document.getElementById("p-submit").textContent = "mettre à jour le projet";
    document.getElementById("p-cancel").style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.getElementById("p-cancel").addEventListener("click", () => {
    editingProjectId = null;
    document.getElementById("project-form").reset();
    document.getElementById("p-submit").textContent = "créer le projet";
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
        showMsg("Projet mis à jour.", false);
      } else {
        await api.post("/api/projects", payload);
        showMsg("Projet créé.", false);
      }
      document.getElementById("project-form").reset();
      document.getElementById("p-cancel").click();
      loadProjectsAdmin();
    } catch (err) {
      showMsg(err.message, true);
    }
  });

  async function deleteProject(id) {
    if (!confirm("Supprimer ce projet ?")) return;
    try {
      await api.del(`/api/projects/${id}`);
      showMsg("Projet supprimé.", false);
      loadProjectsAdmin();
    } catch (err) {
      showMsg(err.message, true);
    }
  }

  // ---- Writeups CRUD ----
  async function loadWriteupsAdmin() {
    const container = document.getElementById("writeups-admin-list");
    try {
      const writeups = await api.get("/api/writeups");
      container.innerHTML = writeups.length
        ? writeups.map((w) => `
          <div class="card">
            <div class="title">${escapeHtml(w.title)}</div>
            <div class="meta">${escapeHtml(w.ctf_name)} · ${escapeHtml(w.category)} · id:${w.id}</div>
            <div class="desc">${escapeHtml(w.summary)}</div>
            <button data-edit="${w.id}">éditer</button>
            <button data-delete="${w.id}" class="danger">supprimer</button>
          </div>
        `).join("")
        : `<p class="empty">// aucun writeup.</p>`;

      container.querySelectorAll("[data-edit]").forEach((btn) =>
        btn.addEventListener("click", async () => {
          const full = await api.get(`/api/writeups/${btn.dataset.edit}`);
          editWriteup(full);
        })
      );
      container.querySelectorAll("[data-delete]").forEach((btn) =>
        btn.addEventListener("click", () => deleteWriteup(btn.dataset.delete))
      );
    } catch (err) {
      container.innerHTML = `<p class="empty">// erreur : ${err.message}</p>`;
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
    document.getElementById("w-submit").textContent = "mettre à jour le writeup";
    document.getElementById("w-cancel").style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.getElementById("w-cancel").addEventListener("click", () => {
    editingWriteupId = null;
    document.getElementById("writeup-form").reset();
    document.getElementById("w-submit").textContent = "créer le writeup";
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
        showMsg("Writeup mis à jour.", false);
      } else {
        await api.post("/api/writeups", payload);
        showMsg("Writeup créé.", false);
      }
      document.getElementById("writeup-form").reset();
      document.getElementById("w-cancel").click();
      loadWriteupsAdmin();
    } catch (err) {
      showMsg(err.message, true);
    }
  });

  async function deleteWriteup(id) {
    if (!confirm("Supprimer ce writeup ?")) return;
    try {
      await api.del(`/api/writeups/${id}`);
      showMsg("Writeup supprimé.", false);
      loadWriteupsAdmin();
    } catch (err) {
      showMsg(err.message, true);
    }
  }

  // ---- Tools CRUD ----
  let editingToolId = null;

  async function loadToolsAdmin() {
    const container = document.getElementById("tools-admin-list");
    try {
      const tools = await api.get("/api/tools");
      container.innerHTML = tools.length
        ? tools.map((t) => `
          <div class="card">
            <div class="title">${escapeHtml(t.name)}${t.version ? " — " + escapeHtml(t.version) : ""}</div>
            <div class="meta">${escapeHtml(t.category)} · id:${t.id}</div>
            <div class="desc">${escapeHtml(t.description)}</div>
            <button data-edit="${t.id}">éditer</button>
            <button data-delete="${t.id}" class="danger">supprimer</button>
          </div>
        `).join("")
        : `<p class="empty">// aucun outil. Les blocs pacman de la page d'accueil afficheront "aucun outil enregistré".</p>`;

      container.querySelectorAll("[data-edit]").forEach((btn) =>
        btn.addEventListener("click", () => editTool(tools.find((t) => t.id == btn.dataset.edit)))
      );
      container.querySelectorAll("[data-delete]").forEach((btn) =>
        btn.addEventListener("click", () => deleteTool(btn.dataset.delete))
      );
    } catch (err) {
      container.innerHTML = `<p class="empty">// erreur : ${err.message}</p>`;
    }
  }

  function editTool(t) {
    editingToolId = t.id;
    document.getElementById("t-name").value = t.name || "";
    document.getElementById("t-version").value = t.version || "";
    document.getElementById("t-category").value = t.category || "offensive";
    document.getElementById("t-description").value = t.description || "";
    document.getElementById("t-sort").value = t.sort_order ?? 0;
    document.getElementById("t-submit").textContent = "mettre à jour l'outil";
    document.getElementById("t-cancel").style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.getElementById("t-cancel").addEventListener("click", () => {
    editingToolId = null;
    document.getElementById("tool-form").reset();
    document.getElementById("t-submit").textContent = "ajouter l'outil";
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
        showMsg("Outil mis à jour.", false);
      } else {
        await api.post("/api/tools", payload);
        showMsg("Outil ajouté.", false);
      }
      document.getElementById("tool-form").reset();
      document.getElementById("t-cancel").click();
      loadToolsAdmin();
    } catch (err) {
      showMsg(err.message, true);
    }
  });

  async function deleteTool(id) {
    if (!confirm("Supprimer cet outil ?")) return;
    try {
      await api.del(`/api/tools/${id}`);
      showMsg("Outil supprimé.", false);
      loadToolsAdmin();
    } catch (err) {
      showMsg(err.message, true);
    }
  }

  checkAuth();
