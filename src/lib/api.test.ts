import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchClubs } from './api';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('fetchClubs', () => {
  it('loads clubs through the local football proxy without a browser API key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: [
          {
            team: {
              id: 42,
              name: 'Arsenal',
              code: 'ARS',
              logo: 'https://example.com/arsenal.png',
              country: 'England',
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchClubs('39')).resolves.toEqual([
      {
        id: '42',
        name: 'Arsenal',
        shortName: 'ARS',
        logo: 'https://example.com/arsenal.png',
        country: 'England',
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith('/api/football?league=39&season=2024');
    expect(localStorage.getItem('clubs_cache')).toContain('Arsenal');
  });
});
