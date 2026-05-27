import { create } from 'zustand';
import { KEYS, getAll, save } from '../lib/storage';
import { createSeasonWithSchedule } from '../lib/schedule';
import type { League, Season, Team } from '../lib/types';

interface SeasonStore {
  seasons: Season[];
  createSeason: (league: League, teams: Team[]) => Season;
  updateSeason: (season: Season) => Season;
  refresh: () => void;
}

export const useSeasonStore = create<SeasonStore>((set) => ({
  seasons: getAll<Season>(KEYS.seasons),

  createSeason: (league, teams) => {
    const season = createSeasonWithSchedule(league, teams);
    set({ seasons: getAll<Season>(KEYS.seasons) });
    return season;
  },

  updateSeason: (season) => {
    const updated = save<Season>(KEYS.seasons, season);
    set({ seasons: getAll<Season>(KEYS.seasons) });
    return updated;
  },

  refresh: () => set({ seasons: getAll<Season>(KEYS.seasons) }),
}));
