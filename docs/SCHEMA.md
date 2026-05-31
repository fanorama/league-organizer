# Supabase Schema & RLS

SQL untuk membangun seluruh skema database League Organizer beserta Row Level Security (RLS).

## Cara Pakai

1. Buka **Supabase Dashboard → SQL Editor → New query**.
2. Salin tiap blok di bawah (atau seluruhnya sekaligus) lalu **Run**.
3. Skema ini direkonstruksi dari mapper `dbToX()`/`xToDb()` di `src/lib/storage.ts` dan tipe di `src/lib/types.ts` — kolom memakai `snake_case`.

**Aman dijalankan ulang (idempotent):** memakai `create table if not exists`, `create index if not exists`, dan `drop policy if exists` sebelum `create policy`.

## Catatan Desain

- **Primary key** `uuid` dengan `default gen_random_uuid()` (built-in di Postgres Supabase). App juga boleh mengirim UUID sendiri saat upsert.
- **Timestamp** `timestamptz` dengan `default now()`.
- **Cascade delete** ditangani di level DB lewat foreign key `on delete cascade` — tidak ada cascade manual di application layer. Hapus liga akan otomatis menghapus tim, musim, dan match terkait.
- `owner_id` (teams) dan `champion_id` (seasons) memakai `on delete set null` agar menghapus player/tim tidak ikut menghapus baris yang mereferensikannya.

---

## 1. Tables

Urutan eksekusi mengikuti dependensi foreign key.

```sql
-- ===== leagues =====
create table if not exists public.leagues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ===== players =====
create table if not exists public.players (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  skill_override text check (skill_override in ('jago','sedang','pemula')),  -- null = skill otomatis dari win rate
  created_at     timestamptz not null default now()
);

-- ===== teams =====
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  league_id   uuid not null references public.leagues(id) on delete cascade,
  name        text not null,
  short_name  text,
  badge       text,
  logo        text,
  status      text not null default 'pool' check (status in ('pool','active')),
  owner_id    uuid references public.players(id) on delete set null,
  owner       text,            -- DEPRECATED: nama owner lama, hanya fallback migrasi
  tier        text check (tier in ('elite','mid','underdog')),  -- tier klub di level tim (null → 'mid' saat draw)
  external_id text,            -- id klub dari API Football (sebagai string)
  created_at  timestamptz not null default now()
);

-- ===== club_tiers =====
-- Tier klub persisten lintas-liga, keyed by external_id (id klub API Football).
-- Dipakai weighted spin wheel (balanced draw); tercermin ke teams.tier saat klub diimpor.
create table if not exists public.club_tiers (
  external_id text primary key,
  tier        text not null check (tier in ('elite','mid','underdog'))
);

-- ===== seasons =====
create table if not exists public.seasons (
  id              uuid primary key default gen_random_uuid(),
  league_id       uuid not null references public.leagues(id) on delete cascade,
  number          integer not null,
  status          text not null default 'setup'
                    check (status in ('setup','active','finished','playoff_setup','playoff_active')),
  team_ids        uuid[] not null default '{}',
  owner_snapshots jsonb not null default '{}'::jsonb,   -- { [teamId]: { playerId, playerName } }
  champion_id     uuid references public.teams(id) on delete set null,
  bracket         jsonb,                                -- struktur PlayoffBracket
  started_at      timestamptz,
  finished_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- ===== matches =====
create table if not exists public.matches (
  id                uuid primary key default gen_random_uuid(),
  season_id         uuid not null references public.seasons(id) on delete cascade,
  matchday          integer not null,                  -- 99 = ditunda (delayed)
  home_team_id      uuid references public.teams(id) on delete cascade,
  away_team_id      uuid references public.teams(id) on delete cascade,
  home_score        integer,
  away_score        integer,
  status            text not null default 'scheduled'
                      check (status in ('scheduled','finished','delayed')),
  match_type        text not null default 'league' check (match_type in ('league','playoff')),
  original_matchday integer,
  scheduled_date    timestamptz,
  bracket_slot      jsonb                              -- struktur BracketSlotRef
);

-- ===== quick_match_sessions =====
create table if not exists public.quick_match_sessions (
  id          uuid primary key default gen_random_uuid(),
  player1_id  uuid not null references public.players(id) on delete cascade,
  player2_id  uuid not null references public.players(id) on delete cascade,
  status      text not null default 'active' check (status in ('active','finished')),
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);

-- ===== quick_match_games =====
create table if not exists public.quick_match_games (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.quick_match_sessions(id) on delete cascade,
  player1_club_id   text,        -- snapshot klub (bukan FK; bisa external id atau team id)
  player1_club_name text,
  player1_club_logo text,
  player2_club_id   text,
  player2_club_name text,
  player2_club_logo text,
  player1_score     integer not null default 0,
  player2_score     integer not null default 0,
  created_at        timestamptz not null default now()
);
```

---

## 2. Indexes

Mengindeks kolom yang dipakai untuk filter di `storage.ts` (`getTeamsByLeague`, `getSeasonsByLeague`, `getMatchesBySeason`, `getQuickMatchGamesBySession`, dll).

```sql
create index if not exists idx_teams_league_id     on public.teams(league_id);
create index if not exists idx_teams_owner_id       on public.teams(owner_id);
create index if not exists idx_seasons_league_id    on public.seasons(league_id);
create index if not exists idx_matches_season_id    on public.matches(season_id);
create index if not exists idx_qm_sessions_player1  on public.quick_match_sessions(player1_id);
create index if not exists idx_qm_sessions_player2  on public.quick_match_sessions(player2_id);
create index if not exists idx_qm_games_session_id  on public.quick_match_games(session_id);
```

