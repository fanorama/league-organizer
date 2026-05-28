import { beforeEach, describe, expect, it, vi } from 'vitest';
import { byCreatedAtDesc, getCache, getLeagues, saveCache, saveLeague } from './storage';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    from: mocks.from,
  },
}));

beforeEach(() => {
  localStorage.clear();
  mocks.from.mockReset();
});

function query(overrides: Record<string, unknown>) {
  return {
    select: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
    ...overrides,
  } as any;
}

describe('getLeagues', () => {
  it('maps Supabase rows to app leagues', async () => {
    const q = query({
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'l1', name: 'Liga A', description: null, settings: { meetingsPerSeason: 1, continuousSeasons: false }, created_at: '2026-01-01T00:00:00Z' }],
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    const leagues = await getLeagues();

    expect(mocks.from).toHaveBeenCalledWith('leagues');
    expect(leagues[0]).toEqual({
      id: 'l1',
      name: 'Liga A',
      description: undefined,
      settings: { meetingsPerSeason: 1, continuousSeasons: false },
      createdAt: '2026-01-01T00:00:00Z',
    });
  });
});

describe('saveLeague', () => {
  it('upserts camelCase data as a Supabase row', async () => {
    const q = query({
      single: vi.fn().mockResolvedValue({
        data: { id: 'l1', name: 'Liga A', description: 'Desc', settings: { meetingsPerSeason: 2, continuousSeasons: true }, created_at: '2026-01-01T00:00:00Z' },
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    const saved = await saveLeague({
      name: 'Liga A',
      description: 'Desc',
      settings: { meetingsPerSeason: 2, continuousSeasons: true },
      createdAt: '2026-01-01T00:00:00Z',
    });

    expect(q.upsert).toHaveBeenCalledWith({
      name: 'Liga A',
      description: 'Desc',
      settings: { meetingsPerSeason: 2, continuousSeasons: true },
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(saved.id).toBe('l1');
  });
});

describe('cache helpers', () => {
  it('keeps Football API cache in localStorage', () => {
    const cache = { '39:2024': { data: [], fetchedAt: '2026-01-01T00:00:00Z' } };
    expect(saveCache(cache)).toEqual(cache);
    expect(getCache()).toEqual(cache);
  });
});

describe('byCreatedAtDesc', () => {
  it('sorts newer items first', () => {
    const older = { createdAt: '2024-01-01T00:00:00Z' };
    const newer = { createdAt: '2024-06-01T00:00:00Z' };
    expect(byCreatedAtDesc(older, newer)).toBeGreaterThan(0);
  });
});
