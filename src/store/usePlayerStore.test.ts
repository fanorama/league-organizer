import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as storage from '../lib/storage';
import type { Player, Team } from '../lib/types';
import { usePlayerStore } from './usePlayerStore';

vi.mock('../lib/storage');

const player: Player = { id: 'p1', name: 'Alice', createdAt: '2026-01-01T00:00:00Z' };
const ownedTeam: Team = { id: 't1', leagueId: 'l1', name: 'Team 1', status: 'active', ownerId: 'p1', owner: 'Alice' };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(storage.getPlayers).mockResolvedValue([]);
  vi.mocked(storage.getTeams).mockResolvedValue([]);
  usePlayerStore.setState({ players: [] });
});

describe('usePlayerStore', () => {
  it('adds a player and refreshes state', async () => {
    vi.mocked(storage.savePlayer).mockResolvedValue(player);
    vi.mocked(storage.getPlayers).mockResolvedValue([player]);

    const saved = await usePlayerStore.getState().addPlayer({ name: player.name, createdAt: player.createdAt });

    expect(saved).toEqual(player);
    expect(usePlayerStore.getState().players).toEqual([player]);
  });

  it('deletes a player and clears ownership from teams', async () => {
    vi.mocked(storage.getTeams).mockResolvedValue([ownedTeam]);

    await usePlayerStore.getState().deletePlayer('p1');

    expect(storage.deletePlayer).toHaveBeenCalledWith('p1');
    expect(storage.saveTeam).toHaveBeenCalledWith({ ...ownedTeam, ownerId: null, owner: null });
  });
});
