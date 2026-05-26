# Phase 03: Downstream Filters

## Objective

`league.js` dan `season.js` hanya menggunakan tim ber-status `'active'` saat membuat season dan memvalidasi jumlah peserta. Klub di pool tidak boleh masuk jadwal.

## Scope

- Files yang boleh diubah: `js/league.js`, `js/season.js`
- Files yang tidak boleh disentuh: `js/teams.js`, `js/wheel.js`, `js/schedule.js`, `js/standings.js`, `js/storage.js`

## Preconditions

- Phase 01 selesai: team baru tersimpan dengan `status: 'pool'`
- Phase 02 selesai: UI sudah menampilkan dua section dengan benar

## Tasks

### 1. `js/league.js` — Filter teams ke active-only

**Lokasi:** `js/league.js` baris ~15

Ubah:
```js
const teams = getAll(KEYS.teams).filter((team) => team.leagueId === league.id);
```

Menjadi:
```js
const teams = getAll(KEYS.teams).filter((team) => team.leagueId === league.id && team.status === 'active');
```

Ini mempengaruhi:
- `teams.length < 2` check untuk disabled "Create season" button (line ~24)
- `champions` lookup object (line ~17) — tetap benar, champion pasti active
- Klub yang tampil di preview list di league.html (line ~65)
- `createSeasonWithSchedule(league, teams)` call (line ~74) — hanya active yang masuk jadwal

### 2. `js/season.js` — Filter teams ke active-only

**Lokasi:** `js/season.js` baris ~23

Ubah:
```js
const teams = getAll(KEYS.teams).filter((team) => team.leagueId === league.id);
```

Menjadi:
```js
const teams = getAll(KEYS.teams).filter((team) => team.leagueId === league.id && team.status === 'active');
```

Ini mempengaruhi:
- `teams.length < 2` disabled check untuk "Start season" button (line ~43)

**Catatan `teamMap()`:** Fungsi `teamMap()` di `season.js` (line ~15) dipakai untuk lookup nama tim di schedule/standings display. Tim yang sudah masuk matches pasti sudah active. Tidak wajib diubah, tapi untuk konsistensi bisa ditambah filter yang sama:

```js
function teamMap() {
  return Object.fromEntries(
    getAll(KEYS.teams)
      .filter((team) => team.leagueId === league.id && team.status === 'active')
      .map((team) => [team.id, team])
  );
}
```

Ini opsional — implementor boleh skip jika mau menjaga perubahan minimal.

## Acceptance Criteria

- Buat 6 active teams + 4 pool teams → Create Season button enabled (bukan disabled)
- Season yang dibuat hanya punya jadwal untuk 6 active teams (tidak ada pool teams di schedule)
- Season.html → Start Season button reflects count active teams, bukan semua teams

## Verification

- Commands:
  - Buka `http://localhost:4173/league.html?id=<id>`
  - Buka `http://localhost:4173/season.html?id=<seasonId>`
  - Buka localStorage → `matches` → hitung matchday entries
- Expected results:
  - Dengan 6 active teams, meetingsPerSeason=1: total 15 matches (round-robin, 6 teams)
  - Tidak ada match yang melibatkan pool team ID
  - "Create season" disabled hanya jika active teams < 2
- Evidence: paste jumlah matches dari localStorage, konfirmasi tidak ada pool team ID di matches

## Idempotence and Recovery

- Safe to re-run: ya — pure filter query change
- Recovery: revert `js/league.js` dan `js/season.js`
- Irreversible: tidak ada. Season yang sudah terbuat tidak otomatis berubah

## Exit Criteria

- [ ] `league.js` hanya menyertakan active teams ke `createSeasonWithSchedule`
- [ ] "Create season" disabled ketika active teams < 2 (pool teams tidak dihitung)
- [ ] Jadwal season tidak berisi pool team IDs
- [ ] "Start season" di `season.js` disabled ketika active teams < 2
