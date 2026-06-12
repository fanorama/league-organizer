# Plan: Fitur "Competition" (Group + Knockout)

**Slug:** `260611-1233-competition-feature`
**Dibuat:** 2026-06-11 12:33
**Status:** Draft (siap dieksekusi)
**Sumber:** Brainstorm tervalidasi (sesi `/brainstorm` 2026-06-11)

---

## 1. Tujuan & Hasil yang Diharapkan

Menambahkan mode turnamen baru **Competition** bergaya Piala Dunia/Euro/UCL ke League Organizer — entitas **top-level mandiri** (sejajar League, tidak terikat `league_id`). Alur lengkap:

> buat competition → daftarkan peserta (player) → undi klub via spin wheel → draw grup berbasis pot → fase grup (round-robin) → kualifikasi → knockout single-elimination → juara.

Hasil yang dapat diamati pengguna:
- Menu **Competitions** baru di navigasi; halaman `#/competitions` (daftar + buat) dan `#/competition/:id` (detail dengan tab per fase).
- Admin bisa mengatur format grup fleksibel, menjalankan undian, menginput skor grup & knockout, dan melihat juara.
- Pengunjung non-admin bisa melihat semua (read-only, sesuai RLS Supabase).

## 2. Arsitektur (Approach A — Entitas Paralel Penuh)

Mengikuti lapisan wajib **UI → Store → `storage.ts` → Supabase** (AGENTS.md). Tiga tabel baru terpisah, store baru, helper murni baru, dua halaman baru. **Tidak menyentuh** tabel/alur liga yang sudah teruji. Helper murni di-reuse: `generateRoundRobin()`, `pickWeightedClub()`, komponen `SpinWheel`, `TeamBadge`, dan pola render bracket dari `SeasonPage`.

### Lifecycle status competition
```
setup → draw_clubs → group_draw → group_stage → knockout → finished
```

## 3. Asumsi & Keputusan (dari brainstorm)

- **Peserta** = player + klub (snapshot ownership ala `ownerSnapshots`). Skor antar player.
- **Undian klub** per player via `pickWeightedClub` (reuse weighted draw + `SpinWheel`).
- **Draw grup** berbasis pot: peserta dibagi ke `potCount` pot (urut by tier/seed), satu peserta per pot disebar ke tiap grup, tanpa collision pot-sama di grup-sama.
- **Distribusi tak rata**: `groupCount` ditentukan admin; sisa peserta disebar round-robin → selisih ukuran antar-grup ≤ 1 (mis. 17 peserta, 4 grup → ukuran 5,4,4,4).
- **qualifyMode**: `top1` | `top2` | `top2_plus_best_thirds`.
- **Best-third ranking**: pakai **semua hasil grup** (Pts → GD → GF), simplifikasi MVP (BUKAN normalisasi vs top-4).
- **Pairing best-third → bracket**: tabel lookup ala UEFA untuk jumlah grup yang didukung (mis. 6 & 8 grup); **fallback** penempatan berurutan + warning bila konfigurasi di luar tabel.
- **Knockout**: single-elimination. Leg configurable `1` (single) atau `2` (two-legged, agregat); **final selalu single leg**. Jika agregat seri → pemenang ditentukan **manual oleh admin** (tidak ada away-goals/penalty otomatis).
- **Champion** = pemenang final → `champion_id`, status `finished`.
- Write **admin-only** lewat RLS Supabase (pola dua-policy: public read + authenticated write), tanpa route guard.

## 4. Non-Goals (MVP)

- Third-place playoff match.
- Away-goals rule, extra time / penalty tracking terpisah.
- Seeding otomatis berbasis stats lintas-competition.
- Normalisasi best-third vs top-4 (aturan UEFA penuh).
- Test komponen React (UI diverifikasi via `npm run dev`, sesuai konvensi).

## 5. Strategi Berfase

| Phase | Objektif | Kompleksitas |
|-------|----------|--------------|
| [phase-01](phase-01-types-schema-storage.md) | Types, DDL Supabase (SCHEMA.md), mapper + CRUD storage | M |
| [phase-02](phase-02-competition-helpers.md) | Helper murni `competition.ts` + unit test (engine turnamen) | L |
| [phase-03](phase-03-store-orchestration.md) | Store `useCompetitionStore` + orkestrasi lifecycle + test | M |
| [phase-04](phase-04-pages-routing.md) | Halaman `CompetitionsPage` & `CompetitionPage` (tab fase) + routing + nav | L |
| [phase-05](phase-05-docs.md) | Update dokumentasi (AGENTS.md, docs/) | S |

Urutan menjaga dependensi: data layer → engine murni (teruji) → orkestrasi → UI → docs. Phase 1–3 sepenuhnya unit-testable sebelum UI.

## 6. Verifikasi Global

```bash
npm run test:run     # semua unit test hijau (termasuk test baru)
npm run build        # tsc + vite build tanpa error
npm run dev          # verifikasi manual alur UI di browser
```

Catatan: DDL di SCHEMA.md harus dijalankan **manual** di Supabase SQL Editor sebelum verifikasi UI end-to-end (greenfield, idempotent).

## 7. Risiko & Mitigasi

