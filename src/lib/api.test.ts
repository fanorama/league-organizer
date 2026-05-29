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
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        teams: [
          {
            id: 42,
            name: 'Arsenal FC',
            tla: 'ARS',
            crest: 'https://example.com/arsenal.png',
            area: { name: 'England' },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchClubs('PL')).resolves.toEqual([
      {
        id: '42',
        name: 'Arsenal FC',
        shortName: 'ARS',
        logo: 'https://example.com/arsenal.png',
        country: 'England',
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith('/api/football?competition=PL');
    expect(localStorage.getItem('clubs_cache')).toContain('Arsenal');
  });

  it('includes season only for competitions that define one', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ teams: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchClubs('EC')).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledWith('/api/football?competition=EC&season=2024');
  });

  it('reports a clear error when the football proxy does not return JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/javascript' }),
      text: async () => 'export default async function handler() {}',
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchClubs('PL')).rejects.toThrow('Football proxy returned application/javascript instead of JSON');
  });

  it('uses the football proxy error message when the proxy returns JSON failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'API key not configured' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchClubs('PL')).rejects.toThrow('API key not configured');
  });
});
