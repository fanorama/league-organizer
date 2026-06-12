# Phase 02 — Helper Murni `competition.ts` + Unit Test (Engine Turnamen)

**Objektif:** Implementasi seluruh logika turnamen sebagai fungsi murni (rng injected, deterministik di test) di `src/lib/competition.ts`, dengan unit test menyeluruh. Tidak menyentuh Supabase di file ini.

**Kompleksitas/Risiko:** L (inti algoritmik fitur)

## Prasyarat
- Baca `src/lib/balancedDraw.ts` (pola rng injected `rng: () => number = Math.random`, weighted pick).
- Baca `src/lib/standings.ts` (`StandingsRow`, `calculateStandingsFromData`, tiebreaker Pts→GD→GF→nama).
- Baca `src/lib/schedule.ts:68` (`generateRoundRobin(teamIds, meetingsPerSeason)`).
- Pola test: `src/lib/balancedDraw.test.ts`, `src/lib/standings.test.ts`.

## Tasks (semua di `src/lib/competition.ts`, plus `competition.test.ts`)

1. **`distributeToGroups(participantIds: string[], groupCount: number, rng?): GroupDef[]`**
   - Acak (rng injected) lalu sebar round-robin agar selisih ukuran antar-grup ≤ 1.
   - Key grup: `'A'`, `'B'`, … (huruf, urut). Grup awal mendapat sisa (lebih besar).
   - Test: 16/4 → 4×4; 17/4 → [5,4,4,4]; 0 peserta → grup kosong; groupCount=1.

2. **`assignPots(participants: CompetitionParticipant[], potCount: number): CompetitionParticipant[]`**
   - Urutkan peserta by `seed` (jika ada) lalu by `clubTier` (elite→mid→underdog) sebagai proxy kekuatan; bagi merata ke `potCount` pot. Set field `pot` (1..potCount).
   - Test: distribusi pot merata; potCount=1 → semua pot 1.

3. **`drawGroupsFromPots(participants, groupCount, potCount, rng?): GroupDef[]`**
   - Untuk tiap pot, sebar anggotanya ke grup-grup berbeda sehingga **tidak ada dua peserta dari pot sama di grup sama** selama ukuran memungkinkan. Sisa (pot terakhir saat grup tak rata) menyebar ke grup yang masih kurang.
   - Set `groupKey` pada participant. Kembalikan `GroupDef[]`.
   - Test: rng deterministik → no same-pot collision saat ukuran rata; 17/4 → fallback sisa benar.

4. **`computeGroupStandings(group: GroupDef, participants, matches: CompetitionMatch[]): CompetitionStandingsRow[]`**
   - Generalisasi `calculateStandingsFromData`: hitung dari `stage='group'` & `groupKey` cocok & `status='finished'`. Row berbasis `participantId` (bukan Team). Tiebreak Pts→GD→GF→nama klub/player.
   - Definisikan `CompetitionStandingsRow { participantId; played; won; drawn; lost; gf; ga; gd; pts; rank }`.
   - Test: 1 grup 4 peserta dengan hasil → urutan & pts benar; tie GD/GF.

5. **`rankBestThirds(allGroupStandings, bestThirdsCount): string[]`**
   - Kumpulkan peringkat-3 tiap grup, ranking lintas-grup pakai **semua hasil** (Pts→GD→GF), ambil `bestThirdsCount` teratas. Kembalikan participantId terurut.
   - Test: 6 grup → pilih 4 best-third terbaik dengan tiebreak.

6. **`generateGroupSchedule(groups, meetingsPerPair): CompetitionMatch[]`**
   - Per grup panggil `generateRoundRobin(participantIds, meetingsPerPair)`; flatten jadi `CompetitionMatch[]` (`stage='group'`, `groupKey`, `homeParticipantId`/`awayParticipantId`, `status='scheduled'`). Id via pemanggil/store (helper boleh kembalikan tanpa id atau terima id generator).
   - Test: 4 peserta meetings=1 → 6 match; meetings=2 → 12.

7. **Bracket seeding + best-third lookup**
   - `BEST_THIRD_LOOKUP: Record<number, ...>` — tabel pairing ala UEFA untuk jumlah grup yang didukung (mis. 6 grup→4 best-thirds, 8 grup→… ). Dokumentasikan grup mana yang didukung.
   - `seedKnockout(groups, allGroupStandings, settings): CompetitionBracket`
     - `top1`: juara tiap grup → bracket (butuh groupCount = pangkat 2, atau bye).
     - `top2`: pola standar 1A-2B, 1C-2D, … (cross-group, hindari juara vs runner-up grup sama di babak 1).
     - `top2_plus_best_thirds`: isi slot lewat `BEST_THIRD_LOOKUP[groupCount]`; bila `groupCount` tak ada di tabel → **fallback**: gabung [semua juara, semua runner-up, best-thirds terurut] lalu seed berurutan + set flag/return `{ bracket, warning: string }`.
     - Babak yang jumlah peserta bukan pangkat 2 → tambahkan `bye` pada tie (`team2=null`, `winner=team1`).
   - Test: 8 grup top2 → 16 peserta, 8 tie babak-1, pairing benar; 6 grup top2_plus_best_thirds(4) → 16 peserta via lookup; groupCount tak didukung → fallback + warning; jumlah ganjil → bye benar.

8. **Knockout advance + agregat two-legged**
   - `resolveTieWinner(tie, matches, knockoutLegs, manualWinnerId?): string | null`
     - single leg: pemenang skor; seri → `manualWinnerId` wajib.
     - two-legged: jumlah agregat dua leg; seri agregat → `manualWinnerId` wajib (no away-goals).
   - `advanceKnockout(bracket, matches, settings, manualWinners?): CompetitionBracket`
     - Isi `winner` tiap tie yang lengkap; propagasi pemenang ke tie babak berikut (pola pairing standar: tie i & i+1 → tie berikut). Bila babak terakhir selesai → `seeds`/champion ditentukan pemanggil.
   - `generateKnockoutMatchesForRound(bracket, round, knockoutLegs): CompetitionMatch[]` (final paksa 1 leg).
   - Test: two-legged agregat (mis. 1-2 & 2-1 → seri → butuh manual); single leg winner; propagasi pemenang ke babak berikut; final selalu 1 leg.

## Verifikasi
```bash
npm run test:run -- competition       # file test baru hijau
npx tsc --noEmit
```

## Acceptance Criteria
- `src/lib/competition.ts` mengekspor seluruh fungsi di atas, pure (tanpa import `storage`/`supabase`), rng injectable.
- `src/lib/competition.test.ts` mencakup: distributeToGroups (incl. 17/4), drawGroupsFromPots (no same-pot collision), computeGroupStandings + tiebreak, rankBestThirds, seedKnockout (lookup + fallback + bye), resolveTieWinner two-legged & single, advanceKnockout propagasi. Semua hijau.
- Coverage `src/lib/**` bertambah; tidak ada regresi test lain.

## Catatan
- Pola rng injected wajib agar deterministik (lihat `balancedDraw.test.ts`).
- `generateRoundRobin` sudah typed & aman diimpor dari `schedule.ts` (jangan impor fungsi async-nya yang menyentuh storage).
