import { create } from 'zustand';
import { KEYS, getAll, remove, save } from '../lib/storage';
import type { Team } from '../lib/types';

interface TeamStore {
  teams: Team[];
  addTeam: (data: Omit<Team, 'id'>) => Team;
  updateTeam: (team: Team) => Team;
  removeTeam: (id: string) => void;
  unassignTeam: (id: string) => void;
  refresh: () => void;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: getAll<Team>(KEYS.teams),

  addTeam: (data) => {
    const team = save<Team>(KEYS.teams, data as Team);
    set({ teams: getAll<Team>(KEYS.teams) });
    return team;
  },

  updateTeam: (team) => {
    const updated = save<Team>(KEYS.teams, team);
    set({ teams: getAll<Team>(KEYS.teams) });
    return updated;
  },

  removeTeam: (id) => {
    remove(KEYS.teams, id);
    set({ teams: getAll<Team>(KEYS.teams) });
  },

  unassignTeam: (id) => {
    const team = get().teams.find((candidate) => candidate.id === id);
    if (!team) return;
    save<Team>(KEYS.teams, { ...team, status: 'pool', owner: null, ownerId: null });
    set({ teams: getAll<Team>(KEYS.teams) });
  },

  refresh: () => set({ teams: getAll<Team>(KEYS.teams) }),
}));
