import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  byCreatedAtDesc,
  getCache,
  getLeagues,
  getMatchesByTeamId,
  getPlayers,
  getQuickMatchGamesBySession,
  getQuickMatchSessions,
  getTeams,
  deleteClubTier,
  getClubTier,
  getClubTiers,
  saveClubTier,
  saveCache,
  saveLeague,
  savePlayer,
  saveQuickMatchGame,
  saveQuickMatchSession,
  saveTeam,
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
          player2_club_id: 'che',
          player2_club_name: 'Chelsea',
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
      player2_club_id: 'che',
      player2_club_name: 'Chelsea',
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

describe('team tier mapper', () => {
  it('maps tier from snake_case to camelCase on read', async () => {
    const q = query({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 't1',
            league_id: 'l1',
            name: 'Arsenal',
            short_name: 'ARS',
            badge: 'ARS',
            logo: null,
            status: 'pool',
            owner_id: null,
            tier: 'elite',
            external_id: null,
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    const teams = await getTeams();

    expect(teams[0].tier).toBe('elite');
  });

  it('maps null tier as null', async () => {
    const q = query({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 't1',
            league_id: 'l1',
            name: 'Arsenal',
            short_name: 'ARS',
            badge: 'ARS',
            logo: null,
            status: 'pool',
            owner_id: null,
            tier: null,
            external_id: null,
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    const teams = await getTeams();

    expect(teams[0].tier).toBeNull();
  });

  it('upserts tier as snake_case', async () => {
    const q = query({
      single: vi.fn().mockResolvedValue({
        data: {
          id: 't1',
          league_id: 'l1',
          name: 'Arsenal',
          short_name: 'ARS',
          badge: 'ARS',
          logo: null,
          status: 'pool',
          owner_id: null,
          tier: 'underdog',
          external_id: null,
          created_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    await saveTeam({
      leagueId: 'l1',
      name: 'Arsenal',
      shortName: 'ARS',
      badge: 'ARS',
      status: 'pool',
      tier: 'underdog',
      createdAt: '2026-01-01T00:00:00Z',
    });

    expect(q.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'underdog' }),
    );
  });
});

describe('player skillOverride mapper', () => {
  it('maps skill_override from snake_case on read', async () => {
    const q = query({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'p1',
            name: 'Alice',
            created_at: '2026-01-01T00:00:00Z',
            skill_override: 'jago',
          },
        ],
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    const players = await getPlayers();

    expect(players[0].skillOverride).toBe('jago');
  });

  it('maps null skill_override as null', async () => {
    const q = query({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'p1',
            name: 'Alice',
            created_at: '2026-01-01T00:00:00Z',
            skill_override: null,
          },
        ],
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    const players = await getPlayers();

    expect(players[0].skillOverride).toBeNull();
  });

  it('upserts skillOverride as skill_override', async () => {
    const q = query({
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'p1',
          name: 'Alice',
          created_at: '2026-01-01T00:00:00Z',
          skill_override: 'pemula',
        },
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    await savePlayer({
      name: 'Alice',
      skillOverride: 'pemula',
      createdAt: '2026-01-01T00:00:00Z',
    });

    expect(q.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ skill_override: 'pemula' }),
    );
  });
});

describe('club_tiers mapper', () => {
  it('maps external_id → externalId on read', async () => {
    const q = query({
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { external_id: '57', tier: 'elite' },
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    const result = await getClubTier('57');

    expect(mocks.from).toHaveBeenCalledWith('club_tiers');
    expect(q.eq).toHaveBeenCalledWith('external_id', '57');
    expect(result).toEqual({ externalId: '57', tier: 'elite' });
  });

  it('returns null when club tier not found', async () => {
    const q = query({
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    mocks.from.mockReturnValue(q);

    const result = await getClubTier('999');

    expect(result).toBeNull();
  });

  it('upserts camelCase → snake_case on save', async () => {
    const q = query({
      single: vi.fn().mockResolvedValue({
        data: { external_id: '57', tier: 'underdog' },
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    const result = await saveClubTier({ externalId: '57', tier: 'underdog' });

    expect(mocks.from).toHaveBeenCalledWith('club_tiers');
    expect(q.upsert).toHaveBeenCalledWith({ external_id: '57', tier: 'underdog' });
    expect(result).toEqual({ externalId: '57', tier: 'underdog' });
  });

  it('deletes a club tier row by external_id', async () => {
    const q = query({
      eq: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    });
    mocks.from.mockReturnValue(q);

    await deleteClubTier('57');

    expect(mocks.from).toHaveBeenCalledWith('club_tiers');
    expect(q.eq).toHaveBeenCalledWith('external_id', '57');
  });

  it('batch fetches club tiers by external_ids', async () => {
    const q = query({
      in: vi.fn().mockResolvedValue({
        data: [
          { external_id: '57', tier: 'elite' },
          { external_id: '65', tier: 'underdog' },
        ],
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    const results = await getClubTiers(['57', '65']);

    expect(mocks.from).toHaveBeenCalledWith('club_tiers');
    expect(q.select).toHaveBeenCalledWith('*');
    expect(q.in).toHaveBeenCalledWith('external_id', ['57', '65']);
    expect(results).toEqual([
      { externalId: '57', tier: 'elite' },
      { externalId: '65', tier: 'underdog' },
    ]);
  });

  it('returns empty array when batch input is empty', async () => {
    const q = query({});
    mocks.from.mockReturnValue(q);

    const results = await getClubTiers([]);

    expect(mocks.from).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });
});

describe('getMatchesByTeamId', () => {
  it('mengembalikan match yang melibatkan team sebagai home atau away', async () => {
    const q = query({
      or: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'm1',
            season_id: 's1',
            matchday: 1,
            home_team_id: 't1',
            away_team_id: 't2',
            home_score: null,
            away_score: null,
            status: 'scheduled',
            match_type: 'league',
            original_matchday: null,
            scheduled_date: null,
            bracket_slot: null,
          },
          {
            id: 'm2',
            season_id: 's2',
            matchday: 2,
            home_team_id: 't3',
            away_team_id: 't1',
            home_score: 2,
            away_score: 1,
            status: 'finished',
            match_type: 'league',
            original_matchday: null,
            scheduled_date: null,
            bracket_slot: null,
          },
        ],
        error: null,
      }),
    });
    mocks.from.mockReturnValue(q);

    const results = await getMatchesByTeamId('t1');

    expect(mocks.from).toHaveBeenCalledWith('matches');
    expect(q.select).toHaveBeenCalledWith('*');
    expect(q.or).toHaveBeenCalledWith('home_team_id.eq.t1,away_team_id.eq.t1');
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('m1');
    expect(results[1].id).toBe('m2');
  });

  it('mengembalikan array kosong jika team tidak punya riwayat', async () => {
    const q = query({
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    mocks.from.mockReturnValue(q);

    const results = await getMatchesByTeamId('t-null');

    expect(results).toEqual([]);
  });
});
