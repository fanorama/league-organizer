import { describe, expect, it } from 'vitest';
import { calculateStandingsFromData } from './standings';
import type { Match, Season, Team } from './types';

const season: Season = {
  id: 's1',
  leagueId: 'league1',
  number: 1,
  status: 'active',
  teamIds: ['t1', 't2', 't3'],
  createdAt: '2026-01-01T00:00:00Z',
};

const teams: Team[] = [
  { id: 't1', leagueId: 'league1', name: 'Team A', status: 'active' },
  { id: 't2', leagueId: 'league1', name: 'Team B', status: 'active' },
  { id: 't3', leagueId: 'league1', name: 'Team C', status: 'active' },
];

function match(id: string, homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number, matchType: Match['matchType'] = 'league'): Match {
  return {
    id,
    seasonId: 's1',
    matchday: 1,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    status: 'finished',
    matchType,
  };
}

describe('calculateStandingsFromData', () => {
  it('returns empty array when season is missing', () => {
    expect(calculateStandingsFromData(null, teams, [])).toEqual([]);
  });

  it('calculates wins, draws, goal difference, points, and ordering', () => {
    const rows = calculateStandingsFromData(season, teams, [
      match('m1', 't1', 't2', 3, 1),
      match('m2', 't3', 't2', 1, 1),
    ]);

    expect(rows).toHaveLength(3);
    expect(rows[0].team.id).toBe('t1');
    expect(rows[0]).toMatchObject({ won: 1, drawn: 0, pts: 3, gf: 3, ga: 1, gd: 2 });
    expect(rows.find((row) => row.team.id === 't2')).toMatchObject({ lost: 1, drawn: 1, pts: 1 });
  });

  it('ignores playoff and unfinished matches', () => {
    const rows = calculateStandingsFromData(season, teams, [
      match('m1', 't1', 't2', 5, 0, 'playoff'),
      { ...match('m2', 't1', 't2', 2, 0), status: 'scheduled' },
    ]);

    expect(rows.find((row) => row.team.id === 't1')?.played).toBe(0);
  });
});
