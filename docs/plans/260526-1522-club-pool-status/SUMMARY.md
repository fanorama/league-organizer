# Implementation Plan: Club Pool Status Flag

> Created: 2026-05-26 15:22:00

## Purpose / Big Picture

Tambahkan field `status: 'pool' | 'active'` ke entity `Team` sehingga klub yang di-import/ditambah tidak langsung jadi peserta liga. Hanya klub yang terpilih via spin wheel (status `active`) yang masuk jadwal dan standings. Ini memungkinkan user menyimpan pool banyak klub dan memilih peserta secara acak.

Brainstorm: [docs/brainstorms/260526-1515-club-pool-spin-wheel/SUMMARY.md](../../brainstorms/260526-1515-club-pool-spin-wheel/SUMMARY.md)

## Objective

- Semua `save` call untuk Team menyertakan `status: 'pool'` sebagai default
- `wheel.js` hanya mengambil kandidat dari `status === 'pool'` dan set `status: 'active'` setelah assign
- `teams.js` menampilkan dua section terpisah: **Peserta Liga** (active) dan **Pool Referensi** (pool)
- `league.js` dan `season.js` hanya memakai `status === 'active'` teams untuk schedule dan validasi

## Context and Orientation

- Relevant docs: [section-01-data-model-update.md](../../brainstorms/260526-1515-club-pool-spin-wheel/section-01-data-model-update.md), [section-02-ui-flow.md](../../brainstorms/260526-1515-club-pool-spin-wheel/section-02-ui-flow.md)
- Relevant files:
  - `js/teams.js` — render + form save + import save
  - `js/wheel.js` — spin wheel modal logic
  - `js/league.js` — create season, teams query
  - `js/season.js` — teamMap(), start season disabled check
- Existing patterns: `getAll(KEYS.teams).filter(t => t.leagueId === id)` — tambah `&& t.status === 'active'`
- Storage: `save()` di `storage.js` tidak perlu diubah — field baru otomatis tersimpan

## Scope

### In scope
- Tambah `status` field saat create team (form manual + import API)
- Update wheel: kandidat = pool, hasil = active
- UI dua-section di `teams.html`
- Filter query di `league.js` dan `season.js`

### Out of scope
- Migrasi data lama (app masih fresh/empty localStorage)
- Fitur "skip spin, tambah manual ke peserta"
- `standings.js` — pure function, hanya menerima data yang diberikan, tidak query storage

## Architecture & Approach

Pendekatan: status flag minimal pada `Team`. Tidak ada entitas baru. Storage helper tidak berubah. Semua perubahan terlokalisasi di 4 file JS.

Urutan aman: schema dulu → wheel logic → UI display → downstream queries.

## Progress

- [x] Plan approved for execution.
- [x] Phase 1 complete.
- [x] Phase 2 complete.
- [x] Phase 3 complete.
- [x] Final verification complete.

- 2026-05-26 15:29:46 WIB — Started Phase 1 (Schema + Wheel): adding default pool status on team creation/import and changing wheel candidate/assignment behavior.
- 2026-05-26 15:30:29 WIB — Completed Phase 1. Changed `js/teams.js` and `js/wheel.js`; verified with `node --check js/teams.js` and `node --check js/wheel.js`.
- 2026-05-26 15:30:29 WIB — Started Phase 2 (UI Two-Section): restructuring `teams.js` render into active participants and pool reference sections.
- 2026-05-26 15:31:07 WIB — Completed Phase 2. Changed `js/teams.js`; verified with `node --check js/teams.js`.
- 2026-05-26 15:31:07 WIB — Started Phase 3 (Downstream Filters): filtering season creation and setup validation to active teams.
- 2026-05-26 15:31:52 WIB — Completed Phase 3. Changed `js/league.js` and `js/season.js`; verified with `node --check js/league.js` and `node --check js/season.js`.
- 2026-05-26 15:33:56 WIB — User approved scope expansion: standings and fixtures must use only active teams with assigned owners, and unused/pool clubs must be excluded from competition views.
- 2026-05-26 15:34:26 WIB — Applied expanded filters to `js/league.js`, `js/season.js`, and `js/standings.js`; verified with `node --check` on each changed file.
- 2026-05-26 15:34:48 WIB — Final verification passed with `for f in js/*.js; do node --check "$f" || exit 1; done`. No `package.json` exists, so npm build/lint is not applicable.
- 2026-05-26 15:38:27 WIB — Browser/server QA pending user-side. Attempted `curl -I http://localhost:4173/teams.html` from sandbox, but localhost was not reachable from this execution environment.