---

## 3. Row Level Security (RLS)

**Model otorisasi aplikasi:** pengunjung tanpa login dapat **membaca** semua data (read-only), sedangkan **write** (insert/update/delete) hanya untuk user yang login lewat Supabase Auth (`authenticated`). Ini selaras dengan UI: tidak ada route guard, pembatasan ditegakkan di sini.

Pola per tabel: dua policy permissive.
- `*_public_read` — `select` untuk semua role (anon + authenticated).
- `*_authenticated_write` — `all` (read+write) hanya untuk role `authenticated`.

> ⚠️ **Catatan keamanan:** policy read bersifat **publik** — siapa pun dengan anon key bisa membaca seluruh isi tabel. Ini memang desain aplikasi (data liga bersifat publik). Jangan simpan data sensitif di tabel ini.

### 3a. Aktifkan RLS

```sql
alter table public.leagues              enable row level security;
alter table public.players              enable row level security;
alter table public.teams                enable row level security;
alter table public.seasons              enable row level security;
alter table public.matches              enable row level security;
alter table public.club_tiers           enable row level security;
alter table public.quick_match_sessions enable row level security;
alter table public.quick_match_games    enable row level security;
```

### 3b. Policies

```sql
-- ===== leagues =====
drop policy if exists "leagues_public_read" on public.leagues;
create policy "leagues_public_read" on public.leagues
  for select using (true);
drop policy if exists "leagues_authenticated_write" on public.leagues;
create policy "leagues_authenticated_write" on public.leagues
  for all to authenticated using (true) with check (true);

-- ===== players =====
drop policy if exists "players_public_read" on public.players;
create policy "players_public_read" on public.players
  for select using (true);
drop policy if exists "players_authenticated_write" on public.players;
create policy "players_authenticated_write" on public.players
  for all to authenticated using (true) with check (true);

-- ===== teams =====
drop policy if exists "teams_public_read" on public.teams;
create policy "teams_public_read" on public.teams
  for select using (true);
drop policy if exists "teams_authenticated_write" on public.teams;
create policy "teams_authenticated_write" on public.teams
  for all to authenticated using (true) with check (true);

-- ===== seasons =====
drop policy if exists "seasons_public_read" on public.seasons;
create policy "seasons_public_read" on public.seasons
  for select using (true);
drop policy if exists "seasons_authenticated_write" on public.seasons;
create policy "seasons_authenticated_write" on public.seasons
  for all to authenticated using (true) with check (true);

-- ===== matches =====
drop policy if exists "matches_public_read" on public.matches;
create policy "matches_public_read" on public.matches
  for select using (true);
drop policy if exists "matches_authenticated_write" on public.matches;
create policy "matches_authenticated_write" on public.matches
  for all to authenticated using (true) with check (true);

-- ===== club_tiers =====
drop policy if exists "club_tiers_public_read" on public.club_tiers;
create policy "club_tiers_public_read" on public.club_tiers
  for select using (true);
drop policy if exists "club_tiers_authenticated_write" on public.club_tiers;
create policy "club_tiers_authenticated_write" on public.club_tiers
  for all to authenticated using (true) with check (true);

-- ===== quick_match_sessions =====
drop policy if exists "qm_sessions_public_read" on public.quick_match_sessions;
create policy "qm_sessions_public_read" on public.quick_match_sessions
  for select using (true);
drop policy if exists "qm_sessions_authenticated_write" on public.quick_match_sessions;
create policy "qm_sessions_authenticated_write" on public.quick_match_sessions
  for all to authenticated using (true) with check (true);

-- ===== quick_match_games =====
drop policy if exists "qm_games_public_read" on public.quick_match_games;
create policy "qm_games_public_read" on public.quick_match_games
  for select using (true);
drop policy if exists "qm_games_authenticated_write" on public.quick_match_games;
create policy "qm_games_authenticated_write" on public.quick_match_games
  for all to authenticated using (true) with check (true);
```

---

## 4. Membuat Admin

Aplikasi tidak punya halaman sign-up. Buat akun admin secara manual:

**Supabase Dashboard → Authentication → Users → Add user** (isi email + password, centang *Auto Confirm User*).

Login lewat `#/login` di app memakai kredensial tersebut. Setiap user yang berhasil login dianggap admin (`isAdmin = session !== null`).

---

## 5. Verifikasi

```sql
-- Cek RLS aktif di semua tabel
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r'
order by relname;

-- Daftar semua policy
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

---

## Catatan Implementasi (diskrepansi kode)

- **Kolom `teams.owner`** sudah deprecated — mapper `storage.ts` saat ini tidak menulis maupun membacanya. Disertakan agar data lama tidak hilang; aman dihapus jika tidak ada data legacy.
- **Kolom `quick_match_games.player1_club_logo` / `player2_club_logo`** dibaca oleh `dbToQuickMatchGame()` tetapi **tidak ditulis** oleh `quickMatchGameToDb()`. Akibatnya kolom ini selalu `null` dengan kode saat ini. Kolom tetap disertakan agar konsisten dengan path baca; perbaiki path tulis di `storage.ts` bila logo perlu dipersist.