- **Engine bracket kompleks** (seeding grup → knockout, two-legged agregat). Mitigasi: helper murni `competition.ts` dengan rng injected + unit test menyeluruh sebelum UI (pola `balancedDraw`/`schedule`).
- **Best-third lookup di luar konfigurasi didukung**. Mitigasi: fallback berurutan + warning, dites eksplisit.
- **`schedule.ts` punya `@ts-nocheck`** — jangan ubah file itu; reuse hanya `generateRoundRobin` (sudah typed) via import.
- **Drift skema DB vs types**. Mitigasi: mapper dbToX/xToDb diuji di `storage.test.ts`.

---

## 8. Progress (diisi saat eksekusi)

- [x] Phase 1 — types + DDL SCHEMA + storage CRUD/mapper. `tsc --noEmit` lolos, 107 test hijau (2026-06-11).
- [x] Phase 2 — `competition.ts` engine murni + `competition.test.ts` (27 test hijau, tsc bersih) (2026-06-11).
- [x] Phase 3 — `useCompetitionStore.ts` + test (6 test). Suite penuh 140 test hijau, tsc bersih (2026-06-11).
- [x] Phase 4 — `CompetitionsPage` + `CompetitionPage` (tab per fase), routing `App.tsx`, nav `Shell.tsx`. `npm run build` sukses, tsc bersih, 140 test hijau. Verifikasi browser end-to-end menunggu DDL dijalankan user di Supabase (2026-06-11).
- [x] Phase 5 — update AGENTS.md, docs/SUMMARY.md, domain-flows, key-modules, directory-structure, business-rules. SCHEMA.md sudah final di Phase 1 (2026-06-11).

## 9. Surprises / Discoveries (diisi saat eksekusi)

- **2026-06-11** `createId()` yang disebut di phase-01 task 3 **tidak ada** di codebase. Pola existing: ID di-generate Supabase via `gen_random_uuid()` default; upsert tanpa id mengandalkan DB. Mapper `competitionToDb` dkk mengikuti pola ini (tidak set id saat insert).

## 10. Decision Log (diisi saat eksekusi)

- **2026-06-11 (Phase 1)** DDL di `docs/SCHEMA.md` dijalankan **manual** oleh user di Supabase SQL Editor (di luar scope eksekusi kode). Mapper mengikuti pola `gen_random_uuid()` — insert tanpa id, ID datang dari DB.
- **2026-06-11 (Phase 3)** Ditambahkan action `startClubDraw(competitionId)` (transisi `setup → draw_clubs`) yang tidak eksplisit di phase-03 namun dibutuhkan oleh tab Setup di phase-04. Konsisten dengan pola guard transisi lainnya.
- **2026-06-11 (Phase 4)** Komponen `SpinWheel` existing terkutat erat ke liga (mutasi `team.ownerId`, status pool/ready/active per-liga) sehingga **tidak dipakai langsung**. Yang di-reuse adalah engine `pickWeightedClub` (helper inti undian) lewat tombol "Undi" per peserta di tab Undian. Reuse `TeamBadge`/animasi wheel penuh dilewati demi kesederhanaan MVP; fungsi undian berbobot tetap identik.
- **2026-06-11 (Phase 4)** Skill pemain untuk undian klub memakai `player.skillOverride ?? 'sedang'` (tanpa kalkulasi stats lintas-liga) — simplifikasi MVP agar halaman competition tidak bergantung pada `playerStats`/seasons. Pool klub = tim global yang punya `externalId` & belum dipakai peserta lain.

## 11. Outcomes / Retrospective (diisi saat eksekusi)

**Status: SELESAI** (2026-06-11). Kelima fase tuntas.

- **Verifikasi global**: `npx tsc --noEmit` bersih · `npm run test:run` → **140 test hijau (23 file)**, termasuk `competition.test.ts` (27) dan `useCompetitionStore.test.ts` (6) baru · `npm run build` sukses.
- **File baru**: `src/lib/competition.ts` (+test), `src/store/useCompetitionStore.ts` (+test), `src/pages/CompetitionsPage.tsx`, `src/pages/CompetitionPage.tsx`.
- **File diubah**: `src/lib/types.ts`, `src/lib/storage.ts`, `src/App.tsx`, `src/components/Shell.tsx`, `docs/SCHEMA.md`, `AGENTS.md`, `docs/SUMMARY.md`, `docs/architecture/domain-flows.md`, `docs/codebase/key-modules.md`, `docs/codebase/directory-structure.md`, `docs/project-pdr/business-rules.md`.
- **Deviasi yang disetujui** (lihat Decision Log): `startClubDraw` ditambahkan ke store; `SpinWheel` tidak di-reuse penuh (hanya engine `pickWeightedClub`); skill undian pakai `skillOverride ?? 'sedang'`.
- **Tindak lanjut pengguna (BLOCKER untuk verifikasi browser)**: jalankan DDL Phase 1 di `docs/SCHEMA.md` secara **manual** di Supabase SQL Editor (3 tabel + index + RLS, idempotent). Setelah itu verifikasi alur end-to-end via `npm run dev`: buat competition → tambah peserta → undi klub → undi grup → input skor grup → mulai knockout (uji two-legged agregat + manual winner) → juara tampil.
