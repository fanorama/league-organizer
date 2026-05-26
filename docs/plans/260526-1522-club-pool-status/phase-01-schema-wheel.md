# Phase 01: Schema + Wheel

## Objective

- Semua team yang di-create menyertakan `status: 'pool'` secara default
- `wheel.js` hanya mengambil kandidat dari klub ber-status `'pool'`
- Setelah owner di-assign, status berubah menjadi `'active'`

## Scope

- Files yang boleh diubah: `js/teams.js`, `js/wheel.js`
- Files yang tidak boleh disentuh di phase ini: `js/league.js`, `js/season.js`, `js/storage.js`

## Preconditions

- Tidak ada. Phase ini adalah titik awal.

## Tasks

### 1. `js/teams.js` — Tambah `status: 'pool'` ke form save

**Lokasi:** `js/teams.js` baris ~69–77 (form submit handler `teamForm`)

Cari blok:
```js
save(KEYS.teams, {
  leagueId: league.id,
  name,
  shortName: ...,
  badge: ...,
  owner: null,
  externalId: null
});
```

Tambahkan field `status: 'pool'`:
```js
save(KEYS.teams, {
  leagueId: league.id,
  name,
  shortName: ...,
  badge: ...,
  owner: null,
  externalId: null,
  status: 'pool'
});
```

### 2. `js/teams.js` — Tambah `status: 'pool'` ke import save

**Lokasi:** `js/teams.js` baris ~141–148 (import form submit handler)

Cari blok:
```js
save(KEYS.teams, {
  leagueId: league.id,
  name: club.name,
  shortName: club.shortName,
  badge: club.logo || club.shortName,
  owner: null,
  externalId: club.id
});
```

Tambahkan field `status: 'pool'`:
```js
save(KEYS.teams, {
  leagueId: league.id,
  name: club.name,
  shortName: club.shortName,
  badge: club.logo || club.shortName,
  owner: null,
  externalId: club.id,
  status: 'pool'
});
```

### 3. `js/wheel.js` — Update kandidat wheel ke status-based

**Lokasi:** `js/wheel.js` baris ~23–25 (fungsi `unassigned()`)

Ubah:
```js
function unassigned() {
  return teams.filter((team) => !team.owner);
}
```

Menjadi:
```js
function unassigned() {
  return teams.filter((team) => team.status === 'pool');
}
```

### 4. `js/wheel.js` — Update assign: set `status: 'active'`

**Lokasi:** `js/wheel.js` baris ~52–58 (ownerForm submit handler)

Ubah:
```js
teams[index] = save(KEYS.teams, { ...selected, owner });
```

Menjadi:
```js
teams[index] = save(KEYS.teams, { ...selected, owner, status: 'active' });
```

### 5. `js/teams.js` — Pass hanya pool teams ke wheel modal

**Lokasi:** `js/teams.js` baris ~80–82 (wheelButton click handler)

Ubah:
```js
document.getElementById("wheelButton").addEventListener("click", () => {
  openWheelModal(teams, render);
});
```

Menjadi:
```js
document.getElementById("wheelButton").addEventListener("click", () => {
  const poolTeams = teams.filter((team) => team.status === 'pool');
  openWheelModal(poolTeams, render);
});
```

## Acceptance Criteria

- Team yang di-buat via form punya `status: 'pool'` di localStorage
- Team yang di-import punya `status: 'pool'` di localStorage
- Wheel modal hanya menampilkan klub ber-status `'pool'`
- Setelah assign, team punya `status: 'active'` dan `owner: 'NamaPemilik'` di localStorage

## Verification

- Commands:
  - Buka `http://localhost:4173/teams.html?league=<id>`
  - Buka browser DevTools → Application → LocalStorage → `teams`
- Expected results:
  - Setelah add/import: `{"status":"pool","owner":null,...}`
  - Setelah spin + assign: `{"status":"active","owner":"Nama",...}`
- Evidence: Screenshot/paste localStorage entry sebelum dan sesudah spin

## Idempotence and Recovery

- Safe to re-run: ya — `save()` upsert by id
- Recovery: revert `js/teams.js` dan `js/wheel.js`
- Rollback: tidak ada perubahan storage structure yang permanen

## Exit Criteria

- [ ] `status: 'pool'` tersimpan di localStorage saat create team
- [ ] `status: 'pool'` tersimpan di localStorage saat import
- [ ] Wheel hanya menampilkan pool teams
- [ ] Setelah assign, status berubah ke `'active'`
