# Implementation Plan: Migrate League Organizer ke React

> Created: 2026-05-27 15:37:00

## Purpose / Big Picture

Memindahkan rendering layer aplikasi League Organizer dari vanilla JS + `innerHTML` ke React (Vite + TypeScript + Zustand + React Router), tanpa mengubah business logic, storage layer, data model localStorage, atau design system (CSS).

Tujuan: modernisasi codebase agar dapat diperluas dengan lebih mudah, sambil menjaga kompatibilitas data penuh dengan versi lama.

Brainstorm artifact: [docs/brainstorms belum dibuat — konteks tersedia di plan ini]

## Objective

- Scaffold proyek Vite + React + TypeScript
- Port file logic (`storage.js`, `api.js`, `schedule.js`, `standings.js`) ke TypeScript tanpa mengubah logika
- Buat Zustand stores sebagai bridge ke localStorage
- Konversi setiap halaman HTML lama menjadi React page component
- Implementasi SPA routing dengan React Router v6
- Pertahankan semua CSS class names agar `styles/main.css` tetap bekerja

## Context and Orientation

- **Relevant files/modules:**
  - `js/storage.js` — CRUD localStorage, cascade delete
  - `js/api.js` — fetch clubs dari API Football + cache
  - `js/schedule.js` — round-robin, playoff, schedule generation
  - `js/standings.js` — kalkulasi standings
  - `js/wheel.js` — spin wheel modal (canvas animation)
  - `js/leagues.js`, `js/league.js`, `js/teams.js`, `js/season.js`, `js/settings.js` — page logic
  - `js/ui.js` — renderShell, escapeHtml, badge, teamBadge, requireEntity
  - `styles/main.css` — satu file CSS, dipakai ulang as-is

- **Existing patterns to follow:**
  - Setiap halaman punya fungsi `render()` yang di-call ulang setelah mutasi → diganti React state + re-render
  - `escapeHtml()` wajib sebelum `innerHTML` → tidak diperlukan lagi di React (JSX auto-escape)
  - Storage layer selalu melalui `storage.js` functions, tidak akses `localStorage` langsung

- **Constraints:**
  - localStorage schema TIDAK boleh berubah (backward compatible)
  - CSS class names HARUS identik dengan yang ada di `main.css`
  - Logika di `schedule.js` dan `standings.js` sangat kompleks — port hanya tipe, jangan ubah logika
  - Tidak ada backend — semua data tetap di localStorage

## Scope

### In scope
- Scaffold Vite + React + TypeScript project di direktori yang sama
- Port semua `js/*.js` logic files ke `src/lib/*.ts` (hanya tambah types)
- Buat 4 Zustand stores: league, team, season, match
- Buat Shell component dan komponen shared (Badge, TeamBadge, SpinWheel)
- Buat 5 React page components menggantikan 5 halaman HTML
- Setup React Router v6 dengan route mapping yang tepat
- Copy `styles/main.css` ke root `src/` atau referensikan dari lokasi lama

### Out of scope
- Perubahan UI/UX atau design system
- Perubahan business logic atau algoritma
- Perubahan localStorage schema
- Penambahan fitur baru
- Testing framework (proyek ini tidak punya test suite)
- Server-side rendering atau backend

## Architecture & Approach

**Prinsip utama:** Zustand hanya sebagai "view cache" dari localStorage. Setiap store:
1. Init state dari `getAll()` saat module load
2. Setiap mutasi: panggil `storage.ts` function → lalu `set()` untuk trigger re-render
3. `refresh()` tersedia untuk sync ulang jika perlu

**Routing mapping:**
| Lama (multi-page) | Baru (React Router) |
|---|---|
| `leagues.html` | `/` |
| `league.html?id=xxx` | `/league/:id` |
| `teams.html?leagueId=xxx` | `/league/:id/teams` |
| `season.html?id=xxx` | `/league/:id/season/:seasonId` |
| `settings.html` | `/settings` |

