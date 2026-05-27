import { createSeasonWithSchedule, replaceSeasonSchedule } from "./schedule.js";
import { calculateStandings } from "./standings.js";
import { KEYS, getAll, getById, save } from "./storage.js";
import { badge, escapeHtml, qs, renderShell, requireEntity, teamBadge } from "./ui.js";

const seasonId = qs("id");
let season = getById(KEYS.seasons, seasonId);
let league = season ? getById(KEYS.leagues, season.leagueId) : null;
renderShell("leagues", season && league ? `${league.name} - Season ${season.number}` : "Season", league ? `<a class="btn" href="league.html?id=${league.id}">Back</a>` : "");

const app = document.getElementById("app");
let activeTab = "schedule";

function teamMap() {
  return Object.fromEntries(getAll(KEYS.teams).filter((team) => team.leagueId === league.id && team.status === "active" && team.owner).map((team) => [team.id, team]));
}

function render() {
  season = getById(KEYS.seasons, seasonId);
  league = season ? getById(KEYS.leagues, season.leagueId) : null;
  if (!requireEntity(season && league, "Season not found.")) return;

  const teams = getAll(KEYS.teams).filter((team) => team.leagueId === league.id && team.status === "active" && team.owner);
  const matches = getAll(KEYS.matches).filter((match) => match.seasonId === season.id);
  const allFinished = matches.length > 0 && matches.every((match) => match.status === "finished");

  if (season.status === "active" && allFinished) {
    finishSeason();
    return;
  }

  app.innerHTML = `
    <section class="card" style="margin-bottom:18px">
      <div class="row" style="justify-content:space-between">
        <div>
          <h2>Season ${season.number}</h2>
          <div class="muted">${matches.length} matches · ${matches.filter((match) => match.status === "finished").length} finished</div>
        </div>
        <div class="actions">
          ${badge(season.status)}
          ${season.status === "setup" ? `
            <button id="randomize" class="btn" type="button">Randomize</button>
            <button id="startSeason" class="btn primary" type="button" ${teams.length < 2 ? "disabled" : ""}>Start season</button>
          ` : ""}
        </div>
      </div>
    </section>
    <div class="tabs">
      <button class="tab ${activeTab === "schedule" ? "active" : ""}" data-tab="schedule" type="button">Schedule</button>
      <button class="tab ${activeTab === "standings" ? "active" : ""}" data-tab="standings" type="button">Standings</button>
    </div>
    <section id="tabContent"></section>
  `;

  app.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      render();
    });
  });

  document.getElementById("randomize")?.addEventListener("click", () => {
    replaceSeasonSchedule(season, teams.map((team) => team.id), league.settings.meetingsPerSeason);
    render();
  });

  document.getElementById("startSeason")?.addEventListener("click", () => {
    if (confirm("Start season? Schedule changes will be locked.")) {
      save(KEYS.seasons, { ...season, status: "active", startedAt: new Date().toISOString() });
      render();
    }
  });

  if (activeTab === "standings") renderStandings();
  else renderSchedule();
}

function renderSchedule() {
  const teams = teamMap();
  const matches = getAll(KEYS.matches).filter((match) => match.seasonId === season.id)
    .sort((a, b) => a.matchday - b.matchday || a.id.localeCompare(b.id));
  const groups = matches.reduce((acc, match) => {
    if (!acc.has(match.matchday)) acc.set(match.matchday, []);
    acc.get(match.matchday).push(match);
    return acc;
  }, new Map());
  const content = document.getElementById("tabContent");
  content.innerHTML = matches.length ? [...groups.entries()].map(([matchday, items]) => `
    <div class="matchday">
      <div class="matchday-title">${Number(matchday) === 99 ? "Postponed" : `Matchday ${matchday}`}</div>
      ${items.map((match) => renderMatch(match, teams)).join("")}
    </div>
  `).join("") : `<div class="empty">No schedule generated.</div>`;

  content.querySelectorAll("[data-save-score]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest(".match-card");
      const match = getById(KEYS.matches, button.dataset.saveScore);
      save(KEYS.matches, {
        ...match,
        homeScore: Number(row.querySelector("[name=homeScore]").value),
        awayScore: Number(row.querySelector("[name=awayScore]").value),
        status: "finished"
      });
      render();
    });
  });

  content.querySelectorAll("[data-delay]").forEach((button) => {
    button.addEventListener("click", () => {
      const match = getById(KEYS.matches, button.dataset.delay);
      save(KEYS.matches, {
        ...match,
        status: "delayed",
        originalMatchday: match.matchday,
        matchday: 99
      });
      render();
    });
  });
}

