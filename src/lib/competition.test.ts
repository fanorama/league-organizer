import { describe, expect, it } from 'vitest';
import {
  advanceKnockout,
  assignPots,
  computeGroupStandings,
  distributeToGroups,
  drawGroupsFromPots,
  generateGroupSchedule,
  generateKnockoutMatchesForRound,
  rankBestThirds,
  resolveTieWinner,
  seedKnockout,
  type CompetitionStandingsRow,
} from './competition';
import type { CompetitionMatch, CompetitionParticipant, CompetitionSettings, GroupDef } from './types';

function participant(overrides: Partial<CompetitionParticipant> = {}): CompetitionParticipant {
  return {
    id: 'p1',
    competitionId: 'c1',
    playerId: 'pl1',
    ...overrides,
  };
}

// rng deterministik: sekuens yang berputar
function seqRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

function gmatch(overrides: Partial<CompetitionMatch>): CompetitionMatch {
  return {
    id: 'm',
    competitionId: 'c1',
    stage: 'group',
    status: 'finished',
    ...overrides,
  };
}

describe('distributeToGroups', () => {
  it('16 peserta / 4 grup → 4×4', () => {
    const ids = Array.from({ length: 16 }, (_, i) => `p${i}`);
    const groups = distributeToGroups(ids, 4, () => 0);
    expect(groups.map((g) => g.participantIds.length)).toEqual([4, 4, 4, 4]);
    expect(groups.map((g) => g.key)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('17 peserta / 4 grup → [5,4,4,4]', () => {
    const ids = Array.from({ length: 17 }, (_, i) => `p${i}`);
    const groups = distributeToGroups(ids, 4, () => 0);
    expect(groups.map((g) => g.participantIds.length)).toEqual([5, 4, 4, 4]);
  });

  it('0 peserta → grup kosong', () => {
    const groups = distributeToGroups([], 3, () => 0);
    expect(groups.map((g) => g.participantIds.length)).toEqual([0, 0, 0]);
  });

  it('groupCount=1 → semua di A', () => {
    const groups = distributeToGroups(['a', 'b', 'c'], 1, () => 0);
    expect(groups).toHaveLength(1);
    expect(groups[0].participantIds).toHaveLength(3);
  });
});

describe('assignPots', () => {
  it('membagi merata ke potCount pot urut kekuatan tier', () => {
    const ps = [
      participant({ id: 'a', clubTier: 'underdog' }),
      participant({ id: 'b', clubTier: 'elite' }),
      participant({ id: 'c', clubTier: 'mid' }),
      participant({ id: 'd', clubTier: 'elite' }),
    ];
    const result = assignPots(ps, 2);
    const potOf = (id: string) => result.find((p) => p.id === id)!.pot;
    // elite (b,d) → pot 1; mid (c), underdog (a) → pot 2
    expect(potOf('b')).toBe(1);
    expect(potOf('d')).toBe(1);
    expect(potOf('c')).toBe(2);
    expect(potOf('a')).toBe(2);
  });

  it('potCount=1 → semua pot 1', () => {
    const ps = [participant({ id: 'a' }), participant({ id: 'b' })];
    expect(assignPots(ps, 1).every((p) => p.pot === 1)).toBe(true);
  });
});

describe('drawGroupsFromPots', () => {
  it('tidak ada collision pot-sama saat ukuran rata (16/4, 4 pot)', () => {
    const ps = Array.from({ length: 16 }, (_, i) =>
      participant({ id: `p${i}`, pot: Math.floor(i / 4) + 1 }),
    );
    const groups = drawGroupsFromPots(ps, 4, 4, seqRng([0.1, 0.5, 0.9, 0.3]));
    expect(groups.map((g) => g.participantIds.length)).toEqual([4, 4, 4, 4]);
    // tiap grup harus punya tepat satu peserta dari tiap pot
    groups.forEach((g) => {
      const pots = g.participantIds.map((id) => ps.find((p) => p.id === id)!.pot);
      expect(new Set(pots).size).toBe(4);
    });
  });

  it('17/4 → fallback sisa benar (ukuran [5,4,4,4])', () => {
    const ps = Array.from({ length: 17 }, (_, i) =>
      participant({ id: `p${i}`, pot: Math.min(4, Math.floor(i / 4) + 1) }),
    );
    const groups = drawGroupsFromPots(ps, 4, 4, seqRng([0.2, 0.7, 0.4, 0.9]));
    expect(groups.map((g) => g.participantIds.length)).toEqual([5, 4, 4, 4]);
    const total = groups.reduce((s, g) => s + g.participantIds.length, 0);
    expect(total).toBe(17);
  });
});

describe('computeGroupStandings', () => {
  const group: GroupDef = { key: 'A', participantIds: ['a', 'b', 'c', 'd'] };
  const participants = ['a', 'b', 'c', 'd'].map((id) => participant({ id, clubName: id.toUpperCase() }));

  it('menghitung poin & urutan benar', () => {
    const matches: CompetitionMatch[] = [
      gmatch({ id: 'm1', groupKey: 'A', homeParticipantId: 'a', awayParticipantId: 'b', homeScore: 3, awayScore: 0 }),
      gmatch({ id: 'm2', groupKey: 'A', homeParticipantId: 'c', awayParticipantId: 'd', homeScore: 1, awayScore: 1 }),
      gmatch({ id: 'm3', groupKey: 'A', homeParticipantId: 'a', awayParticipantId: 'c', homeScore: 2, awayScore: 1 }),
    ];
    const rows = computeGroupStandings(group, participants, matches);
    expect(rows[0].participantId).toBe('a');
    expect(rows[0].pts).toBe(6);
    expect(rows[0].rank).toBe(1);
  });

  it('mengabaikan match grup lain & yang belum selesai', () => {
    const matches: CompetitionMatch[] = [
      gmatch({ id: 'm1', groupKey: 'B', homeParticipantId: 'a', awayParticipantId: 'b', homeScore: 5, awayScore: 0 }),
      gmatch({ id: 'm2', groupKey: 'A', status: 'scheduled', homeParticipantId: 'a', awayParticipantId: 'b', homeScore: null, awayScore: null }),
    ];
    const rows = computeGroupStandings(group, participants, matches);
    expect(rows.every((r) => r.played === 0)).toBe(true);
  });

  it('tiebreak GD lalu GF', () => {
    const matches: CompetitionMatch[] = [
      gmatch({ id: 'm1', groupKey: 'A', homeParticipantId: 'a', awayParticipantId: 'c', homeScore: 4, awayScore: 0 }),
      gmatch({ id: 'm2', groupKey: 'A', homeParticipantId: 'b', awayParticipantId: 'd', homeScore: 2, awayScore: 0 }),
    ];
    const rows = computeGroupStandings(group, participants, matches);
    // a & b sama-sama 3 pts; a GD+4 > b GD+2
    expect(rows[0].participantId).toBe('a');
    expect(rows[1].participantId).toBe('b');
  });
});

describe('rankBestThirds', () => {
  it('memilih best-third terbaik dengan tiebreak', () => {
    const mkRow = (id: string, pts: number, gd: number): CompetitionStandingsRow => ({
      participantId: id, played: 2, won: 0, drawn: 0, lost: 0, gf: gd, ga: 0, gd, pts, rank: 3,
    });
    const standings: CompetitionStandingsRow[][] = [
      [mkRow('1a', 6, 0), mkRow('2a', 3, 0), mkRow('3a', 4, 5)],
      [mkRow('1b', 6, 0), mkRow('2b', 3, 0), mkRow('3b', 4, 2)],
      [mkRow('1c', 6, 0), mkRow('2c', 3, 0), mkRow('3c', 1, 0)],
      [mkRow('1d', 6, 0), mkRow('2d', 3, 0), mkRow('3d', 3, 0)],
    ];
    expect(rankBestThirds(standings, 2)).toEqual(['3a', '3b']);
  });
});

describe('generateGroupSchedule', () => {
  const groups: GroupDef[] = [{ key: 'A', participantIds: ['a', 'b', 'c', 'd'] }];

  it('4 peserta meetings=1 → 6 match', () => {
    expect(generateGroupSchedule(groups, 1, 'c1')).toHaveLength(6);
  });

  it('4 peserta meetings=2 → 12 match', () => {
    expect(generateGroupSchedule(groups, 2, 'c1')).toHaveLength(12);
  });
});

describe('seedKnockout', () => {
  function standings(groupCount: number): CompetitionStandingsRow[][] {
    const mk = (id: string, rank: number): CompetitionStandingsRow => ({
      participantId: id, played: 3, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 9 - rank, rank,
    });
    return Array.from({ length: groupCount }, (_, g) => {
      const letter = String.fromCharCode(65 + g);
      return [mk(`1${letter}`, 1), mk(`2${letter}`, 2), mk(`3${letter}`, 3), mk(`4${letter}`, 4)];
    });
  }

  it('8 grup top2 → 16 peserta, 8 tie babak-1 pairing 1A-2B', () => {
    const settings: CompetitionSettings = { groupCount: 8, meetingsPerPair: 1, qualifyMode: 'top2', knockoutLegs: 1, potCount: 4 };
    const bracket = seedKnockout([], standings(8), settings);
    expect(bracket.rounds[0]).toHaveLength(8);
    expect(bracket.seeds).toHaveLength(16);
    expect(bracket.rounds[0][0].team1).toBe('1A');
    expect(bracket.rounds[0][0].team2).toBe('2B');
    expect(bracket.rounds[0][1].team1).toBe('1B');
    expect(bracket.rounds[0][1].team2).toBe('2A');
    // total rounds: 8→4→2→1 = 4 ronde
    expect(bracket.rounds).toHaveLength(4);
  });

  it('6 grup top2_plus_best_thirds(4) → 16 peserta via lookup', () => {
    const settings: CompetitionSettings = { groupCount: 6, meetingsPerPair: 1, qualifyMode: 'top2_plus_best_thirds', bestThirdsCount: 4, knockoutLegs: 1, potCount: 4 };
    const bracket = seedKnockout([], standings(6), settings);
    expect(bracket.rounds[0]).toHaveLength(8);
    expect(bracket.warning).toBeUndefined();
    expect(bracket.seeds).toHaveLength(16);
  });

  it('groupCount tak didukung untuk best-thirds → fallback + warning', () => {
    const settings: CompetitionSettings = { groupCount: 5, meetingsPerPair: 1, qualifyMode: 'top2_plus_best_thirds', bestThirdsCount: 2, knockoutLegs: 1, potCount: 4 };
    const bracket = seedKnockout([], standings(5), settings);
    expect(bracket.warning).toBeDefined();
  });

  it('top1 dengan jumlah ganjil → ada bye', () => {
    const settings: CompetitionSettings = { groupCount: 3, meetingsPerPair: 1, qualifyMode: 'top1', knockoutLegs: 1, potCount: 1 };
    const bracket = seedKnockout([], standings(3), settings);
    // 3 juara → pad ke 4 → 2 tie, satu di antaranya bye
    expect(bracket.rounds[0]).toHaveLength(2);
    expect(bracket.rounds[0].some((t) => t.bye)).toBe(true);
  });
});

describe('resolveTieWinner', () => {
  const settingsLegs2: 1 | 2 = 2;

  it('single leg: pemenang skor', () => {
    const t = { team1: 'a', team2: 'b', matchIds: ['m1'] };
    const matches: CompetitionMatch[] = [
      gmatch({ id: 'm1', stage: 'knockout', homeParticipantId: 'a', awayParticipantId: 'b', homeScore: 2, awayScore: 1 }),
    ];
    expect(resolveTieWinner(t, matches, 1)).toBe('a');
  });

  it('single leg seri → butuh manual', () => {
    const t = { team1: 'a', team2: 'b', matchIds: ['m1'] };
    const matches: CompetitionMatch[] = [
      gmatch({ id: 'm1', stage: 'knockout', homeParticipantId: 'a', awayParticipantId: 'b', homeScore: 1, awayScore: 1 }),
    ];
    expect(resolveTieWinner(t, matches, 1)).toBeNull();
    expect(resolveTieWinner(t, matches, 1, 'b')).toBe('b');
  });

  it('two-legged agregat (1-2 & 2-1) → seri → butuh manual', () => {
    const t = { team1: 'a', team2: 'b', matchIds: ['m1', 'm2'] };
    const matches: CompetitionMatch[] = [
      gmatch({ id: 'm1', stage: 'knockout', homeParticipantId: 'a', awayParticipantId: 'b', homeScore: 1, awayScore: 2 }),
      gmatch({ id: 'm2', stage: 'knockout', homeParticipantId: 'b', awayParticipantId: 'a', homeScore: 1, awayScore: 2 }),
    ];
    // a: 1 + 2 = 3; b: 2 + 1 = 3 → seri
    expect(resolveTieWinner(t, matches, settingsLegs2)).toBeNull();
    expect(resolveTieWinner(t, matches, settingsLegs2, 'a')).toBe('a');
  });

  it('two-legged agregat menang jelas', () => {
    const t = { team1: 'a', team2: 'b', matchIds: ['m1', 'm2'] };
    const matches: CompetitionMatch[] = [
      gmatch({ id: 'm1', stage: 'knockout', homeParticipantId: 'a', awayParticipantId: 'b', homeScore: 3, awayScore: 0 }),
      gmatch({ id: 'm2', stage: 'knockout', homeParticipantId: 'b', awayParticipantId: 'a', homeScore: 1, awayScore: 0 }),
    ];
    expect(resolveTieWinner(t, matches, settingsLegs2)).toBe('a');
  });

  it('belum semua leg selesai → null', () => {
    const t = { team1: 'a', team2: 'b', matchIds: ['m1', 'm2'] };
    const matches: CompetitionMatch[] = [
      gmatch({ id: 'm1', stage: 'knockout', homeParticipantId: 'a', awayParticipantId: 'b', homeScore: 1, awayScore: 0 }),
    ];
    expect(resolveTieWinner(t, matches, settingsLegs2)).toBeNull();
  });

  it('bye → otomatis team1', () => {
    const t = { team1: 'a', team2: null, matchIds: [], bye: true, winner: 'a' };
    expect(resolveTieWinner(t, [], 1)).toBe('a');
  });
});

describe('advanceKnockout', () => {
  const settings: CompetitionSettings = { groupCount: 4, meetingsPerPair: 1, qualifyMode: 'top1', knockoutLegs: 1, potCount: 1 };

  it('mengisi winner & propagasi ke babak berikut', () => {
    const bracket = {
      rounds: [
        [
          { team1: 'a', team2: 'b', matchIds: ['m1'] },
          { team1: 'c', team2: 'd', matchIds: ['m2'] },
        ],
        [{ team1: null, team2: null, matchIds: [] }],
      ],
    };
    const matches: CompetitionMatch[] = [
      gmatch({ id: 'm1', stage: 'knockout', homeParticipantId: 'a', awayParticipantId: 'b', homeScore: 2, awayScore: 0 }),
      gmatch({ id: 'm2', stage: 'knockout', homeParticipantId: 'c', awayParticipantId: 'd', homeScore: 0, awayScore: 1 }),
    ];
    const result = advanceKnockout(bracket, matches, settings);
    expect(result.rounds[0][0].winner).toBe('a');
    expect(result.rounds[0][1].winner).toBe('d');
    expect(result.rounds[1][0].team1).toBe('a');
    expect(result.rounds[1][0].team2).toBe('d');
  });
});

describe('generateKnockoutMatchesForRound', () => {
  it('final selalu 1 leg meski knockoutLegs=2', () => {
    const bracket = {
      rounds: [
        [
          { team1: 'a', team2: 'b', matchIds: [] },
          { team1: 'c', team2: 'd', matchIds: [] },
        ],
        [{ team1: 'a', team2: 'c', matchIds: [] }],
      ],
    };
    // babak 0 (bukan final) dengan legs=2 → 2 leg per tie → 4 match
    expect(generateKnockoutMatchesForRound(bracket, 0, 2, 'c1')).toHaveLength(4);
    // babak 1 = final → 1 leg
    expect(generateKnockoutMatchesForRound(bracket, 1, 2, 'c1')).toHaveLength(1);
  });

  it('melewati tie bye / belum lengkap', () => {
    const bracket = {
      rounds: [
        [
          { team1: 'a', team2: null, matchIds: [], bye: true, winner: 'a' },
          { team1: 'c', team2: 'd', matchIds: [] },
        ],
        [{ team1: null, team2: null, matchIds: [] }],
      ],
    };
    expect(generateKnockoutMatchesForRound(bracket, 0, 1, 'c1')).toHaveLength(1);
  });
});