**SpinWheel:** Diport ke React component menggunakan `useRef` untuk canvas element dan `useEffect` untuk trigger animasi CSS transform.

**Struktur folder target:**
```
src/
  lib/
    storage.ts
    api.ts
    schedule.ts
    standings.ts
  store/
    useLeagueStore.ts
    useTeamStore.ts
    useSeasonStore.ts
    useMatchStore.ts
  components/
    Shell.tsx
    Badge.tsx
    TeamBadge.tsx
    SpinWheel.tsx
  pages/
    LeaguesPage.tsx
    LeaguePage.tsx
    TeamsPage.tsx
    SeasonPage.tsx
    SettingsPage.tsx
  App.tsx
  main.tsx
styles/
  main.css       ← tidak diubah
index.html       ← Vite entry point (baru)
```

## Progress

- [ ] Plan approved for execution.
- [x] Phase 1: Scaffold & Logic Layer — complete.
- [x] Phase 2: Store Layer — complete.
- [x] Phase 3: Shell & Shared Components — complete.
- [x] Phase 4: Pages — complete.
- [-] Phase 5: Routing & Final Polish — in progress.
- [ ] Final verification pending.

- 2026-05-27 15:47:17 WIB — Started Phase 1: Scaffold & Logic Layer. Verified Node.js v26.1.0 and npm 11.13.0 are available.
- 2026-05-27 15:52:30 WIB — Completed Phase 1. Added Vite/React/TypeScript scaffold and `src/lib/{types,storage,api,schedule,standings}.ts`; installed dependencies; verification passed with `npx tsc --noEmit` and `npm run build`.
- 2026-05-27 15:52:43 WIB — Started Phase 2: Store Layer.
- 2026-05-27 15:53:31 WIB — Completed Phase 2. Added four Zustand stores in `src/store/`; verification passed with `npx tsc --noEmit`.
- 2026-05-27 15:53:42 WIB — Started Phase 3: Shell & Shared Components.
- 2026-05-27 15:54:57 WIB — Completed Phase 3. Added `Shell`, `Badge`, `TeamBadge`, `SpinWheel`, React bootstrap, and temporary `App`; verification passed with `npx tsc --noEmit`; `npm run dev -- --host 127.0.0.1` is serving at `http://127.0.0.1:5173/`.
- 2026-05-27 15:55:16 WIB — Started Phase 4: Pages.
- 2026-05-27 16:02:40 WIB — Completed Phase 4. Added `SettingsPage`, `LeaguesPage`, `LeaguePage`, `TeamsPage`, and `SeasonPage`; verification passed with `npx tsc --noEmit`.
- 2026-05-27 16:02:56 WIB — Started Phase 5: Routing & Final Polish.
- 2026-05-27 20:19:02 WIB — Fixed Zustand v5 `getSnapshot` warning by moving filtered/sorted selector derivations into `useMemo` in `LeaguesPage`, `LeaguePage`, `TeamsPage`, `SeasonPage`, and `SpinWheel`. Verification passed with `npx tsc --noEmit` and `npm run build`. Local curl cannot reach the user's existing dev server on port 5173 from the sandbox namespace; browser manual verification remains pending.
- 2026-05-27 20:29:54 WIB — Addressed review P1/P2 findings: switched `BrowserRouter` to `HashRouter` for static hosting, moved `TeamsPage` derived hooks before the early return, added build output ignores for `dist/` and `*.tsbuildinfo`, and removed the legacy `settings.html` redirect from `src/lib/api.ts`. Verification passed with `npx tsc --noEmit`, `npm run build`, selector scan, and legacy redirect/router scan.

## Phases

