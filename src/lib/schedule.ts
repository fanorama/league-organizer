// @ts-nocheck
import { calculateStandings } from './standings';
import { KEYS, createId, getAll, getById, save, setAll } from './storage';
import type { League, Match, PlayoffSlot, Season, Team } from './types';

const ROUTING_4 = [
  { from: { b: "upper", r: 0, s: 0 }, winnerTo: { b: "upper", r: 1, s: 0, t: "team1" }, loserTo: { b: "lower", r: 0, s: 0, t: "team1" } },
  { from: { b: "upper", r: 0, s: 1 }, winnerTo: { b: "upper", r: 1, s: 0, t: "team2" }, loserTo: { b: "lower", r: 0, s: 0, t: "team2" } },
  { from: { b: "upper", r: 1, s: 0 }, winnerTo: { b: "grand_final", r: 0, s: 0, t: "team1" }, loserTo: { b: "lower", r: 1, s: 0, t: "team2" } },
  { from: { b: "lower", r: 0, s: 0 }, winnerTo: { b: "lower", r: 1, s: 0, t: "team1" }, loserTo: "eliminated" },
  { from: { b: "lower", r: 1, s: 0 }, winnerTo: { b: "grand_final", r: 0, s: 0, t: "team2" }, loserTo: "eliminated" }
];

const ROUTING_6 = [
  { from: { b: "upper", r: 0, s: 0 }, winnerTo: { b: "upper", r: 1, s: 0, t: "team2" }, loserTo: { b: "lower", r: 0, s: 0, t: "team1" } },
  { from: { b: "upper", r: 0, s: 1 }, winnerTo: { b: "upper", r: 1, s: 1, t: "team2" }, loserTo: { b: "lower", r: 0, s: 1, t: "team1" } },
  { from: { b: "upper", r: 1, s: 0 }, winnerTo: { b: "upper", r: 2, s: 0, t: "team1" }, loserTo: { b: "lower", r: 1, s: 0, t: "team2" } },
  { from: { b: "upper", r: 1, s: 1 }, winnerTo: { b: "upper", r: 2, s: 0, t: "team2" }, loserTo: { b: "lower", r: 1, s: 1, t: "team2" } },
  { from: { b: "upper", r: 2, s: 0 }, winnerTo: { b: "grand_final", r: 0, s: 0, t: "team1" }, loserTo: { b: "lower", r: 3, s: 0, t: "team2" } },
  { from: { b: "lower", r: 1, s: 0 }, winnerTo: { b: "lower", r: 2, s: 0, t: "team1" }, loserTo: "eliminated" },
  { from: { b: "lower", r: 1, s: 1 }, winnerTo: { b: "lower", r: 2, s: 0, t: "team2" }, loserTo: "eliminated" },
  { from: { b: "lower", r: 2, s: 0 }, winnerTo: { b: "lower", r: 3, s: 0, t: "team1" }, loserTo: "eliminated" },
  { from: { b: "lower", r: 3, s: 0 }, winnerTo: { b: "grand_final", r: 0, s: 0, t: "team2" }, loserTo: "eliminated" }
];

