import { KEYS, getAll, getById } from './storage';
import type { Match, Season, Team } from './types';

export interface StandingsRow {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  form: string[];
}

export function calculateStandings(seasonId: string): StandingsRow[] {
  const season = getById<Season>(KEYS.seasons, seasonId);
  if (!season) return [];
  const allTeamsMap = Object.fromEntries(
    getAll<Team>(KEYS.teams).filter((team) => team.leagueId === season.leagueId).map((team) => [team.id, team]),
  );
  const teams = (season.teamIds || []).map((id) => allTeamsMap[id]).filter(Boolean);
  const finished = getAll<Match>(KEYS.matches).filter((match) => match.seasonId === seasonId && match.status === 'finished' && match.matchType !== 'playoff');

  return teams.map((team) => {
    const row = {
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0,
      form: [] as string[],
    };

    finished.forEach((match) => {
      const home = match.homeTeamId === team.id;
      const away = match.awayTeamId === team.id;
      if (!home && !away) return;

      const goalsFor = home ? Number(match.homeScore) : Number(match.awayScore);
      const goalsAgainst = home ? Number(match.awayScore) : Number(match.homeScore);
      row.played += 1;
      row.gf += goalsFor;
      row.ga += goalsAgainst;

      if (goalsFor > goalsAgainst) {
        row.won += 1;
        row.pts += 3;
        row.form.push('W');
      } else if (goalsFor === goalsAgainst) {
        row.drawn += 1;
        row.pts += 1;
        row.form.push('D');
      } else {
        row.lost += 1;
        row.form.push('L');
      }
    });

    row.gd = row.gf - row.ga;
    row.form = row.form.slice(-5);
    return row;
  }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name));
}
