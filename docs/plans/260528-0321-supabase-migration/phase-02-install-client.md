# Phase 02: Install & Init Supabase Client

## Objective

Install `@supabase/supabase-js`, buat file client singleton `src/lib/supabase.ts`, dan update `.env.example`.

## Scope

- Files/modules this phase may touch:
  - `package.json`
  - `src/lib/supabase.ts` (baru)
  - `.env.example`
- Files/modules this phase must not touch: semua store, pages, storage.ts

## Preconditions

- Phase 01 selesai: `.env.local` sudah punya `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`

## Tasks

### 1. Install Package

```bash
npm install @supabase/supabase-js
```

### 2. Buat `src/lib/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)
```

### 3. Update `.env.example`

Tambahkan dua baris baru di `.env.example`:

```
FOOTBALL_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Acceptance Criteria

- `@supabase/supabase-js` muncul di `package.json` dependencies
- `src/lib/supabase.ts` ada dan bisa di-import
- TypeScript tidak error di `supabase.ts`

## Verification

```bash
npm run build
```

Expected: build sukses tanpa TypeScript error.

## Idempotence and Recovery

- `npm install` aman diulang
- File `supabase.ts` bisa di-overwrite jika ada kesalahan

## Exit Criteria

- [ ] `@supabase/supabase-js` ada di `package.json`
- [ ] `src/lib/supabase.ts` terbuat
- [ ] `.env.example` di-update
- [ ] `npm run build` sukses
