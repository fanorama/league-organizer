import { create } from 'zustand';
import { deleteLeague, getLeagues, saveLeague } from '../lib/storage';
import type { League } from '../lib/types';

interface LeagueStore {
  leagues: League[];
  fetchLeagues: () => Promise<void>;
  createLeague: (data: Omit<League, 'id'>) => Promise<League>;
  updateLeague: (league: League) => Promise<League>;
  deleteLeague: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useLeagueStore = create<LeagueStore>((set) => ({
  leagues: [],

  fetchLeagues: async () => {
    set({ leagues: await getLeagues() });
  },

  createLeague: async (data) => {
    const league = await saveLeague(data);
    set({ leagues: await getLeagues() });
    return league;
  },

  updateLeague: async (league) => {
    const updated = await saveLeague(league);
    set({ leagues: await getLeagues() });
    return updated;
  },

  deleteLeague: async (id) => {
    await deleteLeague(id);
    set({ leagues: await getLeagues() });
  },

  refresh: async () => {
    set({ leagues: await getLeagues() });
  },
}));
