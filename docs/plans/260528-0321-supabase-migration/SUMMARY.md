# Implementation Plan: Migrasi Database ke Supabase

> Created: 2026-05-28 03:21:00

## Purpose / Big Picture

Mengganti storage layer dari `localStorage` ke Supabase (PostgreSQL) agar data liga bisa diakses publik secara read-only, sementara satu admin bisa write via Supabase Auth. Tidak ada real-time update, tidak ada migrasi data lama (fresh start).

Spec: [Design Spec](../../superpowers/specs/2026-05-28-supabase-migration-design.md)

## Objective

- Hapus semua `localStorage` read/write untuk entitas utama (leagues, players, teams, seasons, matches)
- Ganti dengan Supabase PostgreSQL via `@supabase/supabase-js`
- Tambah autentikasi admin (Supabase Auth, email + password)
- Publik hanya bisa melihat data; tombol write hanya muncul untuk admin yang login
- Keamanan write di-enforce via RLS policies di Supabase

## Context and Orientation

- Relevant files/modules:
  - `src/lib/storage.ts` — storage layer utama, akan di-rewrite total
  - `src/lib/supabase.ts` — file baru, Supabase client singleton
  - `src/lib/types.ts` — TypeScript interfaces, tidak berubah
  - `src/store/useLeagueStore.ts`, `useTeamStore.ts`, `useSeasonStore.ts`, `useMatchStore.ts`, `usePlayerStore.ts` — Zustand stores, semua actions jadi async
  - `src/App.tsx` — tambah route `/login`
  - `src/components/Shell.tsx` — tambah auth state + logout button
  - `src/pages/LoginPage.tsx` — file baru
  - `src/pages/LeaguesPage.tsx`, `LeaguePage.tsx`, `TeamsPage.tsx`, `SeasonPage.tsx`, `PlayersPage.tsx` — sembunyikan write UI untuk publik

- Existing patterns to follow:
  - Zustand store pattern: `create<Store>((set, get) => ({...}))`
  - Semua types tetap camelCase di TypeScript, mapping ke snake_case di storage layer
  - `clubs_cache` tetap di localStorage (Football API cache, bukan data utama)

- Constraints:
  - `@ts-nocheck` di `schedule.ts` — jangan sentuh file ini
  - `clubs_cache` dan `app_settings` tetap di localStorage, tidak perlu dimigrasikan
  - TypeScript types di `types.ts` tidak berubah interface-nya

## Scope

### In scope
- Setup schema SQL + RLS di Supabase
- Install dan init `@supabase/supabase-js`
- Rewrite `storage.ts` dengan fungsi async per entitas
- Update semua Zustand stores jadi async
- Halaman login admin + auth state di Shell
- Conditional UI (sembunyikan write untuk publik)
- Update tests: ganti mock localStorage → mock Supabase

### Out of scope
- Real-time subscriptions
- Migrasi data localStorage lama
- Multiple admin / user management
- `clubs_cache` (tetap localStorage)
- `src/lib/schedule.ts` (jangan disentuh)

## Architecture & Approach

Data flow baru:
```
Component → Zustand store (async action) → storage.ts (async fn) → Supabase client → PostgreSQL
```

Mapping camelCase ↔ snake_case dilakukan di `storage.ts`:
- TypeScript types tetap camelCase (`leagueId`, `createdAt`, dll.)
- Kolom PostgreSQL pakai snake_case (`league_id`, `created_at`, dll.)
- Storage functions melakukan transformasi saat read (snake→camel) dan write (camel→snake)

Auth state disimpan di Zustand store `useAuthStore.ts` (baru), di-init di `App.tsx` via `supabase.auth.onAuthStateChange()`.

## Progress

