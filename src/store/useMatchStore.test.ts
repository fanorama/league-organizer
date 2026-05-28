import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as storage from '../lib/storage';
import type { Match } from '../lib/types';
import { useMatchStore } from './useMatchStore';

vi.mock('../lib/storage');

const match: Match = {
  id: 'm1',
  seasonId: 's1',
  matchday: 1,
  homeTeamId: 't1',
  awayTeamId: 't2',
  homeScore: null,
  awayScore: null,
  status: 'scheduled',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(storage.getMatches).mockResolvedValue([]);
  useMatchStore.setState({ matches: [] });
});

describe('useMatchStore', () => {
  it('updates a match and refreshes state', async () => {
    const finished = { ...match, homeScore: 2, awayScore: 1, status: 'finished' as const };
    vi.mocked(storage.saveMatch).mockResolvedValue(finished);
    vi.mocked(storage.getMatches).mockResolvedValue([finished]);

    const saved = await useMatchStore.getState().updateMatch(finished);

    expect(saved).toEqual(finished);
    expect(useMatchStore.getState().matches).toEqual([finished]);
  });
});
