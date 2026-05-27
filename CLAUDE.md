# AGENTS.md

Lihat `AGENTS.md` di root project untuk dokumentasi lengkap arsitektur, konvensi kode, dan panduan pengembangan.

## Ringkasan Singkat

League Organizer adalah aplikasi web multi-liga. Stack: **React 18 + TypeScript + Vite + Zustand + React Router v6**. Storage: `localStorage` saja, tidak ada server.

```bash
npm install && npm run dev   # dev server di localhost:5173
npm run build                # build produksi
```

## Hal Kritis

- Gunakan fungsi dari `src/lib/storage.ts` — jangan akses `localStorage` langsung
- Hapus liga selalu via `cascadeDeleteLeague()` di `storage.ts`
- Tidak ada test suite — verifikasi dengan browser
