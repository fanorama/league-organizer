# Domain Flows

Alur kerja utama aplikasi dan logika domain yang menyertainya.

## Siklus Hidup Liga

1. **Buat liga** (`LeaguesPage`) → simpan `League` dengan `settings` (`meetingsPerSeason`, `continuousSeasons`, opsi `playoff`) → navigate ke `LeaguePage`.
2. **Buat player** (`PlayersPage`) → `Player` bersifat **global**, dipakai lintas liga.
3. **Tambah/import tim** (`TeamsPage`) → tim masuk pool dengan `status: 'pool'`. Import via `ImportClubGrid` (grid + tab kompetisi) yang memanggil `fetchClubs()`.
4. **Spin wheel** (`SpinWheel` di `TeamsPage`) → assign player ke tim: set `ownerId` (→ `Player.id`) dan `status: 'active'`. Hanya tim ber-`status: 'pool'` yang masuk wheel.
5. **Buat musim** (`LeaguePage` → `createSeasonWithSchedule`) → snapshot kepemilikan dicatat di `Season.ownerSnapshots` (`{ [teamId]: { playerId, playerName } }`) → `generateRoundRobin()` membuat jadwal → navigate ke `SeasonPage`.
6. **Input skor** (`SeasonPage`) → saat semua match `finished`, musim otomatis jadi `status: 'finished'` dan `champion` dicatat.
7. **(Opsional) Playoff** → jika `settings.playoff.enabled`, setelah liga reguler selesai musim masuk `playoff_setup` → `playoff_active` dengan bracket double-elimination.
8. **Statistik** → `PlayersPage` (leaderboard global), `PlayerPage` (profil + head-to-head antar player).

## Penjadwalan (`src/lib/schedule.ts`)

- `generateRoundRobin(teamIds, meetingsPerSeason)` — bangun jadwal round-robin; `meetingsPerSeason` mengatur berapa kali tiap pasangan bertemu (mis. 2 = home & away).
- `createSeasonWithSchedule(league, teams)` — buat `Season` baru + simpan semua `Match`-nya.
- `replaceSeasonSchedule(...)` — regenerasi jadwal untuk musim yang ada.
- Playoff: `startPlayoff()`, `advancePlayoffRound()`, `finishPlayoff()`, plus resolver multi-leg `resolveMultiLegWinnerPublic()`. Struktur bracket disimpan di `Season.bracket` (`PlayoffBracket`: `upper`, `lower`, `grandFinal`).
- File ini memakai `@ts-nocheck` — kompleks, perlu kehati-hatian ekstra saat modifikasi.

> **Konvensi `matchday`:** nilai `99` menandai pertandingan yang ditunda (delayed). `match_type` `'league' | 'playoff'` membedakan match reguler dan playoff.

## Klasemen (`src/lib/standings.ts`)

`calculateStandingsFromData(season, teams, matches)` menghitung tabel klasemen. Tiebreaker berurutan: **Points → Goal Difference → Goals For**. Varian async `calculateStandings(seasonId)` mengambil data dari storage dulu.

## Statistik Player (`src/lib/playerStats.ts`)

- Sumber kebenaran kepemilikan untuk statistik adalah **`Season.ownerSnapshots`**, bukan `Team.ownerId` saat ini — sehingga statistik historis tetap akurat meski kepemilikan tim berubah setelah musim selesai.
- `calculatePlayerStatsFromData(...)` → `PlayerStats` (agregat lintas liga + breakdown per liga + riwayat tim).
- `calculateHeadToHeadFromData(playerAId, playerBId, ...)` → `H2HStats` untuk perbandingan dua player.

## Quick Match (`src/lib/quickMatchStats.ts`)

Mode pertandingan cepat antar dua player, **terpisah** dari sistem liga/musim.

1. `QuickMatchPage` — daftar & buat `QuickMatchSession` (dua `playerId`).
2. `QuickMatchSessionPage` — tiap player memilih klub via `ClubPickerModal` (pemilihan kompetisi independen per player), input skor tiap game (`QuickMatchGame` menyimpan snapshot klub: `id`, `name`, `logo`).
3. `calculateQuickMatchStatsFromData(...)` → `QuickMatchStats` (rekap menang/seri/kalah, gol) untuk session.

Data quick match disimpan di tabel Supabase `quick_match_sessions` dan `quick_match_games`.
