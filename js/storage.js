export const KEYS = {
  settings: "app_settings",
  leagues: "leagues",
  teams: "teams",
  seasons: "seasons",
  matches: "matches",
  clubsCache: "clubs_cache"
};

export function getAll(key) {
  return JSON.parse(localStorage.getItem(key) || "[]");
}

export function setAll(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

export function getById(key, id) {
  return getAll(key).find((item) => item.id === id) || null;
}

export function save(key, item) {
  const items = getAll(key);
  const next = {
    ...item,
    id: item.id || crypto.randomUUID()
  };
  const index = items.findIndex((candidate) => candidate.id === next.id);
  if (index >= 0) {
    items[index] = next;
  } else {
    items.push(next);
  }
  setAll(key, items);
  return next;
}

export function remove(key, id) {
  setAll(key, getAll(key).filter((item) => item.id !== id));
}

export function getSettings() {
  return JSON.parse(localStorage.getItem(KEYS.settings) || "{\"apiKey\":\"\"}");
}

export function saveSettings(settings) {
  const next = { ...getSettings(), ...settings };
  localStorage.setItem(KEYS.settings, JSON.stringify(next));
  return next;
}

export function getCache() {
  return JSON.parse(localStorage.getItem(KEYS.clubsCache) || "{}");
}

export function saveCache(cache) {
  localStorage.setItem(KEYS.clubsCache, JSON.stringify(cache));
  return cache;
}

export function cascadeDeleteLeague(leagueId) {
  const seasons = getAll(KEYS.seasons).filter((season) => season.leagueId === leagueId);
  const seasonIds = new Set(seasons.map((season) => season.id));
  remove(KEYS.leagues, leagueId);
  setAll(KEYS.teams, getAll(KEYS.teams).filter((team) => team.leagueId !== leagueId));
  setAll(KEYS.seasons, getAll(KEYS.seasons).filter((season) => season.leagueId !== leagueId));
  setAll(KEYS.matches, getAll(KEYS.matches).filter((match) => !seasonIds.has(match.seasonId)));
}

export function byCreatedAtDesc(a, b) {
  return new Date(b.createdAt) - new Date(a.createdAt);
}
