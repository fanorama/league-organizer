# Phase 03: Rewrite Storage Layer

## Objective

Ganti `src/lib/storage.ts` dari fungsi sinkron berbasis localStorage menjadi fungsi async per entitas yang hit Supabase. `clubs_cache` tetap di localStorage.

## Scope

- Files/modules this phase may touch:
  - `src/lib/storage.ts` — rewrite total
- Files/modules this phase must not touch:
  - `src/lib/types.ts`
  - `src/lib/schedule.ts`
  - Semua store dan pages (store diupdate di Phase 04)

## Preconditions

- Phase 02 selesai: `src/lib/supabase.ts` ada

## Tasks

### 1. Pahami mapping camelCase ↔ snake_case

TypeScript types pakai camelCase, kolom PostgreSQL pakai snake_case. Storage functions harus melakukan transformasi.

Mapping per entitas:

**League:**
```
id → id
name → name
description → description
settings → settings (jsonb, tidak perlu transform)
createdAt → created_at
```

**Player:**
```
id → id
name → name
createdAt → created_at
```

**Team:**
```
id → id
leagueId → league_id
name → name
shortName → short_name
badge → badge
logo → logo
status → status
ownerId → owner_id
externalId → external_id
createdAt → created_at
(owner field deprecated, tidak disimpan ke DB)
```

**Season:**
```
id → id
leagueId → league_id
number → number
status → status
teamIds → team_ids (jsonb)
ownerSnapshots → owner_snapshots (jsonb)
champion → champion_id (uuid — simpan teamId dari field champion)
bracket → bracket (jsonb)
startedAt → started_at
finishedAt → finished_at
createdAt → created_at
```

**Match:**
```
id → id
seasonId → season_id
matchday → matchday
homeTeamId → home_team_id
awayTeamId → away_team_id
homeScore → home_score
awayScore → away_score
status → status
matchType → match_type
originalMatchday → original_matchday
scheduledDate → scheduled_date (timestamptz atau null)
bracketSlot → bracket_slot (jsonb)
createdAt → created_at
```

### 2. Rewrite `src/lib/storage.ts`

Ganti seluruh isi file dengan implementasi baru. Struktur:

```ts
import { supabase } from './supabase';
import type { League, Player, Team, Season, Match, CacheEntry } from './types';

// ─── Helper mapping functions ───────────────────────────────────────────────

function dbToLeague(row: any): League { ... }
function leagueToDb(league: Partial<League>): any { ... }

function dbToPlayer(row: any): Player { ... }
function playerToDb(player: Partial<Player>): any { ... }

function dbToTeam(row: any): Team { ... }
function teamToDb(team: Partial<Team>): any { ... }

function dbToSeason(row: any): Season { ... }
function seasonToDb(season: Partial<Season>): any { ... }

function dbToMatch(row: any): Match { ... }
function matchToDb(match: Partial<Match>): any { ... }

// ─── Leagues ─────────────────────────────────────────────────────────────────

export async function getLeagues(): Promise<League[]> {
  const { data, error } = await supabase.from('leagues').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToLeague);
}

export async function getLeagueById(id: string): Promise<League | null> {
  const { data, error } = await supabase.from('leagues').select('*').eq('id', id).single();
  if (error) return null;
  return dbToLeague(data);
}

export async function saveLeague(league: Omit<League, 'id'> | League): Promise<League> {
  const row = leagueToDb(league);
  const { data, error } = await supabase.from('leagues').upsert(row).select().single();
  if (error) throw error;
  return dbToLeague(data);
}

export async function deleteLeague(id: string): Promise<void> {
  const { error } = await supabase.from('leagues').delete().eq('id', id);
  if (error) throw error;
  // cascade delete otomatis via FK on delete cascade di PostgreSQL
}

// ─── Players ──────────────────────────────────────────────────────────────────

export async function getPlayers(): Promise<Player[]> { ... }
export async function getPlayerById(id: string): Promise<Player | null> { ... }
export async function savePlayer(player: Omit<Player, 'id'> | Player): Promise<Player> { ... }
export async function deletePlayer(id: string): Promise<void> { ... }

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function getTeams(): Promise<Team[]> { ... }
export async function getTeamsByLeague(leagueId: string): Promise<Team[]> { ... }
export async function getTeamById(id: string): Promise<Team | null> { ... }
export async function saveTeam(team: Omit<Team, 'id'> | Team): Promise<Team> { ... }
export async function deleteTeam(id: string): Promise<void> { ... }

// ─── Seasons ─────────────────────────────────────────────────────────────────

export async function getSeasonsByLeague(leagueId: string): Promise<Season[]> { ... }
export async function getSeasonById(id: string): Promise<Season | null> { ... }
export async function saveSeason(season: Omit<Season, 'id'> | Season): Promise<Season> { ... }
export async function deleteSeason(id: string): Promise<void> { ... }

// ─── Matches ─────────────────────────────────────────────────────────────────

export async function getMatchesBySeason(seasonId: string): Promise<Match[]> { ... }
export async function getMatchById(id: string): Promise<Match | null> { ... }
export async function saveMatch(match: Omit<Match, 'id'> | Match): Promise<Match> { ... }
export async function saveMatches(matches: (Omit<Match, 'id'> | Match)[]): Promise<Match[]> { ... }
export async function deleteMatch(id: string): Promise<void> { ... }

// ─── Cache (tetap localStorage) ──────────────────────────────────────────────

export function getCache<T = CacheEntry>(): Record<string, T> {
  return JSON.parse(localStorage.getItem('clubs_cache') || '{}') as Record<string, T>;
}

export function saveCache<T>(cache: Record<string, T>): Record<string, T> {
  localStorage.setItem('clubs_cache', JSON.stringify(cache));
  return cache;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export function byCreatedAtDesc<T extends { createdAt: string }>(a: T, b: T): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
```

Catatan penting untuk implementasi helper mapping:
- `dbToLeague(row)`: `created_at` → `createdAt`
- `dbToSeason(row)`: `champion_id` → `champion`, `team_ids` → `teamIds`, `owner_snapshots` → `ownerSnapshots`, `started_at` → `startedAt`, `finished_at` → `finishedAt`
- `seasonToDb(season)`: field `champion` (string | null) → `champion_id`; pastikan `id` tidak di-include jika belum ada
- `upsert` menggunakan `id` sebagai conflict key — jika `league.id` tidak ada, Supabase generate UUID baru

**Fungsi `createId` dan `cascadeDeleteLeague` dihapus** — tidak dibutuhkan lagi:
- ID di-generate otomatis oleh PostgreSQL (`gen_random_uuid()`)
- Cascade delete di-handle oleh FK constraints

## Acceptance Criteria

- `storage.ts` tidak import `localStorage` lagi (kecuali untuk cache)
- `createId`, `getAll`, `setAll`, `save`, `remove`, `cascadeDeleteLeague` tidak ada lagi
- Fungsi-fungsi baru bersifat async, return `Promise<T>`
- TypeScript compile tanpa error

## Verification

```bash
npm run build
```

Expected: build sukses. Stores akan error sementara karena masih import fungsi lama — itu normal, diperbaiki di Phase 04.

## Idempotence and Recovery

- Rewrite idempoten — bisa diulang
- Jika ada error, rollback via `git restore src/lib/storage.ts`

## Exit Criteria

- [ ] `storage.ts` rewrite selesai
- [ ] Tidak ada `localStorage` access selain `getCache`/`saveCache`
- [ ] Tidak ada fungsi `createId`, `cascadeDeleteLeague`, `getAll`, `setAll`
- [ ] `npm run build` tidak error di `storage.ts`
