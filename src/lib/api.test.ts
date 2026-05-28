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

  it('reports a clear error when the football proxy does not return JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/javascript' }),
      text: async () => 'export default async function handler() {}',
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchClubs('39')).rejects.toThrow('Football proxy returned application/javascript instead of JSON');
  });

  it('uses the football proxy error message when the proxy returns JSON failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'API key not configured' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchClubs('39')).rejects.toThrow('API key not configured');
  });
});