const ROUTING_8 = [
  { from: { b: "upper", r: 0, s: 0 }, winnerTo: { b: "upper", r: 1, s: 0, t: "team1" }, loserTo: { b: "lower", r: 0, s: 1, t: "team2" } },
  { from: { b: "upper", r: 0, s: 1 }, winnerTo: { b: "upper", r: 1, s: 0, t: "team2" }, loserTo: { b: "lower", r: 0, s: 1, t: "team1" } },
  { from: { b: "upper", r: 0, s: 2 }, winnerTo: { b: "upper", r: 1, s: 1, t: "team1" }, loserTo: { b: "lower", r: 0, s: 0, t: "team2" } },
  { from: { b: "upper", r: 0, s: 3 }, winnerTo: { b: "upper", r: 1, s: 1, t: "team2" }, loserTo: { b: "lower", r: 0, s: 0, t: "team1" } },
  { from: { b: "upper", r: 1, s: 0 }, winnerTo: { b: "upper", r: 2, s: 0, t: "team1" }, loserTo: { b: "lower", r: 1, s: 0, t: "team2" } },
  { from: { b: "upper", r: 1, s: 1 }, winnerTo: { b: "upper", r: 2, s: 0, t: "team2" }, loserTo: { b: "lower", r: 1, s: 1, t: "team2" } },
  { from: { b: "upper", r: 2, s: 0 }, winnerTo: { b: "grand_final", r: 0, s: 0, t: "team1" }, loserTo: { b: "lower", r: 3, s: 0, t: "team2" } },
  { from: { b: "lower", r: 0, s: 0 }, winnerTo: { b: "lower", r: 1, s: 0, t: "team1" }, loserTo: "eliminated" },
  { from: { b: "lower", r: 0, s: 1 }, winnerTo: { b: "lower", r: 1, s: 1, t: "team1" }, loserTo: "eliminated" },
  { from: { b: "lower", r: 1, s: 0 }, winnerTo: { b: "lower", r: 2, s: 0, t: "team1" }, loserTo: "eliminated" },
  { from: { b: "lower", r: 1, s: 1 }, winnerTo: { b: "lower", r: 2, s: 0, t: "team2" }, loserTo: "eliminated" },
  { from: { b: "lower", r: 2, s: 0 }, winnerTo: { b: "lower", r: 3, s: 0, t: "team1" }, loserTo: "eliminated" },
  { from: { b: "lower", r: 3, s: 0 }, winnerTo: { b: "grand_final", r: 0, s: 0, t: "team2" }, loserTo: "eliminated" }
];

