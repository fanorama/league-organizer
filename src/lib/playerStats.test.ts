import { describe, expect, it } from 'vitest';
import { calculateHeadToHeadFromData, calculatePlayerStatsFromData } from './playerStats';
import type { Match, Season, Team } from './types';

const teams: Team[] = [
  { id: 't1', leagueId: 'l1', name: 'Team 1', status: 'pool', owner: null, ownerId: null },
  { id: 't2', leagueId: 'l1', name: 'Team 2', status: 'active', owner: 'Bob', ownerId: 'p2' },
];

const seasons: Season[] = [{
  id: 's1',
  leagueId: 'l1',
  number: 1,
  status: 'finished',
  teamIds: ['t1', 't2'],
  ownerSnapshots: {
    t1: { playerId: 'p1', playerName: 'Alice' },
    t2: { playerId: 'p2', playerName: 'Bob' },
  },
  champion: 't1',
  createdAt: '2026-01-01T00:00:00Z',
}];

const matches: Match[] = [{
  id: 'm1',
  seasonId: 's1',
  matchday: 1,
  homeTeamId: 't1',
  awayTeamId: 't2',
  homeScore: 2,
  awayScore: 1,
  status: 'finished',
  matchType: 'league',
}];

describe('calculatePlayerStatsFromData', () => {
  it('uses season owner snapshots instead of current team owner', () => {
    const stats = calculatePlayerStatsFromData('p1', teams, seasons, matches);

    expect(stats.totals.played).toBe(1);
    expect(stats.totals.won).toBe(1);
    expect(stats.totals.points).toBe(3);
    expect(stats.totals.championships).toBe(1);
  });
});

describe('calculateHeadToHeadFromData', () => {
  it('uses season owner snapshots for historical matchups', () => {
    const h2h = calculateHeadToHeadFromData('p1', 'p2', seasons, [{ ...matches[0], homeScore: 0, awayScore: 3 }]);

    expect(h2h.played).toBe(1);
    expect(h2h.winsA).toBe(0);
    expect(h2h.winsB).toBe(1);
    expect(h2h.gfA).toBe(0);
    expect(h2h.gfB).toBe(3);
  });
});
