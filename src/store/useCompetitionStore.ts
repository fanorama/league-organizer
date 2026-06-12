import { create } from 'zustand';
import {
  advanceKnockout,
  assignPots,
  buildGroupMatchdays,
  computeGroupStandings,
  drawGroupsFromPots,
  generateGroupSchedule,
  generateKnockoutMatchesForRound,
  resolveTieWinner,
  seedKnockout,
} from '../lib/competition';
import {
  deleteCompetition as deleteCompetitionDb,
  deleteParticipant as deleteParticipantDb,
  getCompetitionById,
  getCompetitionMatchesByCompetition,
  getCompetitions,
  getParticipantsByCompetition,
  saveCompetition,
  saveCompetitionMatch,
  saveCompetitionMatches,
  saveParticipant,
  saveParticipants,
} from '../lib/storage';
import type {
  Competition,
  CompetitionBracket,
  CompetitionMatch,
  CompetitionParticipant,
  CompetitionSettings,
} from '../lib/types';

interface ClubAssignment {
  externalId?: string | null;
  name: string;
  logo?: string | null;
}

interface CompetitionStore {
  competitions: Competition[];
  competition: Competition | null;
  participants: CompetitionParticipant[];
  matches: CompetitionMatch[];

  fetchCompetitions: () => Promise<void>;
  createCompetition: (name: string, description: string | undefined, settings: CompetitionSettings) => Promise<Competition>;
  updateCompetition: (c: Competition) => Promise<Competition>;
  updateCompetitionSettings: (id: string, patch: Partial<CompetitionSettings>) => Promise<void>;
  deleteCompetition: (id: string) => Promise<void>;
  loadCompetitionDetail: (id: string) => Promise<void>;

  addParticipant: (competitionId: string, playerId: string) => Promise<void>;
  addParticipants: (competitionId: string, playerIds: string[]) => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;

  startClubDraw: (competitionId: string) => Promise<void>;
  assignClubToParticipant: (participantId: string, club: ClubAssignment, tier: 'elite' | 'mid' | 'underdog') => Promise<void>;
  resetClubDraw: (competitionId: string) => Promise<void>;
  finishClubDraw: (competitionId: string) => Promise<void>;

  runGroupDraw: (competitionId: string, rng?: () => number) => Promise<void>;

  shuffleGroupSchedule: (competitionId: string) => Promise<void>;
  lockGroupSchedule: (competitionId: string) => Promise<void>;

  saveGroupResult: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
  startKnockout: (competitionId: string) => Promise<void>;

  saveKnockoutResult: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
  resolveTie: (competitionId: string, round: number, tieIndex: number, manualWinnerId?: string) => Promise<void>;
  finishCompetition: (competitionId: string, championParticipantId: string) => Promise<void>;

  refresh: () => Promise<void>;
}

async function reloadDetail(id: string): Promise<Pick<CompetitionStore, 'competition' | 'participants' | 'matches'>> {
  const [competition, participants, matches] = await Promise.all([
    getCompetitionById(id),
    getParticipantsByCompetition(id),
    getCompetitionMatchesByCompetition(id),
  ]);
  return { competition, participants, matches };
}

/**
 * Generate & persist match untuk tie di satu babak yang BELUM punya match,
 * lalu isi matchIds tiap tie. Aman dipanggil ulang: tie yang sudah punya match
 * dilewati sehingga tidak terjadi duplikasi (mis. saat tie kedua baru siap
 * setelah tie pertama di babak yang sama).
 */
async function persistRoundMatches(competition: Competition, bracket: CompetitionBracket, round: number): Promise<void> {
  const pending = new Set(
    bracket.rounds[round]
      .map((tie, i) => ({ tie, i }))
      .filter(({ tie }) => (tie.matchIds?.length ?? 0) === 0)
      .map(({ i }) => i),
  );
  const fresh = generateKnockoutMatchesForRound(bracket, round, competition.settings.knockoutLegs, competition.id)
    .filter((m) => pending.has(m.tieIndex as number));
  if (!fresh.length) return;
  const saved = await saveCompetitionMatches(fresh);
  bracket.rounds[round].forEach((tie, i) => {
    const ids = saved.filter((m) => m.tieIndex === i).map((m) => m.id);
    if (ids.length) tie.matchIds = ids;
  });
}