function renderMatch(match, teams) {
  const home = teams[match.homeTeamId];
  const away = teams[match.awayTeamId];
  const canEdit = season.status === "active" && match.status !== "finished";
  return `
    <article class="match-card">
      <div class="match-main">
        ${renderTeamSummary(home)}
        <div class="score-box">
          ${canEdit ? `
            <input class="score-input" name="homeScore" type="number" min="0" value="${match.homeScore ?? ""}">
            <span>-</span>
            <input class="score-input" name="awayScore" type="number" min="0" value="${match.awayScore ?? ""}">
          ` : `<span>${match.homeScore ?? ""}</span><span>${match.status === "finished" ? "-" : "vs"}</span><span>${match.awayScore ?? ""}</span>`}
        </div>
        ${renderTeamSummary(away, "away")}
      </div>
      <div class="actions">
        ${badge(match.status)}
        ${canEdit ? `<button class="btn primary" data-save-score="${match.id}" type="button">Save</button>` : ""}
        ${canEdit && match.status === "scheduled" ? `<button class="btn" data-delay="${match.id}" type="button">Delay</button>` : ""}
      </div>
    </article>
  `;
}

function renderTeamSummary(team, side = "home") {
  const details = `
    <div>
      <div class="team-name">${escapeHtml(team?.name || "Unknown")}</div>
      <div class="muted">owner: ${escapeHtml(team?.owner || "unassigned")}</div>
    </div>
  `;
  return side === "away"
    ? `<div class="team-line away">${details}${teamBadge(team)}</div>`
    : `<div class="team-line">${teamBadge(team)}${details}</div>`;
}

function renderStandings() {
  const rows = calculateStandings(season.id);
  document.getElementById("tabContent").innerHTML = `
    <section class="panel">
      <div class="panel-body" style="overflow:auto">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Team</th><th>Owner</th><th class="center">P</th><th class="center">W</th><th class="center">D</th><th class="center">L</th><th class="center">GF</th><th class="center">GA</th><th class="center">GD</th><th class="center">Pts</th><th>Form</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td><div class="team-line">${teamBadge(row.team)}<span class="team-name">${escapeHtml(row.team.name)}</span></div></td>
                <td>${escapeHtml(row.team.owner || "unassigned")}</td>
                <td class="center">${row.played}</td>
                <td class="center">${row.won}</td>
                <td class="center">${row.drawn}</td>
                <td class="center">${row.lost}</td>
                <td class="center">${row.gf}</td>
                <td class="center">${row.ga}</td>
                <td class="center">${row.gd}</td>
                <td class="center"><strong>${row.pts}</strong></td>
                <td>${row.form.join(" ") || "-"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function finishSeason() {
  const standings = calculateStandings(season.id);
  const finished = save(KEYS.seasons, {
    ...season,
    status: "finished",
    champion: standings[0]?.team.id || null,
    finishedAt: new Date().toISOString()
  });
  if (league.settings.continuousSeasons) {
    const teams = getAll(KEYS.teams).filter((team) => team.leagueId === league.id && team.status === "active" && team.owner);
    createSeasonWithSchedule(league, teams);
  }
  season = finished;
  render();
}

render();
