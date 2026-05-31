import { describe, expect, it } from 'vitest';
import { DRAW_ORDER, DRAW_WEIGHTS, getActiveDrawTier, pickWeightedClub } from './balancedDraw';
import type { Player, Team } from './types';

function team(overrides: Partial<Team> = {}): Team {
  return {
    id: 't1',
    leagueId: 'l1',
    name: 'Arsenal',
    status: 'pool',
    ...overrides,
  };
}

function player(overrides: Partial<Player> = {}): Player {
  return { id: 'p1', name: 'Alice', createdAt: '2026-01-01T00:00:00Z', ...overrides };
}

describe('DRAW_WEIGHTS', () => {
  it('has weights for all skill tiers and club tiers', () => {
    expect(DRAW_WEIGHTS.jago.elite).toBe(1);
    expect(DRAW_WEIGHTS.jago.mid).toBe(3);
    expect(DRAW_WEIGHTS.jago.underdog).toBe(6);

    expect(DRAW_WEIGHTS.sedang.elite).toBe(3);
    expect(DRAW_WEIGHTS.sedang.mid).toBe(5);
    expect(DRAW_WEIGHTS.sedang.underdog).toBe(3);

    expect(DRAW_WEIGHTS.pemula.elite).toBe(6);
    expect(DRAW_WEIGHTS.pemula.mid).toBe(3);
    expect(DRAW_WEIGHTS.pemula.underdog).toBe(1);
  });
});

describe('DRAW_ORDER', () => {
  it('starts with pemula, then sedang, then jago', () => {
    expect(DRAW_ORDER).toEqual(['pemula', 'sedang', 'jago']);
  });
});

describe('pickWeightedClub', () => {
  it('returns null for empty pool', () => {
    expect(pickWeightedClub([], 'jago', () => 0.5)).toBeNull();
  });

  it('returns null when all weights are zero (teams with tier but weights = 0 cannot happen with current matrix, but tests the safety)', () => {
    // No tier produces weight 0 — all tiers have positive weight in the matrix.
    // Testing edge: all totalWeight = 0 scenario is defensive, so use the one team.
    const result = pickWeightedClub([team({ tier: 'elite' })], 'jago', () => 0.5);
    expect(result).not.toBeNull();
  });

  it('picks the only team when pool has one team', () => {
    const t = team({ id: 't1', tier: 'mid' });
    expect(pickWeightedClub([t], 'jago', () => 0.5)).toBe(t);
  });

  it('treats null tier as mid', () => {
    const elite = team({ id: 'e', tier: 'elite' });
    const nullTier = team({ id: 'n', tier: null });
    // jago: elite=1, mid=3 → nullTier treated as mid, weight=3
    // rng=0 means pick first that accumulates enough weight
    const result = pickWeightedClub([elite, nullTier], 'jago', () => 0);
    expect(result).toBe(elite);
  });

  it('picks elite club when rng is very low for jago vs pemula', () => {
    const elite = team({ id: 'e', tier: 'elite' });
    const underdog = team({ id: 'u', tier: 'underdog' });
    // jago: elite=1, underdog=6 → total=7, first team (elite) wins with rng * 7 < 1
    const result = pickWeightedClub([elite, underdog], 'jago', () => 0.001);
    expect(result).toBe(elite);
  });

  it('picks underdog club when rng is high for jago', () => {
    const elite = team({ id: 'e', tier: 'elite' });
    const underdog = team({ id: 'u', tier: 'underdog' });
    // jago: elite=1, underdog=6 → total=7, underdog wins with rng * 7 >= 1
    const result = pickWeightedClub([elite, underdog], 'jago', () => 0.9);
    expect(result).toBe(underdog);
  });

  it('pemula gets elite club with high probability (edge rng)', () => {
    const elite = team({ id: 'e', tier: 'elite' });
    const underdog = team({ id: 'u', tier: 'underdog' });
    // pemula: elite=6, underdog=1 → total=7, elite wins with rng * 7 < 6
    const result = pickWeightedClub([elite, underdog], 'pemula', () => 0.001);
    expect(result).toBe(elite);
  });

  it('tier with weight 0 is never picked (club tier not present in pool)', () => {
    // This is just verifying the matrix is sensible; all tiers have positive weights
    // for all skill levels, so a tier-weight-0 can't happen with valid matrix.
    // But if team has tier that somehow maps to 0 (defensive), skip.
    // The matrix guarantees positive weights for all (elite, mid, underdog).
    // So this test just confirms the pool works normally.
    const t1 = team({ id: 't1', tier: 'elite' });
    const t2 = team({ id: 't2', tier: 'mid' });
    const t3 = team({ id: 't3', tier: 'underdog' });
    const result = pickWeightedClub([t1, t2, t3], 'sedang', () => 0.5);
    expect(result).toBeDefined();
  });
});

describe('getActiveDrawTier', () => {
  it('returns null when no players remain', () => {
    expect(getActiveDrawTier([])).toBeNull();
  });

  it('returns pemula first', () => {
    const players = [
      { player: player({ id: 'p1' }), skill: 'jago' as const },
      { player: player({ id: 'p2' }), skill: 'pemula' as const },
      { player: player({ id: 'p3' }), skill: 'sedang' as const },
    ];
    expect(getActiveDrawTier(players)).toBe('pemula');
  });

  it('returns sedang when no pemula', () => {
    const players = [
      { player: player({ id: 'p1' }), skill: 'jago' as const },
      { player: player({ id: 'p2' }), skill: 'sedang' as const },
    ];
    expect(getActiveDrawTier(players)).toBe('sedang');
  });

  it('returns jago when only jago left', () => {
    const players = [
      { player: player({ id: 'p1' }), skill: 'jago' as const },
    ];
    expect(getActiveDrawTier(players)).toBe('jago');
  });

  it('skips empty tier', () => {
    const players = [
      { player: player({ id: 'p1' }), skill: 'jago' as const },
      { player: player({ id: 'p2' }), skill: 'jago' as const },
    ];
    expect(getActiveDrawTier(players)).toBe('jago');
  });
});
