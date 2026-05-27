import { createSeasonWithSchedule } from "./schedule.js";
import { KEYS, getAll, getById, save } from "./storage.js";
import { badge, escapeHtml, qs, renderShell, requireEntity, teamBadge } from "./ui.js";

const leagueId = qs("id");
let league = getById(KEYS.leagues, leagueId);
renderShell("leagues", league ? league.name : "League", league ? `<a class="btn" href="teams.html?league=${league.id}">Teams</a>` : "");

const app = document.getElementById("app");

function render() {
  league = getById(KEYS.leagues, leagueId);
  if (!requireEntity(league, "League not found.")) return;

  const teams = getAll(KEYS.teams).filter((team) => team.leagueId === league.id && team.status === "active" && team.owner);
  const seasons = getAll(KEYS.seasons).filter((season) => season.leagueId === league.id).sort((a, b) => b.number - a.number);
  const champions = Object.fromEntries(teams.map((team) => [team.id, team]));

  app.innerHTML = `
    <div class="two-col">
      <section class="panel">
        <div class="panel-head">
          <h2>Seasons</h2>
          <button id="createSeason" class="btn primary" type="button" ${teams.length < 2 ? "disabled" : ""}>Create season</button>
        </div>
        <div class="panel-body">
          ${teams.length < 2 ? `<div class="empty">Add at least two teams before creating a season.</div>` : ""}
          ${seasons.length ? `<div class="list">${seasons.map((season) => `
            <div class="list-row">
              <div>
                <strong>Season ${season.number}</strong>
                <div class="muted">${season.champion ? `Champion: ${escapeHtml(champions[season.champion]?.name || "Unknown")}` : "No champion yet"}</div>
              </div>
              <div class="actions">
                ${badge(season.status)}
                <a class="btn" href="season.html?id=${season.id}">Open</a>
              </div>
            </div>
          `).join("")}</div>` : teams.length >= 2 ? `<div class="empty">No seasons yet.</div>` : ""}
        </div>
      </section>
      <aside class="list">
        <section class="card">
          <h2>League settings</h2>
          <form id="settingsForm" class="list">
            <div class="field">
              <label>Meetings per season</label>
              <select name="meetingsPerSeason">
                <option value="1" ${league.settings.meetingsPerSeason === 1 ? "selected" : ""}>Single round</option>
                <option value="2" ${league.settings.meetingsPerSeason === 2 ? "selected" : ""}>Home and away</option>
              </select>
            </div>
            <div class="field">
              <label>Continuous seasons</label>
              <select name="continuousSeasons">
                <option value="false" ${league.settings.continuousSeasons ? "" : "selected"}>Off</option>
                <option value="true" ${league.settings.continuousSeasons ? "selected" : ""}>On</option>
              </select>
            </div>
            <button class="btn" type="submit">Save</button>
          </form>
        </section>
        <section class="card">
          <h2>Teams</h2>
          ${teams.length ? `<div class="list">${teams.slice(0, 8).map((team) => `
            <div class="team-line">${teamBadge(team)}<span class="team-name">${escapeHtml(team.name)}</span></div>
          `).join("")}</div>` : `<div class="empty">No teams.</div>`}
        </section>
      </aside>
    </div>
  `;

  document.getElementById("createSeason").addEventListener("click", () => {
    const season = createSeasonWithSchedule(league, teams);
    window.location.href = `season.html?id=${season.id}`;
  });

  document.getElementById("settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    save(KEYS.leagues, {
      ...league,
      settings: {
        meetingsPerSeason: Number(data.get("meetingsPerSeason")),
        continuousSeasons: data.get("continuousSeasons") === "true"
      }
    });
    render();
  });
}

render();
