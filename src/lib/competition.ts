import { generateRoundRobin } from './schedule';
import type {
  CompetitionBracket,
  CompetitionMatch,
  CompetitionParticipant,
  CompetitionSettings,
  CompetitionTie,
  GroupDef,
} from './types';

/** Match competition yang belum punya id (id di-generate Supabase saat save). */
export type NewCompetitionMatch = Omit<CompetitionMatch, 'id'>;

export interface CompetitionStandingsRow {
  participantId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  rank: number;
}

const TIER_RANK: Record<string, number> = { elite: 0, mid: 1, underdog: 2 };

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function groupKeyFor(index: number): string {
  return String.fromCharCode(65 + index);
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// ===== 1. Distribusi peserta ke grup (selisih ukuran ≤ 1) =====

export function distributeToGroups(
  participantIds: string[],
  groupCount: number,
  rng: () => number = Math.random,
): GroupDef[] {
  const groups: GroupDef[] = Array.from({ length: groupCount }, (_, i) => ({
    key: groupKeyFor(i),
    participantIds: [],
  }));
  const shuffled = shuffleWithRng(participantIds, rng);
  shuffled.forEach((id, i) => {
    groups[i % groupCount].participantIds.push(id);
  });
  return groups;
}

// ===== 2. Assign pot berbasis kekuatan (seed → tier) =====

export function assignPots(
  participants: CompetitionParticipant[],
  potCount: number,
): CompetitionParticipant[] {
  const sorted = [...participants].sort((a, b) => {
    const sa = a.seed ?? Number.POSITIVE_INFINITY;
    const sb = b.seed ?? Number.POSITIVE_INFINITY;
    if (sa !== sb) return sa - sb;
    return TIER_RANK[a.clubTier ?? 'mid'] - TIER_RANK[b.clubTier ?? 'mid'];
  });
  const n = sorted.length;
  const potSize = Math.max(1, Math.ceil(n / potCount));
  return sorted.map((p, i) => ({ ...p, pot: Math.min(potCount, Math.floor(i / potSize) + 1) }));
}

// ===== 3. Draw grup dari pot (hindari collision pot-sama) =====

export function drawGroupsFromPots(
  participants: CompetitionParticipant[],
  groupCount: number,
  potCount: number,
  rng: () => number = Math.random,
): GroupDef[] {
  const n = participants.length;
  const base = Math.floor(n / groupCount);
  const remainder = n % groupCount;
  const groups = Array.from({ length: groupCount }, (_, j) => ({
    key: groupKeyFor(j),
    participantIds: [] as string[],
    pots: new Set<number>(),
    target: base + (j < remainder ? 1 : 0),
  }));

  for (let p = 1; p <= potCount; p += 1) {
    const members = shuffleWithRng(participants.filter((x) => x.pot === p), rng);
    for (const m of members) {
      const withSpace = groups.filter((g) => g.participantIds.length < g.target);
      const preferred = withSpace.filter((g) => !g.pots.has(p));
      const pool = (preferred.length ? preferred : withSpace).sort(
        (a, b) => a.participantIds.length - b.participantIds.length,
      );
      const g = pool[0];
      if (!g) break;
      g.participantIds.push(m.id);
      g.pots.add(p);
      m.groupKey = g.key;
    }
  }

  return groups.map((g) => ({ key: g.key, participantIds: g.participantIds }));
}

// ===== 4. Klasemen grup =====

export function computeGroupStandings(
  group: GroupDef,
  participants: CompetitionParticipant[],
  matches: CompetitionMatch[],
): CompetitionStandingsRow[] {
  const nameOf = (id: string): string => {
    const p = participants.find((x) => x.id === id);
    return p?.clubName || p?.playerId || id;
  };
  const finished = matches.filter(
    (m) => m.stage === 'group' && m.groupKey === group.key && m.status === 'finished',
  );

  const rows = group.participantIds.map((pid) => ({
    participantId: pid,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    pts: 0,
    rank: 0,
  }));
  const byId = Object.fromEntries(rows.map((r) => [r.participantId, r]));

  finished.forEach((m) => {
    const home = m.homeParticipantId ? byId[m.homeParticipantId] : undefined;
    const away = m.awayParticipantId ? byId[m.awayParticipantId] : undefined;
    if (!home || !away) return;
    const hs = Number(m.homeScore);
    const as = Number(m.awayScore);
    home.played += 1;
    away.played += 1;
    home.gf += hs;
    home.ga += as;
    away.gf += as;
    away.ga += hs;
    if (hs > as) {
      home.won += 1;
      home.pts += 3;
      away.lost += 1;
    } else if (hs === as) {
      home.drawn += 1;
      away.drawn += 1;
      home.pts += 1;
      away.pts += 1;
    } else {
      away.won += 1;
      away.pts += 3;
      home.lost += 1;
    }
  });

  rows.forEach((r) => {
    r.gd = r.gf - r.ga;
  });
  rows.sort(
    (a, b) =>
      b.pts - a.pts ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      nameOf(a.participantId).localeCompare(nameOf(b.participantId)),
  );
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

// ===== 5. Ranking best-third lintas grup =====

export function rankBestThirds(
  allGroupStandings: CompetitionStandingsRow[][],
  bestThirdsCount: number,
): string[] {
  const thirds = allGroupStandings.map((g) => g[2]).filter(Boolean) as CompetitionStandingsRow[];
  thirds.sort(
    (a, b) =>
      b.pts - a.pts ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.participantId.localeCompare(b.participantId),
  );
  return thirds.slice(0, bestThirdsCount).map((r) => r.participantId);
}

// ===== 6. Jadwal grup (round-robin per grup) =====

export function generateGroupSchedule(
  groups: GroupDef[],
  meetingsPerPair: 1 | 2,
  competitionId = '',
): NewCompetitionMatch[] {
  const matches: NewCompetitionMatch[] = [];
  groups.forEach((group) => {
    const rounds = generateRoundRobin(group.participantIds, meetingsPerPair);
    rounds.forEach((round) => {
      round.forEach((pair) => {
        matches.push({
          competitionId,
          stage: 'group',
          groupKey: group.key,
          round: null,
          tieIndex: null,
          leg: null,
          homeParticipantId: pair.homeTeamId,
          awayParticipantId: pair.awayTeamId,
          homeScore: null,
          awayScore: null,
          status: 'scheduled',
        });
      });
    });
  });
  return matches;
}

/**
 * Susun match grup menjadi matchday dengan distribusi seimbang ("sebar merata"):
 * setiap matchday idealnya berisi satu laga per grup, tetapi grup yang lebih
 * besar (mis. 5 tim) boleh menaruh laga ekstranya di matchday yang sudah ada
 * selama tak ada tim yang main dua kali dalam matchday tersebut. Hasilnya tidak
 * ada matchday tunggal di ekor. `groupMatches` harus urutan pembuatan.
 */
export function buildGroupMatchdays(
  groups: GroupDef[],
  groupMatches: CompetitionMatch[],
): string[][] {
  const byGroup = new Map<string, CompetitionMatch[]>();
  groupMatches.forEach((m) => {
    const key = m.groupKey ?? '';
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(m);
  });

  const counts = groups.map((g) => byGroup.get(g.key)?.length ?? 0).filter((n) => n > 0);
  if (!counts.length) return [];
  // Target jumlah matchday = jumlah laga grup terbesar KEDUA (grup "normal"),
  // sehingga sisa grup terbesar terserap ke matchday yang ada, bukan jadi ekor.
  const sorted = [...counts].sort((a, b) => b - a);
  const targetDays = Math.max(sorted[1] ?? sorted[0], 1);

  const days: string[][] = [];
  const dayTeams: Set<string>[] = [];
  const ensure = (n: number) => {
    while (days.length < n) { days.push([]); dayTeams.push(new Set()); }
  };
  ensure(targetDays);

  groups.forEach((group) => {
    (byGroup.get(group.key) ?? []).forEach((m) => {
      const home = m.homeParticipantId ?? '';
      const away = m.awayParticipantId ?? '';
      // Pilih matchday dengan laga paling sedikit yang belum memuat kedua tim.
      let best = -1;
      for (let d = 0; d < days.length; d += 1) {
        if (dayTeams[d].has(home) || dayTeams[d].has(away)) continue;
        if (best === -1 || days[d].length < days[best].length) best = d;
      }
      if (best === -1) { ensure(days.length + 1); best = days.length - 1; }
      days[best].push(m.id);
      dayTeams[best].add(home);
      dayTeams[best].add(away);
    });
  });

  return days.filter((md) => md.length);
}

// ===== 7. Seeding knockout + tabel best-third =====

function tie(a?: string | null, b?: string | null): CompetitionTie {
  const t: CompetitionTie = { team1: a ?? null, team2: b ?? null, matchIds: [] };
  if (t.team1 && !t.team2) {
    t.bye = true;
    t.winner = t.team1;
  }
  return t;
}

interface LookupPools {
  champions: string[];
  runners: string[];
  thirds: string[];
}

/**
 * Tabel pairing best-third ala UEFA (simplifikasi MVP, tidak bergantung pada
 * grup mana yang lolos karena best-third sudah dipilih lebih dulu).
 * Grup yang didukung: 6 grup + 4 best-third (16 peserta, gaya Euro 2016).
 */
export const BEST_THIRD_LOOKUP: Record<number, (pools: LookupPools) => CompetitionTie[]> = {
  6: ({ champions, runners, thirds }) => [
    tie(champions[0], thirds[0]),
    tie(champions[1], thirds[1]),
    tie(champions[2], thirds[2]),
    tie(champions[3], thirds[3]),
    tie(champions[4], runners[5]),
    tie(champions[5], runners[4]),
    tie(runners[0], runners[3]),
    tie(runners[1], runners[2]),
  ],
};

function pairAdjacent(seeds: string[]): CompetitionTie[] {
  const size = nextPow2(seeds.length);
  const padded: (string | null)[] = [...seeds];
  while (padded.length < size) padded.push(null);
  const ties: CompetitionTie[] = [];
  for (let i = 0; i < size; i += 2) {
    ties.push(tie(padded[i], padded[i + 1]));
  }
  return ties;
}

function buildTop2Seeds(champions: string[], runners: string[]): string[] {
  const seeds: string[] = [];
  for (let i = 0; i < champions.length; i += 2) {
    const a = i;
    const b = i + 1;
    if (b < champions.length) {
      // pola 1A, 2B, 1B, 2A (cross-group)
      if (champions[a]) seeds.push(champions[a]);
      if (runners[b]) seeds.push(runners[b]);
      if (champions[b]) seeds.push(champions[b]);
      if (runners[a]) seeds.push(runners[a]);
    } else {
      if (champions[a]) seeds.push(champions[a]);
      if (runners[a]) seeds.push(runners[a]);
    }
  }
  return seeds;
}

function buildRounds(firstRoundTies: CompetitionTie[]): CompetitionTie[][] {
  const rounds: CompetitionTie[][] = [firstRoundTies];
  let count = firstRoundTies.length;
  while (count > 1) {
    count = Math.ceil(count / 2);
    rounds.push(Array.from({ length: count }, () => ({ team1: null, team2: null, matchIds: [] })));
  }
  return rounds;
}

export function seedKnockout(
  _groups: GroupDef[],
  allGroupStandings: CompetitionStandingsRow[][],
  settings: CompetitionSettings,
): CompetitionBracket {
  const champions = allGroupStandings.map((g) => g[0]?.participantId).filter(Boolean) as string[];
  const runners = allGroupStandings.map((g) => g[1]?.participantId).filter(Boolean) as string[];

  let firstRoundTies: CompetitionTie[];
  let seeds: string[];
  let warning: string | undefined;

  if (settings.qualifyMode === 'top1') {
    seeds = champions;
    firstRoundTies = pairAdjacent(seeds);
  } else if (settings.qualifyMode === 'top2') {
    seeds = buildTop2Seeds(champions, runners);
    firstRoundTies = pairAdjacent(seeds);
  } else {
    const thirds = rankBestThirds(allGroupStandings, settings.bestThirdsCount ?? 0);
    const lookup = BEST_THIRD_LOOKUP[settings.groupCount];
    if (lookup) {
      firstRoundTies = lookup({ champions, runners, thirds });
      seeds = firstRoundTies.flatMap((t) => [t.team1, t.team2]).filter(Boolean) as string[];
    } else {
      seeds = [...champions, ...runners, ...thirds];
      firstRoundTies = pairAdjacent(seeds);
      warning = `Konfigurasi ${settings.groupCount} grup tidak ada di tabel best-third; memakai penempatan berurutan (fallback).`;
    }
  }

  const bracket: CompetitionBracket = { rounds: buildRounds(firstRoundTies), seeds };
  if (warning) bracket.warning = warning;
  return bracket;
}

// ===== 8. Resolusi tie + advance knockout =====

export function resolveTieWinner(
  t: CompetitionTie,
  matches: CompetitionMatch[],
  _knockoutLegs: 1 | 2,
  manualWinnerId?: string | null,
): string | null {
  if (t.bye) return t.team1 ?? null;
  if (!t.team1 || !t.team2) return null;
  if (!t.matchIds.length) return null;
  const legMatches = matches.filter((m) => t.matchIds.includes(m.id));
  const finished = legMatches.filter((m) => m.status === 'finished');
  if (finished.length < t.matchIds.length) return null;

  let agg1 = 0;
  let agg2 = 0;
  finished.forEach((m) => {
    const hs = Number(m.homeScore);
    const as = Number(m.awayScore);
    if (m.homeParticipantId === t.team1) agg1 += hs;
    if (m.awayParticipantId === t.team1) agg1 += as;
    if (m.homeParticipantId === t.team2) agg2 += hs;
    if (m.awayParticipantId === t.team2) agg2 += as;
  });

  if (agg1 > agg2) return t.team1;
  if (agg2 > agg1) return t.team2;
  return manualWinnerId ?? null;
}

export function advanceKnockout(
  bracket: CompetitionBracket,
  matches: CompetitionMatch[],
  settings: CompetitionSettings,
  manualWinners: Record<string, string> = {},
): CompetitionBracket {
  const rounds = bracket.rounds.map((r) => r.map((t) => ({ ...t })));
  for (let r = 0; r < rounds.length; r += 1) {
    const isFinal = r === rounds.length - 1;
    const legs: 1 | 2 = isFinal ? 1 : settings.knockoutLegs;
    rounds[r].forEach((t, i) => {
      if (!t.winner) {
        const w = resolveTieWinner(t, matches, legs, manualWinners[`${r}-${i}`]);
        if (w) t.winner = w;
      }
      if (t.winner && r + 1 < rounds.length) {
        const next = rounds[r + 1][Math.floor(i / 2)];
        if (i % 2 === 0) next.team1 = t.winner;
        else next.team2 = t.winner;
      }
    });
  }
  return { ...bracket, rounds };
}

export function generateKnockoutMatchesForRound(
  bracket: CompetitionBracket,
  round: number,
  knockoutLegs: 1 | 2,
  competitionId = '',
): NewCompetitionMatch[] {
  const isFinal = round === bracket.rounds.length - 1;
  const legs: 1 | 2 = isFinal ? 1 : knockoutLegs;
  const matches: NewCompetitionMatch[] = [];
  bracket.rounds[round].forEach((t, i) => {
    if (t.bye || !t.team1 || !t.team2) return;
    for (let leg = 1; leg <= legs; leg += 1) {
      const home = leg === 2 ? t.team2 : t.team1;
      const away = leg === 2 ? t.team1 : t.team2;
      matches.push({
        competitionId,
        stage: 'knockout',
        groupKey: null,
        round,
        tieIndex: i,
        leg,
        homeParticipantId: home,
        awayParticipantId: away,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
      });
    }
  });
  return matches;
}
