import type { Player } from './types';
import type { AggregatedStats } from './playerStats';

export type SkillTier = 'jago' | 'sedang' | 'pemula';

export const SKILL_THRESHOLDS = {
  jagoMinWinRate: 0.6,
  sedangMinWinRate: 0.4,
  minGames: 5,
} as const;

export function computeAutoSkill(stats: AggregatedStats): SkillTier {
  if (stats.played < SKILL_THRESHOLDS.minGames) return 'sedang';

  const winRate = stats.won / stats.played;

  if (winRate >= SKILL_THRESHOLDS.jagoMinWinRate) return 'jago';
  if (winRate >= SKILL_THRESHOLDS.sedangMinWinRate) return 'sedang';
  return 'pemula';
}

export function resolvePlayerSkill(player: Player, stats: AggregatedStats): SkillTier {
  if (player.skillOverride) return player.skillOverride;
  return computeAutoSkill(stats);
}
