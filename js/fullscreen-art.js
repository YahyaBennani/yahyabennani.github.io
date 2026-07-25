// Bannières ASCII plein écran, façon splash screen de msfconsole.
// Déclenchées par un bouton (barre d'outils), fermées au clic / touche / Échap.

const FULLSCREEN_BANNERS = [
  {
    art: `          _____ _____ ______  _____ _____ 
    /\\   / ____/ ____|  ____|/ ____/ ____|
   /  \\ | |   | |    | |__  | (___| (___  
  / /\\ \\| |   | |    |  __|  \\___ \\\\___ \\ 
 / ____ \\ |___| |____| |____ ____) |___) |
/_/    \\_\\_____\\_____|______|_____/_____/ 
                                          
                                          
  _____ _____            _   _ _______ ______ _____  
 / ____|  __ \\     /\\   | \\ | |__   __|  ____|  __ \\ 
| |  __| |__) |   /  \\  |  \\| |  | |  | |__  | |  | |
| | |_ |  _  /   / /\\ \\ | . \` |  | |  |  __| | |  | |
| |__| | | \\ \\  / ____ \\| |\\  |  | |  | |____| |__| |
 \\_____|_|  \\_\\/_/    \\_\\_| \\_|  |_|  |______|_____/ 
                                                     
                                                     `,
    tagline: "welcome back, root.",
    color: "green",
  },
  {
    art: `'########:::'#######:::'#######::'########:
 ##.... ##:'##.... ##:'##.... ##:... ##..::
 ##:::: ##: ##:::: ##: ##:::: ##:::: ##::::
 ########:: ##:::: ##: ##:::: ##:::: ##::::
 ##.. ##::: ##:::: ##: ##:::: ##:::: ##::::
 ##::. ##:: ##:::: ##: ##:::: ##:::: ##::::
 ##:::. ##:. #######::. #######::::: ##::::
..:::::..:::.......::::.......::::::..:::::`,
    tagline: "whoami — you already know.",
    color: "cyan",
  },
  {
    art: ` _____   ____  _____ _______ ______ ____  _      _____ ____  
|  __ \\ / __ \\|  __ \\__   __|  ____/ __ \\| |    |_   _/ __ \\ 
| |__) | |  | | |__) | | |  | |__ | |  | | |      | || |  | |
|  ___/| |  | |  _  /  | |  |  __|| |  | | |      | || |  | |
| |    | |__| | | \\ \\  | |  | |   | |__| | |____ _| || |__| |
|_|     \\____/|_|  \\_\\ |_|  |_|    \\____/|______|_____\\____/ 
                                                             
                                                             `,
    tagline: "cybersecurity engineer in training — offensive / defensive / devsecops",
    color: "accent",
  },
  {
    art: `        uuuuuuuuuuuuuuuuuuuu
      u* uu$$$$$$$$$$$uu $$*u
   u* uu$$$$$$$$$$$$$$$$$uu $$u
  u  u$$$$$$$$$$$$$$$$$$$$$u u$u
 u  u$$$$$$$$$$$$$$$$$$$$$$$u u$u
 $  $$$$$$$$$$$$$$$$$$$$$$$$$  $$
$u u$$$$$$$$$$$$$$$$$$$$$$$$$u u$
$  $$$$$$$$$$$$$$$$$$$$$$$$$$$  $
$  $$$$$"   "$$$"   "$$$$$$$$$  $
$  $$$$$u$u u$u u$u u$$$$$$$$$  $
$  $$$$$$$$$$$$$$$$$$$$$$$$$$$  $
 $ "$$$$$$$$$$$$$$$$$$$$$$$$$" $
 $u "$$$$$$$$$$$$$$$$$$$$$$$" u$
  $u "$$$$$$$$$$$$$$$$$$$$$" u$
   $$u "$$$$$$$$$$$$$$$$$" u$$
    "$$$$uu       uu$$$$$"
      "*$$$$$$$$$$$*"`,
    tagline: "curiosity killed the process. stay ethical, stay sharp.",
    color: "red",
  },
];

function openFullscreenAscii() {
  const pick = FULLSCREEN_BANNERS[Math.floor(Math.random() * FULLSCREEN_BANNERS.length)];

  const overlay = document.createElement("div");
  overlay.className = "ascii-fullscreen-overlay";
  overlay.innerHTML = `
    <pre class="ascii-fullscreen-art ascii-fullscreen-${pick.color}">${pick.art}</pre>
    <p class="ascii-fullscreen-tagline">${pick.tagline}</p>
    <p class="ascii-fullscreen-hint">click anywhere / press any key to close</p>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  function close() {
    overlay.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", close);
  }
  overlay.addEventListener("click", close);
  document.addEventListener("keydown", close);
}

function initFullscreenArt() {
  const btn = document.getElementById("fullscreen-ascii-btn");
  if (btn) btn.addEventListener("click", openFullscreenAscii);
}
