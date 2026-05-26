# Section 03 — Implementation Plan

## File Structure (Target)

```
/
├── leagues.html
├── league.html
├── teams.html
├── season.html
├── settings.html
├── styles/
│   └── main.css
└── js/
    ├── storage.js      ← localStorage CRUD wrapper
    ├── leagues.js      ← leagues page logic
    ├── league.js       ← league detail page logic
    ├── teams.js        ← teams page + wheel modal + API import
    ├── season.js       ← season page + schedule generator
    ├── standings.js    ← standings calculator (pure function)
    └── api.js          ← API fetch + cache management
```

File lama yang dihapus: `index.html`, `schedule.html`, `standings.html`

---

## Sprint Breakdown

### Sprint 1 — Foundation
- [ ] Hapus file HTML lama
- [ ] Buat `styles/main.css` baru (clean slate, extend design lama yang bagus)
- [ ] Buat `js/storage.js` (getAll, getById, save, remove, getSettings, saveSettings)
- [ ] Buat `leagues.html` — list liga, create liga (modal/form inline), delete liga

### Sprint 2 — Settings & Teams
- [ ] Buat `settings.html` — input API key, simpan ke localStorage, tampilkan status cache
- [ ] Buat `teams.html` — list tim, add tim manual (nama, badge emoji, shortName)
- [ ] Buat `js/wheel.js` — spinning wheel modal, assign owner ke tim
- [ ] Buat `js/api.js` — fetch clubs, caching 7 hari, import ke league

### Sprint 3 — League & Season Setup
- [ ] Buat `league.html` — detail liga, list seasons, tombol create season, league settings
- [ ] Buat `js/schedule.js` — round-robin generator, randomize, bye handling
- [ ] Buat `season.html` (mode setup) — tampil jadwal yang di-generate, tombol randomize & start

### Sprint 4 — Match Management
- [ ] `season.html` (mode active) — input skor per match
- [ ] Standings tab di `season.html` — computed real-time
- [ ] Delay match — tombol delay, match masuk ke Postponed section
- [ ] Season finish — semua match selesai → deklarasi juara

### Sprint 5 — Polish
- [ ] Continuous season — auto-create season baru setelah finish
- [ ] Empty states (liga kosong, belum ada season, dll)
- [ ] Konfirmasi dialog untuk aksi irreversible (Start Season, Delete Liga)
- [ ] Responsive layout minor fixes

---

## UI Components Utama

| Komponen | File | Catatan |
|---|---|---|
| League card | leagues.html | Nama, jumlah tim, status season aktif |
| Create league modal | leagues.html | Form: nama, deskripsi, meetings, continuous |
| Team card | teams.html | Badge, nama, owner badge, tombol edit |
| Spinning wheel modal | teams.html via wheel.js | Canvas atau CSS conic-gradient animation |
| Import clubs modal | teams.html via api.js | Search bar, list hasil, checkbox select |
| Matchday group | season.html | Header matchday, list match cards |
| Match card (active) | season.html | Score input field muncul untuk match scheduled |
| Standings table | season.html | P W D L GF GA GD Pts + form pills |
| Season header | season.html | Status badge, tombol Start/Finish season |

---

## Edge Cases

| Kasus | Penanganan |
|---|---|
| Tim ganjil | Tambah "BYE" virtual, match vs BYE tidak ditampilkan |
| N < 2 tim | Tombol "Start Season" disabled, tampil warning |
| API key kosong | Redirect ke settings.html saat klik import |
| Cache > 7 hari | Fetch ulang, update cache |
| Delay di matchday terakhir | Match masuk Postponed (matchday=99) |
| Start Season = irreversible | Konfirmasi dialog sebelum execute |
| Season finish dengan postponed | Season baru bisa finish hanya jika semua match selesai |
| Delete liga dengan seasons aktif | Warning + konfirmasi, hapus semua data terkait |

---

## Verifikasi Manual (Golden Path)

1. Buka app → buat liga baru
2. Buka Settings → input API key → save
3. Buka Teams → import klub dari API → pilih 6 klub
4. Spin wheel → assign nama ke semua klub
5. Kembali ke liga → create season (meetings=2)
6. Lihat jadwal ter-generate → klik Randomize → jadwal berubah
7. Klik Start Season → konfirmasi → jadwal terkunci
8. Input skor beberapa match → lihat standings update
9. Delay satu match → match masuk Postponed
10. Input skor semua match termasuk Postponed → season finish otomatis
11. Lihat juara tersimpan di detail liga
12. Buka Settings → lihat cache status → klik Refresh Cache
