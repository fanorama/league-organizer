import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSeasonWithSchedule } from '../lib/schedule';
import * as storage from '../lib/storage';
import type { League, Season, Team } from '../lib/types';
import { useSeasonStore } from './useSeasonStore';

vi.mock('../lib/storage');
vi.mock('../lib/schedule', () => ({
  createSeasonWithSchedule: vi.fn(),
}));

const league: League = {
  id: 'l1',
  name: 'League',
  createdAt: '2026-01-01T00:00:00Z',
  settings: { meetingsPerSeason: 1, continuousSeasons: false },
};
const team: Team = { id: 't1', leagueId: 'l1', name: 'Team 1', status: 'active' };
const season: Season = {
  id: 's1',
  leagueId: 'l1',
  number: 1,
  status: 'setup',
  teamIds: ['t1'],
  createdAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(storage.getSeasons).mockResolvedValue([]);
  useSeasonStore.setState({ seasons: [] });
});

describe('useSeasonStore', () => {
  it('creates a season through schedule helper and refreshes state', async () => {
    vi.mocked(createSeasonWithSchedule).mockResolvedValue(season);
    vi.mocked(storage.getSeasons).mockResolvedValue([season]);

    const saved = await useSeasonStore.getState().createSeason(league, [team]);

    expect(saved).toEqual(season);
    expect(useSeasonStore.getState().seasons).toEqual([season]);
  });

  it('updates a season and refreshes state', async () => {
    const updated = { ...season, status: 'active' as const };
    vi.mocked(storage.saveSeason).mockResolvedValue(updated);
    vi.mocked(storage.getSeasons).mockResolvedValue([updated]);

    const saved = await useSeasonStore.getState().updateSeason(updated);

    expect(saved).toEqual(updated);
    expect(useSeasonStore.getState().seasons).toEqual([updated]);
  });
});
