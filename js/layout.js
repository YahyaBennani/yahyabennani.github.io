// Petit séparateur ASCII (pas un logo) réutilisable entre sections
const ASCII_DIVIDER = "─".repeat(64);

const COLORBAR = ["--red", "--yellow", "--green", "--cyan", "--accent", "--magenta", "--fg", "--fg-bright"];

function renderColorbar() {
  const colors = ["--red", "--yellow", "--green", "--cyan", "--accent", "--magenta", "--fg", "--fg-bright"];
  const bar = document.createElement("div");
  bar.className = "colorbar";
  bar.innerHTML = colors.map((c) => `<span style="background:var(${c})"></span>`).join("");
  return bar;
}

function renderShell(activePage) {
  // Barre de titre façon fenêtre rétro : icône + titre à gauche, boutons à droite.
  // Barre de titre sombre, style terminal OS (points macOS)
  const termbar = document.createElement("div");
  termbar.className = "termbar";
  termbar.innerHTML = `
    <span class="win-dot" style="background:#ff5f56"></span>
    <span class="win-dot" style="background:#ffbd2e"></span>
    <span class="win-dot" style="background:#27c93f"></span>
    <span class="path">visitor@portfolio — ~/${activePage}</span>
  `;

  // Navigation façon onglets (tab bar), reliée visuellement au contenu en dessous.
  const nav = document.createElement("nav");
  nav.className = "termnav";
  const links = [
    ["index.html", "whoami"],
    ["projects.html", "ls projects/"],
    ["writeups.html", "ls writeups/"],
  ];
  nav.innerHTML = links
    .map(([href, label]) => {
      const isActive = activePage === href ? "active" : "";
      return `<a href="${href}" class="${isActive}">${label}</a>`;
    })
    .join("");

  const footer = document.createElement("footer");
  footer.innerHTML = `
    <span>© ${new Date().getFullYear()} — build with the terminal, for the terminal.</span>
    <span><a href="https://github.com/" target="_blank" rel="noopener">github</a> · <a href="mailto:contact@example.com">contact</a></span>
  `;

  // Barre d'outils du bas, façon fenêtre rétro (voir l'image de référence)
  const toolbar = document.createElement("div");
  toolbar.className = "win-toolbar";
  toolbar.innerHTML = `
    <a class="win-toolbar-btn" href="index.html">Home</a>
    <a class="win-toolbar-btn" href="projects.html">Projects</a>
    <a class="win-toolbar-btn" href="writeups.html">Writeups</a>
    <button id="fullscreen-ascii-btn" type="button">Fullscreen ASCII</button>
    <a class="win-toolbar-btn" href="index.html#contact" style="margin-left:auto;">Contact</a>
  `;

  return { termbar, nav, footer, toolbar };
}
