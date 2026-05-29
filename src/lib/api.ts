import { getCache, saveCache } from './storage';
import type { CacheEntry, ClubFromApi } from './types';

export const COMPETITIONS: { code: string; name: string; season?: number }[] = [
  { code: 'PL', name: 'Premier League' },
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'SA', name: 'Serie A' },
  { code: 'DED', name: 'Eredivisie' },
  { code: 'CL', name: 'UEFA Champions League' },
  { code: 'EC', name: 'European Championship', season: 2024 },
  { code: 'WC', name: 'FIFA World Cup', season: 2026 },
];

export function hasFreshCache(entry?: CacheEntry): boolean {
  if (!entry) return false;
  const age = Date.now() - new Date(entry.fetchedAt).getTime();
  return age < 7 * 24 * 60 * 60 * 1000;
}

export async function fetchClubs(competition: string): Promise<ClubFromApi[]> {
  const cache = getCache<CacheEntry<ClubFromApi[]>>();
  const config = COMPETITIONS.find((c) => c.code === competition);
  const cacheKey = config?.season ? `${competition}:${config.season}` : competition;
  if (hasFreshCache(cache[cacheKey])) return cache[cacheKey].data;

  let url = `/api/football?competition=${competition}`;
  if (config?.season) url += `&season=${config.season}`;
  const response = await fetch(url);
  const contentType = response.headers?.get('content-type') ?? '';
  if (contentType && !contentType.includes('application/json')) {
    throw new Error(`Football proxy returned ${contentType} instead of JSON`);
  }

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || `API request failed: ${response.status}`);
  const data = payload.teams.map((team: { id: number; name: string; tla?: string; crest?: string; area?: { name?: string } }) => ({
    id: String(team.id),
    name: team.name,
    shortName: (team.tla || team.name.slice(0, 3)).toUpperCase(),
    logo: team.crest,
    country: team.area?.name ?? '',
  }));
  cache[cacheKey] = { data, fetchedAt: new Date().toISOString() };
  saveCache(cache);
  return data;
}
