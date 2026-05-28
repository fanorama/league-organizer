import { getCache, saveCache } from './storage';
import type { CacheEntry, ClubFromApi } from './types';

const API_SEASON = 2024;

export const COMPETITIONS = [
  { id: '39', name: 'Premier League', country: 'England' },
  { id: '135', name: 'Serie A', country: 'Italy' },
  { id: '140', name: 'La Liga', country: 'Spain' },
  { id: '78', name: 'Bundesliga', country: 'Germany' },
  { id: '61', name: 'Ligue 1', country: 'France' },
];

export function hasFreshCache(entry?: CacheEntry): boolean {
  if (!entry) return false;
  const age = Date.now() - new Date(entry.fetchedAt).getTime();
  return age < 7 * 24 * 60 * 60 * 1000;
}

export async function fetchClubs(competitionId: string | number): Promise<ClubFromApi[]> {
  const cache = getCache<CacheEntry<ClubFromApi[]>>();
  const cacheKey = `${competitionId}:${API_SEASON}`;
  if (hasFreshCache(cache[cacheKey])) return cache[cacheKey].data;

  const response = await fetch(`/api/football?league=${competitionId}&season=${API_SEASON}`);
  const contentType = response.headers?.get('content-type') ?? '';
  if (contentType && !contentType.includes('application/json')) {
    throw new Error(`Football proxy returned ${contentType} instead of JSON`);
  }

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `API request failed: ${response.status}`);
  if (payload.errors && Object.keys(payload.errors).length) {
    throw new Error(Object.values(payload.errors).flat().join(', '));
  }
  const data = payload.response.map(({ team }: { team: { id: number; name: string; code?: string; logo?: string; country?: string } }) => ({
    id: String(team.id),
    name: team.name,
    shortName: (team.code || team.name.slice(0, 3)).slice(0, 3).toUpperCase(),
    logo: team.logo,
    country: team.country || '',
  }));
  cache[cacheKey] = { data, fetchedAt: new Date().toISOString() };
  saveCache(cache);
  return data;
}
