import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as storage from '../lib/storage';
import type { QuickMatchGame, QuickMatchSession } from '../lib/types';
import { useQuickMatchStore } from './useQuickMatchStore';

vi.mock('../lib/storage');

const session: QuickMatchSession = {
  id: 's1',
  player1Id: 'p1',
  player2Id: 'p2',
  status: 'active',
  createdAt: '2026-05-28T01:00:00Z',
  finishedAt: null,
};

const game: QuickMatchGame = {
  id: 'g1',
  sessionId: 's1',
  player1Club: { id: 'ars', name: 'Arsenal' },
  player2Club: { id: 'che', name: 'Chelsea' },
  player1Score: 3,
  player2Score: 1,
  createdAt: '2026-05-28T01:10:00Z',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(storage.getQuickMatchSessions).mockResolvedValue([]);
  vi.mocked(storage.getQuickMatchGamesBySession).mockResolvedValue([]);
  useQuickMatchStore.setState({ sessions: [], gamesBySession: {} });
});

describe('useQuickMatchStore', () => {
  it('starts a session and refreshes sessions', async () => {
    vi.mocked(storage.saveQuickMatchSession).mockResolvedValue(session);
    vi.mocked(storage.getQuickMatchSessions).mockResolvedValue([session]);

    const saved = await useQuickMatchStore.getState().startSession('p1', 'p2');

    expect(storage.saveQuickMatchSession).toHaveBeenCalledWith({
      player1Id: 'p1',
      player2Id: 'p2',
      status: 'active',
      createdAt: expect.any(String),
      finishedAt: null,
    });
    expect(saved).toEqual(session);
    expect(useQuickMatchStore.getState().sessions).toEqual([session]);
  });

  it('adds a game and refreshes games for that session', async () => {
    vi.mocked(storage.saveQuickMatchGame).mockResolvedValue(game);
    vi.mocked(storage.getQuickMatchGamesBySession).mockResolvedValue([game]);

    const saved = await useQuickMatchStore.getState().addGame({
      sessionId: 's1',
      player1Club: game.player1Club,
      player2Club: game.player2Club,
      player1Score: 3,
      player2Score: 1,
      createdAt: '2026-05-28T01:10:00Z',
    });

    expect(saved).toEqual(game);
    expect(useQuickMatchStore.getState().gamesBySession.s1).toEqual([game]);
  });

  it('finishes a session with a finished timestamp', async () => {
    const finished = { ...session, status: 'finished' as const, finishedAt: '2026-05-28T02:00:00Z' };
    vi.mocked(storage.saveQuickMatchSession).mockResolvedValue(finished);
    vi.mocked(storage.getQuickMatchSessions).mockResolvedValue([finished]);

    const saved = await useQuickMatchStore.getState().finishSession(session);

    expect(storage.saveQuickMatchSession).toHaveBeenCalledWith({
      ...session,
      status: 'finished',
      finishedAt: expect.any(String),
    });
    expect(saved).toEqual(finished);
    expect(useQuickMatchStore.getState().sessions).toEqual([finished]);
  });
});
