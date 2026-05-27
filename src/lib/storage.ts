import type { AppSettings, CacheEntry } from './types';

export const KEYS = {
  settings: 'app_settings',
  leagues: 'leagues',
  teams: 'teams',
  seasons: 'seasons',
  matches: 'matches',
  clubsCache: 'clubs_cache',
  players: 'players',
} as const;

export function getAll<T = { id: string }>(key: string): T[] {
  return JSON.parse(localStorage.getItem(key) || '[]') as T[];
}

export function setAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export function getById<T extends { id: string } = any>(key: string, id: string | null | undefined): T | null {
  return getAll<T>(key).find((item) => item.id === id) || null;
}

export function createId(): string {
  const browserCrypto = globalThis.crypto;
  if (browserCrypto && typeof browserCrypto.randomUUID === 'function') {
    return browserCrypto.randomUUID();
  }

  if (browserCrypto && typeof browserCrypto.getRandomValues === 'function') {
    const bytes = browserCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function save<T extends object>(key: string, item: T & { id?: string }): T & { id: string } {
  const items = getAll<T & { id: string }>(key);
  const next = {
    ...item,
    id: item.id || createId(),
  } as T & { id: string };
  const index = items.findIndex((candidate) => candidate.id === next.id);
  if (index >= 0) {
    items[index] = next;
  } else {
    items.push(next);
  }
  setAll(key, items);
  return next;
}

export function remove(key: string, id: string): void {
  setAll(key, getAll<{ id: string }>(key).filter((item) => item.id !== id));
}

export function getSettings(): AppSettings {
  return JSON.parse(localStorage.getItem(KEYS.settings) || '{"apiKey":""}') as AppSettings;
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...settings };
  localStorage.setItem(KEYS.settings, JSON.stringify(next));
  return next;
}

export function getCache<T = CacheEntry>(): Record<string, T> {
  return JSON.parse(localStorage.getItem(KEYS.clubsCache) || '{}') as Record<string, T>;
}

export function saveCache<T>(cache: Record<string, T>): Record<string, T> {
  localStorage.setItem(KEYS.clubsCache, JSON.stringify(cache));
  return cache;
}

export function cascadeDeleteLeague(leagueId: string): void {
  const seasons = getAll<{ id: string; leagueId: string }>(KEYS.seasons).filter((season) => season.leagueId === leagueId);
  const seasonIds = new Set(seasons.map((season) => season.id));
  remove(KEYS.leagues, leagueId);
  setAll(KEYS.teams, getAll<{ leagueId: string }>(KEYS.teams).filter((team) => team.leagueId !== leagueId));
  setAll(KEYS.seasons, getAll<{ leagueId: string }>(KEYS.seasons).filter((season) => season.leagueId !== leagueId));
  setAll(KEYS.matches, getAll<{ seasonId: string }>(KEYS.matches).filter((match) => !seasonIds.has(match.seasonId)));
}

export function byCreatedAtDesc<T extends { createdAt: string }>(a: T, b: T): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
