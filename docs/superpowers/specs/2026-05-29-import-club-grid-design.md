# Rombak Penambahan Tim ke Pool: Grid Picker

**Tanggal:** 2026-05-29
**Status:** Disetujui (siap perencanaan implementasi)

## Latar Belakang

`ImportModal` di `src/pages/TeamsPage.tsx` adalah mekanisme menambahkan tim
dari API ke **Pool Referensi** sebuah liga. Versi saat ini memakai daftar
checkbox vertikal dengan dropdown kompetisi dan field search.

Tujuan: mengganti daftar checkbox menjadi **grid badge klub** yang visual,
meniru pola `ClubGrid`/`ClubBadge` di `src/components/ClubPickerModal.tsx`,
namun disesuaikan untuk **multi-select**.

## Lingkup

- Hanya `ImportModal` (di `TeamsPage.tsx`) dan satu komponen baru.
- `ClubPickerModal.tsx` **tidak diubah**.
- Tidak ada perubahan pada model data, storage, atau alur assign owner.

## Keputusan Desain

1. **Multi-select via toggle.** Klik kartu klub menandainya terpilih
   (border/checkmark), klik lagi membatalkan. Bisa memilih banyak.
2. **Search dihapus.** Daftar klub per kompetisi ±20 tim, cukup nyaman tanpa
   filter.
3. **Selektor kompetisi: tab, bukan dropdown.** Satu baris tombol tab (satu per
   `COMPETITIONS`), satu grid yang isinya berubah saat tab diganti.
4. **Komponen grid lokal khusus import** (bukan generalisasi `ClubPickerModal`).
   Dua use-case cukup beda (single vs multi-select) sehingga abstraksi bersama
   tidak dipaksakan.

## Komponen Baru: `src/components/ImportClubGrid.tsx`

### `ImportClubGrid`
Props:
- `clubs: ClubFromApi[]`
- `selectedIds: Set<string>`
- `poolIds: Set<string>` — id klub yang sudah ada di pool
- `loading: boolean`
- `error: string`
- `onToggle: (id: string) => void`
- `onRetry: () => void`

Render:
- Jika `error` → pesan error + tombol "Coba lagi" (`onRetry`).
- Jika `loading` → indikator "Memuat klub...".
- Selain itu → grid `.club-grid` berisi `ImportClubBadge` per klub.

### `ImportClubBadge`
Props: `club`, `selected`, `inPool`, `onToggle`.

- Meniru `ClubBadge` (logo + fallback shortName + nama, dengan `onError`
  fallback ke teks).
- `selected` → kelas `club-selected` (reuse style).
- `inPool` → tampil redup + label "In pool", `disabled`, tidak bisa di-toggle.
- `aria-pressed={selected}`, `aria-label` deskriptif.

## Perubahan di `ImportModal` (`TeamsPage.tsx`)

- **Hapus:** `search` state, input search, dan memo `filtered`.
- **`importable`** jadi turunan langsung: `clubs` yang `!poolIds.has(id)`.
- **Tab kompetisi:** baris tombol tab menggantikan `<select>` kompetisi. Tab
  aktif ditandai (kelas aktif); klik tab → `setCompetitionId(id)` +
  `loadCompetition(id)`.
- **Grid:** `<ImportClubGrid>` menggantikan `#clubList`, menerima `clubs`,
  `selectedIds`, `poolIds`, `loading`, `error`, `onToggle`, `onRetry`.
- **Toggle:** `onToggle(id)` membungkus `toggleSelected(id, !selectedIds.has(id))`.
  Logika `selectedIds: Set<string>` yang ada dipertahankan.

## Fitur yang Dipertahankan

- **Select all visible** → karena search dihapus, berarti memilih semua klub
  kompetisi aktif yang belum di pool (`importable`). Tetap satu tombol.
- **State In pool** → `poolIds` tetap dipakai, kini sebagai visual kartu.
- **Footer sticky "Add N selected"** → `handleAddSelected` tidak berubah.

## Di Luar Lingkup

- Perubahan pada Spin wheel, assign owner manual, atau manajemen pool.
- Refactor `ClubPickerModal`.
- Penambahan styling baru di luar reuse kelas `.club-grid` / `.club-badge-button`
  / `.club-selected` yang sudah ada (sesuaikan jika kelas In-pool perlu varian).
