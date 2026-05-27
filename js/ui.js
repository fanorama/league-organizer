export function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function renderShell(active, title, actions = "") {
  document.body.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="leagues.html"><span class="brand-mark">⚽</span><span>LeagueOrg</span></a>
        <nav class="nav">
          <a class="${active === "leagues" ? "active" : ""}" href="leagues.html">🏟️ Leagues</a>
          <a class="${active === "settings" ? "active" : ""}" href="settings.html">⚙️ Settings</a>
        </nav>
      </aside>
      <div class="main">
        <header class="topbar">
          <h1>${title}</h1>
          <div class="topbar-actions">${actions}</div>
        </header>
        <main class="content" id="app"></main>
      </div>
    </div>
  `;
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

export function badge(status) {
  const classes = {
    setup: "warning",
    active: "success",
    finished: "",
    delayed: "warning",
    scheduled: "",
    error: "danger"
  };
  return `<span class="badge ${classes[status] || ""}">${escapeHtml(status)}</span>`;
}

export function teamBadge(team) {
  if (!team) return `<span class="team-badge">?</span>`;
  const badgeValue = team.badge || team.shortName || "?";
  if (/^https?:\/\//.test(badgeValue)) {
    return `<span class="team-badge"><img src="${escapeHtml(badgeValue)}" alt=""></span>`;
  }
  return `<span class="team-badge">${escapeHtml(badgeValue)}</span>`;
}

export function requireEntity(entity, message) {
  if (entity) return true;
  document.getElementById("app").innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  return false;
}
