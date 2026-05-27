import { beforeEach, describe, expect, it } from 'vitest';
import { KEYS, getById, save } from '../lib/storage';
import { usePlayerStore } from './usePlayerStore';

beforeEach(() => {
  localStorage.clear();
  usePlayerStore.setState({ players: [] });
});

describe('usePlayerStore.deletePlayer', () => {
  it('clears current owner fields without deleting teams', () => {
    save(KEYS.players, { id: 'p1', name: 'Alice', createdAt: new Date().toISOString() });
    save(KEYS.teams, {
      id: 't1',
      leagueId: 'l1',
      name: 'Team 1',
      status: 'active',
      owner: 'Alice',
      ownerId: 'p1',
    });
    usePlayerStore.getState().refresh();

    usePlayerStore.getState().deletePlayer('p1');

    const team = getById<{ id: string; owner: string | null; ownerId: string | null }>(KEYS.teams, 't1');
    expect(team?.owner).toBeNull();
    expect(team?.ownerId).toBeNull();
    expect(getById(KEYS.players, 'p1')).toBeNull();
  });
});
