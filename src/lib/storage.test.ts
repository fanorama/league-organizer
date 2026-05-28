import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  byCreatedAtDesc,
  getCache,
  getLeagues,
  getQuickMatchGamesBySession,
  getQuickMatchSessions,
  saveCache,
  saveLeague,
  saveQuickMatchGame,
  saveQuickMatchSession,
} from './storage';

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

describe('getQuickMatchSessions', () => {
  it('maps Supabase rows to app quick match sessions', async () => {
    const q = query({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 's1',
            player1_id: 'p1',
            player2_id: 'p2',
            status: 'active',
            created_at: '2026-05-28T01:00:00Z',
            finished_at: null,
          },
        ],
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    const sessions = await getQuickMatchSessions();

    expect(mocks.from).toHaveBeenCalledWith('quick_match_sessions');
    expect(q.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(sessions[0]).toEqual({
      id: 's1',
      player1Id: 'p1',
      player2Id: 'p2',
      status: 'active',
      createdAt: '2026-05-28T01:00:00Z',
      finishedAt: null,
    });
  });
});

describe('saveQuickMatchSession', () => {
  it('upserts camelCase data as a Supabase quick match session row', async () => {
    const q = query({
      single: vi.fn().mockResolvedValue({
        data: {
          id: 's1',
          player1_id: 'p1',
          player2_id: 'p2',
          status: 'active',
          created_at: '2026-05-28T01:00:00Z',
          finished_at: null,
        },
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    const saved = await saveQuickMatchSession({
      player1Id: 'p1',
      player2Id: 'p2',
      status: 'active',
      createdAt: '2026-05-28T01:00:00Z',
      finishedAt: null,
    });

    expect(q.upsert).toHaveBeenCalledWith({
      player1_id: 'p1',
      player2_id: 'p2',
      status: 'active',
      created_at: '2026-05-28T01:00:00Z',
      finished_at: null,
    });
    expect(saved.id).toBe('s1');
  });
});

describe('getQuickMatchGamesBySession', () => {
  it('maps Supabase rows to app quick match games for one session', async () => {
    const q = query({
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'g1',
            session_id: 's1',
            player1_club_id: 'ars',
            player1_club_name: 'Arsenal',
            player1_club_logo: 'ars.png',
            player2_club_id: 'che',
            player2_club_name: 'Chelsea',
            player2_club_logo: null,
            player1_score: 2,
            player2_score: 1,
            created_at: '2026-05-28T01:10:00Z',
          },
        ],
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    const games = await getQuickMatchGamesBySession('s1');

    expect(mocks.from).toHaveBeenCalledWith('quick_match_games');
    expect(q.eq).toHaveBeenCalledWith('session_id', 's1');
    expect(q.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(games[0]).toEqual({
      id: 'g1',
      sessionId: 's1',
      player1Club: { id: 'ars', name: 'Arsenal', logo: 'ars.png' },
      player2Club: { id: 'che', name: 'Chelsea', logo: undefined },
      player1Score: 2,
      player2Score: 1,
      createdAt: '2026-05-28T01:10:00Z',
    });
  });
});

describe('saveQuickMatchGame', () => {
  it('upserts a quick match game with club snapshots and scores', async () => {
    const q = query({
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'g1',
          session_id: 's1',
          player1_club_id: 'ars',
          player1_club_name: 'Arsenal',
          player1_club_logo: 'ars.png',
          player2_club_id: 'che',
          player2_club_name: 'Chelsea',
          player2_club_logo: 'che.png',
          player1_score: 2,
          player2_score: 2,
          created_at: '2026-05-28T01:10:00Z',
        },
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    const saved = await saveQuickMatchGame({
      sessionId: 's1',
      player1Club: { id: 'ars', name: 'Arsenal', logo: 'ars.png' },
      player2Club: { id: 'che', name: 'Chelsea', logo: 'che.png' },
      player1Score: 2,
      player2Score: 2,
      createdAt: '2026-05-28T01:10:00Z',
    });

    expect(q.upsert).toHaveBeenCalledWith({
      session_id: 's1',
      player1_club_id: 'ars',
      player1_club_name: 'Arsenal',
      player1_club_logo: 'ars.png',
      player2_club_id: 'che',
      player2_club_name: 'Chelsea',
      player2_club_logo: 'che.png',
      player1_score: 2,
      player2_score: 2,
      created_at: '2026-05-28T01:10:00Z',
    });
    expect(saved.player1Score).toBe(2);
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
