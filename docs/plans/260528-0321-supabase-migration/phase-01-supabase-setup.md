# Phase 01: Supabase Setup

## Objective

Buat Supabase project, jalankan schema SQL + RLS policies, dan catat env vars yang dibutuhkan.

## Scope

- Files/modules this phase may touch: tidak ada file kode
- Files/modules this phase must not touch: semua source code

## Preconditions

- Akun Supabase tersedia di supabase.com
- Akses ke Vercel project settings

## Tasks

### 1. Buat Supabase Project

Di https://supabase.com/dashboard:
1. Klik **New project**
2. Nama project: `league-organizer`
3. Generate database password yang kuat, simpan password ini
4. Region: pilih yang paling dekat (misal Singapore)
5. Tunggu project selesai dibuat (~1 menit)

### 2. Jalankan Schema SQL

Di Supabase dashboard → **SQL Editor** → **New query**, jalankan:

```sql
-- Enable RLS di semua tabel
alter table if exists leagues enable row level security;

-- Leagues
create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  settings jsonb not null default '{}',
  created_at timestamptz default now()
);

-- Players
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Teams
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  name text not null,
  short_name text,
  badge text,
  logo text,
  status text not null default 'pool',
  owner_id uuid references players(id) on delete set null,
  external_id text,
  created_at timestamptz default now()
);

-- Seasons
create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  number int not null default 1,
  status text not null default 'setup',
  team_ids jsonb not null default '[]',
  owner_snapshots jsonb not null default '{}',
  champion_id uuid references teams(id) on delete set null,
  bracket jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

-- Matches
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons(id) on delete cascade,
  home_team_id uuid references teams(id) on delete cascade,
  away_team_id uuid references teams(id) on delete cascade,
  matchday int not null,
  home_score int,
  away_score int,
  status text not null default 'scheduled',
  match_type text not null default 'league',
  original_matchday int,
  scheduled_date timestamptz,
  bracket_slot jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table leagues enable row level security;
alter table players enable row level security;
alter table teams enable row level security;
alter table seasons enable row level security;
alter table matches enable row level security;
```

### 3. Jalankan RLS Policies

Di SQL Editor, query baru:

```sql
-- LEAGUES
create policy "leagues public read" on leagues for select using (true);
create policy "leagues admin insert" on leagues for insert with check (auth.role() = 'authenticated');
create policy "leagues admin update" on leagues for update using (auth.role() = 'authenticated');
create policy "leagues admin delete" on leagues for delete using (auth.role() = 'authenticated');

-- PLAYERS
create policy "players public read" on players for select using (true);
create policy "players admin insert" on players for insert with check (auth.role() = 'authenticated');
create policy "players admin update" on players for update using (auth.role() = 'authenticated');
create policy "players admin delete" on players for delete using (auth.role() = 'authenticated');

-- TEAMS
create policy "teams public read" on teams for select using (true);
create policy "teams admin insert" on teams for insert with check (auth.role() = 'authenticated');
create policy "teams admin update" on teams for update using (auth.role() = 'authenticated');
create policy "teams admin delete" on teams for delete using (auth.role() = 'authenticated');

-- SEASONS
create policy "seasons public read" on seasons for select using (true);
create policy "seasons admin insert" on seasons for insert with check (auth.role() = 'authenticated');
create policy "seasons admin update" on seasons for update using (auth.role() = 'authenticated');
create policy "seasons admin delete" on seasons for delete using (auth.role() = 'authenticated');

-- MATCHES
create policy "matches public read" on matches for select using (true);
create policy "matches admin insert" on matches for insert with check (auth.role() = 'authenticated');
create policy "matches admin update" on matches for update using (auth.role() = 'authenticated');
create policy "matches admin delete" on matches for delete using (auth.role() = 'authenticated');
```

### 4. Buat Admin User

Di Supabase dashboard → **Authentication** → **Users** → **Add user**:
- Email: `septianrifano.dev@gmail.com`
- Password: pilih password kuat
- Klik **Create user**

### 5. Catat Env Vars

Di Supabase dashboard → **Project Settings** → **API**:
- Catat `Project URL` → ini `VITE_SUPABASE_URL`
- Catat `anon public` key → ini `VITE_SUPABASE_ANON_KEY`

Di Vercel project settings → **Environment Variables**, tambahkan:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Juga buat file `.env.local` di root project (untuk development):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

`.env.local` sudah di-gitignore, aman.

## Acceptance Criteria

- Semua 5 tabel terbuat di Supabase
- RLS aktif dan policies terpasang (cek di Table Editor → pilih tabel → Policies)
- Admin user terbuat di Authentication
- Env vars tersimpan di Vercel dan `.env.local`

## Verification

- Di Supabase Table Editor: pastikan tabel `leagues`, `players`, `teams`, `seasons`, `matches` ada
- Di Authentication: pastikan admin user muncul
- Di Project Settings → API: URL dan anon key tercatat

## Idempotence and Recovery

- SQL menggunakan `create table if not exists` — aman diulang
- Jika policy sudah ada, hapus dulu: `drop policy if exists "leagues public read" on leagues;`

## Exit Criteria

- [ ] 5 tabel terbuat di Supabase
- [ ] RLS policies aktif di semua tabel
- [ ] Admin user terbuat
- [ ] `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` tersimpan di Vercel dan `.env.local`
