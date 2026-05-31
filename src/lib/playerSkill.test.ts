import { describe, expect, it } from 'vitest';
import { computeAutoSkill, resolvePlayerSkill } from './playerSkill';
import type { AggregatedStats } from './playerStats';
import type { Player } from './types';

function stats(overrides: Partial<AggregatedStats> = {}): AggregatedStats {
  return {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    championships: 0,
    ...overrides,
  };
}

function player(overrides: Partial<Player> = {}): Player {
  return { id: 'p1', name: 'Alice', createdAt: '2026-01-01T00:00:00Z', ...overrides };
}

describe('computeAutoSkill', () => {
  it('returns sedang when played < minGames', () => {
    expect(computeAutoSkill(stats({ played: 4, won: 4 }))).toBe('sedang');
  });

  it('returns jago when winRate >= 0.6', () => {
    expect(computeAutoSkill(stats({ played: 10, won: 6 }))).toBe('jago');
    expect(computeAutoSkill(stats({ played: 10, won: 10 }))).toBe('jago');
  });

  it('returns sedang when winRate >= 0.4 and < 0.6', () => {
    expect(computeAutoSkill(stats({ played: 10, won: 4 }))).toBe('sedang');
    expect(computeAutoSkill(stats({ played: 10, won: 5 }))).toBe('sedang');
  });

  it('returns pemula when winRate < 0.4', () => {
    expect(computeAutoSkill(stats({ played: 10, won: 3 }))).toBe('pemula');
    expect(computeAutoSkill(stats({ played: 10, won: 0 }))).toBe('pemula');
  });
});

describe('resolvePlayerSkill', () => {
  it('uses override when set', () => {
    expect(resolvePlayerSkill(player({ skillOverride: 'jago' }), stats({ played: 10, won: 0 }))).toBe('jago');
    expect(resolvePlayerSkill(player({ skillOverride: 'pemula' }), stats({ played: 10, won: 10 }))).toBe('pemula');
  });

  it('falls back to auto when override is null', () => {
    expect(resolvePlayerSkill(player({ skillOverride: null }), stats({ played: 10, won: 8 }))).toBe('jago');
  });

  it('falls back to auto when override is undefined', () => {
    expect(resolvePlayerSkill(player(), stats({ played: 3, won: 3 }))).toBe('sedang');
  });
});
