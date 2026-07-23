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
  const termbar = document.createElement("div");
  termbar.className = "termbar";
  termbar.innerHTML = `
    <span class="dot" style="background:#ff5f56"></span>
    <span class="dot" style="background:#ffbd2e"></span>
    <span class="dot" style="background:#27c93f"></span>
    <span class="path">visitor@portfolio: ~/${activePage}</span>
  `;

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
    <span><a href="https://github.com/YahyaBennani" target="_blank" rel="noopener">github</a> · <a href="mailto:ybennani348@gmail.com">contact</a></span>
  `;

  return { termbar, nav, footer };
}
