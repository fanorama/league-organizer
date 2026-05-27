import { create } from 'zustand';
import { KEYS, getAll, save } from '../lib/storage';
import type { Match } from '../lib/types';

interface MatchStore {
  matches: Match[];
  updateMatch: (match: Match) => Match;
  refresh: () => void;
}

export const useMatchStore = create<MatchStore>((set) => ({
  matches: getAll<Match>(KEYS.matches),

  updateMatch: (match) => {
    const updated = save<Match>(KEYS.matches, match);
    set({ matches: getAll<Match>(KEYS.matches) });
    return updated;
  },

  refresh: () => set({ matches: getAll<Match>(KEYS.matches) }),
}));
