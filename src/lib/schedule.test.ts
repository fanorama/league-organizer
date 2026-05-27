import { describe, it, expect } from 'vitest';
import { generateRoundRobin, resolveMultiLegWinnerPublic } from './schedule';
import type { Match, PlayoffSlot } from './types';

describe('generateRoundRobin', () => {
  it('returns empty array for less than 2 teams', () => {
    expect(generateRoundRobin([])).toEqual([]);
    expect(generateRoundRobin(['team1'])).toEqual([]);
  });

  it('generates correct number of rounds for even teams', () => {
    const rounds = generateRoundRobin(['a', 'b', 'c', 'd']);
    expect(rounds).toHaveLength(3);
  });

  it('generates correct number of rounds for odd teams', () => {
    const rounds = generateRoundRobin(['a', 'b', 'c']);
    expect(rounds).toHaveLength(3);
  });

  it('each team plays exactly once per round (even teams)', () => {
    const teams = ['a', 'b', 'c', 'd'];
    const rounds = generateRoundRobin(teams);
    rounds.forEach((round) => {
      const participants = round.flatMap((m) => [m.homeTeamId, m.awayTeamId]);
      expect(new Set(participants).size).toBe(participants.length);
    });
  });

  it('doubles total rounds when meetingsPerSeason is 2', () => {
    const rounds1 = generateRoundRobin(['a', 'b', 'c', 'd'], 1);
    const rounds2 = generateRoundRobin(['a', 'b', 'c', 'd'], 2);
    expect(rounds2).toHaveLength(rounds1.length * 2);
  });
});

describe('resolveMultiLegWinnerPublic', () => {
  const makeSlot = (team1: string, team2: string): PlayoffSlot =>
    ({ team1, team2, matchIds: [] }) as unknown as PlayoffSlot;

  const makeMatch = (homeId: string, awayId: string, homeScore: number, awayScore: number): Match =>
    ({
      id: 'x',
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeScore,
      awayScore,
      status: 'finished',
      matchType: 'playoff',
    }) as unknown as Match;

  it('returns team1 when team1 wins on aggregate', () => {
    const slot = makeSlot('A', 'B');
    const matches = [makeMatch('A', 'B', 2, 0)];
    expect(resolveMultiLegWinnerPublic(slot, matches)).toBe('A');
  });

  it('returns team2 when team2 wins on aggregate', () => {
    const slot = makeSlot('A', 'B');
    const matches = [makeMatch('A', 'B', 0, 2)];
    expect(resolveMultiLegWinnerPublic(slot, matches)).toBe('B');
  });

  it('returns null when aggregate is tied', () => {
    const slot = makeSlot('A', 'B');
    const matches = [makeMatch('A', 'B', 1, 1)];
    expect(resolveMultiLegWinnerPublic(slot, matches)).toBeNull();
  });

  it('returns null when a match is not finished yet', () => {
    const slot = makeSlot('A', 'B');
    const unfinished = { ...makeMatch('A', 'B', 2, 0), status: 'scheduled' } as unknown as Match;
    expect(resolveMultiLegWinnerPublic(slot, [unfinished])).toBeNull();
  });

  it('resolves two-leg aggregate correctly', () => {
    const slot = makeSlot('A', 'B');
    // Leg 1: A(home) 1-2 B — B leads 2-1
    // Leg 2: B(home) 0-1 A — A scores 1 away, aggregate 2-2
    const leg1 = makeMatch('A', 'B', 1, 2);
    const leg2 = makeMatch('B', 'A', 0, 1); // away team A scores 1
    // Total: A=2, B=2 → tied
    expect(resolveMultiLegWinnerPublic(slot, [leg1, leg2])).toBeNull();
  });

  it('resolves extra leg winner correctly', () => {
    const slot = makeSlot('A', 'B');
    const extraLeg: Match = {
      ...makeMatch('A', 'B', 2, 1),
      bracketSlot: { bracket: 'upper', round: 0, isExtraLeg: true },
    } as unknown as Match;
    expect(resolveMultiLegWinnerPublic(slot, [extraLeg])).toBe('A');
  });

  it('returns null for tied extra leg', () => {
    const slot = makeSlot('A', 'B');
    const extraLeg: Match = {
      ...makeMatch('A', 'B', 1, 1),
      bracketSlot: { bracket: 'upper', round: 0, isExtraLeg: true },
    } as unknown as Match;
    expect(resolveMultiLegWinnerPublic(slot, [extraLeg])).toBeNull();
  });

  it('returns slot.team1 when no matches and no matchIds', () => {
    const slot: PlayoffSlot = { team1: 'A', team2: 'B', matchIds: [] };
    expect(resolveMultiLegWinnerPublic(slot, [])).toBe('A');
  });
});
