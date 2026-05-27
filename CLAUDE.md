# AGENTS.md

## Project Overview

League Organizer adalah aplikasi web multi-liga berbasis browser tanpa build step. Dibangun dengan vanilla JavaScript (ES Modules), HTML statis, dan satu CSS file. Semua data disimpan di `localStorage` — tidak ada server, database, atau bundler.

**Teknologi utama:**
- Vanilla JS (ES Modules, `type="module"`)
- `localStorage` sebagai persistent storage
- API Football (v3.football.api-sports.io) untuk import data klub
- CSS custom properties (dark theme)
- Tidak ada framework, tidak ada build tool, tidak ada dependencies

## Struktur Proyek

```
leagues.html        # Halaman daftar liga (entry point utama)
league.html         # Detail liga + manajemen musim
teams.html          # Manajemen tim, import klub, spin wheel
season.html         # Jadwal pertandingan + klasemen
settings.html       # API key dan cache manajemen

js/
  storage.js        # CRUD localStorage, cascade delete, helper sort
  ui.js             # renderShell, escapeHtml, badge, teamBadge, requireEntity
  api.js            # fetchClubs() dari API Football, cache 7 hari
  schedule.js       # generateRoundRobin(), createSeasonWithSchedule()
  standings.js      # calculateStandings() — Pts, GD, GF tiebreaker
  leagues.js        # Logic halaman leagues.html
  league.js         # Logic halaman league.html
  teams.js          # Logic halaman teams.html + import modal + wheel
  season.js         # Logic halaman season.html
  settings.js       # Logic halaman settings.html
  wheel.js          # Spin wheel modal untuk assign owner ke tim

styles/
  main.css          # Satu file CSS dengan CSS custom properties
```

## Cara Menjalankan

Proyek ini adalah pure static HTML — cukup buka di browser dengan HTTP server lokal (diperlukan karena ES Modules).

```bash
# Python (paling mudah)
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code: gunakan Live Server extension
```

Buka `http://localhost:8080/leagues.html` sebagai entry point.

**Tidak ada `npm install`, tidak ada build step, tidak ada `.env` file.**

## Data Model (localStorage)

| Key | Tipe | Keterangan |
|-----|------|------------|
| `leagues` | `League[]` | Liga dengan `settings.meetingsPerSeason`, `settings.continuousSeasons` |
| `teams` | `Team[]` | `status: "pool" | "active"`, `leagueId`, `externalId` (dari API) |
| `seasons` | `Season[]` | `status: "setup" | "active" | "finished"`, `leagueId`, `champion` |
| `matches` | `Match[]` | `matchday`, `homeScore`, `awayScore`, `status: "scheduled" | "finished" | "delayed"` |
| `clubs_cache` | `Record<string, CacheEntry>` | Cache API Football, TTL 7 hari |
| `app_settings` | `{ apiKey: string }` | API key Football API |

Semua entitas menggunakan `crypto.randomUUID()` untuk ID.

## Alur Utama Aplikasi

1. **Buat liga** di `leagues.html` → redirect ke `league.html`
2. **Tambah/import tim** di `teams.html` → masuk ke pool (`status: "pool"`)
3. **Spin wheel** di `teams.html` → assign owner → tim jadi `status: "active"`
4. **Buat musim** di `league.html` → generate jadwal round-robin → redirect ke `season.html`
5. **Input skor** di `season.html` → ketika semua match selesai, musim otomatis `"finished"` dan champion dicatat

## Konvensi Kode

- **Tidak ada framework** — semua DOM manipulation manual via `innerHTML` + `addEventListener`
- **Escape selalu**: gunakan `escapeHtml()` dari `ui.js` sebelum memasukkan string ke `innerHTML`
- **Pattern render**: setiap halaman punya fungsi `render()` yang di-call ulang setelah mutasi data
- **Storage layer**: gunakan fungsi dari `storage.js` (`save`, `getAll`, `getById`, `remove`) — jangan langsung akses `localStorage`
- **URL params**: gunakan `qs(name)` dari `ui.js` untuk membaca query string
- **Shell**: setiap halaman memanggil `renderShell(activeNav, title, actionsHtml)` di awal

## Menambah Fitur Baru

Saat menambah halaman baru:
1. Buat file `.html` dengan `<script type="module" src="js/nama.js"></script>`
2. Buat file `js/nama.js` — panggil `renderShell()` di awal
3. Daftarkan link di sidebar `renderShell()` di `ui.js` jika perlu

Saat menambah data baru:
1. Tambahkan key ke `KEYS` di `storage.js`
2. Gunakan `save()` / `getAll()` / `remove()` untuk CRUD
3. Tambahkan `cascadeDelete` jika ada relasi parent-child

## API Football

- Base URL: `https://v3.football.api-sports.io`
- Header: `x-apisports-key: <API_KEY>`
- API key disimpan di `localStorage` via `settings.html`
- Cache per `competitionId:season` — TTL 7 hari
- Jika tidak ada API key, otomatis redirect ke `settings.html`
- Kompetisi yang didukung: Premier League, Serie A, La Liga, Bundesliga, Ligue 1 (season 2024)

## Hal yang Perlu Diperhatikan

- **Tidak ada autentikasi** — semua data lokal per browser
- **Tidak ada validasi server-side** — validasi hanya di form HTML (`required`, `maxlength`)
- **`escapeHtml()` wajib** saat memasukkan user input ke `innerHTML` — jangan lewatkan ini
- **Cascade delete**: hapus liga via `cascadeDeleteLeague()` — ini menghapus semua tim, musim, dan pertandingan yang terkait
- **Spin wheel hanya untuk pool teams** — tim dengan `status: "active"` sudah tidak masuk wheel
- **`matchday: 99`** digunakan sebagai penanda pertandingan yang ditunda (delayed)
- Proyek ini tidak memiliki test suite — verifikasi fitur dengan membuka langsung di browser