function getRoutingTable(teamsCount) {
  if (teamsCount === 8) return ROUTING_8;
  if (teamsCount === 6) return ROUTING_6;
  return ROUTING_4;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateRoundRobin(teamIds: string[], meetingsPerSeason = 1): Array<Array<{ homeTeamId: string; awayTeamId: string }>> {
  if (teamIds.length < 2) return [];
  const hasBye = teamIds.length % 2 === 1;
  let rotation = hasBye ? [...teamIds, "BYE"] : [...teamIds];
  const rounds = [];
  const roundsCount = rotation.length - 1;

  for (let round = 0; round < roundsCount; round += 1) {
    const matches = [];
    for (let i = 0; i < rotation.length / 2; i += 1) {
      const a = rotation[i];
      const b = rotation[rotation.length - 1 - i];
      if (a !== "BYE" && b !== "BYE") {
        const flip = Math.random() > 0.5;
        matches.push({ homeTeamId: flip ? b : a, awayTeamId: flip ? a : b });
      }
    }
    rounds.push(matches);
    rotation = [rotation[0], rotation[rotation.length - 1], ...rotation.slice(1, -1)];
  }

  const randomizedRounds = shuffle(rounds);
  if (Number(meetingsPerSeason) === 1) return randomizedRounds;
  return [
    ...randomizedRounds,
    ...randomizedRounds.map((round) => round.map((match) => ({
      homeTeamId: match.awayTeamId,
      awayTeamId: match.homeTeamId
    })))
  ];
}

export function replaceSeasonSchedule(season: Season, teamIds: string[], meetingsPerSeason: number): Match[] {
  const existing = getAll(KEYS.matches).filter((match) => match.seasonId !== season.id);
  const generated = generateRoundRobin(teamIds, meetingsPerSeason).flatMap((round, index) => (
    round.map((match) => ({
      id: createId(),
      seasonId: season.id,
      matchday: index + 1,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      originalMatchday: null,
      scheduledDate: null
    }))
  ));
  setAll(KEYS.matches, [...existing, ...generated]);
  return generated;
}

export function createSeasonWithSchedule(league: League, teams: Team[]): Season {
  const seasons = getAll(KEYS.seasons).filter((season) => season.leagueId === league.id);
  const players = getAll(KEYS.players);
  const playersById = Object.fromEntries(players.map((player) => [player.id, player]));
  const season = save(KEYS.seasons, {
    leagueId: league.id,
    number: seasons.length + 1,
    status: "setup",
    teamIds: teams.map((team) => team.id),
    ownerSnapshots: Object.fromEntries(teams.map((team) => {
      const player = team.ownerId ? playersById[team.ownerId] : null;
      return [team.id, { playerId: team.ownerId || null, playerName: player?.name || team.owner || null }];
    })),
    champion: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null
  });
  replaceSeasonSchedule(season, teams.map((team) => team.id), league.settings.meetingsPerSeason);
  return season;
}

function getLegCount(format, bracketName, roundIndex, teamsCount) {
  if (bracketName === "grand_final" || bracketName === "grand_final_reset") return format.grandFinal;
  const isUpperFinal = bracketName === "upper" && roundIndex === (teamsCount === 4 ? 1 : 2);
  const isLowerFinal = bracketName === "lower" && roundIndex === (teamsCount === 4 ? 1 : 3);
  if (bracketName === "upper") return isUpperFinal ? format.upperFinal : format.upperEarly;
  if (bracketName === "lower") return isLowerFinal ? format.lowerFinal : format.lowerEarly;
  return 1;
}

export function resolveMultiLegWinnerPublic(slot: PlayoffSlot, matchRecords: Match[]): string | null | undefined {
  if (!matchRecords.length) return slot.matchIds.length ? null : slot.team1;
  const finished = matchRecords.filter((match) => match.status === "finished");
  if (finished.length < matchRecords.length) return null;

  const lastFinished = finished[finished.length - 1];
  if (lastFinished.bracketSlot?.isExtraLeg) {
    const team1IsHome = lastFinished.homeTeamId === slot.team1;
    const g1 = team1IsHome ? lastFinished.homeScore : lastFinished.awayScore;
    const g2 = team1IsHome ? lastFinished.awayScore : lastFinished.homeScore;
    if (g1 > g2) return slot.team1;
    if (g2 > g1) return slot.team2;
    return null;
  }

  let goals1 = 0;
  let goals2 = 0;

  finished.forEach((match) => {
    const team1IsHome = match.homeTeamId === slot.team1;
    if (team1IsHome) {
      goals1 += match.homeScore;
      goals2 += match.awayScore;
    } else {
      goals1 += match.awayScore;
      goals2 += match.homeScore;
    }
  });

  if (goals1 > goals2) return slot.team1;
  if (goals2 > goals1) return slot.team2;
  return null;
}

function addExtraLeg(season, slot, bracketName, roundIndex, slotIndex) {
  const leg = slot.matchIds.length + 1;
  const match = save(KEYS.matches, {
    seasonId: season.id,
    matchday: 99,
    homeTeamId: slot.team1,
    awayTeamId: slot.team2,
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    originalMatchday: null,
    scheduledDate: null,
    matchType: "playoff",
    bracketSlot: { bracket: bracketName, round: roundIndex, slot: slotIndex, leg, isExtraLeg: true }
  });
  slot.matchIds.push(match.id);
}

function generatePlayoffMatchIds(season, slot, legCount, bracketName, roundIndex, slotIndex) {
  const ids = [];
  for (let leg = 1; leg <= legCount; leg += 1) {
    const homeTeamId = leg % 2 === 1 ? slot.team1 : slot.team2;
    const awayTeamId = leg % 2 === 1 ? slot.team2 : slot.team1;
    const match = save(KEYS.matches, {
      seasonId: season.id,
      matchday: 99,
      homeTeamId,
      awayTeamId,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      originalMatchday: null,
      scheduledDate: null,
      matchType: "playoff",
      bracketSlot: { bracket: bracketName, round: roundIndex, slot: slotIndex, leg }
    });
    ids.push(match.id);
  }
  return ids;
}

function getDestinationSlot(bracket, dest) {
  if (dest.b === "grand_final") {
    if (!bracket.grandFinal.match) {
      bracket.grandFinal.match = { matchIds: [], team1: null, team2: null };
    }
    return bracket.grandFinal.match;
  }
  const rounds = dest.b === "upper" ? bracket.upper.rounds : bracket.lower.rounds;
  return rounds[dest.r]?.[dest.s];
}

function fillDestination(season, bracket, dest, teamId) {
  const destSlot = getDestinationSlot(bracket, dest);
  if (!destSlot || destSlot[dest.t] === teamId) return false;
  destSlot[dest.t] = teamId;

  if (destSlot.team1 && destSlot.team2 && destSlot.matchIds.length === 0 && !destSlot.bye) {
    const legCount = getLegCount(bracket.config.format, dest.b, dest.r, bracket.config.teamsCount);
    destSlot.matchIds = generatePlayoffMatchIds(
      season,
      destSlot,
      legCount,
      dest.b,
      dest.r,
      dest.b === "grand_final" ? 0 : dest.s
    );
  }
  return true;
}

function advanceByes(season, bracket) {
  let updated = false;
  if (bracket.config.teamsCount !== 6) return updated;

  bracket.lower.rounds[0].forEach((slot, slotIndex) => {
    if (!slot.bye || !slot.team1 || slot.forwarded) return;
    const dest = { b: "lower", r: 1, s: slotIndex, t: "team1" };
    if (fillDestination(season, bracket, dest, slot.team1)) updated = true;
    slot.forwarded = true;
    updated = true;
  });
  return updated;
}

export function startPlayoff(season: Season, league: League): void {
  const playoffConfig = league.settings.playoff;
  const { teamsCount, formatPerRound } = playoffConfig;
  const standings = calculateStandings(season.id);
  const seeds = standings.slice(0, teamsCount).map((row) => row.team.id);
  const bracket = {
    seeds,
    config: { teamsCount, format: formatPerRound },
    upper: { rounds: [] },
    lower: { rounds: [] },
    grandFinal: { match: null, reset: null }
  };

  if (teamsCount === 4) {
    bracket.upper.rounds = [
      [
        { matchIds: [], team1: seeds[0], team2: seeds[3] },
        { matchIds: [], team1: seeds[1], team2: seeds[2] }
      ],
      [{ matchIds: [], team1: null, team2: null }]
    ];
    bracket.lower.rounds = [
      [{ matchIds: [], team1: null, team2: null }],
      [{ matchIds: [], team1: null, team2: null }]
    ];
  } else if (teamsCount === 6) {
    bracket.upper.rounds = [
      [
        { matchIds: [], team1: seeds[2], team2: seeds[5] },
        { matchIds: [], team1: seeds[3], team2: seeds[4] }
      ],
      [
        { matchIds: [], team1: seeds[0], team2: null },
        { matchIds: [], team1: seeds[1], team2: null }
      ],
      [{ matchIds: [], team1: null, team2: null }]
    ];
    bracket.lower.rounds = [
      [
        { matchIds: [], team1: null, team2: null, bye: true },
        { matchIds: [], team1: null, team2: null, bye: true }
      ],
      [
        { matchIds: [], team1: null, team2: null },
        { matchIds: [], team1: null, team2: null }
      ],
      [{ matchIds: [], team1: null, team2: null }],
      [{ matchIds: [], team1: null, team2: null }]
    ];
  } else {
    bracket.upper.rounds = [
      [
        { matchIds: [], team1: seeds[0], team2: seeds[7] },
        { matchIds: [], team1: seeds[3], team2: seeds[4] },
        { matchIds: [], team1: seeds[1], team2: seeds[6] },
        { matchIds: [], team1: seeds[2], team2: seeds[5] }
      ],
      [
        { matchIds: [], team1: null, team2: null },
        { matchIds: [], team1: null, team2: null }
      ],
      [{ matchIds: [], team1: null, team2: null }]
    ];
    bracket.lower.rounds = [
      [
        { matchIds: [], team1: null, team2: null },
        { matchIds: [], team1: null, team2: null }
      ],
      [
        { matchIds: [], team1: null, team2: null },
        { matchIds: [], team1: null, team2: null }
      ],
      [{ matchIds: [], team1: null, team2: null }],
      [{ matchIds: [], team1: null, team2: null }]
    ];
  }

  bracket.upper.rounds[0] = bracket.upper.rounds[0].map((slot, slotIndex) => {
    if (slot.bye || !slot.team1 || !slot.team2) return slot;
    const matchIds = generatePlayoffMatchIds(season, slot, formatPerRound.upperEarly, "upper", 0, slotIndex);
    return { ...slot, matchIds };
  });

  save(KEYS.seasons, { ...season, status: "playoff_active", bracket });
}

export function advancePlayoffRound(seasonId: string): void {
  const season = getById(KEYS.seasons, seasonId);
  if (!season?.bracket) return;

  const bracket = season.bracket;
  const allMatches = Object.fromEntries(
    getAll(KEYS.matches)
      .filter((match) => match.seasonId === seasonId && match.matchType === "playoff")
      .map((match) => [match.id, match])
  );
  const routing = getRoutingTable(bracket.config.teamsCount);
  let updated = advanceByes(season, bracket);

  routing.forEach((route) => {
    const rounds = route.from.b === "upper" ? bracket.upper.rounds : bracket.lower.rounds;
    const slot = rounds[route.from.r]?.[route.from.s];
    if (!slot || slot.bye || !slot.team1 || !slot.team2) return;

    const matchRecords = slot.matchIds.map((id) => allMatches[id]).filter(Boolean);
    const allFinished = matchRecords.length > 0 && matchRecords.every((m) => m.status === "finished");
    const winner = resolveMultiLegWinnerPublic(slot, matchRecords);
    if (!winner) {
      if (allFinished) {
        addExtraLeg(season, slot, route.from.b, route.from.r, route.from.s);
        updated = true;
      }
      return;
    }

    const loser = winner === slot.team1 ? slot.team2 : slot.team1;
    if (route.winnerTo !== "eliminated" && fillDestination(season, bracket, route.winnerTo, winner)) updated = true;
    if (route.loserTo !== "eliminated" && fillDestination(season, bracket, route.loserTo, loser)) updated = true;
  });

  const grandFinal = bracket.grandFinal.match;
  if (grandFinal?.team1 && grandFinal?.team2) {
    const matches = grandFinal.matchIds.map((id) => allMatches[id]).filter(Boolean);
    const allFinished = matches.length > 0 && matches.every((m) => m.status === "finished");
    const winner = resolveMultiLegWinnerPublic(grandFinal, matches);
    if (winner) {
      const upperWinner = grandFinal.team1;
      if (winner !== upperWinner) {
        if (!bracket.grandFinal.reset) {
          bracket.grandFinal.reset = { matchIds: [], team1: upperWinner, team2: winner };
          bracket.grandFinal.reset.matchIds = generatePlayoffMatchIds(
            season,
            bracket.grandFinal.reset,
            bracket.config.format.grandFinal,
            "grand_final_reset",
            0,
            0
          );
          updated = true;
        }
      } else if (!bracket.grandFinal.reset) {
        save(KEYS.seasons, { ...season, bracket });
        finishPlayoff(seasonId, winner);
        return;
      }
    } else if (allFinished) {
      addExtraLeg(season, grandFinal, "grand_final", 0, 0);
      updated = true;
    }
  }

  const reset = bracket.grandFinal.reset;
  if (reset?.team1 && reset?.team2) {
    const matches = reset.matchIds.map((id) => allMatches[id]).filter(Boolean);
    const allResetFinished = matches.length > 0 && matches.every((m) => m.status === "finished");
    const winner = resolveMultiLegWinnerPublic(reset, matches);
    if (winner) {
      save(KEYS.seasons, { ...season, bracket });
      finishPlayoff(seasonId, winner);
      return;
    } else if (allResetFinished) {
      addExtraLeg(season, reset, "grand_final_reset", 0, 0);
      updated = true;
    }
  }

  if (updated) {
    save(KEYS.seasons, { ...season, bracket });
  }
}

export function finishPlayoff(seasonId: string, championTeamId: string): void {
  const season = getById(KEYS.seasons, seasonId);
  const league = getById(KEYS.leagues, season.leagueId);
  save(KEYS.seasons, {
    ...season,
    status: "finished",
    champion: championTeamId,
    finishedAt: new Date().toISOString()
  });

  if (league.settings.continuousSeasons) {
    const teams = getAll(KEYS.teams).filter((team) => team.leagueId === league.id && team.status === "active" && team.ownerId);
    createSeasonWithSchedule(league, teams);
  }
}
