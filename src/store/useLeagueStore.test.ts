import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as storage from '../lib/storage';
import type { League } from '../lib/types';
import { useLeagueStore } from './useLeagueStore';

vi.mock('../lib/storage');

const league: League = {
  id: 'l1',
  name: 'Test League',
  createdAt: '2026-01-01T00:00:00Z',
  settings: { meetingsPerSeason: 1, continuousSeasons: false },
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(storage.getLeagues).mockResolvedValue([]);
  useLeagueStore.setState({ leagues: [] });
});

describe('useLeagueStore', () => {
  it('fetches leagues into state', async () => {
    vi.mocked(storage.getLeagues).mockResolvedValue([league]);

    await useLeagueStore.getState().fetchLeagues();

    expect(useLeagueStore.getState().leagues).toEqual([league]);
  });

  it('creates a league and refreshes state', async () => {
    vi.mocked(storage.saveLeague).mockResolvedValue(league);
    vi.mocked(storage.getLeagues).mockResolvedValue([league]);

    const saved = await useLeagueStore.getState().createLeague({ name: league.name, createdAt: league.createdAt, settings: league.settings });

    expect(saved).toEqual(league);
    expect(useLeagueStore.getState().leagues).toEqual([league]);
  });

  it('deletes a league and refreshes state', async () => {
    await useLeagueStore.getState().deleteLeague('l1');

    expect(storage.deleteLeague).toHaveBeenCalledWith('l1');
    expect(useLeagueStore.getState().leagues).toEqual([]);
  });
});
