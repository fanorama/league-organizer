import { create } from 'zustand';
import { getMatches, saveMatch, saveMatches } from '../lib/storage';
import type { Match } from '../lib/types';

interface MatchStore {
  matches: Match[];
  fetchMatches: () => Promise<void>;
  updateMatch: (match: Match) => Promise<Match>;
  addMatches: (matches: (Omit<Match, 'id'> | Match)[]) => Promise<Match[]>;
  refresh: () => Promise<void>;
}

export const useMatchStore = create<MatchStore>((set) => ({
  matches: [],

  fetchMatches: async () => {
    set({ matches: await getMatches() });
  },

  updateMatch: async (match) => {
    const updated = await saveMatch(match);
    set({ matches: await getMatches() });
    return updated;
  },

  addMatches: async (matches) => {
    const saved = await saveMatches(matches);
    set({ matches: await getMatches() });
    return saved;
  },

  refresh: async () => {
    set({ matches: await getMatches() });
  },
}));
