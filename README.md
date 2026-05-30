# League Organizer

Aplikasi web **multi-liga** untuk mengelola turnamen sepak bola yang dimainkan via video game (skor input manual): klasemen, statistik player, spin wheel pengundian klub, playoff double-elimination, dan quick match antar player.

**Stack:** React 18 + TypeScript + Vite + Zustand + React Router v6 (HashRouter). Backend & auth: **Supabase**. Import klub: **football-data.org** via proxy serverless. Deploy: **Vercel**.

## Quick Start

```bash
npm install
# buat .env dari .env.example (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, FOOTBALL_API_KEY)
npm run dev        # http://localhost:5173
```

```bash
npm run build      # build produksi ke dist/
npm run test:run   # jalankan unit test sekali
```

> Tanpa `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` yang valid, app akan crash saat inisialisasi Supabase client.

## Dokumentasi

Lihat **[docs/SUMMARY.md](docs/SUMMARY.md)** sebagai pintu masuk dokumentasi (arsitektur, struktur kode, konvensi, dan product/PDR). Untuk panduan kontributor/agent yang lebih ringkas, lihat juga [AGENTS.md](AGENTS.md).
