# AGENTS.md

## Project Overview

League Organizer adalah aplikasi web multi-liga. Dibangun dengan React + TypeScript + Vite. Data persisten disimpan di **Supabase** (PostgreSQL) — bukan `localStorage`. Autentikasi menggunakan Supabase Auth (email + password). Hanya user yang login (`isAdmin: true`) yang dianggap sebagai admin; pengunjung biasa tetap bisa melihat data secara read-only.

**Teknologi utama:**
- React 18 + TypeScript
- Vite (dev server + build)
- Zustand untuk state management
- React Router v6 (HashRouter)
- **Supabase** (`@supabase/supabase-js`) sebagai backend + auth
- `localStorage` hanya untuk `clubs_cache` (cache API Football)
- Vitest + jsdom + Testing Library untuk unit test
- API Football (v3.football.api-sports.io) untuk import data klub, di-proxy via serverless function `api/football.ts` (Vercel)

## Setup & Cara Menjalankan

```bash
npm install
```

Buat file `.env` di root project dengan variabel berikut (lihat `.env.example`):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
FOOTBALL_API_KEY=<api-sports-key>   # dipakai server-side oleh proxy /api/football
```

```bash
npm run dev        # Dev server di http://localhost:5173
npm run build      # Build produksi ke dist/
npm run preview    # Preview hasil build
```

> **Penting:** Tanpa `.env` yang valid, app akan crash karena Supabase client tidak bisa diinisialisasi.

## Testing

```bash
npm test           # Vitest watch mode
npm run test:run   # Jalankan sekali (CI-friendly)
npm run test:ui    # Buka Vitest UI di browser
npm run coverage   # Coverage report ke ./coverage/
```

File test berada di samping source-nya (`*.test.ts` / `*.test.tsx`). Test include pattern mencakup `src/**` dan `api/**`. Test environment menggunakan jsdom. Coverage hanya dihitung untuk `src/lib/**` dan `src/store/**`.

**Supabase di-mock sepenuhnya di test.** Setup global ada di `src/test/setup.ts` — ia mock `@supabase/supabase-js` dan juga menyediakan in-memory `localStorage` shim (dibutuhkan Node.js 22+). Saat menambah test baru yang memanggil storage functions, set return value mock sesuai kebutuhan:

```ts
import { vi } from 'vitest';
// supabaseQuery.order sudah auto-mock di setup.ts
// Override per-test jika butuh data spesifik:
vi.mocked(supabaseQuery.order).mockResolvedValueOnce({ data: [...], error: null });
```

## Struktur Proyek

```
src/
  main.tsx              # Entry point React
  App.tsx               # Router + inisialisasi Supabase auth session
  pages/
    LeaguesPage.tsx     # Daftar liga
    LeaguePage.tsx      # Detail liga + manajemen musim
    TeamsPage.tsx       # Manajemen tim, import klub, spin wheel
    SeasonPage.tsx      # Jadwal pertandingan + klasemen + playoff
    PlayersPage.tsx     # Leaderboard global semua player
    PlayerPage.tsx      # Profil player: stats per liga + H2H
    LoginPage.tsx       # Halaman login admin (Supabase Auth)
    QuickMatchPage.tsx          # Daftar & buat quick match session
    QuickMatchSessionPage.tsx   # Detail session: pilih klub per player, input game, stats
  components/
    Shell.tsx           # Layout wrapper + navigasi + tombol Login/Logout
    Badge.tsx           # Badge komponen
    TeamBadge.tsx       # Badge tim dengan logo
    SpinWheel.tsx       # Spin wheel modal untuk assign owner
    ImportClubGrid.tsx  # Grid picker import klub dengan tab kompetisi (TeamsPage)
    ClubPickerModal.tsx # Modal pemilihan klub per player (quick match)
  store/
    useLeagueStore.ts       # Zustand store untuk liga
    useTeamStore.ts         # Zustand store untuk tim
    useSeasonStore.ts       # Zustand store untuk musim
    useMatchStore.ts        # Zustand store untuk pertandingan
    usePlayerStore.ts       # Zustand store untuk player global
    useAuthStore.ts         # Zustand store untuk auth session (isAdmin)
    useQuickMatchStore.ts   # Zustand store untuk quick match session
  lib/
    types.ts            # TypeScript interfaces semua entitas
    storage.ts          # CRUD Supabase + mapper camelCase↔snake_case
    supabase.ts         # Inisialisasi Supabase client (singleton)
    api.ts              # fetchClubs() via /api/football, cache 7 hari di localStorage
    schedule.ts         # generateRoundRobin(), playoff bracket logic
    standings.ts        # calculateStandings() — Pts, GD, GF tiebreaker
    playerStats.ts      # calculatePlayerStats(), calculateHeadToHead()
    playerAssignment.ts # Helper assign player ke tim di liga
    quickMatchStats.ts  # calculateQuickMatchStatsFromData() untuk session quick match
    playerSkill.ts      # SkillTier (jago/sedang/pemula), computeAutoSkill(), resolvePlayerSkill()
    balancedDraw.ts     # ClubTier (elite/mid/underdog), DRAW_WEIGHTS, pickWeightedClub() — weighted spin wheel
  test/
    setup.ts            # Vitest global setup + mock Supabase + localStorage shim
api/
  football.ts           # Serverless function (Vercel) proxy ke API Football, baca FOOTBALL_API_KEY
styles/
  main.css              # Design system dan komponen styles
```

## Routing

Menggunakan `HashRouter` — semua route berbasis hash (`#/`):

| Route | Halaman |
|-------|---------|
| `#/` | Daftar liga |
| `#/login` | Halaman login admin |
| `#/league/:id` | Detail liga |
| `#/league/:id/teams` | Manajemen tim |
| `#/league/:id/season/:seasonId` | Jadwal + klasemen + playoff |
| `#/players` | Leaderboard global player |
| `#/player/:id` | Profil player (stats + H2H) |
| `#/clubs` | Manajemen tier klub global (admin-only) |
| `#/quick-match` | Daftar & buat quick match session |
| `#/quick-match/:sessionId` | Detail quick match session |

## Data Model (Supabase Tables)

| Tabel | Keterangan |
|-------|------------|
| `leagues` | Liga — `id`, `name`, `description`, `settings` (JSONB), `created_at` |
| `players` | Entitas player global — `id`, `name`, `created_at` |
| `teams` | `league_id`, `status: "pool" \| "active"`, `owner_id` (→ `players.id`), `external_id` |
| `seasons` | `league_id`, `number`, `status`, `team_ids` (array), `owner_snapshots` (JSONB), `champion_id`, `bracket` (JSONB) |
| `matches` | `season_id`, `matchday`, `home_team_id`, `away_team_id`, `home_score`, `away_score`, `status`, `match_type` |
| `club_tiers` | Tier klub persisten lintas-liga — `external_id` (PK, → API Football team id), `tier: "elite" \| "mid" \| "underdog"` |

**Nama kolom di DB menggunakan `snake_case`.** Konversi ke/dari `camelCase` dilakukan oleh mapper di `storage.ts` (misalnya `leagueId` ↔ `league_id`).

`clubs_cache` **masih di `localStorage`** — tidak ada di Supabase. Quick match session disimpan via `useQuickMatchStore` (lihat `storage.ts`).

Semua entitas menggunakan `crypto.randomUUID()` via `createId()` di `storage.ts`.

### Catatan Penting: Player Ownership

- `Team.ownerId` menunjuk ke `Player.id` global (field aktif)
- `Team.owner` (string nama) sudah **deprecated** — hanya fallback migrasi
- `Season.ownerSnapshots` menyimpan snapshot `{ playerId, playerName }` per `teamId` saat musim dibuat — ini yang digunakan untuk kalkulasi statistik player
- `Player.skillOverride` (opsional) menimpa skill tier otomatis; `Team.tier` menyimpan tier klub di level tim (default `mid`)

## Skill Tier Pemain & Weighted Draw

Spin wheel di TeamsPage mendukung **balanced draw** — peluang menarik klub dibobot berdasarkan skill pemain vs tier klub.

- **Skill pemain** (`src/lib/playerSkill.ts`): `SkillTier = 'jago' | 'sedang' | 'pemula'`.
  - `computeAutoSkill(stats)` menentukan tier dari win rate (≥0.6 → jago, ≥0.4 → sedang, sisanya pemula); butuh ≥5 game, jika kurang default `sedang`.
  - `resolvePlayerSkill(player, stats)` memakai `player.skillOverride` jika diset, jika tidak fallback ke `computeAutoSkill`.
- **Tier klub** (`src/lib/balancedDraw.ts`): `ClubTier = 'elite' | 'mid' | 'underdog'`, disimpan persisten di tabel `club_tiers` (keyed by `external_id`) dan tercermin di `Team.tier`.
- **Bobot draw**: `DRAW_WEIGHTS[skill][clubTier]` — pemula condong ke elite, jago condong ke underdog (lihat tabel di `balancedDraw.ts`). `pickWeightedClub(poolTeams, skill, rng)` melakukan weighted random; `rng` di-inject agar deterministik di test.
- Tier klub diatur via popover picker di TeamsPage; perubahan disimpan lewat `saveClubTier()` / `deleteClubTier()` di `storage.ts`.

## Autentikasi

- Supabase Auth email + password
- `App.tsx` menginisialisasi session saat mount dan subscribe ke `onAuthStateChange`
- `useAuthStore` menyimpan `session` dan `isAdmin: boolean` (true jika session !== null)
- `Shell.tsx` menampilkan tombol **Logout** jika `isAdmin`, atau link **Login** jika tidak
- Tidak ada route guard — halaman tetap dapat diakses tanpa login, tapi operasi write ke Supabase membutuhkan auth sesuai RLS policy yang dikonfigurasi di Supabase

## Storage Layer (`src/lib/storage.ts`)

Semua CRUD ke Supabase ada di sini. Selalu gunakan fungsi dari file ini — jangan impor `supabase` dari `supabase.ts` langsung di komponen atau store.

Fungsi utama per entitas mengikuti pola: `getLeagues()`, `getLeagueById(id)`, `saveLeague(league)`, `deleteLeague(id)`.

Untuk entitas dengan relasi banyak (match, season), ada fungsi filter: `getMatchesBySeason(seasonId)`, `getSeasonsByLeague(leagueId)`, dll.

**Cascade delete** — Supabase menggunakan `ON DELETE CASCADE` di level DB untuk relasi foreign key. Tidak ada manual cascade di application layer.

## Alur Utama Aplikasi

1. **Buat liga** di LeaguesPage → navigate ke LeaguePage
2. **Buat player** di PlayersPage → player tersedia secara global
3. **Tambah/import tim** di TeamsPage → masuk ke pool (`status: "pool"`)
4. **Spin wheel** di TeamsPage → assign player (via `ownerId`) → tim jadi `status: "active"`
5. **Buat musim** di LeaguePage → snapshot ownership dicatat di `ownerSnapshots` → generate jadwal round-robin → navigate ke SeasonPage
6. **Input skor** di SeasonPage → ketika semua match selesai, musim otomatis `"finished"` dan champion dicatat
7. **(Opsional) Playoff** — jika liga mengaktifkan playoff, setelah musim selesai masuk ke fase `"playoff_setup"` → `"playoff_active"` dengan double elimination bracket
8. **Lihat statistik** di PlayersPage (leaderboard) atau PlayerPage (profil detail + H2H antar player)

## Konvensi Kode

- **Storage layer**: gunakan fungsi dari `src/lib/storage.ts` — jangan akses `supabase` client langsung dari komponen atau store
- **State management**: setiap entitas punya Zustand store di `src/store/`. Store hanya membungkus storage functions + trigger re-render
- **Types**: semua interface di `src/lib/types.ts` — tidak ada type inline di komponen
- **Mapper DB**: setiap entitas punya pasangan fungsi `dbToX()` dan `xToDb()` di `storage.ts` untuk konversi snake_case ↔ camelCase

## Menambah Fitur Baru

Saat menambah halaman baru:
1. Buat `src/pages/NamaPage.tsx`
2. Tambahkan route di `src/App.tsx`
3. Tambahkan link di `src/components/Shell.tsx` jika perlu navigasi

Saat menambah tipe data baru:
1. Tambahkan interface ke `src/lib/types.ts`
2. Buat tabel di Supabase (nama kolom `snake_case`)
3. Tambahkan mapper `dbToX()` + `xToDb()` dan fungsi CRUD ke `src/lib/storage.ts`
4. Buat Zustand store baru di `src/store/` jika diperlukan
5. Buat file `*.test.ts` di samping file lib/store baru tersebut

## API Football

- Upstream: `https://v3.football.api-sports.io/teams`
- **Tidak dipanggil langsung dari browser.** Client (`src/lib/api.ts`) memanggil `/api/football?league=<id>&season=<year>`
- Di produksi proxy adalah serverless function `api/football.ts` (Vercel) yang membaca `FOOTBALL_API_KEY` dari env server dan menambah header `x-apisports-key`
- Di dev, proxy disediakan oleh plugin `football-api-dev-proxy` di `vite.config.ts` (juga baca `FOOTBALL_API_KEY`)
- Cache per `competitionId:season` — TTL 7 hari, disimpan di `localStorage` key `clubs_cache`
- Kompetisi yang didukung: Premier League (39), Serie A (135), La Liga (140), Bundesliga (78), Ligue 1 (61) — season 2024

## Hal yang Perlu Diperhatikan

- **`.env` wajib ada** — `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` harus diset, lihat `.env.example`
- **Verifikasi UI dengan browser** — unit test hanya untuk `src/lib/**` dan `src/store/**`, bukan komponen React. Untuk perubahan UI gunakan `npm run dev`
- **Mock Supabase di test** — `src/test/setup.ts` mock seluruh `@supabase/supabase-js`. Jangan buat koneksi Supabase nyata di test
- **Clubs cache masih di localStorage** — `clubs_cache` adalah satu-satunya data yang tidak di Supabase. API key sekarang `FOOTBALL_API_KEY` di env server (tidak lagi di localStorage)
- **Spin wheel hanya untuk pool teams** — tim dengan `status: "active"` sudah tidak masuk wheel
- **`matchday: 99`** digunakan sebagai penanda pertandingan yang ditunda (delayed)
- **`ownerSnapshots`** digunakan untuk kalkulasi stats player — jangan skip ini saat membuat musim baru
- **`@ts-nocheck`** di `schedule.ts` — file ini kompleks, perlu perhatian ekstra saat modifikasi

## Commit Terakhir

`d22ae12` — Merge pull request #13 from fanorama/fanodev/improve-player-club — 2026-05-30
