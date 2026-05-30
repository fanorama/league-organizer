# Business Rules & Constraints

Aturan domain yang ditegakkan kode. Langgar ini = data tidak konsisten.

## Kepemilikan (Ownership)

- `Team.ownerId` → menunjuk ke `Player.id` global (**field aktif**).
- `Team.owner` (string nama) **deprecated** — hanya fallback migrasi data lama.
- `Season.ownerSnapshots` menyimpan `{ [teamId]: { playerId, playerName } }` saat musim **dibuat**. Inilah sumber kebenaran untuk kalkulasi statistik player — jangan skip saat membuat musim, agar statistik historis tetap akurat meski kepemilikan tim berubah kemudian.

## Tim & Spin Wheel

- Tim baru/diimport masuk pool dengan `status: 'pool'`.
- **Spin wheel hanya mengundi tim `status: 'pool'`.** Tim `status: 'active'` (sudah punya owner) tidak masuk wheel.
- Assign owner mengubah tim jadi `status: 'active'` + set `ownerId`.

## Musim & Pertandingan

- `Match.status`: `'scheduled' | 'finished' | 'delayed'`.
- `matchday: 99` = penanda pertandingan ditunda (delayed).
- `Match.matchType`: `'league' | 'playoff'` (default `'league'`).
- Musim otomatis jadi `status: 'finished'` + mencatat `champion` ketika semua match reguler selesai.
- `Season.status`: `setup → active → finished` (+ `playoff_setup → playoff_active` bila playoff aktif).

## Klasemen

- Tiebreaker berurutan: **Points → Goal Difference → Goals For**.

## Playoff

- Aktif hanya jika `LeagueSettings.playoff.enabled`.
- Format **double-elimination** (upper + lower bracket + grand final, dengan kemungkinan reset). Konfigurasi leg per round di `PlayoffFormat`.
- Bracket disimpan di `Season.bracket`.

## Autentikasi & Otorisasi

- Hanya admin (sesi Supabase Auth aktif, `isAdmin: true`) yang boleh write.
- **Tidak ada route guard di front-end** — pembatasan write ditegakkan oleh **RLS policy Supabase**. UI hanya menyembunyikan kontrol write dari non-admin.

## Data & Penyimpanan

- Semua entitas persisten di Supabase, kecuali **`clubs_cache`** yang ada di `localStorage` (TTL 7 hari).
- `FOOTBALL_API_KEY` hanya hidup di server (proxy). Browser tidak pernah memegang API key.
- Kolom DB `snake_case`, dikonversi ke `camelCase` oleh mapper `storage.ts`.

## Fitur Terencana (Belum di Kode)

- **Tier Klub & Balanced Draw** — menambah `Team.tier` (elite/mid/underdog) dan `Player.skillOverride`, plus weighted draw + urutan spin dipaksa (Pemula → Sedang → Jago) di SpinWheel liga. Quick Match tidak terdampak. Spec lengkap: `docs/superpowers/specs/2026-05-30-tier-klub-balanced-draw-design.md`; plan: `docs/plans/260530-1546-tier-klub-balanced-draw/`.
