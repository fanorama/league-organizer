# Implementation Plan: Import Clubs UX Redesign

> Created: 2026-05-26 16:30:00

## Purpose / Big Picture

Modal "Import clubs" saat ini memiliki 4 friction point yang membuat pengalaman import klub dari API tidak intuitif: tombol "Load clubs" ekstra, search tidak aktif sebelum load, tidak ada indikasi klub yang sudah di pool, dan layout checkbox yang awkward.

Perubahan ini menghilangkan keempat friction tersebut dengan satu fungsi yang didesain ulang — tidak ada file baru, tidak ada perubahan arsitektur.

[Brainstorm artifacts](../../brainstorms/260526-1630-import-clubs-ux/SUMMARY.md)

## Objective

Ubah fungsi `openImportModal()` di `js/teams.js` agar:
1. Auto-load clubs saat competition dipilih (tanpa tombol ekstra)
2. Search real-time aktif sejak data masuk, debounce 150ms
3. Baris klub yang `externalId` sudah ada di pool → dim + badge "In pool" + checkbox disabled
4. Checkbox pindah ke kiri, seluruh `<label>` row adalah click target
5. Footer sticky "Add N selected" muncul saat ≥1 item dipilih

## Context and Orientation

- Relevant docs loaded: `docs/brainstorms/260526-1630-import-clubs-ux/SUMMARY.md`
- Relevant files/modules:
  - `js/teams.js` — satu-satunya file yang diubah, fungsi `openImportModal()`
  - `js/api.js` — `fetchClubs(competitionId)`, `COMPETITIONS` (read-only, tidak diubah)
  - `js/storage.js` — `KEYS`, `getAll()`, `save()` (read-only, tidak diubah)
  - `js/ui.js` — `escapeHtml()` (read-only, tidak diubah)
- Existing patterns to follow:
  - Modal dibuka via `modal.className = "modal open"`, ditutup via `modal.className = "modal"`
  - Rendering via `innerHTML` string dengan event listener dipasang setelahnya
  - `escapeHtml()` wajib untuk semua user-facing string dari API
  - `save(KEYS.teams, {...})` untuk persist klub baru
- Constraints:
  - Cache API 7-hari di localStorage tetap dipakai — auto-load aman dari sisi limit
  - Tidak mengubah `fetchClubs()`, `COMPETITIONS`, atau struktur data team
  - Tidak ada build tool / bundler — vanilla JS ES modules langsung

## Scope

### In scope
- Fungsi `openImportModal()` di `js/teams.js` (baris 107–182)
- Markup HTML modal: hapus tombol "Load clubs", restructure row checkbox
- Behavior: auto-load, search debounce, pool-aware, sticky footer

### Out of scope
- Multi-competition selection dalam satu sesi
- Remove klub dari pool lewat modal
- Perubahan CSS/styling baru (gunakan class yang sudah ada)
- File lain selain `js/teams.js`

## Architecture & Approach

Satu fase tunggal karena perubahan terbatas pada satu fungsi. Tidak ada perubahan data model, API, atau struktur halaman. Pendekatan rewrite `openImportModal()` lebih bersih dari patch incremental karena logika lama saling terkait erat.

## Progress

- [x] Plan approved for execution.
- [x] Phase 1 complete.
- [x] Final verification complete.
- 2026-05-26 16:16:31 WIB — Started Phase 1 in batch mode. Confirmed plan path, phase file, and existing imports/helpers for `openImportModal()`.
- 2026-05-26 16:25:21 WIB — Completed Phase 1 implementation in `js/teams.js`. Verification evidence: `node --check js/teams.js` passed; focused Node DOM harness passed auto-load, no load button, search debounce, in-pool disabled badge, label rows, footer count, competition reset, save/close, and error retry checks.
- 2026-05-26 16:29:12 WIB — Final verification complete. `for file in js/*.js; do node --check "$file" || exit 1; done` passed. `curl -I http://localhost:4173/teams.html` returned HTTP 200 from the already-running static server. Full browser manual QA was not run because no browser automation was available in the container.

## Phases

- [x] **Phase 1 [M]: Rewrite openImportModal()** — Implementasi semua 5 perubahan UX dalam satu fungsi

## Key Changes

- `js/teams.js` — fungsi `openImportModal()` diubah sepenuhnya (~60–80 baris)

## Validation and Acceptance

Manual golden path (tidak ada test suite):
1. Buka modal → clubs auto-load tanpa klik tombol apapun ✓
2. Ketik di search → filter real-time ✓
3. Klik seluruh area row (bukan hanya checkbox) → ter-select ✓
4. Klub yang sudah di pool → row dim, checkbox disabled, tidak bisa dipilih ✓
5. Footer counter update saat pilih / batal ✓
6. Ganti competition → fetch baru, selection reset ✓
7. API error → pesan error + tombol Retry ✓
8. Klik "Add N selected" → klub masuk pool, modal tutup, halaman re-render ✓

## Idempotence and Recovery

- Safe re-run: ya — `openImportModal()` adalah pure UI function, bisa ditulis ulang kapan saja
- Rollback: `git checkout js/teams.js` jika diperlukan
- Tidak ada operasi destruktif

## Dependencies

Tidak ada dependensi baru.

## Risks & Mitigations

- **Auto-load boros API call:** Auto-load hanya fetch jika cache tidak ada/expired (7-hari). Untuk kompetisi yang sama, second open adalah instant dari cache.
- **Sticky footer menutupi item terakhir:** Tambah padding-bottom pada list container saat footer aktif.

## Surprises & Discoveries

- 2026-05-26 16:29:12 WIB — Repo has no `package.json`, lint script, build script, or Vite config; verification used `node --check`, the already-running static server, and a focused Node DOM harness.
- 2026-05-26 16:29:12 WIB — Browser automation was unavailable in the container, so visual/manual QA remains available through the final `Need verify` gate.

## Decision Log

- 2026-05-26 16:30:00 — Rewrite penuh `openImportModal()` dipilih vs patch incremental. Rationale: logika lama saling terkait (load button listener → renderClubs → search listener), rewrite lebih bersih dan lebih mudah diverifikasi.

## Outcomes & Retrospective

- Result: Completed with manual browser verification available as a final gate.
- Changed `openImportModal()` only in `js/teams.js`; no API, storage, CSS, or HTML files were changed.
- Verification passed for syntax, static serving, and a focused DOM harness covering the golden-path behavior.
- Note: The worktree already had unrelated modified `js/season.js`; it was not touched during this execution.

## Open Questions

- Apakah "Add selected" perlu konfirmasi dialog, atau langsung add & tutup modal? (Asumsi: langsung add, tidak perlu konfirmasi — sesuai pola existing)
- Apakah "Select all visible" harus exclude yang sudah di pool? (Asumsi: ya, hanya select yang bisa diimport)
