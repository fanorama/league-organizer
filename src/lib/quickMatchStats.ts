import type { QuickMatchGame, QuickMatchSession } from './types';

export interface QuickMatchStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
}

export function calculateQuickMatchStatsFromData(
  playerId: string,
  sessions: QuickMatchSession[],
  gamesBySession: Record<string, QuickMatchGame[]>,
): QuickMatchStats {
  return sessions.reduce<QuickMatchStats>((total, session) => {
    const side = session.player1Id === playerId ? 'player1' : session.player2Id === playerId ? 'player2' : null;
    if (!side) return total;

    for (const game of gamesBySession[session.id] ?? []) {
      total.played += 1;
      if (game.player1Score === game.player2Score) {
        total.drawn += 1;
      } else if (
        (side === 'player1' && game.player1Score > game.player2Score)
        || (side === 'player2' && game.player2Score > game.player1Score)
      ) {
        total.won += 1;
      } else {
        total.lost += 1;
      }
    }

    return total;
  }, { played: 0, won: 0, drawn: 0, lost: 0 });
}
