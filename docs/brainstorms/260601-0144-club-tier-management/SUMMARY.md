# Brainstorm: Club Tier Management — Halaman "Clubs" Global

> Created: 2026-06-01 01:44:00

## Context

- Tier klub (`elite | mid | underdog`) memengaruhi **balanced draw** di spin wheel (`src/lib/balancedDraw.ts`).
- Saat ini tier hanya bisa diatur **per-tim inline** lewat popover `TierBadge` di `TeamsPage` masing-masing liga.
- Tier bersifat **persisten lintas-liga** di tabel `club_tiers` (`external_id` PK + `tier`), namun **tidak ada tempat terpusat** untuk melihat/mengaturnya.
- Konsekuensinya: mengatur tier dari konteks liga itu berulang dan canggung, apalagi untuk banyak klub.
- Klarifikasi: "team management feature" yang dimaksud user = **khusus pengelolaan club tier**, bukan konsep team/squad baru.

## Goals

- Halaman global **"Clubs"** (admin) untuk melihat & mengatur tier seluruh klub lintas-liga dalam satu layar.
- Sumber kebenaran tetap tabel `club_tiers`; tulis langsung via fungsi storage yang sudah ada.
- Mendukung pengaturan cepat/bulk dan pencarian klub.
- Nol perubahan skema DB; maksimalkan reuse infrastruktur import yang ada.

## Non-Goals

- Tidak membuat konsep "team/squad multi-player" atau roster anggota di dalam klub.
- Tidak mengelola klub manual (tanpa `externalId`) — halaman ini hanya untuk klub berkompetisi yang didukung (sumber API).
- Tidak menyentuh `Team.tier` tim yang sudah ada di liga (tidak ada sinkronisasi balik ke musim berjalan).
- Tidak mengubah alur spin wheel / balanced draw yang ada.

## Chosen Approach

**Pendekatan A — Competition-driven (reuse infra import).**

- Route baru `#/clubs` → `src/pages/ClubsPage.tsx`; link "Clubs" di `Shell.tsx` (admin).
- Tab per kompetisi dari `COMPETITIONS` (`src/lib/api.ts`); muat klub via `fetchClubs(code)` (cache 7 hari di localStorage).
- Overlay tier per klub via `getClubTiers(externalIds)`; tampilkan default "Mid" untuk yang belum diset.
- Set/clear tier per klub via `TierControl` (pola popover seperti `TierBadge`) → `saveClubTier()` / `deleteClubTier()`.
- Update optimistik pada `tierMap` lokal + rollback jika gagal.
- Bulk action: pilih beberapa klub → set tier sekaligus (`Promise.all`).
- Filter pencarian nama klub.
- Banner penjelas: "Perubahan berlaku untuk import berikutnya" (tidak mengubah tim liga aktif).

**Rationale:** selaras filosofi "ringan, tanpa friksi"; nol perubahan skema; `external_id` identik dengan id API sehingga overlay tier mulus; reuse `api.ts`, pola `ImportClubGrid`, dan storage tier yang sudah ada.

## Alternatives Considered

- **B — Registry mandiri (perluas `club_tiers` dengan `name`/`logo`):** independen dari API, bisa muat klub kustom. Ditolak karena butuh migrasi skema + seeding metadata, klub belum di-tier tidak muncul sampai di-seed, dan risiko metadata basi — overkill untuk kebutuhan saat ini.
- **C — Hybrid (tab kompetisi + simpan `name` di `club_tiers`):** robust saat API gagal. Ditolak (untuk sekarang) karena dua sumber data + migrasi ringan menambah kompleksitas tanpa kebutuhan nyata; bisa jadi peningkatan lanjutan bila keandalan offline diperlukan.

## Risks & Mitigations

- **API/cache gagal** → blok error + tombol "Coba lagi" (pola `ImportClubGrid`); cache 7 hari mengurangi panggilan.
- **Tulis tier gagal** → rollback `tierMap` + pesan inline per kartu; tidak menghentikan kartu lain.
- **Inkonsistensi persepsi** (tier diubah tapi musim berjalan tak berubah) → banner penjelas eksplisit; `club_tiers` ditegaskan sebagai sumber kebenaran untuk import berikutnya.
- **Akses non-admin** → kontrol tier disembunyikan (read-only); write tetap dijaga RLS Supabase.

## Open Questions

- Perlu tombol **refresh manual** cache klub per tab? (opsional, nice-to-have)
- Format bulk-select: checkbox per kartu vs mode seleksi toggle — diputuskan saat implementasi/plan.
- Apakah halaman juga menampilkan ringkasan jumlah klub per tier sebagai info? (opsional)

## Next Step Recommendation

- Lanjut ke `write-plan` untuk memecah urutan build menjadi langkah konkret:
  1. `ClubsPage` skeleton + route `#/clubs` + link `Shell.tsx` (admin-only)
  2. Tab kompetisi + `fetchClubs` + grid read-only (overlay tier)
  3. `TierControl` set/clear (optimistic + rollback)
  4. Filter cari + bulk action
  5. Banner + empty/error states
  6. Verifikasi browser + update `AGENTS.md` & `docs/codebase/directory-structure.md`