- [x] Plan approved for execution.
- [x] Phase 1: Supabase project setup (manual steps)
- [x] Phase 2: Install client & init
- [x] Phase 3: Rewrite storage layer
- [x] Phase 4: Update Zustand stores ke async
- [x] Phase 5: Auth — LoginPage + Shell
- [x] Phase 6: Conditional write UI
- [x] Phase 7: Update tests
- [-] Final verification pending.

- 2026-05-28 03:26:05 WIB — Started Phase 1 in Interactive mode because the plan changes auth/RLS/database setup. Confirmed the phase is manual dashboard work and `.env.local` is not present in the workspace yet, so Phase 1 cannot be verified from local files.
- 2026-05-28 03:31:09 WIB — Resumed after user confirmation. Verified `.env.local` exists and contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` without printing secret values. Marked Phase 1 complete based on user continuation plus local env evidence; dashboard/Vercel setup remains a manual prerequisite outside this workspace.
- 2026-05-28 03:31:09 WIB — Started Phase 2: install Supabase client, create client singleton, and update `.env.example`.
- 2026-05-28 03:33:00 WIB — Completed Phase 2. Installed `@supabase/supabase-js`, created `src/lib/supabase.ts`, restored `.env.example`, and verified with `npm run build` (pass).
- 2026-05-28 03:33:00 WIB — Started Phase 3: rewrite `src/lib/storage.ts` to Supabase-backed async entity functions while keeping Football API cache in `localStorage`.
- 2026-05-28 03:35:00 WIB — Blocked before editing `src/lib/storage.ts`: Phase 3 requires removing legacy storage APIs (`KEYS`, `getAll`, `setAll`, `getById`, `createId`, `save`, `remove`, `cascadeDeleteLeague`), but non-store source files still import them, including `src/lib/schedule.ts`, `src/lib/standings.ts`, `src/lib/playerStats.ts`, `src/main.tsx`, and `src/pages/SeasonPage.tsx`. The plan explicitly forbids touching `src/lib/schedule.ts`, making the later build gates impossible as written.
- 2026-05-28 03:55:00 WIB — Completed source migration for Phases 3-6 under approved expanded scope. Rewrote `storage.ts`, converted stores and storage-dependent helpers to async/data-driven APIs, removed localStorage bootstrap migrations from `main.tsx`, added auth/login, and gated write UI. Build verification now fails only because tests still import removed legacy storage APIs, so Phase 7 is in progress.
- 2026-05-28 03:50:29 WIB — Completed Phase 7 test rewrite. `npm run test:run` passed: 15 files, 43 tests.
- 2026-05-28 03:50:41 WIB — Coverage verification passed with `npm run coverage`: 15 files, 43 tests.
- 2026-05-28 03:51:00 WIB — Final automated build verification passed with `npm run build`.
- 2026-05-28 03:51:00 WIB — Started dev server for manual validation at `http://localhost:5174/` because port 5173 was already in use.

## Phases

- [ ] **Phase 1 [S]: Supabase Setup** — buat project, jalankan schema SQL + RLS, catat env vars
- [ ] **Phase 2 [S]: Install & Init Client** — install package, buat supabase.ts, update .env.example
- [ ] **Phase 3 [M]: Rewrite Storage Layer** — ganti storage.ts dengan async functions per entitas
- [ ] **Phase 4 [M]: Update Zustand Stores** — semua stores jadi async, hapus dependency ke localStorage
- [ ] **Phase 5 [M]: Auth — Login & Shell** — LoginPage, useAuthStore, session di Shell
- [ ] **Phase 6 [M]: Conditional Write UI** — sembunyikan tombol write untuk publik di semua pages
- [ ] **Phase 7 [M]: Update Tests** — ganti mock localStorage → mock Supabase di semua test files

## Key Changes

