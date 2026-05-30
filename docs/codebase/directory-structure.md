# Directory Structure

## Pohon Direktori

```
league-organizer/
├── api/
│   ├── football.ts          # Vercel serverless proxy → football-data.org (baca FOOTBALL_API_KEY)
│   └── football.test.ts
├── src/
│   ├── main.tsx             # Entry point: render <App /> ke #root
│   ├── App.tsx              # HashRouter + Routes + init Supabase auth session
│   ├── pages/               # Satu komponen per route
│   ├── components/          # Komponen UI yang dipakai ulang
│   ├── store/               # Zustand stores (use*Store.ts)
│   ├── lib/                 # Logika domain + storage + types
│   └── test/setup.ts        # Vitest global setup (mock Supabase + shim localStorage)
├── styles/main.css          # Design system + style komponen (CSS tunggal)
├── index.html               # HTML shell, memuat /src/main.tsx
├── vite.config.ts           # Config Vite + Vitest + plugin proxy football dev
├── vercel.json              # outputDirectory: dist + SPA rewrite
├── tsconfig.json
└── .env.example             # FOOTBALL_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

## Entry Points

| File | Peran |
|------|-------|
| `index.html` | Shell HTML, memuat `/src/main.tsx` sebagai module |
| `src/main.tsx` | Bootstrap React, render `<App />` |
| `src/App.tsx` | Definisi router + inisialisasi auth session global |

## Routing

`HashRouter` — semua URL berbasis hash (`#/...`). Didefinisikan di `src/App.tsx`.

| Route | Halaman | Komponen |
|-------|---------|----------|
| `#/` | Daftar liga | `LeaguesPage` |
| `#/login` | Login admin (Supabase Auth) | `LoginPage` |
| `#/league/:id` | Detail liga + manajemen musim | `LeaguePage` |
| `#/league/:id/teams` | Manajemen tim, import klub, spin wheel | `TeamsPage` |
| `#/league/:id/season/:seasonId` | Jadwal + klasemen + playoff | `SeasonPage` |
| `#/players` | Leaderboard global player | `PlayersPage` |
| `#/player/:id` | Profil player (stats + H2H) | `PlayerPage` |
| `#/quick-match` | Daftar & buat quick match session | `QuickMatchPage` |
| `#/quick-match/:sessionId` | Detail quick match session | `QuickMatchSessionPage` |
| `*` | Redirect ke `#/` | `<Navigate to="/" />` |

## Lokasi Test

File test berdampingan dengan source-nya (`*.test.ts` / `*.test.tsx`). Pattern `include` Vitest mencakup `src/**` dan `api/**`. Coverage hanya dihitung untuk `src/lib/**` dan `src/store/**`.
