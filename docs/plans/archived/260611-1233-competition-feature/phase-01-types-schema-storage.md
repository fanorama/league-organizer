# Phase 01 — Types, Schema (Supabase DDL), Storage Layer

**Objektif:** Menyiapkan fondasi data: interface TypeScript, DDL 3 tabel baru di `docs/SCHEMA.md`, dan mapper + CRUD di `src/lib/storage.ts`. Akhir fase ini, data layer competition siap dipanggil store/helper.

**Kompleksitas/Risiko:** M

## Prasyarat
- Baca `src/lib/types.ts` (pola interface), `src/lib/storage.ts` (mapper `dbToSeason`/`seasonToDb` di sekitar baris 107–360, `createId`, pola upsert/delete), dan `docs/SCHEMA.md` (pola tabel + index + RLS dua-policy).

## Tasks

1. **Tambah types di `src/lib/types.ts`** (di bawah interface yang ada, jangan ubah yang lama):
   ```ts
   export type CompetitionStatus =
     | 'setup' | 'draw_clubs' | 'group_draw' | 'group_stage' | 'knockout' | 'finished';
   export type QualifyMode = 'top1' | 'top2' | 'top2_plus_best_thirds';

   export interface CompetitionSettings {
     groupCount: number;
     participantsTarget?: number;
     meetingsPerPair: 1 | 2;
     qualifyMode: QualifyMode;
     bestThirdsCount?: number;       // dipakai bila qualifyMode === 'top2_plus_best_thirds'
     knockoutLegs: 1 | 2;            // final selalu 1 leg apapun nilainya
     potCount: number;
   }

   export interface GroupDef { key: string; participantIds: string[]; }

   // Reuse pola PlayoffSlot: satu "tie" knockout
   export interface CompetitionTie {
     team1?: string | null;          // participantId
     team2?: string | null;          // participantId
     matchIds: string[];             // 1 (single) atau 2 (two-legged) leg
     winner?: string | null;         // participantId; manual bila agregat seri
     bye?: boolean;
   }

   export interface CompetitionBracket {
     rounds: CompetitionTie[][];     // rounds[0] = babak pertama knockout
     seeds?: string[];               // urutan participantId hasil seeding grup
   }

   export interface Competition {
     id: string;
     name: string;
     description?: string;
     status: CompetitionStatus;
     settings: CompetitionSettings;
     groups?: GroupDef[];
     bracket?: CompetitionBracket;
     championId?: string | null;     // participantId pemenang
     createdAt: string;
     startedAt?: string | null;
     finishedAt?: string | null;
   }

   export interface CompetitionParticipant {
     id: string;
     competitionId: string;
     playerId: string;
     clubExternalId?: string | null;
     clubName?: string | null;
     clubLogo?: string | null;
     clubTier?: 'elite' | 'mid' | 'underdog' | null;
     pot?: number | null;
     groupKey?: string | null;
     seed?: number | null;
     createdAt?: string;
   }

   export interface CompetitionMatch {
     id: string;
     competitionId: string;
     stage: 'group' | 'knockout';
     groupKey?: string | null;       // diisi bila stage='group'
     round?: number | null;          // diisi bila stage='knockout'
     tieIndex?: number | null;       // diisi bila stage='knockout'
     leg?: number | null;            // 1|2 bila two-legged
     homeParticipantId?: string | null;
     awayParticipantId?: string | null;
     homeScore?: number | null;
     awayScore?: number | null;
     status: 'scheduled' | 'finished';
     createdAt?: string;
   }
   ```

2. **Tambah DDL ke `docs/SCHEMA.md`** (idempotent, ikuti pola existing — `create table if not exists`, `create index if not exists`, `drop policy if exists` lalu `create policy`):
   - Tabel `public.competitions`:
     `id uuid primary key`, `name text not null`, `description text`, `status text not null default 'setup'`, `settings jsonb not null default '{}'`, `groups jsonb`, `bracket jsonb`, `champion_id uuid`, `created_at timestamptz not null default now()`, `started_at timestamptz`, `finished_at timestamptz`.
   - Tabel `public.competition_participants`:
     `id uuid primary key`, `competition_id uuid not null references public.competitions(id) on delete cascade`, `player_id uuid not null references public.players(id) on delete cascade`, `club_external_id text`, `club_name text`, `club_logo text`, `club_tier text`, `pot int`, `group_key text`, `seed int`, `created_at timestamptz not null default now()`.
   - Tabel `public.competition_matches`:
     `id uuid primary key`, `competition_id uuid not null references public.competitions(id) on delete cascade`, `stage text not null`, `group_key text`, `round int`, `tie_index int`, `leg int`, `home_participant_id uuid`, `away_participant_id uuid`, `home_score int`, `away_score int`, `status text not null default 'scheduled'`, `created_at timestamptz not null default now()`.
   - Index: `idx_comp_participants_comp_id` on `competition_participants(competition_id)`, `idx_comp_matches_comp_id` on `competition_matches(competition_id)`.
   - RLS: `enable row level security` untuk ketiga tabel + dua policy per tabel (`*_public_read` USING (true); `*_authenticated_write` FOR ALL TO authenticated USING (true) WITH CHECK (true)) — persis pola `seasons`/`matches`.

3. **Tambah mapper + CRUD di `src/lib/storage.ts`** (ikuti pola `dbToSeason`/`seasonToDb` + camelCase↔snake_case; gunakan `createId()` saat insert tanpa id):
   - `dbToCompetition` / `competitionToDb`, `dbToCompetitionParticipant` / `competitionParticipantToDb`, `dbToCompetitionMatch` / `competitionMatchToDb`.
   - Competitions: `getCompetitions()`, `getCompetitionById(id)`, `saveCompetition(c)` (upsert), `deleteCompetition(id)` (cascade DB).
   - Participants: `getParticipantsByCompetition(competitionId)`, `saveParticipant(p)`, `saveParticipants(list)` (bulk upsert), `deleteParticipant(id)`.
   - Matches: `getCompetitionMatchesByCompetition(competitionId)`, `saveCompetitionMatch(m)`, `saveCompetitionMatches(list)` (bulk), `deleteCompetitionMatchesByCompetition(competitionId)`.
   - JSONB fields (`settings`, `groups`, `bracket`) di-pass apa adanya (Supabase serialize otomatis), seperti `bracket` pada season.

## Verifikasi
```bash
npx tsc --noEmit        # types kompilasi tanpa error
npm run test:run        # test existing tetap hijau (belum ada test baru)
```

## Acceptance Criteria
- `src/lib/types.ts` mengekspor semua interface di atas; `tsc --noEmit` lolos.
- `docs/SCHEMA.md` memuat 3 `create table if not exists` baru + index + RLS, idempotent.
- `storage.ts` mengekspor seluruh fungsi CRUD + mapper; tidak ada akses `supabase` di luar `storage.ts`.
- Test existing tetap lulus.

## Catatan
- Jangan ubah `schedule.ts` (punya `@ts-nocheck`).
- DDL dijalankan manual di Supabase SQL Editor (di luar scope eksekusi kode) — dicatat di Decision Log.
