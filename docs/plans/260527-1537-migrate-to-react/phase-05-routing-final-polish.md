# Phase 05: Routing & Final Polish

## Objective

Wiring semua pages ke React Router, verifikasi semua alur utama di browser, dan pastikan data lama di localStorage tidak terpengaruh.

## Scope

- **Files yang dibuat/dimodifikasi:**
  - `src/App.tsx` — React Router setup
  - `index.html` — pastikan meta dan CSS link benar
- **Verifikasi:** semua 5 alur utama di browser

## Preconditions

- Phase 1-4 selesai: semua lib, store, components, dan pages ada dan compile.

## Tasks

### 1. Buat `src/App.tsx` final

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LeaguesPage } from './pages/LeaguesPage';
import { LeaguePage } from './pages/LeaguePage';
import { TeamsPage } from './pages/TeamsPage';
import { SeasonPage } from './pages/SeasonPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LeaguesPage />} />
        <Route path="/league/:id" element={<LeaguePage />} />
        <Route path="/league/:id/teams" element={<TeamsPage />} />
        <Route path="/league/:id/season/:seasonId" element={<SeasonPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 2. Pastikan redirect ke `/settings` jika tidak ada API key

Di `TeamsPage.tsx`, port logika redirect dari `teams.js`:

```tsx
import { useNavigate } from 'react-router-dom';
import { getSettings } from '../lib/storage';

// Di dalam component, sebelum render:
const navigate = useNavigate();
useEffect(() => {
  const { apiKey } = getSettings();
  if (!apiKey && userWantsToImport) {
    navigate('/settings');
  }
}, []);
```

Catatan: redirect ini hanya terjadi saat user klik "Import from API" — bukan saat page load.

### 3. Verifikasi routing di browser

Buka `npm run dev` dan test semua routes:

```
http://localhost:5173/              → LeaguesPage
http://localhost:5173/settings      → SettingsPage
http://localhost:5173/league/<id>   → LeaguePage (dengan league ID valid)
http://localhost:5173/league/<id>/teams → TeamsPage
http://localhost:5173/league/<id>/season/<sid> → SeasonPage
http://localhost:5173/unknown       → redirect ke /
```

### 4. Verifikasi semua alur utama (golden path)

Lakukan verifikasi manual di browser dengan localStorage dari app lama (atau mulai fresh):

**Alur 1: Buat liga baru**
1. Buka `/`
2. Isi form Create League → klik Create
3. Harus redirect ke `/league/<id>`
4. Liga muncul di list di halaman `/`

**Alur 2: Tambah tim ke pool**
1. Dari `/league/:id`, klik "Manage Teams"
2. Masuk ke `/league/:id/teams`
3. Form "Add team manually" → isi nama → submit
4. Tim muncul di Pool section

**Alur 3: Spin wheel → assign owner**
1. Di TeamsPage, klik "Spin Wheel"
2. Modal terbuka, klik Spin
3. Wheel berputar, tim terpilih muncul
4. Isi nama owner → klik Assign
5. Tim pindah ke Active section

**Alur 4: Buat musim → generate jadwal**
1. Dari `/league/:id`, klik "New Season"
2. Redirect ke `/league/:id/season/<sid>`
3. Schedule tab menampilkan matchdays

**Alur 5: Input skor → musim selesai**
1. Di season page, tab Schedule
2. Input skor untuk semua pertandingan → Save
3. Musim otomatis berubah status ke "finished"
4. Champion tercatat di league page

**Alur 6: Data lama tidak hilang**
1. Buka versi lama: `http://localhost:5173/leagues.html` (jika masih ada)
2. Atau cek localStorage di DevTools: data masih ada dengan schema yang sama

### 5. Verifikasi CSS visual

Bandingkan tampilan visual antara versi React baru dan versi HTML lama:
- Header dan navigasi identik
- Card layout identik
- Badge colors identik
- Match card layout identik
- Standings table identik
- Playoff bracket identik

### 6. Pastikan `vite.config.ts` benar

Jika menggunakan `BrowserRouter`, Vite dev server perlu dikonfigurasi untuk handle SPA routing:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Untuk SPA: semua route redirect ke index.html
  // Di Vite dev server ini otomatis, tapi untuk production perlu server config
});
```

Untuk production build (jika deploy ke static host), tambahkan `_redirects` atau konfigurasi server untuk SPA.

### 7. Final build verification

```bash
npm run build
# Pastikan tidak ada warning atau error
```

## Acceptance Criteria

- `http://localhost:5173/` menampilkan LeaguesPage
- Navigasi antar halaman via React Router berfungsi
- Browser back/forward button berfungsi
- Data di localStorage tidak corrupt setelah operasi CRUD
- Tampilan visual identik dengan versi lama
- SpinWheel animasi berfungsi

## Verification

```bash
# TypeScript final check
npx tsc --noEmit

# Production build
npm run build

# Preview production build
npm run preview
```

**Manual checks:**
- Semua 6 alur utama di atas berjalan tanpa error console
- localStorage data masih intact setelah beberapa operasi

## Idempotence and Recovery

- Safe re-run: Ya.
- Jika routing tidak bekerja (404 pada refresh): tambahkan `historyApiFallback` di Vite config atau gunakan `HashRouter` sebagai fallback.
- Jika ada data corruption: file `js/*.js` lama masih ada — buka HTML lama untuk debug.

## Exit Criteria

- [ ] `src/App.tsx` dengan React Router setup selesai
- [ ] Semua 6 alur utama berhasil di browser
- [ ] Tidak ada error di browser console
- [ ] `npm run build` sukses
- [ ] localStorage data kompatibel (tidak ada schema breaking)
- [ ] Visual identik dengan versi lama
