# Phase 02: Store Layer

## Objective

Buat 4 Zustand stores yang menjadi bridge antara localStorage dan React. Setiap store membaca state awal dari localStorage dan mengekspos action yang memanggil `storage.ts` lalu trigger re-render.

## Scope

- **Files yang dibuat:**
  - `src/store/useLeagueStore.ts`
  - `src/store/useTeamStore.ts`
  - `src/store/useSeasonStore.ts`
  - `src/store/useMatchStore.ts`
- **Files yang TIDAK diubah:** `src/lib/*.ts`, CSS, JS lama

## Preconditions

- Phase 1 selesai: `src/lib/storage.ts` dan `src/lib/types.ts` sudah ada dan compile.

## Tasks

### 1. Buat `src/store/useLeagueStore.ts`

```ts
import { create } from 'zustand';
import { getAll, save, cascadeDeleteLeague, KEYS } from '../lib/storage';
import type { League } from '../lib/types';

interface LeagueStore {
  leagues: League[];
  createLeague: (data: Omit<League, 'id'>) => League;
  deleteLeague: (id: string) => void;
  refresh: () => void;
}

export const useLeagueStore = create<LeagueStore>((set) => ({
  leagues: getAll<League>(KEYS.leagues),

  createLeague: (data) => {
    const league = save<League>(KEYS.leagues, data as League);
    set({ leagues: getAll<League>(KEYS.leagues) });
    return league;
  },

  deleteLeague: (id) => {
    cascadeDeleteLeague(id);
    set({ leagues: getAll<League>(KEYS.leagues) });
  },

  refresh: () => set({ leagues: getAll<League>(KEYS.leagues) }),
}));
```

### 2. Buat `src/store/useTeamStore.ts`

Actions yang dibutuhkan berdasarkan `teams.js`:
- `addTeam(data)` — save ke localStorage
- `updateTeam(team)` — update existing (untuk assign owner, ubah status)
- `removeTeam(id)` — remove dari league
- `unassignTeam(id)` — set status kembali ke 'pool', hapus owner
- `refresh()` — sync ulang dari localStorage

```ts
import { create } from 'zustand';
import { getAll, save, remove, KEYS } from '../lib/storage';
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
    const team = get().teams.find((t) => t.id === id);
    if (!team) return;
    save<Team>(KEYS.teams, { ...team, status: 'pool', owner: undefined });
    set({ teams: getAll<Team>(KEYS.teams) });
  },

  refresh: () => set({ teams: getAll<Team>(KEYS.teams) }),
}));
```

### 3. Buat `src/store/useSeasonStore.ts`

Actions berdasarkan `season.js` dan `league.js`:
- `createSeason(league, teams)` — memanggil `createSeasonWithSchedule()` dari `schedule.ts`
- `updateSeason(season)` — save perubahan status
- `refresh()` — sync ulang

```ts
import { create } from 'zustand';
import { getAll, save, getById, KEYS } from '../lib/storage';
import { createSeasonWithSchedule } from '../lib/schedule';
import type { Season, League, Team } from '../lib/types';

interface SeasonStore {
  seasons: Season[];
  createSeason: (league: League, teams: Team[]) => Season;
  updateSeason: (season: Season) => Season;
  refresh: () => void;
}

export const useSeasonStore = create<SeasonStore>((set) => ({
  seasons: getAll<Season>(KEYS.seasons),

  createSeason: (league, teams) => {
    const season = createSeasonWithSchedule(league, teams);
    set({ seasons: getAll<Season>(KEYS.seasons) });
    return season;
  },

  updateSeason: (season) => {
    const updated = save<Season>(KEYS.seasons, season);
    set({ seasons: getAll<Season>(KEYS.seasons) });
    return updated;
  },

  refresh: () => set({ seasons: getAll<Season>(KEYS.seasons) }),
}));
```

### 4. Buat `src/store/useMatchStore.ts`

Actions berdasarkan `season.js`:
- `updateMatch(match)` — save skor, status
- `refresh()` — sync ulang setelah operasi kompleks (advance playoff, dll)

```ts
import { create } from 'zustand';
import { getAll, save, KEYS } from '../lib/storage';
import type { Match } from '../lib/types';

interface MatchStore {
  matches: Match[];
  updateMatch: (match: Match) => Match;
  refresh: () => void;
}

export const useMatchStore = create<MatchStore>((set) => ({
  matches: getAll<Match>(KEYS.matches),

  updateMatch: (match) => {
    const updated = save<Match>(KEYS.matches, match);
    set({ matches: getAll<Match>(KEYS.matches) });
    return updated;
  },

  refresh: () => set({ matches: getAll<Match>(KEYS.matches) }),
}));
```

### 5. Pola penggunaan store di halaman

Store dapat digunakan dengan selector untuk menghindari re-render tidak perlu:

```tsx
// Ambil hanya leagues milik liga ini
const teams = useTeamStore((s) => s.teams.filter((t) => t.leagueId === leagueId));

// Ambil action saja (tidak trigger re-render)
const updateMatch = useMatchStore((s) => s.updateMatch);
```

### 6. Catatan cross-store coordination

Beberapa operasi membutuhkan beberapa store di-refresh sekaligus. Contoh: saat season selesai dan `continuousSeasons` aktif, season baru dibuat otomatis → `useSeasonStore.refresh()` dan `useMatchStore.refresh()` keduanya perlu dipanggil.

Solusi: panggil `refresh()` dari kedua store setelah operasi kompleks di page component. Jangan buat "orchestrator store" — terlalu overengineered untuk skala ini.

## Acceptance Criteria

- 4 store files ada di `src/store/`
- Setiap store mengekspos: state array, minimal 1 mutasi action, dan `refresh()`
- `npx tsc --noEmit` tidak ada error di `src/store/`
- Tidak ada akses `localStorage` langsung di store — semua melalui `storage.ts`

## Verification

```bash
npx tsc --noEmit
```

**Expected:** Tidak ada error TypeScript di `src/store/`.

## Idempotence and Recovery

- Safe re-run: Ya — hanya create/overwrite files.
- Recovery: Jika TypeScript error pada store, cek bahwa `src/lib/types.ts` dan `src/lib/storage.ts` sudah ada dan compile.

## Exit Criteria

- [ ] `src/store/useLeagueStore.ts` — ada dan compile
- [ ] `src/store/useTeamStore.ts` — ada dan compile
- [ ] `src/store/useSeasonStore.ts` — ada dan compile
- [ ] `src/store/useMatchStore.ts` — ada dan compile
- [ ] `npx tsc --noEmit` bersih