| File | Perubahan |
|------|-----------|
| `src/lib/supabase.ts` | Baru — Supabase client singleton |
| `src/lib/storage.ts` | Rewrite total — async functions per entitas |
| `src/store/use*Store.ts` (5 file) | Actions jadi async, hapus import dari storage generic |
| `src/store/useAuthStore.ts` | Baru — auth state (session, isAdmin) |
| `src/pages/LoginPage.tsx` | Baru — form login admin |
| `src/App.tsx` | Tambah route `/login`, init auth listener |
| `src/components/Shell.tsx` | Tambah auth state + logout button |
| `src/pages/*.tsx` (5 pages) | Conditional render write UI |
| `src/lib/storage.test.ts` | Ganti mock localStorage → mock Supabase |
| `src/store/*.test.ts` (5 file) | Update mock ke Supabase responses |
| `.env.example` | Tambah `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` |

## Validation and Acceptance

```bash
npm run test:run      # semua tests pass
npm run build         # TypeScript compile tanpa error
npm run dev           # dev server jalan
```

Manual checks:
- Publik bisa lihat daftar liga tanpa login
- Admin bisa login via `/login`
- Setelah login, tombol write muncul
- Admin bisa create liga, input skor
- Logout → tombol write hilang
- Data persisten di Supabase (refresh page data tetap ada)

## Idempotence and Recovery

- Phase 1 (SQL setup) — jika schema sudah ada, `create table if not exists` aman dijalankan ulang
- Phase 3–6 — file edits idempoten, bisa diulang
- Phase 7 (tests) — vitest tidak ubah state, aman diulang

Rollback: karena fresh start (tidak ada data lama), rollback cukup revert commits git.

## Dependencies

| Package | Alasan |
|---------|--------|
| `@supabase/supabase-js` | Supabase client resmi untuk browser |

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| camelCase ↔ snake_case mapping error | Test tiap fungsi storage dengan mock Supabase |
| RLS terlalu ketat (publik tidak bisa SELECT) | Verifikasi policy di Supabase dashboard setelah setup |
| Zustand stores async breaking React renders | Tambah loading state di stores jika diperlukan |
| `Season.bracket` (complex jsonb) tidak tersimpan benar | Test create + read season dengan bracket data |

## Surprises & Discoveries

- 2026-05-28 03:26:05 WIB — `.env.local` is absent. Phase 2 precondition requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to exist locally after Supabase project setup.
- 2026-05-28 03:31:09 WIB — `.env.example` is deleted in git and an untracked `.env copy.example` exists with the expected env keys. Restoring `.env.example` for Phase 2 and leaving the untracked copy untouched.
- 2026-05-28 03:33:00 WIB — `src/lib/supabase.ts` needed a local `/// <reference types="vite/client" />` because this repo has no existing Vite env declaration file and `tsconfig.json` constrains global types.
- 2026-05-28 03:35:00 WIB — The migration plan covers Zustand stores and pages, but omits dependent library modules that still rely on synchronous localStorage APIs. This is a scope contradiction rather than an implementation detail.

## Decision Log

- 2026-05-28 03:21:00 — Decision: `clubs_cache` tetap di localStorage. Rationale: ini adalah cache Football API, bukan data utama aplikasi; tidak perlu disimpan di DB.
- 2026-05-28 03:21:00 — Decision: mapping camelCase↔snake_case di storage layer, bukan di types. Rationale: TypeScript types tidak berubah, mengurangi perubahan di komponen.
- 2026-05-28 03:21:00 — Decision: auth state via `useAuthStore` Zustand + `onAuthStateChange`. Rationale: konsisten dengan pola stores yang sudah ada.
- 2026-05-28 03:40:00 WIB — Decision: expand migration scope to update storage-dependent helper modules instead of keeping temporary legacy storage compatibility exports. Rationale: user approved a clean Supabase migration after Phase 3 revealed `schedule.ts`, `standings.ts`, `playerStats.ts`, `main.tsx`, and `SeasonPage.tsx` still depend on synchronous localStorage APIs; retaining compatibility would leave hidden localStorage-backed core behavior.

## Outcomes & Retrospective

Automated verification completed. Manual browser validation is pending.

## Open Questions

None.
