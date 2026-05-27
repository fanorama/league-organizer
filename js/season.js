import {
  advancePlayoffRound,
  createSeasonWithSchedule,
  replaceSeasonSchedule,
  resolveMultiLegWinnerPublic,
  startPlayoff
} from "./schedule.js";
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
  const leagueMatches = matches.filter((match) => (match.matchType || "league") === "league");
  const allFinished = leagueMatches.length > 0 && leagueMatches.every((match) => match.status === "finished");

  if (season.status === "active" && allFinished) {
    finishSeason();
    return;
  }

  const showPlayoffTab = ["playoff_setup", "playoff_active"].includes(season.status) || (season.status === "finished" && !!season.bracket);
  if (!showPlayoffTab && activeTab === "playoff") activeTab = "schedule";

  app.innerHTML = `
    <section class="card" style="margin-bottom:18px">
      <div class="row" style="justify-content:space-between">
        <div>
          <h2>Season ${season.number}</h2>
          <div class="muted">${matches.length} matches · ${matches.filter((match) => match.status === "finished").length} finished</div>
        </div>
        <div class="actions">
          ${seasonBadge(season.status)}
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
      ${showPlayoffTab ? `<button class="tab ${activeTab === "playoff" ? "active" : ""}" data-tab="playoff" type="button">Playoff</button>` : ""}
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

  if (activeTab === "playoff") renderPlayoff();
  else if (activeTab === "standings") renderStandings();
  else renderSchedule();
}

function seasonBadge(status) {
  const labels = {
    playoff_setup: "Playoff Setup",
    playoff_active: "Playoff"
  };
  if (!labels[status]) return badge(status);
  return `<span class="badge warning">${labels[status]}</span>`;
}

function renderSchedule() {
  const teams = teamMap();
  const matches = getAll(KEYS.matches).filter((match) => match.seasonId === season.id && (match.matchType || "league") === "league")
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

function renderPlayoff() {
  const content = document.getElementById("tabContent");

  if (season.status === "playoff_setup") {
    renderPlayoffSetup(content);
  } else if (season.status === "playoff_active" || season.status === "finished") {
    renderPlayoffBracket(content);
  } else {
    content.innerHTML = `<div class="empty">Playoff selesai.</div>`;
  }
}

function renderPlayoffSetup(content) {
  const playoffConfig = league.settings.playoff;
  const standings = calculateStandings(season.id);
  const seeds = standings.slice(0, playoffConfig.teamsCount);
  const teams = teamMap();

  content.innerHTML = `
    <section class="card">
      <h2>Playoff Setup</h2>
      <p class="muted">Liga reguler selesai. Top ${playoffConfig.teamsCount} tim siap masuk bracket Double Elimination.</p>
      <ol class="seed-list">
        ${seeds.map((row, index) => `
          <li class="seed-row">
            <span class="seed-num">${index + 1}.</span>
            <div class="team-line">${teamBadge(teams[row.team.id])}<span class="team-name">${escapeHtml(row.team.name)}</span></div>
            <span class="muted">${row.pts} pts</span>
          </li>
        `).join("")}
      </ol>
      <div class="actions" style="margin-top:16px">
        <button id="startPlayoffBtn" class="btn primary" type="button">Start Playoff</button>
      </div>
    </section>
  `;

  document.getElementById("startPlayoffBtn").addEventListener("click", () => {
    if (confirm(`Mulai playoff dengan Top ${playoffConfig.teamsCount} tim? Seeding tidak bisa diubah.`)) {
      startPlayoff(season, league);
      render();
    }
  });
}

function renderPlayoffBracket(content) {
  const bracket = season.bracket;
  const teams = teamMap();
  const allMatches = Object.fromEntries(
    getAll(KEYS.matches)
      .filter((match) => match.seasonId === season.id && match.matchType === "playoff")
      .map((match) => [match.id, match])
  );

  const renderSlot = (slot, isGrandFinal = false, isReset = false) => {
    if (!slot) return "";
    const label = isReset ? "Grand Final Reset" : isGrandFinal ? "Grand Final" : "";
    const team1 = teams[slot.team1];
    const team2 = teams[slot.team2];
    const tbd1 = !slot.team1;
    const tbd2 = !slot.team2;

    if (slot.bye) {
      return `
        <div class="bracket-slot bye">
          <div class="bsr">
            <div class="bsr-side">${teamBadge(team1)}</div>
            <span class="bsr-sep">BYE</span>
            <div class="bsr-side bsr-right"></div>
          </div>
        </div>`;
    }

    const slotMatches = slot.matchIds.map((id) => allMatches[id]).filter(Boolean);
    const canEdit = season.status === "playoff_active";
    const allSlotFinished = slotMatches.length > 0 && slotMatches.every((m) => m.status === "finished");
    const winner = allSlotFinished ? resolveMultiLegWinnerPublic(slot, slotMatches) : null;
    const tied = allSlotFinished && !winner;
    const isMultiLeg = slotMatches.length > 1;

    const finishedMatches = slotMatches.filter((m) => m.status === "finished");
    const hasScores = finishedMatches.length > 0;
    const team1Goals = finishedMatches.reduce((sum, m) =>
      sum + (m.homeTeamId === slot.team1 ? (m.homeScore ?? 0) : (m.awayScore ?? 0)), 0);
    const team2Goals = finishedMatches.reduce((sum, m) =>
      sum + (m.homeTeamId === slot.team2 ? (m.homeScore ?? 0) : (m.awayScore ?? 0)), 0);

    const finishedLegRows = isMultiLeg ? finishedMatches.map((match) => {
      const home = teams[match.homeTeamId];
      const away = teams[match.awayTeamId];
      const legIndex = slotMatches.indexOf(match);
      return `
        <div class="playoff-leg">
          <span class="leg-label">Leg ${legIndex + 1}</span>
          <div class="leg-history-row">
            ${teamBadge(home)}
            <span class="leg-score">${match.homeScore ?? 0} - ${match.awayScore ?? 0}</span>
            ${teamBadge(away)}
          </div>
        </div>`;
    }).join("") : "";

    const editableLegs = slotMatches.map((match, legIndex) => {
      if (!canEdit || match.status === "finished") return "";
      const home = teams[match.homeTeamId];
      const away = teams[match.awayTeamId];
      return `
        <div class="playoff-leg" data-match-id="${match.id}">
          ${isMultiLeg ? `<span class="leg-label">Leg ${legIndex + 1}</span>` : ""}
          <div class="leg-input-row">
            ${teamBadge(home)}
            <input class="score-input" name="homeScore" type="number" min="0" value="${match.homeScore ?? ""}">
            <span class="leg-sep">-</span>
            <input class="score-input" name="awayScore" type="number" min="0" value="${match.awayScore ?? ""}">
            ${teamBadge(away)}
            <button class="btn primary btn-xs" data-save-playoff="${match.id}" type="button">Save</button>
          </div>
        </div>`;
    }).filter(Boolean).join("");

    const team1Win = winner === slot.team1;
    const team2Win = winner === slot.team2;
    const slotClass = `bracket-slot${allSlotFinished ? " finished" : ""}${(tbd1 || tbd2) ? " tbd" : ""}${isGrandFinal ? " grand-final" : ""}`;

    return `
      <div class="${slotClass}">
        ${label ? `<div class="slot-label">${label}</div>` : ""}
        <div class="bsr">
          <div class="bsr-side">
            ${teamBadge(tbd1 ? null : team1)}
            <span class="bsr-owner${team1Win ? " bsr-win" : ""}">${escapeHtml(tbd1 ? "TBD" : (team1?.owner || "?"))}</span>
          </div>
          <span class="bsr-sep">
            ${hasScores
              ? `<span class="bsr-score${team1Win ? " bsr-win" : ""}">${team1Goals}</span><span class="bsr-agg">agg</span><span class="bsr-score${team2Win ? " bsr-win" : ""}">${team2Goals}</span>`
              : "vs"}
          </span>
          <div class="bsr-side bsr-right">
            <span class="bsr-owner${team2Win ? " bsr-win" : ""}">${escapeHtml(tbd2 ? "TBD" : (team2?.owner || "?"))}</span>
            ${teamBadge(tbd2 ? null : team2)}
          </div>
        </div>
        ${(finishedLegRows || editableLegs) ? `<div class="bmt-legs">${finishedLegRows}${editableLegs}</div>` : ""}
        ${tied ? `<div class="bmt-note muted">Tied. Edit score to break tie.</div>` : ""}
      </div>`;
  };

  const renderBracketSection = (label, rounds, keyPrefix) => `
    <div class="bracket-section">
      <div class="bracket-section-header">${label}</div>
      <div class="bracket-rounds-row">
        ${rounds.map((round, i) => `
          <div class="bracket-round-col">
            <div class="round-col-header">${keyPrefix} R${i + 1}</div>
            <div class="round-col-slots">
              ${round.map((slot) => renderSlot(slot)).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </div>`;

  const grandFinalHtml = bracket.grandFinal.match
    ? `<div class="bracket-section">
        <div class="bracket-section-header">Grand Final</div>
        <div class="bracket-rounds-row">
          <div class="bracket-round-col">
            <div class="round-col-slots">
              ${renderSlot(bracket.grandFinal.match, true)}
              ${bracket.grandFinal.reset ? renderSlot(bracket.grandFinal.reset, false, true) : ""}
            </div>
          </div>
        </div>
      </div>`
    : "";

  content.innerHTML = `
    <div class="bracket-layout">
      ${renderBracketSection("Upper Bracket", bracket.upper.rounds, "UB")}
      ${renderBracketSection("Lower Bracket", bracket.lower.rounds, "LB")}
      ${grandFinalHtml}
    </div>
  `;

  content.querySelectorAll("[data-save-playoff]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest(".playoff-leg");
      const match = getById(KEYS.matches, button.dataset.savePlayoff);
      save(KEYS.matches, {
        ...match,
        homeScore: Number(row.querySelector("[name=homeScore]").value),
        awayScore: Number(row.querySelector("[name=awayScore]").value),
        status: "finished"
      });
      advancePlayoffRound(season.id);
      render();
    });
  });
}

function finishSeason() {
  const standings = calculateStandings(season.id);
  const playoffEnabled = league.settings.playoff?.enabled;

  if (playoffEnabled) {
    save(KEYS.seasons, { ...season, status: "playoff_setup" });
    activeTab = "playoff";
    render();
    return;
  }

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
