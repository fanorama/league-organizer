import { create } from 'zustand';
import { deleteTeam, getTeams, saveTeam } from '../lib/storage';
import type { Team } from '../lib/types';

interface TeamStore {
  teams: Team[];
  fetchTeams: () => Promise<void>;
  addTeam: (data: Omit<Team, 'id'>) => Promise<Team>;
  updateTeam: (team: Team) => Promise<Team>;
  removeTeam: (id: string) => Promise<void>;
  removeTeams: (ids: string[]) => Promise<void>;
  unassignTeam: (id: string) => Promise<void>;
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
    await deleteTeam(id);
    set({ teams: await getTeams() });
  },

  removeTeams: async (ids) => {
    for (const id of ids) {
      await deleteTeam(id);
    }
    set({ teams: await getTeams() });
  },

  unassignTeam: async (id) => {
    const team = get().teams.find((candidate) => candidate.id === id);
    if (!team) return;
    await saveTeam({ ...team, status: 'pool', owner: null, ownerId: null });
    set({ teams: await getTeams() });
  },

  refresh: async () => {
    set({ teams: await getTeams() });
  },
}));
