# Generate Gambar Standings — Design Doc

**Tanggal:** 2026-05-30
**Status:** Disetujui untuk implementasi
**Branch:** `fanodev/generate-image-standing`

## Ringkasan

Fitur untuk meng-export klasemen (standings) sebuah musim menjadi **gambar PNG** bergaya grafis broadcast/poster, siap dibagikan ke sosial media. Satu template desain tetap (rasio **1:1**, gradasi gelap→ungu dengan baris mengambang dan juara disorot). Tombol pemicu **khusus admin**. Hasil bisa **diunduh** dan **dibagikan** (Web Share API).

Tidak ada perubahan skema Supabase, tidak ada logika klasemen baru — fitur ini murni lapisan presentasi di atas `calculateStandingsFromData()` yang sudah ada.

## Keputusan Desain (hasil brainstorming)

| Aspek | Keputusan |
|-------|-----------|
| Jenis template | **Satu** template default yang rapi (bukan multi-tema, bukan upload background) |
| Orientasi/rasio | **Persegi 1:1** (1080×1080) — untuk feed IG/WA |
| Kolom per baris | **Ringkas:** peringkat · logo · nama · M (main) · SG (selisih gol) · Pts |
| Gaya visual | **Desain E "Glow Poster"** — gradasi hitam→ungu, glow sudut, baris mengambang tanpa garis pemisah, juara (peringkat 1) disorot lembut, tipografi besar uppercase, border-radius 8px |
| Logo tim | **Logo asli via proxy + fallback inisial** (opsi 3) |
| Akses | **Admin-only** (`isAdmin` dari `useAuthStore`) |
| Output | **Unduh PNG + Bagikan** (Web Share API) |

## Arsitektur

### Alur

1. Admin membuka tab **Standings** pada halaman musim → melihat tombol **"Bagikan Gambar"**.
2. Klik tombol → buka **modal**.
3. Modal me-render template (`StandingsImageCard`) ke node DOM **off-screen** berukuran tetap 1080×1080.
4. Tunggu seluruh **logo + font** selesai dimuat.
5. "Potret" node DOM menjadi PNG via **`html-to-image`**.
6. Tampilkan **preview** PNG di modal, dengan tombol **Unduh** dan **Bagikan**.

### Komponen & File

| File | Tipe | Tugas |
|------|------|-------|
| `src/components/StandingsImageCard.tsx` | Baru | Template visual E. Menerima props `rows`, `league`, `season`, `matchday`, `dateLabel`. Render off-screen 1080×1080 dengan **inline style** (tidak bergantung `main.css`, agar capture akurat & konsisten). |
| `src/components/StandingsImageModal.tsx` | Baru | Modal: render card off-screen, orkestrasi capture (tunggu logo+font), tampilkan preview, tombol Unduh & Bagikan, state loading/error. |
| `src/lib/standingsImage.ts` | Baru | Helper murni: `captureToPng(node)`, `getInitials(team)`, `getTeamColor(team)` (warna deterministik dari nama), `proxiedLogoUrl(url)`. |
| `api/crest.ts` | Baru | Vercel serverless proxy logo. |
| `src/pages/SeasonPage.tsx` | Ubah | Tambah tombol "Bagikan Gambar" di `StandingsTab` (gated `isAdmin`), kelola state buka/tutup modal. |
| `package.json` | Ubah | Tambah dependency `html-to-image`. |

### Proxy logo — `api/crest.ts`

- Endpoint: `GET /api/crest?url=<logo-url>`.
- Validasi `url` (hanya izinkan host yang diharapkan, mis. `crests.football-data.org`, untuk mencegah SSRF jadi open proxy).
- Fetch logo **server-side** (tanpa batasan CORS browser), lalu kirim ulang body dengan header:
  - `Access-Control-Allow-Origin: *`
  - `Content-Type` sesuai sumber
  - `Cache-Control` panjang (logo jarang berubah)
