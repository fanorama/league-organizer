import { describe, expect, it } from 'vitest';
import { canAssignPlayerToLeague, getAssignablePlayersForLeague } from './playerAssignment';
import type { Player, Team } from './types';

const players: Player[] = [
  { id: 'p1', name: 'Alice', createdAt: '2026-05-28T00:00:00.000Z' },
  { id: 'p2', name: 'Bob', createdAt: '2026-05-28T00:00:00.000Z' },
  { id: 'p3', name: 'Cara', createdAt: '2026-05-28T00:00:00.000Z' },
];

const teams: Team[] = [
  { id: 't1', leagueId: 'l1', name: 'Team 1', status: 'active', ownerId: 'p1' },
  { id: 't2', leagueId: 'l1', name: 'Team 2', status: 'pool', ownerId: null },
  { id: 't3', leagueId: 'l2', name: 'Team 3', status: 'active', ownerId: 'p2' },
];

describe('getAssignablePlayersForLeague', () => {
  it('excludes players already assigned in the same league', () => {
    expect(getAssignablePlayersForLeague(players, teams, 'l1').map((player) => player.id)).toEqual(['p2', 'p3']);
  });

  it('allows a player assigned in another league', () => {
    expect(canAssignPlayerToLeague('p2', teams, 'l1')).toBe(true);
  });

  it('blocks a player assigned in the target league', () => {
    expect(canAssignPlayerToLeague('p1', teams, 'l1')).toBe(false);
  });
});
