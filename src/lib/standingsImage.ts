import type { Match, Team } from './types';

const LOGO_PALETTE = [
  '#dc2626',
  '#0ea5e9',
  '#16a34a',
  '#f59e0b',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#ea580c',
  '#4f46e5',
  '#65a30d',
];

export function teamLogoUrl(team: Team): string | null {
  for (const value of [team.badge, team.logo]) {
    if (!value || !/^https?:\/\//.test(value)) continue;
    try {
      const parsed = new URL(value);
      if (parsed.hostname === 'media.api-sports.io' && team.externalId) {
        return `https://media.api-sports.io/football/teams/${encodeURIComponent(team.externalId)}.png`;
      }
    } catch {
      return value;
    }
    return value;
  }
  return null;
}

export function proxiedLogoUrl(url: string): string {
  return `/api/crest?url=${encodeURIComponent(url)}`;
}

export function getInitials(team: Team): string {
  const source = (team.shortName || team.name || '?').trim();
  if (!source) return '?';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function getTeamColor(team: Team): string {
  const key = team.id || team.name || '';
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return LOGO_PALETTE[hash % LOGO_PALETTE.length];
}

export function formatGoalDiff(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd);
}

export function latestMatchday(matches: Match[], seasonId: string): number | null {
  const finished = matches.filter(
    (m) => m.seasonId === seasonId && m.status === 'finished' && (m.matchType || 'league') !== 'playoff',
  );
  if (finished.length === 0) return null;
  return Math.max(...finished.map((m) => m.matchday));
}
