import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from './football';

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

afterEach(() => {
  delete process.env.FOOTBALL_API_KEY;
  vi.restoreAllMocks();
});

describe('football proxy', () => {
  it('returns an error when the deployment API key is not configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = createResponse();

    await handler({ query: { league: '39', season: '2024' } } as any, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'API key not configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards league and season to API-Football with the deployment API key', async () => {
    process.env.FOOTBALL_API_KEY = 'secret-key';
    const upstreamPayload = { response: [{ team: { id: 42, name: 'Arsenal' } }] };
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => upstreamPayload,
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = createResponse();

    await handler({ query: { league: '39', season: '2024' } } as any, res as any);

    expect(fetchMock).toHaveBeenCalledWith('https://v3.football.api-sports.io/teams?league=39&season=2024', {
      headers: { 'x-apisports-key': 'secret-key' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(upstreamPayload);
  });
});
