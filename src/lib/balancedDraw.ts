import type { Player, Team } from './types';
import type { SkillTier } from './playerSkill';

export type ClubTier = 'elite' | 'mid' | 'underdog';

export const DRAW_WEIGHTS: Record<SkillTier, Record<ClubTier, number>> = {
  jago: { elite: 1, mid: 3, underdog: 6 },
  sedang: { elite: 3, mid: 5, underdog: 3 },
  pemula: { elite: 6, mid: 3, underdog: 1 },
};

export const DRAW_ORDER: SkillTier[] = ['pemula', 'sedang', 'jago'];

function resolveClubTier(team: Team): ClubTier {
  return (team.tier || 'mid') as ClubTier;
}

export function pickWeightedClub(
  poolTeams: Team[],
  playerSkill: SkillTier,
  rng: () => number = Math.random,
): Team | null {
  if (!poolTeams.length) return null;

  const weights = DRAW_WEIGHTS[playerSkill];
  const entries = poolTeams.map((team) => ({
    team,
    weight: weights[resolveClubTier(team)],
  }));

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight === 0) return null;

  let roll = rng() * totalWeight;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.team;
  }

  return entries[entries.length - 1].team;
}

export interface PlayerWithSkill {
  player: Player;
  skill: SkillTier;
}

export function getActiveDrawTier(
  unassignedPlayersWithSkill: PlayerWithSkill[],
): SkillTier | null {
  for (const tier of DRAW_ORDER) {
    if (unassignedPlayersWithSkill.some((p) => p.skill === tier)) {
      return tier;
    }
  }
  return null;
}