## Phases

- [ ] **Phase 1 [S]: Schema + Wheel** — Tambah `status: 'pool'` ke semua save call; update wheel.js agar pakai status
- [ ] **Phase 2 [M]: UI Two-Section** — Restructure teams.html render: Peserta section + Pool section
- [ ] **Phase 3 [S]: Downstream Filters** — Update league.js dan season.js queries ke active-only

## Key Changes

| File | Perubahan |
|---|---|
| `js/teams.js` | `status: 'pool'` di form save (line 69) dan import save (line 141); render dua section; wheel button condition |
| `js/wheel.js` | `unassigned()` → filter `status === 'pool'`; assign → `{ ...selected, owner, status: 'active' }` |
| `js/league.js` | Line 15: tambah `&& team.status === 'active'` |
| `js/season.js` | Line 23: tambah `&& team.status === 'active'` |

## Validation and Acceptance

- Build/lint: `npm run build` (jika ada) atau buka browser langsung
- Manual check: buka `http://localhost:4173/teams.html?league=<id>`
- Acceptance criteria:
  1. Import 3 klub → muncul di Pool section, bukan Peserta
  2. Spin wheel → pilih nama → klub pindah ke Peserta section
  3. Wheel hanya berisi klub pool yang tersisa
  4. Buat season → hanya Peserta yang masuk jadwal

## Idempotence and Recovery

- Safe re-run: semua perubahan idempotent, tidak ada destructive op
- Rollback: revert 4 file JS ke versi sebelumnya
- Irreversible: tidak ada. localStorage bisa di-clear kapanpun

## Dependencies

- Tidak ada package baru

## Risks & Mitigations

- `season.js` line 15 (`teamMap()`) mengambil teams untuk lookup nama di schedule display. Teams yang sudah masuk matches pasti sudah active — tidak perlu filter di sini, tapi boleh ditambahkan untuk konsistensi
- Jika user punya localStorage lama tanpa field `status` → pool section kosong, semua muncul sebagai "tanpa status". Mitigasi: dalam scope phase ini cukup treat missing status = 'pool' di render

## Surprises & Discoveries

- 2026-05-26 15:31:30 WIB — `js/standings.js` does query `KEYS.teams` directly, contrary to the plan note that it is pure and out of scope. Keeping Phase 3 scoped to `league.js` and `season.js`; final standings behavior may need an approved scope decision.

## Decision Log

- 2026-05-26 15:22:00 — Pilih status flag (bukan entitas Club terpisah). Rationale: perubahan minimal, cukup untuk kebutuhan.
- 2026-05-26 15:22:00 — `standings.js` dan `schedule.js` tidak perlu diubah: mereka menerima data dari caller, bukan query storage sendiri.
- 2026-05-26 15:33:56 WIB — Expand competition filters to `status === 'active' && owner` and include `js/standings.js`. Rationale: user clarified that standings and fixtures must exclude unused/pool clubs and only include assigned active clubs.

## Outcomes & Retrospective

- Completed with approved scope expansion.
- New/imported teams now default to `status: 'pool'`.
- Wheel candidates come only from pool teams; assigning an owner promotes the selected club to `status: 'active'`.
- Teams UI now separates `Peserta Liga` from `Pool Referensi`.
- League season creation, season fixtures/regeneration, continuous seasons, and standings now use only active teams with assigned owners.
- No build script exists in this static workspace; verification used `node --check` across all JavaScript files.

## Open Questions

- Tidak ada.
