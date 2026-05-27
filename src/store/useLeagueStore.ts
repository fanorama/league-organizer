import { create } from 'zustand';
import { KEYS, cascadeDeleteLeague, getAll, save } from '../lib/storage';
import type { League } from '../lib/types';

interface LeagueStore {
  leagues: League[];
  createLeague: (data: Omit<League, 'id'>) => League;
  updateLeague: (league: League) => League;
  deleteLeague: (id: string) => void;
  refresh: () => void;
}

export const useLeagueStore = create<LeagueStore>((set) => ({
  leagues: getAll<League>(KEYS.leagues),

  createLeague: (data) => {
    const league = save<League>(KEYS.leagues, data as League);
    set({ leagues: getAll<League>(KEYS.leagues) });
    return league;
  },

  updateLeague: (league) => {
    const updated = save<League>(KEYS.leagues, league);
    set({ leagues: getAll<League>(KEYS.leagues) });
    return updated;
  },

  deleteLeague: (id) => {
    cascadeDeleteLeague(id);
    set({ leagues: getAll<League>(KEYS.leagues) });
  },

  refresh: () => set({ leagues: getAll<League>(KEYS.leagues) }),
}));
