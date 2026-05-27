# AGENTS.md

## Project Overview

League Organizer adalah aplikasi web multi-liga berbasis browser. Dibangun dengan React + TypeScript + Vite. Semua data disimpan di `localStorage` — tidak ada server atau database.

**Teknologi utama:**
- React 18 + TypeScript
- Vite (dev server + build)
- Zustand untuk state management
- React Router v6 (HashRouter)
- `localStorage` sebagai persistent storage
- API Football (v3.football.api-sports.io) untuk import data klub

## Struktur Proyek

```
src/
  main.tsx            # Entry point React
  App.tsx             # Router + route definitions
  pages/
    LeaguesPage.tsx   # Daftar liga
    LeaguePage.tsx    # Detail liga + manajemen musim
    TeamsPage.tsx     # Manajemen tim, import klub, spin wheel
    SeasonPage.tsx    # Jadwal pertandingan + klasemen + playoff
    SettingsPage.tsx  # API key dan cache manajemen
  components/
    Shell.tsx         # Layout wrapper + sidebar navigasi
    Badge.tsx         # Badge komponen
    TeamBadge.tsx     # Badge tim dengan logo
    SpinWheel.tsx     # Spin wheel modal untuk assign owner
  store/
    useLeagueStore.ts # Zustand store untuk liga
    useTeamStore.ts   # Zustand store untuk tim
    useSeasonStore.ts # Zustand store untuk musim
    useMatchStore.ts  # Zustand store untuk pertandingan
  lib/
    types.ts          # TypeScript interfaces semua entitas
    storage.ts        # CRUD localStorage, cascade delete, helper sort
    api.ts            # fetchClubs() dari API Football, cache 7 hari
    schedule.ts       # generateRoundRobin(), playoff bracket logic
    standings.ts      # calculateStandings() — Pts, GD, GF tiebreaker
```

## Setup & Cara Menjalankan

```bash
npm install
npm run dev        # Dev server di http://localhost:5173
npm run build      # Build produksi ke dist/
npm run preview    # Preview hasil build
```

Tidak ada `.env` file — API key disimpan langsung di `localStorage` via halaman Settings.

## Routing

Menggunakan `HashRouter` — semua route berbasis hash (`#/`):

| Route | Halaman |
|-------|---------|
| `#/` | Daftar liga |
| `#/league/:id` | Detail liga |
| `#/league/:id/teams` | Manajemen tim |
| `#/league/:id/season/:seasonId` | Jadwal + klasemen + playoff |
| `#/settings` | Settings API key |

## Data Model (localStorage)

| Key | Tipe | Keterangan |
|-----|------|------------|
| `leagues` | `League[]` | Liga dengan `settings.meetingsPerSeason`, `settings.continuousSeasons`, `settings.playoff` |
| `teams` | `Team[]` | `status: "pool" \| "active"`, `leagueId`, `externalId` (dari API) |
| `seasons` | `Season[]` | `status: "setup" \| "active" \| "finished" \| "playoff_setup" \| "playoff_active"` |
| `matches` | `Match[]` | `matchday`, `homeScore`, `awayScore`, `status`, `matchType: "league" \| "playoff"` |
| `clubs_cache` | `Record<string, CacheEntry>` | Cache API Football, TTL 7 hari |
| `app_settings` | `{ apiKey: string }` | API key Football API |

Semua entitas menggunakan `crypto.randomUUID()` untuk ID via `createId()` di `storage.ts`.

## Alur Utama Aplikasi

1. **Buat liga** di LeaguesPage → navigate ke LeaguePage
2. **Tambah/import tim** di TeamsPage → masuk ke pool (`status: "pool"`)
3. **Spin wheel** di TeamsPage → assign owner → tim jadi `status: "active"`
4. **Buat musim** di LeaguePage → generate jadwal round-robin → navigate ke SeasonPage
5. **Input skor** di SeasonPage → ketika semua match selesai, musim otomatis `"finished"` dan champion dicatat
6. **(Opsional) Playoff** — jika liga mengaktifkan playoff, setelah musim selesai masuk ke fase `"playoff_setup"` → `"playoff_active"` dengan double elimination bracket

## Konvensi Kode

- **Storage layer**: gunakan fungsi dari `src/lib/storage.ts` (`save`, `getAll`, `getById`, `remove`) — jangan langsung akses `localStorage`
- **State management**: setiap entitas punya Zustand store di `src/store/`. Store hanya membungkus storage functions + trigger re-render
- **Types**: semua interface di `src/lib/types.ts` — tidak ada type inline di komponen
- **Cascade delete**: hapus liga via `cascadeDeleteLeague()` dari `storage.ts` — menghapus semua tim, musim, dan pertandingan terkait

## Menambah Fitur Baru

Saat menambah halaman baru:
1. Buat `src/pages/NamaPage.tsx`
2. Tambahkan route di `src/App.tsx`
3. Tambahkan link di `src/components/Shell.tsx` jika perlu navigasi

Saat menambah tipe data baru:
1. Tambahkan interface ke `src/lib/types.ts`
2. Tambahkan key ke `KEYS` di `src/lib/storage.ts`
3. Buat Zustand store baru di `src/store/` jika diperlukan
4. Tambahkan `cascadeDelete` di `storage.ts` jika ada relasi parent-child

## API Football

- Base URL: `https://v3.football.api-sports.io`
- Header: `x-apisports-key: <API_KEY>`
- API key disimpan di `localStorage` via SettingsPage
- Cache per `competitionId:season` — TTL 7 hari
- Jika tidak ada API key, throw error yang diarahkan ke Settings
- Kompetisi yang didukung: Premier League (39), Serie A (135), La Liga (140), Bundesliga (78), Ligue 1 (61) — season 2024

## Hal yang Perlu Diperhatikan

- **Tidak ada autentikasi** — semua data lokal per browser
- **Tidak ada test suite** — verifikasi fitur dengan membuka langsung di browser via `npm run dev`
- **Spin wheel hanya untuk pool teams** — tim dengan `status: "active"` sudah tidak masuk wheel
- **`matchday: 99`** digunakan sebagai penanda pertandingan yang ditunda (delayed)
- **Cascade delete**: selalu gunakan `cascadeDeleteLeague()` — jangan hapus liga secara manual
- **`@ts-nocheck`** di `schedule.ts` — file ini kompleks, perlu perhatian ekstra saat modifikasi
