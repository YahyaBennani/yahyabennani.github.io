function renderShell(activePage) {
  // Barre de titre bleue classique (icône + titre + boutons ─ ▭ ✕)
  const termbar = document.createElement("div");
  termbar.className = "termbar";
  termbar.innerHTML = `
    <span class="win-icon">P</span>
    <span class="path">Portfolio — ${activePage}</span>
    <span class="win-controls">
      <span class="win-btn" aria-hidden="true">─</span>
      <span class="win-btn" aria-hidden="true">▭</span>
      <span class="win-btn win-close" aria-hidden="true">✕</span>
    </span>
  `;

  // Barre de menu — navigation fonctionnelle (remplace File/Edit/View/Tools/Help)
  const menubar = document.createElement("div");
  menubar.className = "menubar";
  const menuLinks = [
    ["index.html", "Home"],
    ["projects.html", "Projects"],
    ["writeups.html", "Writeups"],
  ];
  menubar.innerHTML = menuLinks
    .map(([href, label]) => {
      const isActive = activePage === href ? "active" : "";
      return `<a href="${href}" class="${isActive}">${label}</a>`;
    })
    .join("");

  // Barre d'onglets du bas — navigation principale (façon Cover Sheet / Problems / Meds...)
  const tabbar = document.createElement("nav");
  tabbar.className = "tabbar";
  const links = [
    ["index.html", "Home"],
    ["projects.html", "Projects"],
    ["writeups.html", "Writeups"],
  ];
  tabbar.innerHTML = links
    .map(([href, label]) => {
      const isActive = activePage === href ? "active" : "";
      return `<a href="${href}" class="${isActive}">${label}</a>`;
    })
    .join("");

  // Barre de statut du bas
  const statusbar = document.createElement("footer");
  statusbar.className = "statusbar";
  statusbar.innerHTML = `
    <span>Ready</span>
    <span><a href="https://github.com/" target="_blank" rel="noopener">GitHub</a> · <a href="mailto:contact@example.com">Contact</a> · © ${new Date().getFullYear()}</span>
  `;

  return { termbar, menubar, tabbar, statusbar };
}
