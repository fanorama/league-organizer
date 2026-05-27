import { KEYS, createId, getAll, save, setAll } from "./storage.js";

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateRoundRobin(teamIds, meetingsPerSeason = 1) {
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

export function replaceSeasonSchedule(season, teamIds, meetingsPerSeason) {
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

export function createSeasonWithSchedule(league, teams) {
  const seasons = getAll(KEYS.seasons).filter((season) => season.leagueId === league.id);
  const season = save(KEYS.seasons, {
    leagueId: league.id,
    number: seasons.length + 1,
    status: "setup",
    champion: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null
  });
  replaceSeasonSchedule(season, teams.map((team) => team.id), league.settings.meetingsPerSeason);
  return season;
}