/**
 * Hitung ulang pemenang tiap tie (otomatis bila agregat jelas; pakai
 * manualWinners untuk tie yang agregatnya seri), buat match babak berikutnya
 * yang sudah siap, lalu persist bracket + status juara bila final selesai.
 */
async function advanceBracketAndPersist(
  competition: Competition,
  matches: CompetitionMatch[],
  manualWinners: Record<string, string> = {},
): Promise<void> {
  if (!competition.bracket) return;
  const bracket = advanceKnockout(competition.bracket, matches, competition.settings, manualWinners);

  // Generate match untuk tiap tie yang sudah siap tetapi belum punya match.
  // Dicek per-tie (bukan per-babak) agar tie yang baru siap belakangan di
  // babak yang sama tetap mendapat match-nya.
  for (let r = 1; r < bracket.rounds.length; r += 1) {
    const hasPending = bracket.rounds[r].some(
      (t) => t.team1 && t.team2 && !t.bye && (t.matchIds?.length ?? 0) === 0,
    );
    if (hasPending) await persistRoundMatches(competition, bracket, r);
  }

  const finalRound = bracket.rounds[bracket.rounds.length - 1];
  const champion = finalRound.length === 1 ? finalRound[0].winner : null;

  // Simpan bracket advanced sekaligus dengan status final agar bracket yang
  // sudah berisi pemenang tidak tertimpa state lama (lihat finishCompetition).
  await saveCompetition({
    ...competition,
    bracket,
    ...(champion
      ? { championId: champion, status: 'finished' as const, finishedAt: new Date().toISOString() }
      : {}),
  });
}

/**
 * Lengkapi match untuk tie knockout yang sudah siap (kedua tim diketahui)
 * tetapi belum punya match. Return true bila ada perubahan yang dipersist.
 */
async function healMissingKnockoutMatches(competition: Competition): Promise<boolean> {
  const bracket = competition.bracket;
  if (!bracket || competition.status !== 'knockout') return false;
  let changed = false;
  for (let r = 0; r < bracket.rounds.length; r += 1) {
    const hasPending = bracket.rounds[r].some(
      (t) => t.team1 && t.team2 && !t.bye && (t.matchIds?.length ?? 0) === 0,
    );
    if (hasPending) {
      await persistRoundMatches(competition, bracket, r);
      changed = true;
    }
  }
  if (changed) await saveCompetition({ ...competition, bracket });
  return changed;
}

