# Brainstorm: Import Clubs UX Redesign

> Created: 2026-05-26 16:30:00

## Context

Modal "Import clubs" di `teams.html` memiliki 4 friction point utama yang membuat pengalaman import klub dari API menjadi tidak intuitif:

1. **Tombol "Load clubs" ekstra** — user harus klik tombol sebelum data muncul, padahal kompetisi sudah dipilih
2. **Search tidak bisa sebelum load** — search field tampil tapi tidak berguna sampai tombol diklik
3. **Tidak tahu klub yang sudah ada di pool** — tidak ada indikasi visual klub yang sudah diimport
4. **Layout checkbox awkward** — checkbox di kanan, info di kiri, row bukan click target

Skenario penggunaan tipikal: user mengambil beberapa klub top dari satu kompetisi (bukan semua 20, bukan multi-competition).

## Goals

- Auto-load clubs saat competition dipilih (tanpa tombol ekstra)
- Search aktif sejak awal, filter real-time client-side
- Klub yang sudah di pool di-dim dan disabled (tidak bisa re-import)
- Klik seluruh row = toggle selection (checkbox di kiri)
- Footer sticky menampilkan "Add N selected" yang update real-time
- Shortcut "Select all visible" untuk pilih semua hasil filter sekaligus

## Non-Goals

- Multi-competition selection dalam satu sesi import
- Remove klub dari pool lewat modal ini
- Sort / reorder hasil API
- Pagination (API mengembalikan max ~20 klub per kompetisi)

## Chosen Approach

**Smart modal redesign** — fix keempat friction di fungsi `openImportModal()` yang ada di `js/teams.js`, tanpa mengubah pola modal atau struktur halaman.

Alasan dipilih: scope terkecil, fixes semua pain point yang dilaporkan, tidak butuh restructure HTML/CSS major, cache API 7-hari tetap menjaga limit 100 req/day.

## Alternatives Considered

- **Multi-competition tab modal** — tab per kompetisi (PL | Serie A | ...), lazy-load per tab. Lebih powerful tapi overkill untuk use case "ambil yang top saja", scope lebih besar.
- **Inline browse panel** — hapus modal, replace dengan panel inline di samping Teams list. Paling natural tapi butuh restructure layout two-col yang sudah ada.

## Interaction Detail

### Flow baru
```
Buka modal
  → Competition = "Premier League" (default)
  → Auto-fetch langsung, spinner di area list
  → Muncul list klub, search field aktif
  → Klub yang externalId sudah di pool → dim + badge "In pool" + checkbox disabled
  → Klik row / checkbox → toggle selection
  → Footer sticky: "Add 3 selected" (muncul saat ≥1 dipilih)
  → Ganti competition → clear selection + fetch baru (instant jika cache ada)
```

### States

| State | Tampilan |
|---|---|
| Loading | Spinner + "Loading clubs..." |
| Loaded | List row checkbox-kiri + badge In Pool |
| Filter kosong | "No clubs match your search" |
| Semua sudah di pool | "All clubs already in your pool" |
| API error | Pesan error + tombol Retry |
| Selection aktif | Footer sticky "Add N selected" |

### Perubahan kode
File tunggal: `js/teams.js`, fungsi `openImportModal()` (~60–80 baris)

1. Hapus `<button id="loadClubs">`, tambah `change` listener pada `#competition` → auto-trigger fetch
2. Search field naik ke atas, filter real-time debounce 150ms
3. Row markup: checkbox di kiri, seluruh `<label>` adalah click target
4. `renderClubs()` cek `externalId` terhadap existing pool teams → disabled row
5. "Select all visible" shortcut di header list
6. Sticky footer counter via class toggle

## Risks & Mitigations

- **API limit tersisa:** Auto-load bisa memicu fetch tiap kali modal dibuka untuk competition baru → mitigasi: cache 7-hari sudah ada, hanya fetch jika cache tidak ada / expired
- **UX sticky footer overlap:** Footer sticky bisa menutupi item terakhir di list → mitigasi: tambah padding-bottom pada list saat footer aktif

## Open Questions

- Apakah perlu konfirmasi "Apakah kamu yakin ingin menambah N klub?" sebelum submit, atau langsung add & tutup modal?
- Apakah "Select all" perlu exclude yang sudah di pool, atau select ALL termasuk yang disabled?

## Next Step Recommendation

Proceed ke implementasi langsung di `js/teams.js` fungsi `openImportModal()`. Scope cukup kecil untuk skip formal write-plan. Verifikasi manual golden path setelah selesai.
