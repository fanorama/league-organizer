# Phase 05 — Update Dokumentasi

**Objektif:** Sinkronkan dokumentasi dengan fitur Competition yang sudah diimplementasi.

**Kompleksitas/Risiko:** S

## Tasks

1. **`AGENTS.md`**:
   - Tambah halaman baru ke "Struktur Proyek" (`CompetitionsPage.tsx`, `CompetitionPage.tsx`), store (`useCompetitionStore.ts`), lib (`competition.ts`).
   - Tambah baris routing `#/competitions` & `#/competition/:id` ke tabel Routing.
   - Tambah 3 tabel baru ke "Data Model (Supabase Tables)".
   - Tambah catatan singkat fitur Competition (lifecycle, qualifyMode, knockoutLegs) di bagian alur/feature.

2. **`docs/SUMMARY.md`** + detail docs:
   - `docs/architecture/domain-flows.md`: tambah seksi alur Competition (draw → grup → knockout → juara).
   - `docs/codebase/key-modules.md`: tambah `competition.ts`, `useCompetitionStore.ts`, halaman baru.
   - `docs/codebase/directory-structure.md` & tabel routing: tambah route baru.
   - `docs/project-pdr/business-rules.md`: tambah aturan competition (distribusi grup ≤1, best-third simplifikasi, manual winner saat agregat seri, fallback bracket).

3. **`docs/SCHEMA.md`**: pastikan DDL Phase 01 sudah tercantum (jika belum, finalisasi di sini).

## Verifikasi
- Tinjau manual: setiap file ter-update konsisten dengan kode final (nama file, route, tabel cocok).

## Acceptance Criteria
- AGENTS.md & docs/ mencerminkan fitur Competition; tidak ada referensi usang.
- Pembaca baru bisa memahami fitur dari docs tanpa membaca chat.
