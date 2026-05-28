import { create } from 'zustand';
import { createSeasonWithSchedule } from '../lib/schedule';
import { getSeasons, saveSeason } from '../lib/storage';
import type { League, Season, Team } from '../lib/types';

interface SeasonStore {
  seasons: Season[];
  fetchSeasons: () => Promise<void>;
  createSeason: (league: League, teams: Team[]) => Promise<Season>;
  updateSeason: (season: Season) => Promise<Season>;
  refresh: () => Promise<void>;
}

export const useSeasonStore = create<SeasonStore>((set) => ({
  seasons: [],

  fetchSeasons: async () => {
    set({ seasons: await getSeasons() });
  },

  createSeason: async (league, teams) => {
    const season = await createSeasonWithSchedule(league, teams);
    set({ seasons: await getSeasons() });
    return season;
  },

  updateSeason: async (season) => {
    const updated = await saveSeason(season);
    set({ seasons: await getSeasons() });
    return updated;
  },

  refresh: async () => {
    set({ seasons: await getSeasons() });
  },
}));
