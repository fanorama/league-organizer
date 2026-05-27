# Design Spec: Migrasi Database ke Supabase

**Tanggal:** 2026-05-28  
**Status:** Approved

## Ringkasan

Mengganti storage layer dari `localStorage` ke Supabase (PostgreSQL). Satu admin bisa write data via Supabase Auth; publik hanya read-only. Tidak ada real-time, tidak ada migrasi data (fresh start).

---

## Arsitektur

```
React App (Vite)
    │
    ├── src/lib/supabase.ts        ← Supabase client singleton
    ├── src/lib/storage.ts         ← Diganti: semua fn async, hit Supabase
    ├── src/store/**               ← Zustand stores tetap ada, actions jadi async
    └── src/pages/LoginPage.tsx    ← Halaman login admin (baru)
          │
          ▼
    Supabase (cloud)
    ├── Auth          ← Admin login (email + password)
    ├── Database      ← PostgreSQL, semua tabel entitas
    └── RLS Policies  ← SELECT for all, write only for authenticated
```

**Environment variables (Vercel):**
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

`VITE_` prefix mengekspos variabel ke frontend — aman karena anon key memang untuk publik, RLS yang menjaga keamanan write operations.

---

## Skema Database

```sql
create table leagues (
  id uuid primary key,
  name text not null,
  settings jsonb not null default '{}',
  created_at timestamptz default now()
);

create table players (
  id uuid primary key,
  name text not null,
  created_at timestamptz default now()
);

create table teams (
  id uuid primary key,
  league_id uuid references leagues(id) on delete cascade,
  name text not null,
  status text not null default 'pool',
  owner_id uuid references players(id) on delete set null,
  external_id text,
  logo_url text,
  created_at timestamptz default now()
);

create table seasons (
  id uuid primary key,
  league_id uuid references leagues(id) on delete cascade,
  status text not null default 'setup',
  owner_snapshots jsonb not null default '[]',
  champion_id uuid references teams(id) on delete set null,
  created_at timestamptz default now()
);

create table matches (
  id uuid primary key,
  season_id uuid references seasons(id) on delete cascade,
  home_team_id uuid references teams(id) on delete cascade,
  away_team_id uuid references teams(id) on delete cascade,
  matchday int not null,
  home_score int,
  away_score int,
  status text not null default 'scheduled',
  match_type text not null default 'league',
  created_at timestamptz default now()
);
```

### RLS Policies

Diterapkan di semua tabel (`leagues`, `players`, `teams`, `seasons`, `matches`):

```sql
-- Publik bisa SELECT
create policy "public read" on leagues for select using (true);

-- Hanya authenticated (admin) bisa INSERT/UPDATE/DELETE
create policy "admin insert" on leagues for insert
  with check (auth.role() = 'authenticated');
create policy "admin update" on leagues for update
  using (auth.role() = 'authenticated');
create policy "admin delete" on leagues for delete
  using (auth.role() = 'authenticated');

-- (pola yang sama direplikasi untuk players, teams, seasons, matches)
```

Cascade delete di-handle PostgreSQL via `on delete cascade` — tidak perlu `cascadeDeleteLeague()` manual lagi.

`settings` dan `owner_snapshots` tetap `jsonb` karena strukturnya fleksibel.

---

## Storage Layer

`src/lib/storage.ts` diganti dari fungsi sinkron generic ke fungsi async per entitas.

**Client singleton:**
```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

**Contoh fungsi storage baru:**
```ts
// Sebelum (sync, generic)
getAll<League>('leagues') → League[]

// Sesudah (async, per entitas)
async function getLeagues(): Promise<League[]> {
  const { data } = await supabase.from('leagues').select('*')
  return data ?? []
}
```

**Zustand stores** di-update menjadi async actions:
```ts
fetchLeagues: async () => {
  const leagues = await getLeagues()
  set({ leagues })
}
```

---

## Auth Flow

### Login Admin
1. Admin buka `/login`
2. Input email + password → `supabase.auth.signInWithPassword()`
3. Session tersimpan otomatis oleh Supabase client
4. Redirect ke halaman utama sebagai admin

### Cek Session
- `Shell.tsx` cek session via `supabase.auth.getSession()` saat mount
- Authenticated → tampilkan tombol edit/input skor/create
- Tidak authenticated → sembunyikan semua UI write, hanya read-only

### Logout
- `supabase.auth.signOut()` → kembali ke view publik

Keamanan write ada di RLS Supabase (bukan hanya di frontend). Frontend hanya mengatur visibilitas UI.

---

## Testing

- **Storage functions**: mock `@supabase/supabase-js` via `vi.mock()` — bukan mock localStorage lagi
- **Zustand stores**: test async actions dengan `await` + mock Supabase responses
- **Auth**: test kondisi authenticated vs unauthenticated untuk komponen dengan conditional UI

---

## Urutan Implementasi

1. **Setup Supabase project** — buat project di supabase.com, jalankan SQL schema + RLS policies
2. **Install & init client** — `@supabase/supabase-js`, buat `src/lib/supabase.ts`, set env vars di Vercel
3. **Migrasikan storage layer** — ganti `storage.ts` entitas per entitas (leagues → players → teams → seasons → matches)
4. **Update Zustand stores** — jadikan actions async
5. **Tambah LoginPage + auth state** — form login, cek session di Shell
6. **Sembunyikan UI write untuk publik** — conditional render berdasarkan auth state
7. **Update tests** — ganti mock localStorage → mock Supabase
