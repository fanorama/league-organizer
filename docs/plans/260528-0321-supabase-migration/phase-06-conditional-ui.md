# Phase 06: Conditional Write UI

## Objective

Sembunyikan semua tombol dan form yang melakukan write operation (create, update, delete, input skor) untuk user yang tidak login. Data tetap tampil untuk semua user.

## Scope

- Files/modules this phase may touch:
  - `src/pages/LeaguesPage.tsx`
  - `src/pages/LeaguePage.tsx`
  - `src/pages/TeamsPage.tsx`
  - `src/pages/SeasonPage.tsx`
  - `src/pages/PlayersPage.tsx`
- Files/modules this phase must not touch:
  - `src/lib/storage.ts`
  - `src/store/**`
  - `src/lib/schedule.ts`

## Preconditions

- Phase 05 selesai: `useAuthStore` tersedia dengan `isAdmin`
- Phase 04 selesai: stores sudah async, pages perlu di-update untuk `await` store actions

## Tasks

### 1. Pola umum di setiap page

Di setiap page, tambah:

```tsx
import { useAuthStore } from '../store/useAuthStore';

// Di dalam komponen:
const isAdmin = useAuthStore((s) => s.isAdmin);
```

Semua write UI dibungkus `{isAdmin && (...)}`.

### 2. Panggil `fetchX()` di useEffect setiap page

Karena stores tidak lagi auto-load dari localStorage saat init, setiap page perlu memanggil fetch saat mount:

```tsx
// Contoh di LeaguesPage
const { leagues, fetchLeagues } = useLeagueStore();

useEffect(() => {
  fetchLeagues();
}, [fetchLeagues]);
```

### 3. `LeaguesPage.tsx`

Sembunyikan:
- Tombol "New League" / form buat liga baru

Tampilkan selalu:
- Daftar liga

### 4. `LeaguePage.tsx`

Sembunyikan:
- Tombol "Edit league settings"
- Tombol "New Season" / buat musim baru
- Tombol delete liga

Tampilkan selalu:
- Info liga, daftar musim

### 5. `TeamsPage.tsx`

Sembunyikan:
- Form tambah tim manual
- Tombol import tim dari API Football
- Tombol spin wheel (assign owner)
- Tombol hapus tim

Tampilkan selalu:
- Daftar tim dan owner mereka

### 6. `SeasonPage.tsx`

Sembunyikan:
- Input skor pertandingan
- Tombol finalize/advance season
- Tombol playoff actions

Tampilkan selalu:
- Jadwal, klasemen, bracket playoff (read-only)

### 7. `PlayersPage.tsx`

Sembunyikan:
- Form buat player baru
- Tombol hapus player

Tampilkan selalu:
- Daftar player dan stats

### 8. Tambah loading state (opsional)

Jika page membutuhkan state `loading` untuk saat fetch async berlangsung, tambahkan per page:

```tsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchLeagues().finally(() => setLoading(false));
}, [fetchLeagues]);

if (loading) return <div>Loading...</div>;
```

## Acceptance Criteria

- Semua pages berhasil load data dari Supabase
- Tanpa login: tidak ada tombol create/edit/delete yang terlihat
- Dengan login admin: semua write UI muncul
- TypeScript compile tanpa error

## Verification

```bash
npm run build
npm run dev
```

Manual test:
1. Buka app tanpa login → cek semua pages: tidak ada tombol write
2. Login sebagai admin → cek semua pages: tombol write muncul
3. Input skor di SeasonPage → data tersimpan dan tampil setelah refresh
4. Buat liga baru → muncul di daftar
5. Buka tab incognito (publik) → data terlihat, tidak ada write UI

## Idempotence and Recovery

- Perubahan UI idempoten
- Rollback: `git restore src/pages/`

## Exit Criteria

- [ ] `LeaguesPage.tsx` diupdate (fetch + conditional UI)
- [ ] `LeaguePage.tsx` diupdate
- [ ] `TeamsPage.tsx` diupdate
- [ ] `SeasonPage.tsx` diupdate
- [ ] `PlayersPage.tsx` diupdate
- [ ] Semua pages load data dari Supabase tanpa login
- [ ] Write UI tersembunyi tanpa login, muncul saat login
- [ ] `npm run build` sukses
- [ ] Manual test publik (incognito) dan admin berhasil
