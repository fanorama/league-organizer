import { create } from 'zustand';
import { deleteTeam, getMatchesByTeamId, getTeams, saveTeam, saveTeams } from '../lib/storage';
import type { Team } from '../lib/types';

interface TeamStore {
  teams: Team[];
  fetchTeams: () => Promise<void>;
  addTeam: (data: Omit<Team, 'id'>) => Promise<Team>;
  updateTeam: (team: Team) => Promise<Team>;
  /** Returns false (without deleting) if the team has match history. */
  removeTeam: (id: string) => Promise<boolean>;
  /** Returns the ids that were blocked because they have match history. */
  removeTeams: (ids: string[]) => Promise<string[]>;
  unassignTeam: (id: string) => Promise<void>;
  markReady: (id: string) => Promise<void>;
  markPool: (id: string) => Promise<void>;
  /** Simpan ulang status & urutan (sort_order) sekumpulan tim hasil drag-and-drop. */
  reorderTeams: (updated: Team[]) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: [],

  fetchTeams: async () => {
    set({ teams: await getTeams() });
  },

  addTeam: async (data) => {
    const team = await saveTeam(data);
    set({ teams: await getTeams() });
    return team;
  },

  updateTeam: async (team) => {
    const updated = await saveTeam(team);
    set({ teams: await getTeams() });
    return updated;
  },

  removeTeam: async (id) => {
    const matches = await getMatchesByTeamId(id);
    if (matches.length > 0) return false;
    await deleteTeam(id);
    set({ teams: await getTeams() });
    return true;
  },

  removeTeams: async (ids) => {
    const blocked: string[] = [];
    for (const id of ids) {
      const matches = await getMatchesByTeamId(id);
      if (matches.length > 0) {
        blocked.push(id);
        continue;
      }
      await deleteTeam(id);
    }
    set({ teams: await getTeams() });
    return blocked;
  },

  unassignTeam: async (id) => {
    const team = get().teams.find((candidate) => candidate.id === id);
    if (!team) return;
    await saveTeam({ ...team, status: 'pool', owner: null, ownerId: null });
    set({ teams: await getTeams() });
  },

  markReady: async (id) => {
    const team = get().teams.find((c) => c.id === id);
    if (!team) return;
    const next: Team = { ...team, status: 'ready' };
    // Optimistic: perbarui state lokal lebih dulu agar drop tidak berkedip,
    // baru persist & sinkronkan ulang dari storage.
    set({ teams: get().teams.map((c) => (c.id === id ? next : c)) });
    await saveTeam(next);
    set({ teams: await getTeams() });
  },

  markPool: async (id) => {
    const team = get().teams.find((c) => c.id === id);
    if (!team) return;
    const next: Team = { ...team, status: 'pool' };
    set({ teams: get().teams.map((c) => (c.id === id ? next : c)) });
    await saveTeam(next);
    set({ teams: await getTeams() });
  },

  reorderTeams: async (updated) => {
    if (!updated.length) return;
    const patch = new Map(updated.map((t) => [t.id, t]));
    // Optimistic: terapkan status & sortOrder baru lalu urutkan ulang lokal
    // (mirror getTeams) agar kartu langsung muncul di posisi tempat dijatuhkan.
    const next = get().teams
      .map((t) => patch.get(t.id) ?? t)
      .sort((a, b) => {
        const ao = a.sortOrder ?? Number.POSITIVE_INFINITY;
        const bo = b.sortOrder ?? Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
      });
    set({ teams: next });
    await saveTeams(updated);
    set({ teams: await getTeams() });
  },

  refresh: async () => {
    set({ teams: await getTeams() });
  },
}));
