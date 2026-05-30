import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from './crest';

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
  };
}

afterEach(() => vi.restoreAllMocks());

describe('crest proxy', () => {
  it('menolak ketika url tidak diberikan', async () => {
    const res = createResponse();
    await handler({ query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('menolak host di luar allowlist', async () => {
    const res = createResponse();
    await handler({ query: { url: 'https://evil.example.com/57.png' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('menukar .svg ke .png lalu meneruskan dengan header CORS', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => new ArrayBuffer(8),
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = createResponse();

    await handler({ query: { url: 'https://crests.football-data.org/57.svg' } } as any, res as any);

    expect(fetchMock).toHaveBeenCalledWith('https://crests.football-data.org/57.png', expect.any(Object));
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
  });

  it('mengizinkan logo dari API-Sports tanpa normalisasi path', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => new ArrayBuffer(8),
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = createResponse();

    await handler({ query: { url: 'https://media.api-sports.io/football/teams/33.png' } } as any, res as any);

    expect(fetchMock).toHaveBeenCalledWith('https://media.api-sports.io/football/teams/33.png', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
  });
});
