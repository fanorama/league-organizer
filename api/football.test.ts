import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from './football';

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

beforeEach(() => {
  delete process.env.FOOTBALL_API_KEY;
});

afterEach(() => {
  delete process.env.FOOTBALL_API_KEY;
  vi.restoreAllMocks();
});

describe('football proxy', () => {
  it('returns an error when the deployment API key is not configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = createResponse();

    await handler({ query: { competition: 'PL' } } as any, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'API key not configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards competition and season to football-data.org with the deployment API key', async () => {
    process.env.FOOTBALL_API_KEY = 'secret-key';
    const upstreamPayload = { teams: [{ id: 42, name: 'Arsenal FC' }] };
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => upstreamPayload,
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = createResponse();

    await handler({ query: { competition: 'EC', season: '2024' } } as any, res as any);

    expect(fetchMock).toHaveBeenCalledWith('https://api.football-data.org/v4/competitions/EC/teams?season=2024', {
      headers: { 'X-Auth-Token': 'secret-key' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(upstreamPayload);
  });

  it('omits season from the upstream URL when it is not provided', async () => {
    process.env.FOOTBALL_API_KEY = 'secret-key';
    const upstreamPayload = { teams: [] };
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => upstreamPayload,
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = createResponse();

    await handler({ query: { competition: 'PL' } } as any, res as any);

    expect(fetchMock).toHaveBeenCalledWith('https://api.football-data.org/v4/competitions/PL/teams', {
      headers: { 'X-Auth-Token': 'secret-key' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(upstreamPayload);
  });
});
