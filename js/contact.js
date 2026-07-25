const SOCIAL = {
  github: { username: "YahyaBennani", url: "https://github.com/YahyaBennani" },
  gitlab: { username: "YahyaBennani", url: "https://gitlab.com/YahyaBennani" },
  linkedin: { url: "https://www.linkedin.com/in/yahya-bennani/" },
};

async function loadGithubCard() {
  const el = document.getElementById("card-github");
  try {
    const res = await fetch(`https://api.github.com/users/${SOCIAL.github.username}`);
    if (!res.ok) throw new Error("profile not found");
    const u = await res.json();
    el.innerHTML = `
      <img class="avatar" src="${safeUrl(u.avatar_url)}" alt="avatar GitHub" />
      <div>
        <div class="platform gh">github</div>
        <div class="handle">${escapeHtml(u.login)}</div>
        <p class="bio">${escapeHtml(u.bio)}</p>
        <p class="stat">${escapeHtml(u.public_repos)} public repos · ${escapeHtml(u.followers)} followers</p>
        <a class="card-link" href="${SOCIAL.github.url}" target="_blank" rel="noopener">view profile →</a>
      </div>
    `;
  } catch (err) {
    el.innerHTML = fallbackCard("gh", "github", SOCIAL.github.username, SOCIAL.github.url);
  }
}

async function loadGitlabCard() {
  const el = document.getElementById("card-gitlab");
  try {
    const res = await fetch(`https://gitlab.com/api/v4/users?username=${SOCIAL.gitlab.username}`);
    if (!res.ok) throw new Error("profile not found");
    const data = await res.json();
    const u = data[0];
    if (!u) throw new Error("profile not found");
    el.innerHTML = `
      <img class="avatar" src="${safeUrl(u.avatar_url)}" alt="avatar GitLab" />
      <div>
        <div class="platform gl">gitlab</div>
        <div class="handle">${escapeHtml(u.username)}</div>
        <p class="bio">${escapeHtml(u.name)}</p>
        <a class="card-link" href="${SOCIAL.gitlab.url}" target="_blank" rel="noopener">view profile →</a>
      </div>
    `;
  } catch (err) {
    el.innerHTML = fallbackCard("gl", "gitlab", SOCIAL.gitlab.username, SOCIAL.gitlab.url);
  }
}

function loadLinkedinCard() {
  // No public API available for LinkedIn: static card.
  const el = document.getElementById("card-linkedin");
  el.innerHTML = fallbackCard("li", "linkedin", "yahya-bennani", SOCIAL.linkedin.url);
}

function fallbackCard(cls, platform, handle, url) {
  return `
    <div class="avatar" style="display:flex;align-items:center;justify-content:center;color:var(--fg-dim);font-size:11px;">--</div>
    <div>
      <div class="platform ${cls}">${platform}</div>
      <div class="handle">${handle}</div>
      <a class="card-link" href="${url}" target="_blank" rel="noopener">view profile →</a>
    </div>
  `;
}

function initContactCards() {
  loadGithubCard();
  loadGitlabCard();
  loadLinkedinCard();
}
