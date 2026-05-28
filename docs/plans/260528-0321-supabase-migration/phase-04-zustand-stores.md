# Phase 04: Update Zustand Stores ke Async

## Objective

Update semua 5 Zustand stores agar menggunakan fungsi async dari storage layer baru. Semua actions menjadi async, initial state tidak lagi di-load dari localStorage saat store diinit.

## Scope

- Files/modules this phase may touch:
  - `src/store/useLeagueStore.ts`
  - `src/store/useTeamStore.ts`
  - `src/store/useSeasonStore.ts`
  - `src/store/useMatchStore.ts`
  - `src/store/usePlayerStore.ts`
- Files/modules this phase must not touch:
  - `src/lib/storage.ts`
  - `src/pages/**`
  - `src/lib/schedule.ts`

## Preconditions

- Phase 03 selesai: `storage.ts` sudah punya fungsi async baru

## Tasks

### 1. Update `useLeagueStore.ts`

Pattern baru: initial state kosong, fetch dilakukan via `fetchLeagues()`.

```ts
import { create } from 'zustand';
import { deleteLeague, getLeagueById, getLeagues, saveLeague } from '../lib/storage';
import type { League } from '../lib/types';

interface LeagueStore {
  leagues: League[];
  fetchLeagues: () => Promise<void>;
  createLeague: (data: Omit<League, 'id'>) => Promise<League>;
  updateLeague: (league: League) => Promise<League>;
  deleteLeague: (id: string) => Promise<void>;
}

export const useLeagueStore = create<LeagueStore>((set) => ({
  leagues: [],

  fetchLeagues: async () => {
    const leagues = await getLeagues();
    set({ leagues });
  },

  createLeague: async (data) => {
    const league = await saveLeague(data);
    const leagues = await getLeagues();
    set({ leagues });
    return league;
  },

  updateLeague: async (league) => {
    const updated = await saveLeague(league);
    const leagues = await getLeagues();
    set({ leagues });
    return updated;
  },

  deleteLeague: async (id) => {
    await deleteLeague(id);
    const leagues = await getLeagues();
    set({ leagues });
  },
}));
```

### 2. Update `useTeamStore.ts`

```ts
import { create } from 'zustand';
import { deleteTeam, getTeams, saveTeam } from '../lib/storage';
import type { Team } from '../lib/types';

interface TeamStore {
  teams: Team[];
  fetchTeams: () => Promise<void>;
  addTeam: (data: Omit<Team, 'id'>) => Promise<Team>;
  updateTeam: (team: Team) => Promise<Team>;
  removeTeam: (id: string) => Promise<void>;
  unassignTeam: (id: string) => Promise<void>;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: [],

  fetchTeams: async () => {
    const teams = await getTeams();
    set({ teams });
  },

  addTeam: async (data) => {
    const team = await saveTeam(data);
    const teams = await getTeams();
    set({ teams });
    return team;
  },

  updateTeam: async (team) => {
    const updated = await saveTeam(team);
    const teams = await getTeams();
    set({ teams });
    return updated;
  },

  removeTeam: async (id) => {
    await deleteTeam(id);
    const teams = await getTeams();
    set({ teams });
  },

  unassignTeam: async (id) => {
    const team = get().teams.find((t) => t.id === id);
    if (!team) return;
    await saveTeam({ ...team, status: 'pool', owner: null, ownerId: null });
    const teams = await getTeams();
    set({ teams });
  },
}));
```

### 3. Update `useSeasonStore.ts`, `useMatchStore.ts`, `usePlayerStore.ts`

Pola yang sama: initial state `[]`, actions jadi async, import dari storage functions baru (`saveSeason`, `getSeasonsByLeague`, dst).

Untuk `useMatchStore.ts`: tambah `saveMatches` (bulk insert) untuk generate jadwal round-robin.

### 4. Periksa semua import di pages

Setelah stores diupdate, pastikan pages yang memanggil store actions sudah menggunakan `await` atau `.then()`. Ini akan difix di Phase 06 (conditional UI) — untuk sekarang cukup pastikan TypeScript tidak error.

## Acceptance Criteria

- Semua 5 stores tidak import dari `KEYS`, `getAll`, `save`, `remove`, `cascadeDeleteLeague`
- Semua actions bersifat async (return `Promise`)
- Initial state `leagues: []`, `teams: []`, dst — bukan lagi load dari localStorage

## Verification

```bash
npm run build
```

Expected: build sukses. Ada kemungkinan pages error karena memanggil fungsi yang sekarang async — itu normal, diselesaikan di Phase 06.

## Idempotence and Recovery

- File edits idempoten
- Rollback via `git restore src/store/`

## Exit Criteria

- [ ] `useLeagueStore.ts` diupdate
- [ ] `useTeamStore.ts` diupdate
- [ ] `useSeasonStore.ts` diupdate
- [ ] `useMatchStore.ts` diupdate
- [ ] `usePlayerStore.ts` diupdate
- [ ] Tidak ada import `KEYS`, `getAll`, `save`, `remove`, `cascadeDeleteLeague` di stores
- [ ] `npm run build` sukses
