import { COMPETITIONS, fetchClubs } from "./api.js";
import { KEYS, getAll, getById, save } from "./storage.js";
import { badge, escapeHtml, qs, renderShell, requireEntity, teamBadge } from "./ui.js";
import { openWheelModal } from "./wheel.js";

const leagueId = qs("league");
const league = getById(KEYS.leagues, leagueId);
renderShell("leagues", league ? `Teams - ${league.name}` : "Teams", league ? `<a class="btn" href="league.html?id=${league.id}">Back</a>` : "");

const app = document.getElementById("app");

function render() {
  if (!requireEntity(league, "League not found.")) return;
  const teams = getAll(KEYS.teams).filter((team) => team.leagueId === league.id);
  const activeTeams = teams.filter((team) => team.status === "active");
  const poolTeams = teams.filter((team) => (team.status || "pool") === "pool");

  app.innerHTML = `
    <div class="two-col">
      <section class="panel">
        <div class="panel-head">
          <h2>Teams</h2>
          <div class="actions">
            <button id="wheelButton" class="btn" type="button" ${poolTeams.length ? "" : "disabled"}>Spin wheel</button>
            <button id="importButton" class="btn" type="button">Import clubs</button>
          </div>
        </div>
        <div class="panel-body list">
          <section>
            <h3>Peserta Liga</h3>
            ${activeTeams.length ? `<div class="list">${activeTeams.map((team) => `
              <div class="list-row">
                <div class="team-line">
                  ${teamBadge(team)}
                  <div>
                    <div class="team-name">${escapeHtml(team.name)}</div>
                    <div class="muted">${escapeHtml(team.shortName)} · owner: ${escapeHtml(team.owner || "unassigned")}</div>
                  </div>
                </div>
                ${badge("active")}
              </div>
            `).join("")}</div>` : `<div class="empty">No active teams yet. Spin the wheel to add participants.</div>`}
          </section>
          <section>
            <h3>Pool Referensi</h3>
            ${poolTeams.length ? `<div class="list">${poolTeams.map((team) => `
              <div class="list-row">
                <div class="team-line">
                  ${teamBadge(team)}
                  <div>
                    <div class="team-name">${escapeHtml(team.name)}</div>
                    <div class="muted">${escapeHtml(team.shortName)} · owner: ${escapeHtml(team.owner || "unassigned")}</div>
                  </div>
                </div>
                ${badge("pool")}
              </div>
            `).join("")}</div>` : `<div class="empty">No pool teams. Add teams manually or import clubs.</div>`}
          </section>
        </div>
      </section>
      <section class="card">
        <h2>Add team</h2>
        <form id="teamForm" class="list">
          <div class="field">
            <label>Name</label>
            <input name="name" required placeholder="Arsenal">
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Badge</label>
              <input name="badge" placeholder="ARS">
            </div>
            <div class="field">
              <label>Short name</label>
              <input name="shortName" maxlength="3" placeholder="ARS">
            </div>
          </div>
          <button class="btn primary" type="submit">Add team</button>
        </form>
      </section>
    </div>
    <div id="importModal" class="modal"></div>
  `;

  document.getElementById("teamForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = data.get("name").trim();
    save(KEYS.teams, {
      leagueId: league.id,
      name,
      shortName: (data.get("shortName").trim() || name.slice(0, 3)).toUpperCase(),
      badge: data.get("badge").trim() || (data.get("shortName").trim() || name.slice(0, 3)).toUpperCase(),
      owner: null,
      status: "pool",
      externalId: null
    });
    render();
  });

  document.getElementById("wheelButton").addEventListener("click", () => {
    openWheelModal(teams, render);
  });
  document.getElementById("importButton").addEventListener("click", openImportModal);
}

function openImportModal() {
  const modal = document.getElementById("importModal");
  modal.className = "modal open";
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-head">
        <h2>Import clubs</h2>
        <button class="btn" data-close type="button">Close</button>
      </div>
      <div class="modal-body list">
        <div class="form-grid">
          <div class="field">
            <label>Competition</label>
            <select id="competition">${COMPETITIONS.map((item) => `<option value="${item.id}">${item.name} - ${item.country}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label>Search</label>
            <input id="clubSearch" placeholder="Club name">
          </div>
        </div>
        <button id="loadClubs" class="btn primary" type="button">Load clubs</button>
        <div id="clubList" class="list"></div>
      </div>
    </div>
  `;
  modal.querySelector("[data-close]").addEventListener("click", () => modal.className = "modal");
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.className = "modal";
  });
  modal.querySelector("#loadClubs").addEventListener("click", async () => {
    const list = modal.querySelector("#clubList");
    list.innerHTML = `<div class="empty">Loading clubs...</div>`;
    try {
      const clubs = await fetchClubs(modal.querySelector("#competition").value);
      const renderClubs = () => {
        const term = modal.querySelector("#clubSearch").value.toLowerCase();
        const filtered = clubs.filter((club) => club.name.toLowerCase().includes(term));
        list.innerHTML = `
          <form id="clubForm" class="list">
            ${filtered.map((club) => `
              <label class="list-row">
                <span class="team-line">
                  ${club.logo ? `<span class="team-badge"><img src="${escapeHtml(club.logo)}" alt=""></span>` : `<span class="team-badge">${escapeHtml(club.shortName)}</span>`}
                  <span>${escapeHtml(club.name)}</span>
                </span>
                <input style="width:auto" type="checkbox" name="club" value="${escapeHtml(club.id)}">
              </label>
            `).join("")}
            <button class="btn primary" type="submit">Add selected</button>
          </form>
        `;
        list.querySelector("#clubForm").addEventListener("submit", (event) => {
          event.preventDefault();
          new FormData(event.currentTarget).getAll("club").forEach((id) => {
            const club = clubs.find((candidate) => candidate.id === id);
            save(KEYS.teams, {
              leagueId: league.id,
              name: club.name,
              shortName: club.shortName,
              badge: club.logo || club.shortName,
              owner: null,
              status: "pool",
              externalId: club.id
            });
          });
          modal.className = "modal";
          render();
        });
      };
      modal.querySelector("#clubSearch").addEventListener("input", renderClubs);
      renderClubs();
    } catch (error) {
      list.innerHTML = `<div class="empty">Import failed: ${escapeHtml(error.message)}</div>`;
    }
  });
}

render();
