const { termbar, nav, footer } = renderShell("index.html");
document.getElementById("termbar-slot").replaceWith(termbar);
document.getElementById("nav-slot").replaceWith(nav);
document.getElementById("footer-slot").replaceWith(footer);
document.getElementById("colorbar-slot").replaceWith(renderColorbar());

initContactCards();

// ---- Blocs pacman dynamiques, alimentés par la base de données ----
const CATEGORY_META = {
  offensive: { targetId: "pac-offensive", label: "offensive-toolkit" },
  defensive: { targetId: "pac-defensive", label: "defensive-toolkit" },
  devsecops: { targetId: "pac-devsecops", label: "devsecops-toolkit" },
};

function renderPacmanBlock(category, tools) {
  const el = document.getElementById(CATEGORY_META[category].targetId);
  const label = CATEGORY_META[category].label;
  if (!tools.length) {
    el.innerHTML = `<span class="pac-dim">:: aucun outil enregistré pour ${label} pour le moment.</span>`;
    return;
  }
  const pkgList = tools.map((t) => `<span class="pac-pkg">${escapeHtml(t.name)}${t.version ? "-" + escapeHtml(t.version) : ""}</span>`).join("  ");
  const installLines = tools.map((t, i) => {
    const n = i + 1;
    const paddedName = escapeHtml(`${t.name}`).padEnd(24, " ");
    return `<span class="pac-name">(${n}/${tools.length})</span> installing ${paddedName}<span class="pac-bar">[######################]</span> 100%`;
  }).join("\n");

  el.innerHTML =
`<span class="pac-sync">:: Synchronizing package databases...</span>
<span class="pac-dim">resolving dependencies...
looking for conflicting packages...</span>

<span class="pac-count">Packages (${tools.length})</span> ${pkgList}

<span class="pac-prompt">:: Proceed with installation? [Y/n]</span> y
${installLines}
<span class="pac-ok">:: ${label} installed successfully.</span>`;
}

async function loadTools() {
  try {
    const tools = await api.get("/api/tools");
    ["offensive", "defensive", "devsecops"].forEach((cat) => {
      renderPacmanBlock(cat, tools.filter((t) => t.category === cat));
    });
  } catch (err) {
    ["offensive", "defensive", "devsecops"].forEach((cat) => {
      document.getElementById(CATEGORY_META[cat].targetId).innerHTML =
        `<span class="pac-dim">:: impossible de charger les outils (${err.message}). Vérifie js/config.js.</span>`;
    });
  }
}
loadTools();
