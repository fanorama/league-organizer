# Design: Football API Proxy via Vercel Edge Function

**Date:** 2026-05-28
**Status:** Approved

## Background

API key untuk football.api-sports.io saat ini disimpan di `localStorage` dan dapat diubah langsung oleh user melalui halaman Settings. Karena aplikasi ini adalah personal tool yang akan di-deploy ke Vercel, API key seharusnya dikonfigurasi satu kali di level deployment — bukan disentuh lewat UI.

Pendekatan `VITE_` env var ditolak karena key akan ter-embed di JavaScript bundle dan bisa dilihat siapapun lewat DevTools.

## Tujuan

- Pindahkan API key dari `localStorage` ke server-side environment variable Vercel
- Sembunyikan key dari browser sepenuhnya via proxy function
- Hapus UI Settings page (hanya berisi form API key + cache management)
- Pindahkan cache management ke TeamsPage

## Arsitektur

**Sebelum:**
```
Browser → football.api-sports.io (header x-apisports-key dari localStorage)
```

**Sesudah:**
```
Browser → /api/football?league=39&season=2024
              → Vercel serverless function (api/football.ts)
                  → football.api-sports.io (header x-apisports-key dari process.env)
```

## Perubahan File

### File Baru

**`api/football.ts`** — Vercel serverless function sebagai proxy:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { league, season } = req.query;
  const url = `https://v3.football.api-sports.io/teams?league=${league}&season=${season}`;

  const upstream = await fetch(url, { headers: { 'x-apisports-key': apiKey } });
  const data = await upstream.json();
  res.status(upstream.status).json(data);
}
```

**`.env`** — untuk local dev, masuk `.gitignore`:
```
FOOTBALL_API_KEY=your_key_here
```

**`.env.example`** — template, di-commit ke git:
```
FOOTBALL_API_KEY=
```

### File Dimodifikasi

**`src/lib/api.ts`:**
- Ganti URL dari `https://v3.football.api-sports.io/teams?league=...&season=...` ke `/api/football?league=...&season=...`
- Hapus pembacaan `apiKey` dari `getSettings()`
- Hapus guard `if (!apiKey) throw new Error(...)`
- Logika cache tidak berubah

**`src/lib/storage.ts`:**
- Hapus `getSettings()` dan `saveSettings()`
- Hapus key `settings` dari objek `KEYS`

**`src/lib/types.ts`:**
- Hapus interface `AppSettings`

**`src/components/Shell.tsx`:**
- Hapus nav item "Settings"

**`src/pages/TeamsPage.tsx`:**
- Tambah tombol "Refresh cache" yang memanggil `saveCache({})` dan reset state lokal cache

### File Dihapus

- `src/pages/SettingsPage.tsx`

### File Tidak Berubah

Semua store, `schedule.ts`, `standings.ts`, `playerStats.ts`, `playerAssignment.ts`, dan halaman lain tidak menyentuh API key.

## Error Handling

- `FOOTBALL_API_KEY` tidak di-set → function return 500 `{ error: 'API key not configured' }` → `fetchClubs()` throw Error — pesan error sudah ditangani di frontend
- Upstream API error → status code diteruskan apa adanya; existing error handling di `fetchClubs()` tidak berubah

## Setup

**Lokal:**
1. Copy `.env.example` ke `.env`
2. Isi `FOOTBALL_API_KEY` dengan key dari apisports.io
3. Jalankan `vercel dev` (bukan `npm run dev`) agar serverless function ikut berjalan
4. Untuk dev yang tidak butuh fetch clubs baru, `npm run dev` tetap bisa dipakai — cache localStorage masih bekerja

**Vercel:**
1. Buka dashboard Vercel → project → Settings → Environment Variables
2. Tambah `FOOTBALL_API_KEY` dengan nilai key (tanpa prefix `VITE_`)
3. Deploy ulang

## Dependensi Baru

- `@vercel/node` — type definitions untuk Vercel serverless function (dev dependency)
