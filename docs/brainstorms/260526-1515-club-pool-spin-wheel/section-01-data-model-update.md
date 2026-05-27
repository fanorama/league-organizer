# Section 01 — Data Model Update: Team Status

## Perubahan dari Design Awal

`Team` entity di `section-01-data-model.md` (brainstorm 260526-1200) perlu satu tambahan field:

```js
{
  id: string,
  leagueId: string,
  name: string,
  shortName: string,
  badge: string,
  owner: string | null,
  externalId: string | null,
  status: 'pool' | 'active'   // ← NEW. Default: 'pool'
}
```

### Semantik Field `status`

| Nilai | Artinya | `owner` |
|---|---|---|
| `'pool'` | Tersedia di pool, belum di-spin, tidak ikut season | `null` |
| `'active'` | Peserta aktif liga, sudah punya pemilik via spin | `string` (nama) |

### Default Values

- Saat import via API → `status: 'pool'`
- Saat tambah manual → `status: 'pool'`
- Setelah spin + input nama → `status: 'active'`, `owner: 'NamaPemilik'`

---

## Query Patterns yang Berubah

Semua kode yang mengambil "tim peserta" suatu liga harus difilter dengan status:

```js
// Sebelum (design lama)
const leagueTeams = teams.filter(t => t.leagueId === leagueId)

// Sesudah (design baru)
const activeTeams = teams.filter(t => t.leagueId === leagueId && t.status === 'active')
const poolTeams   = teams.filter(t => t.leagueId === leagueId && t.status === 'pool')
```

File yang terdampak:
- `js/teams.js` — tampilkan dua section: pool + active
- `js/wheel.js` — kandidat wheel = `poolTeams` saja
- `js/schedule.js` — generate jadwal dari `activeTeams` saja
- `js/standings.js` — hitung standings dari `activeTeams` saja

---

## Reverse Action: Hapus Peserta Aktif

Jika user menghapus peserta dari daftar aktif:

```js
update(team, { status: 'pool', owner: null })
// Klub kembali ke pool, tersedia untuk di-spin ulang
```
