# Section 02 — UI Flow & Edge Cases

## Layout `teams.html` (Baru)

Halaman teams dibagi dua section:

```
┌─────────────────────────────────────────┐
│  Teams                  [Spin Wheel] [Import] │
├─────────────────────────────────────────┤
│  PESERTA LIGA (N orang)                 │
│  ┌──────────────────────────────────┐   │
│  │ 🏆 AC Milan   · owner: Budi      │   │
│  │ 🏆 Juventus   · owner: Doni      │   │
│  └──────────────────────────────────┘   │
├─────────────────────────────────────────┤
│  POOL REFERENSI (M klub)                │
│  ┌──────────────────────────────────┐   │
│  │ AS Roma       · pool             │   │
│  │ Inter         · pool             │   │
│  │ Man United    · pool             │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## UI States

| State | Tampilan |
|---|---|
| Pool kosong, tidak ada peserta | Empty state: "Tambah atau import klub ke pool dulu" |
| Ada pool, belum ada peserta | Pool list + tombol Spin aktif |
| Sedang spin (ada peserta + ada pool) | Dua section + tombol Spin aktif |
| Pool habis (semua jadi peserta) | Hanya Peserta list. Tombol Spin hidden/disabled |

---

## Wheel Modal Flow

```
1. User klik [Spin Wheel]
   → Modal terbuka, wheel berisi klub status: 'pool'

2. User klik [Putar]
   → Animasi berputar... berhenti di "AS Roma"

3. Muncul prompt di atas/bawah wheel:
   "Siapa pemilik AS Roma?"
   [ Input nama pemilik... ]  [Konfirmasi]

4. User input "Eko" → klik Konfirmasi
   → team.status = 'active', team.owner = 'Eko'
   → "AS Roma" hilang dari wheel candidates
   → Wheel re-render dengan 8 klub tersisa

5. User klik [Putar] lagi untuk orang berikutnya
   → (ulangi sampai cukup)

6. User tutup modal → kembali ke teams.html
```

---

## Edge Cases

| Kasus | Penanganan |
|---|---|
| Pool habis di tengah spin session | Tombol Putar disabled. Tampil: "Pool kosong, import lebih banyak klub" |
| Close modal setelah spin tapi sebelum input nama | Tidak ada perubahan. Klub tetap di pool |
| Hapus peserta aktif | `status → 'pool'`, `owner → null`. Muncul kembali di pool section |
| Hapus klub dari pool | Hapus permanen dari storage |
| Season sudah aktif, user spin lagi | Spin tetap bisa dilakukan. Peserta baru tidak otomatis masuk jadwal yang terkunci (perilaku normal) |
| N < 2 peserta aktif saat create season | Validasi di Season setup: tombol "Start Season" disabled |

---

## Update Golden Path (Verifikasi Manual)

Ganti step 3–4 dari Golden Path (section-03 brainstorm 260526-1200):

```
3. Buka Teams → import 10 klub dari API → semua muncul di "Pool Referensi"
4. Klik Spin Wheel:
   - Putaran 1 → berhenti di AC Milan → input "Budi" → AC Milan pindah ke Peserta
   - Putaran 2 → berhenti di Juventus → input "Doni" → Juventus pindah ke Peserta
   - (ulangi 4x lagi untuk total 6 peserta)
   - Pool tersisa 4 klub (tidak ikut main)
5. Tutup modal → Peserta section menampilkan 6 klub
6. Lanjut ke Liga → Create Season → hanya 6 peserta aktif yang masuk jadwal
```
