import { create } from 'zustand';
import { KEYS, getAll, remove, save, setAll } from '../lib/storage';
import type { Player, Team } from '../lib/types';

interface PlayerStore {
  players: Player[];
  addPlayer: (data: Omit<Player, 'id'>) => Player;
  updatePlayer: (player: Player) => Player;
  deletePlayer: (id: string) => void;
  refresh: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  players: getAll<Player>(KEYS.players),

  addPlayer: (data) => {
    const player = save<Player>(KEYS.players, { ...data, id: '' } as Player);
    set({ players: getAll<Player>(KEYS.players) });
    return player;
  },

  updatePlayer: (player) => {
    const updated = save<Player>(KEYS.players, player);
    set({ players: getAll<Player>(KEYS.players) });
    return updated;
  },

  deletePlayer: (id) => {
    remove(KEYS.players, id);
    const teams = getAll<Team>(KEYS.teams);
    setAll(
      KEYS.teams,
      teams.map((team) => (team.ownerId === id ? { ...team, ownerId: null, owner: null } : team)),
    );
    set({ players: getAll<Player>(KEYS.players) });
  },

  refresh: () => set({ players: getAll<Player>(KEYS.players) }),
}));
