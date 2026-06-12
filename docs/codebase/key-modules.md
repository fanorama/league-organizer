# Key Modules

Tanggung jawab tiap modul utama, dikelompokkan per lapisan.

## `src/lib/` — Logika Domain & Storage

| File | Tanggung jawab |
|------|----------------|
| `types.ts` | Semua interface entitas (`League`, `Player`, `Team`, `Season`, `Match`, `PlayoffBracket`, `QuickMatch*`, `ClubFromApi`, `CacheEntry`). Tidak ada type inline di komponen. |
| `storage.ts` | Satu-satunya akses Supabase. CRUD per entitas + mapper `dbToX()`/`xToDb()` (snake_case ↔ camelCase). Juga `getCache()`/`saveCache()` untuk `clubs_cache` di localStorage. |
| `supabase.ts` | Singleton Supabase client dari env `VITE_SUPABASE_*`. |
| `api.ts` | `fetchClubs(competition)` via `/api/football`, cache 7 hari. Daftar `COMPETITIONS` (kode football-data.org). |
| `schedule.ts` | `generateRoundRobin()`, `createSeasonWithSchedule()`, dan seluruh logika bracket playoff (`startPlayoff`, `advancePlayoffRound`, `finishPlayoff`). Pakai `@ts-nocheck`. |
| `standings.ts` | `calculateStandings()` / `calculateStandingsFromData()` — tiebreaker Pts → GD → GF. |
| `playerStats.ts` | `calculatePlayerStats()`, `calculateHeadToHead()` (+ varian `*FromData`). Pakai `ownerSnapshots` musim. |
| `quickMatchStats.ts` | `calculateQuickMatchStatsFromData()` untuk rekap session quick match. |
| `playerAssignment.ts` | Helper assign player ke tim per liga (`getAssignablePlayersForLeague`, `canAssignPlayerToLeague`, dst). |
| `competition.ts` | Engine murni turnamen Group + Knockout: `distributeToGroups`, `assignPots`, `drawGroupsFromPots`, `computeGroupStandings`, `rankBestThirds`, `generateGroupSchedule`, `seedKnockout` (+ `BEST_THIRD_LOOKUP`), `resolveTieWinner`, `advanceKnockout`, `generateKnockoutMatchesForRound`. Rng injectable, tanpa import `storage`/`supabase`, fully unit-tested. |

> Pola: fungsi domain punya varian `*FromData(...)` murni (input data mentah, mudah dites) dan varian async yang mengambil data dari `storage.ts` lebih dulu.

## `src/store/` — Zustand Stores

Tiap store membungkus fungsi `storage.ts` lalu `set()` state baru. Tidak ada logika bisnis di sini.

| Store | Entitas |
|-------|---------|
| `useLeagueStore` | Liga (`fetchLeagues`, `createLeague`, `updateLeague`, `deleteLeague`, `refresh`) |
| `useTeamStore` | Tim |
| `useSeasonStore` | Musim |
| `useMatchStore` | Pertandingan |
| `usePlayerStore` | Player global |
| `useQuickMatchStore` | Quick match session + game |
| `useCompetitionStore` | Competition — orkestrasi lifecycle (`createCompetition`, `loadCompetitionDetail`, `startClubDraw`, `assignClubToParticipant`, `finishClubDraw`, `runGroupDraw`, `saveGroupResult`, `startKnockout`, `saveKnockoutResult`, `resolveTie`, `finishCompetition`). Store tipis: hanya wrap `storage.ts` + helper `competition.ts`, dengan guard transisi. |
| `useAuthStore` | Session auth + turunan `isAdmin` (tidak menyentuh storage; diisi dari `App.tsx`) |

## `src/pages/` — Halaman per Route

Lihat tabel route di [directory-structure.md](directory-structure.md). Tiap file = satu route.

## `src/components/` — Komponen UI

| Komponen | Fungsi |
|----------|--------|
| `Shell.tsx` | Layout wrapper + navigasi + hamburger menu (mobile) + tombol Login/Logout |
| `Badge.tsx` | Badge generik |
| `TeamBadge.tsx` | Badge tim dengan logo |
| `SpinWheel.tsx` | Modal spin wheel untuk assign owner ke tim pool |
| `ImportClubGrid.tsx` | Grid picker import klub dengan tab kompetisi (TeamsPage) |
| `ClubPickerModal.tsx` | Modal pemilihan klub per player (quick match) |

## `api/` — Serverless

| File | Fungsi |
|------|--------|
| `football.ts` | Vercel function: proxy ke `api.football-data.org/v4`, menambah header `X-Auth-Token` dari `FOOTBALL_API_KEY`. Padanan dev ada di plugin `vite.config.ts`. |