export const useCompetitionStore = create<CompetitionStore>((set, get) => ({
  competitions: [],
  competition: null,
  participants: [],
  matches: [],

  fetchCompetitions: async () => {
    set({ competitions: await getCompetitions() });
  },

  createCompetition: async (name, description, settings) => {
    const saved = await saveCompetition({
      name,
      description,
      status: 'setup',
      settings,
      createdAt: new Date().toISOString(),
    });
    set({ competitions: await getCompetitions() });
    return saved;
  },

  updateCompetition: async (c) => {
    const saved = await saveCompetition(c);
    set({ competitions: await getCompetitions() });
    if (get().competition?.id === c.id) set({ competition: saved });
    return saved;
  },

  updateCompetitionSettings: async (id, patch) => {
    const competition = get().competition?.id === id ? get().competition : await getCompetitionById(id);
    if (!competition) throw new Error('Competition tidak ditemukan.');
    if (competition.status !== 'setup') {
      throw new Error('Pengaturan hanya bisa diubah saat fase setup.');
    }
    const saved = await saveCompetition({ ...competition, settings: { ...competition.settings, ...patch } });
    set({ competitions: await getCompetitions() });
    if (get().competition?.id === id) set({ competition: saved });
  },

  deleteCompetition: async (id) => {
    await deleteCompetitionDb(id);
    set({ competitions: await getCompetitions() });
    if (get().competition?.id === id) set({ competition: null, participants: [], matches: [] });
  },

  loadCompetitionDetail: async (id) => {
    const detail = await reloadDetail(id);
    // Self-heal: kompetisi lama bisa punya tie siap-main tanpa match akibat
    // bug generate per-babak. Lengkapi di sini lalu muat ulang bila berubah.
    if (detail.competition && (await healMissingKnockoutMatches(detail.competition))) {
      set(await reloadDetail(id));
    } else {
      set(detail);
    }
  },

  addParticipant: async (competitionId, playerId) => {
    if (get().participants.some((p) => p.playerId === playerId)) {
      throw new Error('Player sudah terdaftar di competition ini.');
    }
    await saveParticipant({ competitionId, playerId });
    set(await reloadDetail(competitionId));
  },

  addParticipants: async (competitionId, playerIds) => {
    const existing = new Set(get().participants.map((p) => p.playerId));
    const toAdd = [...new Set(playerIds)].filter((pid) => !existing.has(pid));
    if (!toAdd.length) return;
    await saveParticipants(toAdd.map((playerId) => ({ competitionId, playerId })));
    set(await reloadDetail(competitionId));
  },

  removeParticipant: async (participantId) => {
    const competitionId = get().competition?.id;
    await deleteParticipantDb(participantId);
    if (competitionId) set(await reloadDetail(competitionId));
  },

  startClubDraw: async (competitionId) => {
    const { competition, participants } = get();
    if (!competition || competition.id !== competitionId) throw new Error('Competition belum dimuat.');
    if (participants.length < competition.settings.groupCount) {
      throw new Error('Jumlah peserta minimal sama dengan jumlah grup.');
    }
    await saveCompetition({ ...competition, status: 'draw_clubs' });
    set(await reloadDetail(competitionId));
  },

  assignClubToParticipant: async (participantId, club, tier) => {
    const participant = get().participants.find((p) => p.id === participantId);
    if (!participant) throw new Error('Peserta tidak ditemukan.');
    await saveParticipant({
      ...participant,
      clubExternalId: club.externalId ?? null,
      clubName: club.name,
      clubLogo: club.logo ?? null,
      clubTier: tier,
    });
    set(await reloadDetail(participant.competitionId));
  },

  resetClubDraw: async (competitionId) => {
    const { competition, participants } = get();
    if (!competition || competition.id !== competitionId) throw new Error('Competition belum dimuat.');
    if (competition.status !== 'draw_clubs') throw new Error('Undian klub hanya bisa direset saat fase undian klub.');
    const cleared = participants
      .filter((p) => p.clubName)
      .map((p) => ({ ...p, clubExternalId: null, clubName: null, clubLogo: null, clubTier: null }));
    if (cleared.length) await saveParticipants(cleared);
    set(await reloadDetail(competitionId));
  },

  finishClubDraw: async (competitionId) => {
    const { competition, participants } = get();
    if (!competition || competition.id !== competitionId) throw new Error('Competition belum dimuat.');
    if (!participants.length) throw new Error('Belum ada peserta.');
    if (participants.some((p) => !p.clubName)) {
      throw new Error('Semua peserta harus mendapat klub sebelum lanjut.');
    }
    await saveCompetition({ ...competition, status: 'group_draw' });
    set(await reloadDetail(competitionId));
  },

  runGroupDraw: async (competitionId, rng) => {
    const { competition, participants } = get();
    if (!competition || competition.id !== competitionId) throw new Error('Competition belum dimuat.');
    if (participants.some((p) => !p.clubName)) {
      throw new Error('Undian klub belum selesai untuk semua peserta.');
    }
    const { groupCount, potCount, meetingsPerPair } = competition.settings;
    if (participants.length < groupCount) {
      throw new Error('Jumlah peserta lebih sedikit dari jumlah grup.');
    }

    const withPots = assignPots(participants, potCount);
    const groups = drawGroupsFromPots(withPots, groupCount, potCount, rng);
    await saveParticipants(withPots);

    const scheduled = generateGroupSchedule(groups, meetingsPerPair, competitionId);
    await saveCompetitionMatches(scheduled);

    await saveCompetition({
      ...competition,
      groups,
      status: 'group_stage',
      startedAt: competition.startedAt ?? new Date().toISOString(),
    });
    set(await reloadDetail(competitionId));
  },

  shuffleGroupSchedule: async (competitionId) => {
    const { competition, matches } = get();
    if (!competition || competition.id !== competitionId) throw new Error('Competition belum dimuat.');
    if (competition.settings.scheduleLocked) throw new Error('Jadwal sudah dikunci dan tidak bisa diacak.');
    const groupMatches = matches.filter((m) => m.stage === 'group');
    if (!groupMatches.length) throw new Error('Jadwal grup belum dibuat.');
    if (groupMatches.some((m) => m.status === 'finished')) {
      throw new Error('Tidak bisa mengacak: sudah ada hasil pertandingan grup.');
    }

    // Bangun matchday default (ronde round-robin tiap grup → matchday memuat
    // semua grup), lalu acak: urutan matchday diundi ulang dan isi tiap
    // matchday dikocok. Setiap matchday tetap valid (tiap tim main sekali).
    const shuffle = <T,>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const idToGroup = new Map(groupMatches.map((m) => [m.id, m.groupKey ?? '']));
    const matchdays = buildGroupMatchdays(competition.groups ?? [], groupMatches);
    // Acak urutan matchday, tetapi rapikan isi tiap matchday per grup (A→B→C…).
    const shuffled = shuffle(matchdays).map((md) =>
      [...md].sort((a, b) => idToGroup.get(a)!.localeCompare(idToGroup.get(b)!)),
    );
    await saveCompetition({ ...competition, settings: { ...competition.settings, scheduleMatchdays: shuffled } });
    set(await reloadDetail(competitionId));
  },

  lockGroupSchedule: async (competitionId) => {
    const { competition, matches } = get();
    if (!competition || competition.id !== competitionId) throw new Error('Competition belum dimuat.');
    if (competition.settings.scheduleLocked) return;
    if (!matches.some((m) => m.stage === 'group')) throw new Error('Jadwal grup belum dibuat.');
    await saveCompetition({ ...competition, settings: { ...competition.settings, scheduleLocked: true } });
    set(await reloadDetail(competitionId));
  },

  saveGroupResult: async (matchId, homeScore, awayScore) => {
    const match = get().matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match tidak ditemukan.');
    await saveCompetitionMatch({ ...match, homeScore, awayScore, status: 'finished' });
    set(await reloadDetail(match.competitionId));
  },

  startKnockout: async (competitionId) => {
    const { competition, participants, matches } = get();
    if (!competition || competition.id !== competitionId) throw new Error('Competition belum dimuat.');
    const groups = competition.groups ?? [];
    if (!groups.length) throw new Error('Grup belum diundi.');
    const groupMatches = matches.filter((m) => m.stage === 'group');
    if (groupMatches.some((m) => m.status !== 'finished')) {
      throw new Error('Semua match grup harus selesai sebelum knockout.');
    }

    const allStandings = groups.map((g) => computeGroupStandings(g, participants, matches));
    const bracket = seedKnockout(groups, allStandings, competition.settings);
    await persistRoundMatches(competition, bracket, 0);

    await saveCompetition({ ...competition, bracket, status: 'knockout' });
    set(await reloadDetail(competitionId));
  },

  saveKnockoutResult: async (matchId, homeScore, awayScore) => {
    const match = get().matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match tidak ditemukan.');
    await saveCompetitionMatch({ ...match, homeScore, awayScore, status: 'finished' });

    // Setelah skor tersimpan, langsung coba majukan bracket. Tie dengan agregat
    // jelas otomatis lolos; hanya tie yang agregatnya seri butuh pilih manual
    // (lihat resolveTie via TieResolver).
    const fresh = await reloadDetail(match.competitionId);
    if (fresh.competition) {
      await advanceBracketAndPersist(fresh.competition, fresh.matches);
      set(await reloadDetail(match.competitionId));
    } else {
      set(fresh);
    }
  },

  resolveTie: async (competitionId, round, tieIndex, manualWinnerId) => {
    const { competition, matches } = get();
    if (!competition || competition.id !== competitionId) throw new Error('Competition belum dimuat.');
    if (!competition.bracket) throw new Error('Bracket belum dibuat.');

    const manualWinners = manualWinnerId ? { [`${round}-${tieIndex}`]: manualWinnerId } : {};
    await advanceBracketAndPersist(competition, matches, manualWinners);
    set(await reloadDetail(competitionId));
  },

  finishCompetition: async (competitionId, championParticipantId) => {
    const competition = get().competition ?? (await getCompetitionById(competitionId));
    if (!competition) throw new Error('Competition tidak ditemukan.');
    await saveCompetition({
      ...competition,
      championId: championParticipantId,
      status: 'finished',
      finishedAt: new Date().toISOString(),
    });
    set(await reloadDetail(competitionId));
  },

  refresh: async () => {
    set({ competitions: await getCompetitions() });
    const id = get().competition?.id;
    if (id) set(await reloadDetail(id));
  },
}));
