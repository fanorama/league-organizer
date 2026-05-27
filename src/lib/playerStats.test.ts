import { beforeEach, describe, expect, it } from 'vitest';
import { KEYS, save } from './storage';
import { calculateHeadToHead, calculatePlayerStats } from './playerStats';

beforeEach(() => {
  localStorage.clear();
});

describe('calculatePlayerStats', () => {
  it('uses season owner snapshots instead of current team owner', () => {
    save(KEYS.teams, { id: 't1', leagueId: 'l1', name: 'Team 1', status: 'pool', owner: null, ownerId: null });
    save(KEYS.teams, { id: 't2', leagueId: 'l1', name: 'Team 2', status: 'active', owner: 'Bob', ownerId: 'p2' });
    save(KEYS.seasons, {
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
      createdAt: new Date().toISOString(),
    });
    save(KEYS.matches, {
      id: 'm1',
      seasonId: 's1',
      matchday: 1,
      homeTeamId: 't1',
      awayTeamId: 't2',
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
      matchType: 'league',
    });

    const stats = calculatePlayerStats('p1');

    expect(stats.totals.played).toBe(1);
    expect(stats.totals.won).toBe(1);
    expect(stats.totals.points).toBe(3);
    expect(stats.totals.championships).toBe(1);
  });
});

describe('calculateHeadToHead', () => {
  it('uses season owner snapshots for historical matchups', () => {
    save(KEYS.seasons, {
      id: 's1',
      leagueId: 'l1',
      number: 1,
      status: 'finished',
      teamIds: ['t1', 't2'],
      ownerSnapshots: {
        t1: { playerId: 'p1', playerName: 'Alice' },
        t2: { playerId: 'p2', playerName: 'Bob' },
      },
      createdAt: new Date().toISOString(),
    });
    save(KEYS.matches, {
      id: 'm1',
      seasonId: 's1',
      matchday: 1,
      homeTeamId: 't1',
      awayTeamId: 't2',
      homeScore: 0,
      awayScore: 3,
      status: 'finished',
      matchType: 'league',
    });

    const h2h = calculateHeadToHead('p1', 'p2');

    expect(h2h.played).toBe(1);
    expect(h2h.winsA).toBe(0);
    expect(h2h.winsB).toBe(1);
    expect(h2h.gfA).toBe(0);
    expect(h2h.gfB).toBe(3);
  });
});
