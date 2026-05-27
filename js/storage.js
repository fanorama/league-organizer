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

export function createId() {
  const browserCrypto = globalThis.crypto;
  if (browserCrypto && typeof browserCrypto.randomUUID === "function") {
    return browserCrypto.randomUUID();
  }

  if (browserCrypto && typeof browserCrypto.getRandomValues === "function") {
    const bytes = browserCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
    return hex.slice(0, 4).join("") + "-" + hex.slice(4, 6).join("") + "-" + hex.slice(6, 8).join("") + "-" + hex.slice(8, 10).join("") + "-" + hex.slice(10, 16).join("");
  }

  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export function save(key, item) {
  const items = getAll(key);
  const next = {
    ...item,
    id: item.id || createId()
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
