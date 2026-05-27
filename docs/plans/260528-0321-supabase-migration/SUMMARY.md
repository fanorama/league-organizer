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

- [ ] Plan approved for execution.
- [ ] Phase 1: Supabase project setup (manual steps)
- [ ] Phase 2: Install client & init
- [ ] Phase 3: Rewrite storage layer
- [ ] Phase 4: Update Zustand stores ke async
- [ ] Phase 5: Auth — LoginPage + Shell
- [ ] Phase 6: Conditional write UI
- [ ] Phase 7: Update tests
- [ ] Final verification pending.

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

None yet.

## Decision Log

- 2026-05-28 03:21:00 — Decision: `clubs_cache` tetap di localStorage. Rationale: ini adalah cache Football API, bukan data utama aplikasi; tidak perlu disimpan di DB.
- 2026-05-28 03:21:00 — Decision: mapping camelCase↔snake_case di storage layer, bukan di types. Rationale: TypeScript types tidak berubah, mengurangi perubahan di komponen.
- 2026-05-28 03:21:00 — Decision: auth state via `useAuthStore` Zustand + `onAuthStateChange`. Rationale: konsisten dengan pola stores yang sudah ada.

## Outcomes & Retrospective

To be completed after final verification.

## Open Questions

None.