- **Normalisasi SVG → PNG:** bila URL berakhiran `.svg` pada `crests.football-data.org`, proxy meminta varian `.png` (sibling dengan id sama — sudah diverifikasi selalu tersedia). Menghindari kerewelan rasterisasi SVG tanpa perlu dependency `sharp`.
- **Timeout** ~5 detik. Bila gagal → kembalikan status error; klien menangani dengan fallback inisial.

### Logo & fallback (klien)

Untuk tiap baris:
1. Bila `team.badge`/`team.logo` adalah URL → gunakan `<img src={proxiedLogoUrl(url)} crossOrigin="anonymous">`.
2. Bila bukan URL (tim manual dengan badge teks), atau gambar gagal/timeout (`onError`) → render **lingkaran inisial berwarna**:
   - Warna: deterministik dari hash nama tim (`getTeamColor`).
   - Inisial: dari `shortName`, fallback potongan `name` (`getInitials`).

Hasil: gambar **selalu** berhasil dibuat, rapi dalam kondisi apa pun.

### Data ditampilkan

- **Header:** baris kicker `KLASEMEN · MUSIM {season.number}`, judul `{league.name}` (uppercase), subjudul `Pekan {matchday} — {tanggal}`.
  - `matchday` = nilai `matchday` tertinggi di antara match `status === 'finished'` & `matchType !== 'playoff'` pada musim itu. Bila belum ada match selesai → tampilkan tanggal saja (tanpa "Pekan").
  - `tanggal` = tanggal generate, format `id-ID`.
- **Baris:** peringkat, logo/inisial, nama tim (uppercase), `played` (M), `gd` bertanda (SG, mis. `+22`/`-9`), `pts` (Pts).
- **Sumber data:** `calculateStandingsFromData(season, teams, matches)` yang sudah ada. Tidak ada perhitungan baru.

## Penanganan Error

| Kondisi | Penanganan |
|---------|-----------|
| Proxy logo gagal/timeout | Baris jatuh ke lingkaran inisial (otomatis via `onError`) |
| `html-to-image` gagal capture | Modal tampilkan pesan error + tombol "Coba lagi" |
| Web Share API tidak didukung | Sembunyikan tombol Bagikan, sisakan Unduh |
| Belum ada match selesai | Header tanpa "Pekan", standings tetap dirender (semua 0) |

## Testing

- Mengikuti konvensi proyek: verifikasi utama via **browser**.
- Unit test ringan untuk helper murni di `standingsImage.ts`: `getInitials`, `getTeamColor` (deterministik), `proxiedLogoUrl`.
- Tidak ada test untuk capture/DOM (di luar lingkup jsdom).

## Batasan & Catatan (YAGNI)

- **Satu** template saja — tanpa pemilihan tema/warna/background. Multi-tema & upload background sengaja dibuang dari scope.
- Optimal untuk liga **≤ ~12 tim** (baris auto-fit; lebih banyak → makin rapat). Liga di app ini umumnya kecil.
- Tanpa perubahan skema Supabase.
- Web Share API berbagi **file gambar** (`navigator.canShare({ files })`); pada desktop yang tak mendukung, hanya tombol Unduh yang tampil.

## Detail Visual (Template E)

- Kanvas 1080×1080, `border-radius: 8px`, `overflow: hidden`.
- Latar: `radial-gradient` glow ungu di sudut bawah-kanan + `linear-gradient` gelap (hitam→ungu).
- Header: kicker ungu muda (letter-spacing lebar), judul liga besar tebal uppercase, subjudul abu transparan.
- Baris: mengambang langsung di atas latar, **tanpa garis pemisah**, tinggi merata (flex). Peringkat tebal, logo/inisial bulat, nama uppercase, statistik rata tengah, poin tebal rata kanan.
- Peringkat 1 disorot: gradient ungu lembut di belakang baris + warna poin lebih terang.
- Footer: kredit kecil "Fanorama League" rata kanan.

(Ukuran font/spacing pada mockup 440px diskalakan proporsional ke 1080px.)
