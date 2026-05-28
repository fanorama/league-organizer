import { getMatches, getSeasons, getTeams } from './storage';
import type { Match, Season, Team } from './types';

export interface PlayerStats {
  playerId: string;
  leagues: LeagueStats[];
  totals: AggregatedStats;
}

export interface LeagueStats {
  leagueId: string;
  leagueName?: string;
  teams: TeamHistory[];
  stats: AggregatedStats;
  championships: number;
}

export interface TeamHistory {
  teamId: string;
  teamName: string;
  seasonIds: string[];
}

export interface AggregatedStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  championships: number;
}

export interface H2HStats {
  playerAId: string;
  playerBId: string;
  played: number;
  winsA: number;
  draws: number;
  winsB: number;
  gfA: number;
  gfB: number;
}

export function calculatePlayerStatsFromData(
  playerId: string,
  allTeams: Team[],
  seasons: Season[],
  matches: Match[],
  filterLeagueId?: string,
): PlayerStats {
  const teamMap = new Map(allTeams.map((team) => [team.id, team]));
  const leagueMap = new Map<string, LeagueStats>();

  for (const season of seasons) {
    if (filterLeagueId && season.leagueId !== filterLeagueId) continue;
    const ownedTeamIds = (season.teamIds || []).filter((teamId) => season.ownerSnapshots?.[teamId]?.playerId === playerId);
    if (!ownedTeamIds.length) continue;

    if (!leagueMap.has(season.leagueId)) {
      leagueMap.set(season.leagueId, {
        leagueId: season.leagueId,
        teams: [],
        stats: emptyStats(),
        championships: 0,
      });
    }

    const leagueStat = leagueMap.get(season.leagueId)!;
    for (const teamId of ownedTeamIds) {
      const team = teamMap.get(teamId);
      const existing = leagueStat.teams.find((entry) => entry.teamId === teamId);
      if (existing) {
        existing.seasonIds.push(season.id);
      } else {
        leagueStat.teams.push({ teamId, teamName: team?.name ?? teamId, seasonIds: [season.id] });
      }

      if (season.champion === teamId) leagueStat.championships++;
    }
  }

  for (const leagueStat of leagueMap.values()) {
    const seasonIds = new Set(leagueStat.teams.flatMap((team) => team.seasonIds));
    for (const seasonId of seasonIds) {
      const season = seasons.find((item) => item.id === seasonId);
      if (!season) continue;
      const ownedTeamIds = new Set((season.teamIds || []).filter((teamId) => season.ownerSnapshots?.[teamId]?.playerId === playerId));
      const seasonMatches = matches.filter(
        (match) =>
          match.seasonId === seasonId &&
          match.status === 'finished' &&
          (ownedTeamIds.has(match.homeTeamId) || ownedTeamIds.has(match.awayTeamId)),
      );

      for (const match of seasonMatches) {
        if (match.homeScore == null || match.awayScore == null) continue;

        if (ownedTeamIds.has(match.homeTeamId)) {
          addMatchResult(leagueStat.stats, match.homeScore, match.awayScore);
        }
        if (ownedTeamIds.has(match.awayTeamId)) {
          addMatchResult(leagueStat.stats, match.awayScore, match.homeScore);
        }
      }
    }

    leagueStat.stats.championships = leagueStat.championships;
  }

  const leagues = Array.from(leagueMap.values());
  const totals = leagues.reduce<AggregatedStats>(
    (acc, leagueStat) => ({
      played: acc.played + leagueStat.stats.played,
      won: acc.won + leagueStat.stats.won,
      drawn: acc.drawn + leagueStat.stats.drawn,
      lost: acc.lost + leagueStat.stats.lost,
      gf: acc.gf + leagueStat.stats.gf,
      ga: acc.ga + leagueStat.stats.ga,
      gd: acc.gd + leagueStat.stats.gd,
      points: acc.points + leagueStat.stats.points,
      championships: acc.championships + leagueStat.championships,
    }),
    emptyStats(),
  );

  return { playerId, leagues, totals };
}

export async function calculatePlayerStats(playerId: string, filterLeagueId?: string): Promise<PlayerStats> {
  const [allTeams, seasons, matches] = await Promise.all([getTeams(), getSeasons(), getMatches()]);
  return calculatePlayerStatsFromData(playerId, allTeams, seasons, matches, filterLeagueId);
}

export function calculateHeadToHeadFromData(playerAId: string, playerBId: string, seasons: Season[], matches: Match[]): H2HStats {
  const h2h: H2HStats = { playerAId, playerBId, played: 0, winsA: 0, draws: 0, winsB: 0, gfA: 0, gfB: 0 };

  for (const match of matches) {
    if (match.status !== 'finished' || match.homeScore == null || match.awayScore == null) continue;
    const season = seasons.find((item) => item.id === match.seasonId);
    if (!season) continue;

    const homeOwnerId = season.ownerSnapshots?.[match.homeTeamId]?.playerId;
    const awayOwnerId = season.ownerSnapshots?.[match.awayTeamId]?.playerId;
    const homeIsA = homeOwnerId === playerAId && awayOwnerId === playerBId;
    const homeIsB = homeOwnerId === playerBId && awayOwnerId === playerAId;
    if (!homeIsA && !homeIsB) continue;

    h2h.played++;
    const gfA = homeIsA ? match.homeScore : match.awayScore;
    const gfB = homeIsA ? match.awayScore : match.homeScore;
    h2h.gfA += gfA;
    h2h.gfB += gfB;

    if (gfA > gfB) h2h.winsA++;
    else if (gfA === gfB) h2h.draws++;
    else h2h.winsB++;
  }

  return h2h;
}

export async function calculateHeadToHead(playerAId: string, playerBId: string): Promise<H2HStats> {
  const [seasons, matches] = await Promise.all([getSeasons(), getMatches()]);
  return calculateHeadToHeadFromData(playerAId, playerBId, seasons, matches);
}

function addMatchResult(stats: AggregatedStats, gf: number, ga: number): void {
  stats.played++;
  stats.gf += gf;
  stats.ga += ga;
  stats.gd = stats.gf - stats.ga;

  if (gf > ga) {
    stats.won++;
    stats.points += 3;
  } else if (gf === ga) {
    stats.drawn++;
    stats.points++;
  } else {
    stats.lost++;
  }
}

function emptyStats(): AggregatedStats {
  return { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, championships: 0 };
}
