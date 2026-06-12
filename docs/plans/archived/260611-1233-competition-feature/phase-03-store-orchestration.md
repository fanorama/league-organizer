# Phase 03 — Store `useCompetitionStore` + Orkestrasi Lifecycle

**Objektif:** Zustand store yang membungkus storage + helper murni untuk mengorkestrasi transisi lifecycle (setup → draw_clubs → group_draw → group_stage → knockout → finished). Plus unit test store.

**Kompleksitas/Risiko:** M

## Prasyarat
- Baca `src/store/useSeasonStore.ts` (pola store tipis: wrap storage, refetch, set state).
- Baca `src/store/useSeasonStore.test.ts` (pola test store + mock storage via `src/test/setup.ts`).
- Helper dari Phase 02 dan CRUD dari Phase 01.

## Tasks

1. **Buat `src/store/useCompetitionStore.ts`** dengan state: `competitions`, `participants`, `matches` (untuk competition aktif), dan actions:
   - `fetchCompetitions()` → `getCompetitions()`.
   - `createCompetition(name, description, settings)` → `saveCompetition({ status:'setup', ... })`.
   - `updateCompetition(c)` / `deleteCompetition(id)`.
   - `loadCompetitionDetail(id)` → muat competition + `getParticipantsByCompetition` + `getCompetitionMatchesByCompetition` ke state.
   - **Peserta**: `addParticipant(competitionId, playerId)`, `removeParticipant(participantId)`.
   - **draw_clubs**: `assignClubToParticipant(participantId, club, tier)` (set `clubExternalId`/name/logo/tier; dipanggil setelah `pickWeightedClub` di UI). `finishClubDraw(competitionId)` → status `group_draw`.
   - **group_draw**: `runGroupDraw(competitionId, rng?)` → `assignPots` + `drawGroupsFromPots`, simpan `groups` + update `groupKey`/`pot`/`seed` participants, status `group_stage`, lalu `generateGroupSchedule` → bulk `saveCompetitionMatches`. Set `startedAt`.
   - **group_stage**: `saveGroupResult(matchId, homeScore, awayScore)` → update match `status='finished'`.
   - **transisi ke knockout**: `startKnockout(competitionId)` → hitung `computeGroupStandings` semua grup, `seedKnockout`, simpan `bracket` (+ warning bila fallback), generate match babak-1 via `generateKnockoutMatchesForRound`, status `knockout`.
   - **knockout**: `saveKnockoutResult(matchId, homeScore, awayScore)`; `resolveTie(competitionId, round, tieIndex, manualWinnerId?)` → `resolveTieWinner` + `advanceKnockout`; saat babak baru terbentuk → generate match babak berikut; saat final selesai → `finishCompetition`.
   - `finishCompetition(competitionId, championParticipantId)` → status `finished`, `championId`, `finishedAt`.
   - `refresh()`.

2. **Guard transisi**: setiap transisi memvalidasi prasyarat (mis. `runGroupDraw` butuh semua peserta punya klub; `startKnockout` butuh semua match grup `finished`). Lempar `Error` deskriptif bila tidak terpenuhi (UI menampilkan pesan).

3. **`src/store/useCompetitionStore.test.ts`**: test CRUD dasar + minimal satu transisi penuh (mock storage + helper deterministik via rng/stub). Set return mock via pola `vi.mocked(...)` di `setup.ts`.

## Verifikasi
```bash
npm run test:run -- useCompetitionStore
npm run test:run
npx tsc --noEmit
```

## Acceptance Criteria
- Store mengekspor seluruh action; hanya memanggil fungsi `storage.ts` + helper `competition.ts` (tidak akses `supabase` langsung).
- Transisi lifecycle valid & ber-guard; error deskriptif saat prasyarat gagal.
- `useCompetitionStore.test.ts` hijau; seluruh suite hijau.

## Catatan
- Store tetap **tipis**: tidak ada logika algoritmik (itu di `competition.ts`). Store hanya orkestrasi + persist + refetch.
