# Phase 04 — Halaman, Routing & Navigasi

**Objektif:** UI lengkap: daftar/buat competition, dan halaman detail dengan tab per fase yang mengikuti lifecycle. Routing + link navigasi. Write admin-only (mengikuti `useAuthStore.isAdmin`).

**Kompleksitas/Risiko:** L

## Prasyarat
- Baca `src/pages/LeaguesPage.tsx` (pola daftar + buat), `src/pages/SeasonPage.tsx` (input skor inline + render bracket playoff), `src/pages/TeamsPage.tsx` (penggunaan `SpinWheel` + `pickWeightedClub` + drag-drop pool/draw).
- Baca `src/components/SpinWheel.tsx`, `src/components/TeamBadge.tsx`, `src/components/Shell.tsx` (nav + tombol login).
- Baca `src/App.tsx` (definisi route HashRouter).
- Baca `src/store/useAuthStore.ts` (`isAdmin`).

## Tasks

1. **`src/pages/CompetitionsPage.tsx`** (`#/competitions`):
   - Daftar competition (nama, status badge, jumlah peserta) via `useCompetitionStore.fetchCompetitions`.
   - Admin: form buat competition → isi `name`, `description`, dan `CompetitionSettings` (groupCount, meetingsPerPair, qualifyMode, bestThirdsCount kondisional, knockoutLegs, potCount). Navigate ke `#/competition/:id` setelah dibuat.
   - Non-admin: read-only list.

2. **`src/pages/CompetitionPage.tsx`** (`#/competition/:id`):
   - `loadCompetitionDetail(id)` saat mount. Host dengan **tab per fase**, tab aktif/terlihat sesuai `status`:
     - **Setup**: kelola peserta (pilih `Player` global, tambah/hapus), edit settings, tombol "Mulai undian klub" → `draw_clubs`.
     - **Draw**: (a) undi klub per player — reuse `SpinWheel` + `pickWeightedClub(poolKlub, skill, rng)` dan `assignClubToParticipant`; tombol `finishClubDraw`. (b) draw grup — tombol `runGroupDraw` dengan animasi/penyebaran ke grup; tampilkan komposisi grup hasil.
     - **Grup**: kartu klasemen per grup (`computeGroupStandings`) + daftar match grup dengan input skor inline (pola `SeasonPage`). Tombol "Mulai knockout" (`startKnockout`) muncul saat semua match grup `finished`; tampilkan badge lolos (juara/runner-up/best-third).
     - **Knockout**: render bracket (reuse pola render `PlayoffBracket` di `SeasonPage`); input skor per leg; tampilkan agregat untuk two-legged; bila agregat seri tampilkan pemilih pemenang manual (`resolveTie(..., manualWinnerId)`). Tampilkan warning bila bracket dari fallback.
     - **Juara**: ringkasan champion + klub.
   - Semua aksi write disembunyikan/disabled bila `!isAdmin`.

3. **Routing** di `src/App.tsx`: tambah `<Route path="/competitions" .../>` dan `<Route path="/competition/:id" .../>`.

4. **Navigasi** di `src/components/Shell.tsx`: tambah link **Competitions** ke `#/competitions`.

## Verifikasi
```bash
npm run build        # tsc + vite build sukses
npm run dev          # verifikasi manual end-to-end (perlu DDL sudah dijalankan di Supabase)
```
Verifikasi manual (browser): buat competition → tambah ≥ peserta → undi klub → draw grup → input skor grup → mulai knockout → input skor knockout (uji two-legged agregat + manual winner) → champion tampil.

## Acceptance Criteria
- Dua halaman baru render tanpa error; tab mengikuti lifecycle.
- Reuse `SpinWheel`, `pickWeightedClub`, `TeamBadge`, pola bracket `SeasonPage` (tidak menduplikasi engine).
- Aksi write hanya untuk admin; non-admin read-only.
- `npm run build` sukses; alur end-to-end berjalan di `npm run dev`.

## Catatan
- Tidak ada test komponen (sesuai konvensi) — verifikasi via browser.
- Pool klub untuk undian: gunakan klub dari `clubs_cache`/import yang sudah ada, atau daftar klub yang dipilih admin saat setup (samakan dengan sumber pool di TeamsPage).
