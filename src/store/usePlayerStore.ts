import { create } from 'zustand';
import { deletePlayer, getPlayers, getTeams, savePlayer, saveTeam } from '../lib/storage';
import type { Player } from '../lib/types';

interface PlayerStore {
  players: Player[];
  fetchPlayers: () => Promise<void>;
  addPlayer: (data: Omit<Player, 'id'>) => Promise<Player>;
  updatePlayer: (player: Player) => Promise<Player>;
  deletePlayer: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  players: [],

  fetchPlayers: async () => {
    set({ players: await getPlayers() });
  },

  addPlayer: async (data) => {
    const player = await savePlayer(data);
    set({ players: await getPlayers() });
    return player;
  },

  updatePlayer: async (player) => {
    const updated = await savePlayer(player);
    set({ players: await getPlayers() });
    return updated;
  },

  deletePlayer: async (id) => {
    await deletePlayer(id);
    const teams = await getTeams();
    await Promise.all(teams.filter((team) => team.ownerId === id).map((team) => saveTeam({ ...team, ownerId: null, owner: null })));
    set({ players: await getPlayers() });
  },

  refresh: async () => {
    set({ players: await getPlayers() });
  },
}));
