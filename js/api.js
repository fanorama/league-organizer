import { getCache, getSettings, saveCache } from "./storage.js";

const API_BASE_URL = "https://v3.football.api-sports.io";
const API_SEASON = 2024;

export const COMPETITIONS = [
  { id: "39", name: "Premier League", country: "England" },
  { id: "135", name: "Serie A", country: "Italy" },
  { id: "140", name: "La Liga", country: "Spain" },
  { id: "78", name: "Bundesliga", country: "Germany" },
  { id: "61", name: "Ligue 1", country: "France" }
];

export function hasFreshCache(entry) {
  if (!entry) return false;
  const age = Date.now() - new Date(entry.fetchedAt).getTime();
  return age < 7 * 24 * 60 * 60 * 1000;
}

export async function fetchClubs(competitionId) {
  const cache = getCache();
  const cacheKey = `${competitionId}:${API_SEASON}`;
  if (hasFreshCache(cache[cacheKey])) return cache[cacheKey].data;

  const { apiKey } = getSettings();
  if (!apiKey) {
    window.location.href = "settings.html";
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/teams?league=${competitionId}&season=${API_SEASON}`, {
    headers: { "x-apisports-key": apiKey }
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  const payload = await response.json();
  if (payload.errors && Object.keys(payload.errors).length) {
    throw new Error(Object.values(payload.errors).flat().join(", "));
  }
  const data = payload.response.map(({ team }) => ({
    id: String(team.id),
    name: team.name,
    shortName: (team.code || team.name.slice(0, 3)).slice(0, 3).toUpperCase(),
    logo: team.logo,
    country: team.country || ""
  }));
  cache[cacheKey] = { data, fetchedAt: new Date().toISOString() };
  saveCache(cache);
  return data;
}
