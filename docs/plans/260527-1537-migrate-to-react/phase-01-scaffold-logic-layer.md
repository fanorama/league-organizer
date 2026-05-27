# Phase 01: Scaffold & Logic Layer

## Objective

Init proyek Vite + React + TypeScript, port semua logic files ke `src/lib/*.ts`, dan copy CSS ke lokasi yang bisa diakses Vite.

## Scope

- **Files yang dibuat:**
  - `package.json`
  - `vite.config.ts`
  - `tsconfig.json`
  - `index.html` (Vite entry point)
  - `src/main.tsx` (stub kosong sementara)
  - `src/lib/storage.ts`
  - `src/lib/api.ts`
  - `src/lib/schedule.ts`
  - `src/lib/standings.ts`
  - `src/lib/types.ts` (shared interfaces)
- **Files yang TIDAK diubah:** `js/*.js`, `styles/main.css`, `*.html` lama

## Preconditions

- Node.js tersedia (`node --version`)
- Berada di root proyek `/home/fanodev/orca/workspaces/league-organizer/migrate-to-react`

## Tasks

### 1. Init Vite project

```bash
npm create vite@latest . -- --template react-ts
# Pilih: React, TypeScript
# Jika ditanya overwrite, pilih "Ignore files and continue"
```

Hapus file contoh yang tidak diperlukan:
```bash
rm -f src/App.css src/index.css src/assets/react.svg public/vite.svg
```

Edit `index.html` — ganti title menjadi `LeagueOrg` dan pastikan link ke CSS:
```html
<link rel="stylesheet" href="/styles/main.css">
```

### 2. Install dependencies

```bash
npm install react-router-dom zustand
npm install --save-dev @types/react @types/react-dom
```

Verifikasi `package.json` berisi:
- `react-router-dom` ^6
- `zustand` ^5 (atau ^4)

### 3. Buat `src/lib/types.ts`

Definisikan semua interface berdasarkan data model localStorage yang sudah ada:

```ts
export interface LeagueSettings {
  meetingsPerSeason: number;
  continuousSeasons: boolean;
  playoff?: {
    enabled: boolean;
    teamsCount: number;
    legs: number;
  };
}

export interface League {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  settings: LeagueSettings;
}

export interface Team {
  id: string;
  leagueId: string;
  name: string;
  shortName?: string;
  badge?: string;
  owner?: string;
  status: 'pool' | 'active';
  externalId?: number;
  createdAt?: string;
}

export interface Season {
  id: string;
  leagueId: string;
  number: number;
  status: 'setup' | 'active' | 'finished' | 'playoff_setup' | 'playoff_active';
  champion?: string | null;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  bracket?: PlayoffBracket;
}

export interface Match {
  id: string;
  seasonId: string;
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status: 'scheduled' | 'finished' | 'delayed';
  matchType?: 'league' | 'playoff';
  originalMatchday?: number;
  bracketSlot?: {
    round: number;
    bracket: string;
    slotIndex: number;
    legIndex: number;
    isExtraLeg?: boolean;
  };
}

export interface PlayoffSlot {
  team1?: string | null;
  team2?: string | null;
  matchIds: string[];
  winner?: string | null;
  bye?: boolean;
}

export interface PlayoffBracket {
  upper: { rounds: PlayoffSlot[][] };
  lower: { rounds: PlayoffSlot[][] };
  grandFinal: {
    match?: PlayoffSlot;
    reset?: PlayoffSlot;
  };
}

export interface AppSettings {
  apiKey: string;
}

export interface ClubFromApi {
  id: number;
  name: string;
  shortName?: string;
  badge?: string;
}
```

### 4. Port `js/storage.js` → `src/lib/storage.ts`

Copy isi file lama, tambahkan tipe parameter dan return types. Contoh perubahan:

```ts
// Sebelum (JS)
export function getAll(key) { ... }

// Sesudah (TS)
export function getAll<T>(key: string): T[] { ... }
export function save<T extends { id?: string }>(key: string, item: T): T & { id: string } { ... }
export function getById<T extends { id: string }>(key: string, id: string): T | null { ... }
```

Import types dari `./types` untuk fungsi `cascadeDeleteLeague`, `getSettings`, `saveSettings`.

**Penting:** Tidak mengubah logika satu baris pun — hanya tambah generics dan type annotations.

### 5. Port `js/api.js` → `src/lib/api.ts`

Tambahkan return type ke `fetchClubs()`:

```ts
export async function fetchClubs(competitionId: number, season: number): Promise<ClubFromApi[]>
```

Import `AppSettings`, `ClubFromApi` dari `./types`.

### 6. Port `js/schedule.js` → `src/lib/schedule.ts`

File ini kompleks (~panjang). Port dengan cara:
1. Copy seluruh isi file
2. Tambahkan import types di atas: `import type { League, Season, Match, PlayoffBracket, PlayoffSlot } from './types'`
3. Tambahkan type annotations hanya pada function signatures yang public (export)
4. Jangan ubah logika internal — jika ada TypeScript error di logika internal, gunakan `// @ts-ignore` sementara daripada refactor

### 7. Port `js/standings.js` → `src/lib/standings.ts`

```ts
export interface StandingsRow {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  form: string[];
}

export function calculateStandings(seasonId: string): StandingsRow[]
```

### 8. Pastikan `vite.config.ts` bisa serve `styles/main.css`

`main.css` berada di `styles/main.css` (root proyek). Vite secara default serve file dari `public/` folder. Ada dua opsi:

**Opsi A (Recommended):** Copy `styles/main.css` ke `public/styles/main.css`. File original di `styles/` tetap ada.
```bash
mkdir -p public/styles && cp styles/main.css public/styles/main.css
```
Lalu di `index.html`: `<link rel="stylesheet" href="/styles/main.css">`

**Opsi B:** Import CSS langsung di `src/main.tsx`:
```ts
import '../styles/main.css'
```
Vite akan bundle CSS ini otomatis.

Gunakan **Opsi B** karena lebih simpel dan tidak perlu maintain dua copy CSS.

## Acceptance Criteria

- `npm run dev` berjalan tanpa error (meski app masih kosong)
- `npm run build` sukses tanpa TypeScript error
- `src/lib/storage.ts` mengeksport semua fungsi yang sama dengan `js/storage.js`
- `src/lib/schedule.ts` dan `src/lib/standings.ts` tidak mengubah logika — hanya type annotations

## Verification

```bash
# Pastikan semua package terinstall
npm install

# TypeScript check
npx tsc --noEmit

# Build test
npm run build

# Dev server
npm run dev
```

**Expected:** Build sukses. Dev server berjalan. Browser menampilkan halaman kosong (React belum dirender).

## Idempotence and Recovery

- Safe re-run: Ya — tidak ada operasi destructive. `npm install` idempotent.
- Recovery: Jika `npm create vite` gagal, jalankan manual: buat `package.json`, `vite.config.ts`, `tsconfig.json` dari template.
- Rollback: File JS lama tidak tersentuh — buka `leagues.html` langsung di browser untuk verifikasi app lama masih bekerja.

## Exit Criteria

- [ ] `npm run dev` jalan tanpa error
- [ ] `npx tsc --noEmit` tidak ada error di `src/lib/`
- [ ] Semua 4 lib files ada: `storage.ts`, `api.ts`, `schedule.ts`, `standings.ts`
- [ ] `src/lib/types.ts` berisi semua interfaces
