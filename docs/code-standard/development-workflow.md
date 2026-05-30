# Development Workflow

## Tech Stack

| Area | Teknologi |
|------|-----------|
| UI | React 18 + TypeScript 5 |
| Build/Dev | Vite |
| State | Zustand 5 |
| Routing | React Router v6 (`HashRouter`) |
| Backend + Auth | Supabase (`@supabase/supabase-js` 2.x) |
| Import klub | football-data.org via proxy serverless |
| Test | Vitest 4 + jsdom + Testing Library |
| Deploy | Vercel |

## Setup

```bash
npm install
```

Buat `.env` di root (lihat `.env.example`):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
FOOTBALL_API_KEY=<football-data.org-token>   # server-side, dipakai proxy /api/football
```

> **Penting:** Tanpa `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` yang valid, app crash karena Supabase client gagal diinisialisasi. `FOOTBALL_API_KEY` hanya dibutuhkan saat import klub.

## Perintah

```bash
npm run dev        # Dev server di http://localhost:5173
npm run build      # tsc -b && vite build → dist/
npm run preview    # Preview hasil build

npm test           # Vitest watch mode
npm run test:run   # Jalankan sekali (CI-friendly)
npm run test:ui    # Vitest UI di browser
npm run coverage   # Coverage report → ./coverage/
```

## Testing

- File test berdampingan dengan source (`*.test.ts` / `*.test.tsx`). `include`: `src/**` dan `api/**`. Coverage: `src/lib/**` + `src/store/**`.
- **Supabase di-mock penuh** di `src/test/setup.ts` (mock `@supabase/supabase-js` + shim in-memory `localStorage` untuk Node 22+). Jangan buat koneksi Supabase nyata di test.
- Override return value mock per-test bila butuh data spesifik:

```ts
import { vi } from 'vitest';
vi.mocked(supabaseQuery.order).mockResolvedValueOnce({ data: [...], error: null });
```

- Fokus test pada fungsi domain murni (`*FromData`) dan mapper storage (round-trip camel↔snake). Komponen React diverifikasi manual di browser.

## Menambah Halaman Baru

1. Buat `src/pages/NamaPage.tsx`.
2. Tambahkan `<Route>` di `src/App.tsx`.
3. Tambahkan link di `src/components/Shell.tsx` bila perlu navigasi.

## Menambah Tipe Data Baru

1. Tambahkan interface ke `src/lib/types.ts`.
2. Buat tabel di Supabase (kolom `snake_case`).
3. Tambahkan mapper `dbToX()` + `xToDb()` dan fungsi CRUD ke `src/lib/storage.ts`.
4. Buat Zustand store di `src/store/` bila diperlukan (ikuti pola store yang ada).
5. Buat `*.test.ts` di samping file lib/store baru.
