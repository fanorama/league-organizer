# Section 02 — Season Logic & Algorithms

## Season Lifecycle

```
[setup]
  ↓  Tim ditambahkan ke liga
  ↓  Season dibuat, jadwal di-generate otomatis (round-robin)
  ↓  Bisa randomize ulang jadwal (re-generate + shuffle)
  ↓  Tidak ada match yang bisa dimainkan
  
  ── [Start Season] ← satu kali, irreversible ──
  
[active]
  ↓  Jadwal TERKUNCI (tidak bisa tambah/hapus/edit match)
  ↓  Input skor match → status berubah ke 'finished'
  ↓  Standings dihitung real-time
  ↓  Delay match → status 'delayed', matchday → 99 (Postponed)
  
  ── [Semua match status = 'finished'] ──
  
[finished]
  ↓  Tim di posisi 1 standings → champion
  ↓  Season diarsipkan
  ↓  Jika continuousSeasons = true → season baru otomatis dibuat
```

---

## Schedule Generation (Round-Robin)

### Algoritma Dasar

Untuk `N` tim, gunakan rotasi fixed:
- Tetapkan satu tim di posisi fixed (index 0)
- Rotasi tim lain di posisi 1..N-1 setiap putaran
- Hasilkan N-1 matchday (jika N genap) atau N matchday (jika N ganjil, dengan bye)

```
Contoh: 4 tim [A, B, C, D]
  Matchday 1: A vs D, B vs C
  Matchday 2: A vs C, D vs B
  Matchday 3: A vs B, C vs D
```

### Meetings per Season

**meetings = 1 (single round):**
- N*(N-1)/2 total matches
- N-1 matchdays
- Home/away di-assign secara random saat generate

**meetings = 2 (home + away):**
- Generate single round terlebih dahulu
- Duplicate dengan home/away dibalik
- Total = N*(N-1) matches, N-1 × 2 matchdays

### Randomize Jadwal

Setelah generate semua matchup:
1. Shuffle urutan matchday (pasangan tim yang sama, tapi hari berbeda)
2. Jika meetings=1: shuffle home/away secara random
3. Jadwal baru disimpan, lama dibuang

Randomize hanya bisa dilakukan saat `season.status === 'setup'`.

### Tim Ganjil (Bye)

Jika N ganjil, tambahkan satu "BYE" virtual:
- Match melawan BYE diabaikan (tidak ditampilkan di jadwal)
- Tim yang dapat bye di matchday tersebut tidak bermain

---

## Match Delay

```
User klik [Delay Match] pada match yang status = 'scheduled':
  1. match.status → 'delayed'
  2. match.originalMatchday → matchday saat ini (disimpan sebagai histori)
  3. match.matchday → 99
  
Di tampilan jadwal:
  - Section "Matchday 1..N" tampil normal
  - Section terpisah "Postponed" muncul jika ada match dengan matchday = 99
  - Match di Postponed bisa di-input skor kapan saja sebelum season finish
  
Season baru bisa finish hanya jika SEMUA match status = 'finished'
(tidak ada yang scheduled atau delayed tersisa)
```

---

## Standings Calculation

Dihitung setiap kali standings ditampilkan, bukan disimpan.

```js
function calculateStandings(seasonId) {
  const matches = getAll('matches')
    .filter(m => m.seasonId === seasonId && m.status === 'finished');
  
  const teams = getAll('teams').filter(t => t.leagueId === season.leagueId);
  
  return teams.map(team => {
    const home = matches.filter(m => m.homeTeamId === team.id);
    const away = matches.filter(m => m.awayTeamId === team.id);
    
    // hitung W, D, L, GF, GA untuk home + away
    // pts = W*3 + D*1
    // GD = GF - GA
    
    return { team, played, won, drawn, lost, gf, ga, gd, pts };
  }).sort((a, b) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name)
  );
}
```

---

## Spinning Wheel — Club Assignment

```
Flow:
  1. User buka teams.html, klik [Spin Wheel]
  2. Modal muncul dengan wheel berisi semua tim yang belum punya owner
  3. User klik [Putar] → animasi wheel berputar
  4. Wheel berhenti di satu tim secara random
  5. Form muncul: "Nama pemilik untuk [Nama Tim]?"
  6. User input nama → submit → team.owner tersimpan
  7. Putar lagi untuk tim berikutnya (tim yang sudah punya owner tidak masuk wheel)
  8. Selesai ketika semua tim sudah punya owner (atau user tutup modal)
```

---

## API Club Import

```
Flow:
  1. User klik [Import dari Database Klub] di teams.html
  2. App cek clubs_cache[competitionId]:
     a. Jika cache ada dan fetchedAt < 7 hari → gunakan cache
     b. Jika tidak ada atau stale → fetch API → simpan ke cache
  3. Modal tampil: search field + list klub dari cache
  4. User pilih klub yang ingin ditambahkan ke liga
  5. Klik [Add Selected] → klub ter-save sebagai Team di liga ini
  
Jika apiKey belum di-set → redirect ke settings.html dulu
```
