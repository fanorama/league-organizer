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
  let currentClubs = [];
  const selectedIds = new Set();
  let searchTimeout;
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
        <div id="clubActions"></div>
        <div id="clubList" class="list"></div>
        <div id="importFooter" class="import-footer" style="display:none;position:sticky;bottom:0;background:var(--panel);padding-top:12px">
          <button id="addSelected" class="btn primary" type="button">Add 0 selected</button>
        </div>
      </div>
    </div>
  `;
  modal.querySelector("[data-close]").addEventListener("click", () => modal.className = "modal");
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.className = "modal";
  });

  function getPoolIds() {
    return new Set(
      getAll(KEYS.teams)
        .filter((team) => team.leagueId === league.id && team.externalId)
        .map((team) => team.externalId)
    );
  }

  function updateFooter() {
    const list = modal.querySelector("#clubList");
    const footer = modal.querySelector("#importFooter");
    const btn = modal.querySelector("#addSelected");
    const count = selectedIds.size;
    footer.style.display = count > 0 ? "block" : "none";
    btn.textContent = `Add ${count} selected`;
    list.style.paddingBottom = count > 0 ? "56px" : "";
  }

  function renderClubs() {
    const list = modal.querySelector("#clubList");
    const actions = modal.querySelector("#clubActions");
    const poolIds = getPoolIds();
    const term = modal.querySelector("#clubSearch").value.toLowerCase();
    const filtered = currentClubs.filter((club) => club.name.toLowerCase().includes(term));
    const importable = filtered.filter((club) => !poolIds.has(club.id));

    actions.innerHTML = importable.length
      ? `<button id="selectAll" class="btn" type="button" style="margin-bottom:8px">Select all visible</button>`
      : "";

    if (!filtered.length) {
      list.innerHTML = `<div class="empty">No clubs match your search.</div>`;
      updateFooter();
      return;
    }

    if (!importable.length) {
      list.innerHTML = `<div class="empty">All clubs already in your pool.</div>`;
      updateFooter();
      return;
    }

    list.innerHTML = filtered.map((club) => {
      const inPool = poolIds.has(club.id);
      const checked = selectedIds.has(club.id);
      return `
        <label class="list-row${inPool ? " muted" : ""}" style="${inPool ? "opacity:.45;pointer-events:none" : ""}">
          <input style="width:auto" type="checkbox" name="club" value="${escapeHtml(club.id)}" ${checked ? "checked" : ""} ${inPool ? "disabled" : ""}>
          <span class="team-line">
            ${club.logo ? `<span class="team-badge"><img src="${escapeHtml(club.logo)}" alt=""></span>` : `<span class="team-badge">${escapeHtml(club.shortName)}</span>`}
            <span>${escapeHtml(club.name)}</span>
          </span>
          ${inPool ? `<span class="badge badge-pool">In pool</span>` : ""}
        </label>
      `;
    }).join("");

    actions.querySelector("#selectAll")?.addEventListener("click", () => {
      importable.forEach((club) => selectedIds.add(club.id));
      renderClubs();
    });
    list.querySelectorAll("input[type=checkbox]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedIds.add(checkbox.value);
        else selectedIds.delete(checkbox.value);
        updateFooter();
      });
    });
    updateFooter();
  }

  async function loadCompetition(competitionId) {
    const list = modal.querySelector("#clubList");
    modal.querySelector("#clubActions").innerHTML = "";
    list.innerHTML = `<div class="empty">Loading clubs...</div>`;
    try {
      currentClubs = await fetchClubs(competitionId);
      selectedIds.clear();
      updateFooter();
      renderClubs();
    } catch (error) {
      list.innerHTML = `
        <div class="empty">
          Failed to load: ${escapeHtml(error.message)}
          <button id="retryLoad" class="btn" type="button">Retry</button>
        </div>
      `;
      list.querySelector("#retryLoad")?.addEventListener("click", () => loadCompetition(competitionId));
    }
  }

  modal.querySelector("#competition").addEventListener("change", (event) => {
    loadCompetition(event.target.value);
  });
  modal.querySelector("#clubSearch").addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(renderClubs, 150);
  });
  modal.querySelector("#addSelected").addEventListener("click", () => {
    selectedIds.forEach((id) => {
      const club = currentClubs.find((candidate) => candidate.id === id);
      if (!club) return;
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

  loadCompetition(modal.querySelector("#competition").value);
}

render();
