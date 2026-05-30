# System Overview

League Organizer adalah **Single Page Application (SPA)** React yang dideploy di Vercel. Tidak ada server aplikasi sendiri — data persisten ada di **Supabase (PostgreSQL)**, dan satu serverless function bertugas sebagai proxy ke API klub bola.

## Lapisan Arsitektur

Alur data mengalir satu arah melalui empat lapisan. Komponen tidak pernah menyentuh Supabase langsung.

```
React Pages/Components  (src/pages, src/components)
        │  panggil action store
        ▼
Zustand Stores          (src/store/use*Store.ts)
        │  bungkus storage functions + simpan state untuk re-render
        ▼
Storage Layer           (src/lib/storage.ts)
        │  CRUD + mapper camelCase ↔ snake_case
        ▼
Supabase Client         (src/lib/supabase.ts → @supabase/supabase-js)
        ▼
Supabase PostgreSQL
```

- **Pages** memanggil action dari store (mis. `useLeagueStore().createLeague`).
- **Stores** hanya membungkus fungsi `storage.ts` lalu `set()` state baru agar React re-render. Tidak ada logika bisnis di store.
- **`storage.ts`** satu-satunya pintu ke Supabase. Berisi pasangan mapper `dbToX()`/`xToDb()` per entitas untuk konversi `snake_case` (DB) ↔ `camelCase` (app).
- **`supabase.ts`** membuat singleton client dari `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

Logika domain murni (tanpa I/O) terpisah di `src/lib/`: `schedule.ts`, `standings.ts`, `playerStats.ts`, `quickMatchStats.ts`, `playerAssignment.ts`. Fungsi-fungsi ini punya varian `*FromData(...)` yang menerima data mentah (mudah di-unit-test) dan varian async yang mengambil data dari `storage.ts` lebih dulu.

## Autentikasi

- **Supabase Auth** (email + password), hanya untuk admin.
- `App.tsx` memanggil `supabase.auth.getSession()` saat mount dan subscribe ke `onAuthStateChange`, lalu menulis ke `useAuthStore`.
- `useAuthStore` menyimpan `session` dan turunan `isAdmin = session !== null`.
- **Tidak ada route guard** — semua halaman bisa diakses tanpa login (read-only). Pembatasan write ditegakkan di sisi Supabase lewat **RLS policy**, bukan di front-end.

## Integrasi Eksternal: Proxy Klub Bola

Data klub di-import dari **football-data.org** (`https://api.football-data.org/v4/competitions/{competition}/teams`). Browser tidak pernah memanggil upstream langsung — API key (`FOOTBALL_API_KEY`) hanya hidup di sisi server.

| Lingkungan | Proxy | Lokasi |
|-----------|-------|--------|
| Produksi  | Vercel serverless function | `api/football.ts` |
| Dev        | Plugin Vite `football-api-dev-proxy` | `vite.config.ts` |

Keduanya membaca `FOOTBALL_API_KEY` dari env server, menambahkan header `X-Auth-Token`, dan meneruskan query `?competition=<code>&season=<year>`. Client (`src/lib/api.ts`) memanggil `/api/football?...`.

**Cache:** hasil `fetchClubs()` disimpan di `localStorage` key `clubs_cache`, per `competition` (atau `competition:season` untuk kompetisi yang punya `season` tetap), dengan TTL **7 hari**. Ini satu-satunya data yang TIDAK ada di Supabase.

Kompetisi yang didukung (kode football-data.org, di `COMPETITIONS` pada `api.ts`): `PL` Premier League, `FL1` Ligue 1, `BL1` Bundesliga, `SA` Serie A, `DED` Eredivisie, `CL` UEFA Champions League, `EC` European Championship (season 2024), `WC` FIFA World Cup (season 2026).

## Deployment

- Build: `tsc -b && vite build` → output ke `dist/`.
- `vercel.json` mengatur `outputDirectory: dist` dan SPA rewrite `/(.*) → /index.html` (dibutuhkan karena routing pakai `HashRouter`, tapi rewrite menjamin entry tetal ke index).
- Env yang wajib di Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client, di-bundle saat build), dan `FOOTBALL_API_KEY` (server-only, dipakai serverless function).
