import { describe, expect, it } from 'vitest';
import type { QuickMatchGame, QuickMatchSession } from './types';
import { calculateQuickMatchStatsFromData } from './quickMatchStats';

const sessions: QuickMatchSession[] = [
  { id: 's1', player1Id: 'p1', player2Id: 'p2', status: 'finished', createdAt: '2026-05-28T01:00:00Z', finishedAt: '2026-05-28T02:00:00Z' },
  { id: 's2', player1Id: 'p3', player2Id: 'p1', status: 'active', createdAt: '2026-05-28T03:00:00Z', finishedAt: null },
];

const gamesBySession: Record<string, QuickMatchGame[]> = {
  s1: [
    { id: 'g1', sessionId: 's1', player1Club: { id: 'ars', name: 'Arsenal' }, player2Club: { id: 'che', name: 'Chelsea' }, player1Score: 2, player2Score: 1, createdAt: '2026-05-28T01:10:00Z' },
    { id: 'g2', sessionId: 's1', player1Club: { id: 'liv', name: 'Liverpool' }, player2Club: { id: 'mun', name: 'Man United' }, player1Score: 0, player2Score: 0, createdAt: '2026-05-28T01:20:00Z' },
  ],
  s2: [
    { id: 'g3', sessionId: 's2', player1Club: { id: 'mil', name: 'Milan' }, player2Club: { id: 'int', name: 'Inter' }, player1Score: 3, player2Score: 4, createdAt: '2026-05-28T03:10:00Z' },
  ],
};

describe('calculateQuickMatchStatsFromData', () => {
  it('counts wins draws and losses regardless of player side', () => {
    expect(calculateQuickMatchStatsFromData('p1', sessions, gamesBySession)).toEqual({
      played: 3,
      won: 2,
      drawn: 1,
      lost: 0,
    });
  });
});
