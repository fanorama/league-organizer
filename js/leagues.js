import { KEYS, byCreatedAtDesc, cascadeDeleteLeague, getAll, save } from "./storage.js";
import { badge, escapeHtml, renderShell } from "./ui.js";

renderShell("leagues", "Leagues");

const app = document.getElementById("app");

function render() {
  const leagues = getAll(KEYS.leagues).sort(byCreatedAtDesc);
  const teams = getAll(KEYS.teams);
  const seasons = getAll(KEYS.seasons);

  app.innerHTML = `
    <section class="card">
      <h2>Create league</h2>
      <form id="createLeague" class="form-grid">
        <div class="field">
          <label>Name</label>
          <input name="name" required placeholder="Weekend League">
        </div>
        <div class="field">
          <label>Meetings</label>
          <select name="meetingsPerSeason">
            <option value="1">Single round</option>
            <option value="2" selected>Home and away</option>
          </select>
        </div>
        <div class="field">
          <label>Continuous seasons</label>
          <select name="continuousSeasons">
            <option value="false" selected>Off</option>
            <option value="true">On</option>
          </select>
        </div>
        <div class="field">
          <label>Description</label>
          <input name="description" placeholder="Optional">
        </div>
        <div class="field">
          <label>&nbsp;</label>
          <button class="btn primary" type="submit">Create</button>
        </div>
      </form>
    </section>

    <section style="margin-top:18px">
      ${leagues.length ? `<div class="grid">${leagues.map((league) => {
        const leagueTeams = teams.filter((team) => team.leagueId === league.id);
        const activeSeason = seasons.find((season) => season.leagueId === league.id && season.status === "active");
        const latestSeason = seasons.filter((season) => season.leagueId === league.id).sort((a, b) => b.number - a.number)[0];
        return `
          <article class="card">
            <div class="row" style="justify-content:space-between">
              <h2>${escapeHtml(league.name)}</h2>
              ${activeSeason ? badge("active") : latestSeason ? badge(latestSeason.status) : badge("no season")}
            </div>
            <p class="muted">${escapeHtml(league.description || "No description")}</p>
            <div class="row">
              <span class="badge">${leagueTeams.length} teams</span>
              <span class="badge">${league.settings.meetingsPerSeason} meeting${league.settings.meetingsPerSeason === 1 ? "" : "s"}</span>
              ${league.settings.continuousSeasons ? `<span class="badge success">continuous</span>` : ""}
            </div>
            <div class="actions">
              <a class="btn primary" href="league.html?id=${league.id}">Open</a>
              <button class="btn danger" data-delete="${league.id}">Delete</button>
            </div>
          </article>
        `;
      }).join("")}</div>` : `<div class="empty">No leagues yet. Create one to begin.</div>`}
    </section>
  `;

  document.getElementById("createLeague").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const league = save(KEYS.leagues, {
      name: data.get("name").trim(),
      description: data.get("description").trim(),
      createdAt: new Date().toISOString(),
      settings: {
        meetingsPerSeason: Number(data.get("meetingsPerSeason")),
        continuousSeasons: data.get("continuousSeasons") === "true"
      }
    });
    window.location.href = `league.html?id=${league.id}`;
  });

  app.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      if (confirm("Delete this league and all related teams, seasons, and matches?")) {
        cascadeDeleteLeague(button.dataset.delete);
        render();
      }
    });
  });
}

render();