- [x] **Phase 1 [M]: Scaffold & Logic Layer** — Init Vite project, port lib/*.ts, copy CSS
- [x] **Phase 2 [M]: Store Layer** — Buat 4 Zustand stores sebagai bridge localStorage
- [x] **Phase 3 [M]: Shell & Shared Components** — Shell.tsx, Badge, TeamBadge, SpinWheel
- [x] **Phase 4 [L]: Pages** — 5 React page components (Settings → Leagues → League → Teams → Season)
- [-] **Phase 5 [S]: Routing & Final Polish** — App.tsx, React Router, verifikasi alur

## Key Changes

- **Baru:** `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` (Vite entry)
- **Baru:** `src/lib/` (4 files ported ke TS)
- **Baru:** `src/store/` (4 Zustand stores)
- **Baru:** `src/components/` (4 components)
- **Baru:** `src/pages/` (5 pages)
- **Baru:** `src/App.tsx`, `src/main.tsx`
- **Tidak diubah:** `styles/main.css`, `js/*.js` (file lama tetap ada, tidak dihapus)

## Validation and Acceptance

- `npm run build` — tidak ada TypeScript error
- `npm run dev` — dev server jalan di localhost
- Verifikasi manual semua alur utama di browser:
  - Buat liga baru → redirect ke halaman liga
  - Tambah tim / import dari API Football
  - Spin wheel → assign owner
  - Buat musim → generate jadwal
  - Input skor → musim finish → champion tercatat
  - localStorage data lama tidak hilang / tidak corrupt
- Semua CSS class names identik → tampilan visual sama dengan versi lama

## Idempotence and Recovery

- **Safe re-run:** Ya — semua fase hanya create file baru atau modify TS types. Tidak ada operasi destructive.
- **Rollback:** File `js/*.js` lama tidak dihapus, HTML lama tidak dihapus — bisa dikembalikan kapan saja.
- **Irreversible:** Tidak ada operasi irreversible dalam plan ini.

## Dependencies

| Package | Versi | Alasan |
|---------|-------|--------|
| `vite` | latest | Build tool |
| `react` + `react-dom` | ^18 | Framework |
| `@types/react` + `@types/react-dom` | latest | TypeScript types |
| `typescript` | ^5 | Language |
| `react-router-dom` | ^6 | SPA routing |
| `zustand` | ^5 | State management |

Tidak ada dependencies UI library — CSS dari `main.css` dipakai langsung.

## Risks & Mitigations

| Risiko | Mitigasi |
|--------|----------|
| **SpinWheel** — CSS `transform` animation bergantung pada DOM element | Gunakan `useRef(wheelEl)` + apply transform via `wheelEl.current.style.transform` |
| **CSS class names berbeda** | Copy class names dari `innerHTML` lama secara verbatim ke JSX `className` |
| **`schedule.js` sangat panjang dan kompleks** | Port hanya interface/types, tidak ubah satu baris logika |
| **URL params lama (`?id=xxx`)** jadi path params | Semua `<a href="...">` dan `navigate()` diupdate di Phase 5 sekaligus |
| **Impor klub dari API Football** — ada redirect ke `settings.html` jika tanpa API key | Port redirect ke `navigate('/settings')` via React Router |
| **Modal spin wheel** — sebelumnya append ke `document.body` | Ganti dengan React state untuk toggle visibility modal |

## Surprises & Discoveries

- `season.js` adalah file paling besar dan kompleks (~445 baris) karena menggabungkan schedule, standings, dan playoff bracket rendering.
- `wheel.js` menggunakan CSS `transform: rotate(Ndeg)` bukan Canvas — lebih mudah diport ke React.
- `cascadeDeleteLeague()` di `storage.js` menghapus relasi secara manual — tidak perlu diubah, cukup diekspos dari store.

## Decision Log

- 2026-05-27 15:37:00 — Zustand dipilih (bukan Context) karena wrap pattern-nya lebih sederhana untuk localStorage bridge. Rationale: tidak perlu Provider wrapper, action mudah didefinisikan inline.
- 2026-05-27 15:37:00 — File JS lama tidak dihapus selama migrasi. Rationale: rollback safety — jika ada masalah, HTML lama masih bisa dibuka langsung.

## Outcomes & Retrospective

To be completed by `execute-plan` after final verification.

## Open Questions

- Tidak ada — semua requirement sudah dikonfirmasi via brainstorm session.
