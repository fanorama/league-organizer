import { create } from 'zustand';
import { getQuickMatchGamesBySession, getQuickMatchSessions, saveQuickMatchGame, saveQuickMatchSession } from '../lib/storage';
import type { QuickMatchGame, QuickMatchSession } from '../lib/types';

interface QuickMatchStore {
  sessions: QuickMatchSession[];
  gamesBySession: Record<string, QuickMatchGame[]>;
  fetchSessions: () => Promise<void>;
  fetchGames: (sessionId: string) => Promise<void>;
  startSession: (player1Id: string, player2Id: string) => Promise<QuickMatchSession>;
  addGame: (game: Omit<QuickMatchGame, 'id'>) => Promise<QuickMatchGame>;
  finishSession: (session: QuickMatchSession) => Promise<QuickMatchSession>;
}

export const useQuickMatchStore = create<QuickMatchStore>((set) => ({
  sessions: [],
  gamesBySession: {},

  fetchSessions: async () => {
    set({ sessions: await getQuickMatchSessions() });
  },

  fetchGames: async (sessionId) => {
    const games = await getQuickMatchGamesBySession(sessionId);
    set((state) => ({ gamesBySession: { ...state.gamesBySession, [sessionId]: games } }));
  },

  startSession: async (player1Id, player2Id) => {
    const session = await saveQuickMatchSession({
      player1Id,
      player2Id,
      status: 'active',
      createdAt: new Date().toISOString(),
      finishedAt: null,
    });
    set({ sessions: await getQuickMatchSessions() });
    return session;
  },

  addGame: async (game) => {
    const saved = await saveQuickMatchGame(game);
    const games = await getQuickMatchGamesBySession(saved.sessionId);
    set((state) => ({ gamesBySession: { ...state.gamesBySession, [saved.sessionId]: games } }));
    return saved;
  },

  finishSession: async (session) => {
    const saved = await saveQuickMatchSession({
      ...session,
      status: 'finished',
      finishedAt: new Date().toISOString(),
    });
    set({ sessions: await getQuickMatchSessions() });
    return saved;
  },
}));
