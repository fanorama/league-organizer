# Coding Conventions

Konvensi yang harus diikuti agar kode konsisten dengan codebase yang ada.

## Aturan Kritis

- **Akses data hanya lewat `src/lib/storage.ts`.** Jangan pernah impor `supabase` dari `supabase.ts` langsung di komponen atau store. Semua CRUD melalui fungsi `storage.ts`.
- **Tidak ada logika bisnis di store.** Store Zustand hanya membungkus fungsi `storage.ts` lalu `set()` state baru untuk memicu re-render.
- **Semua type di `src/lib/types.ts`.** Tidak ada interface/type inline di komponen.
- **Verifikasi UI dengan browser** (`npm run dev`). Unit test hanya mencakup `src/lib/**` dan `src/store/**`, bukan komponen React.

## Mapper DB (snake_case ↔ camelCase)

Kolom Supabase memakai `snake_case`; tipe aplikasi memakai `camelCase`. Setiap entitas punya pasangan mapper di `storage.ts`:

```ts
function dbToTeam(row: DbRow): Team { /* row.league_id → leagueId */ }
function teamToDb(team: Partial<Team>): DbRow { /* leagueId → league_id */ }
```

- `teamToDb` membungkus hasil dengan `stripUndefined()` — membuang field `undefined` dan string kosong sebelum upsert.
- Field nullable dipetakan eksplisit dengan `?? null` saat menulis dan `?? undefined`/`?? []`/`?? {}` saat membaca.

## Pola Storage Function

CRUD per entitas konsisten:

```ts
getXs()            // select * + order
getXById(id)       // maybeSingle()
getXsByParent(pid) // filter eq + order
saveX(x)           // upsert + select().single() → kembalikan hasil ter-map
deleteX(id)        // delete eq
```

`saveX` menerima `Omit<X,'id'> | X` (insert atau update lewat upsert). ID dibuat oleh Supabase / `crypto.randomUUID()`.

> **Cascade delete** ditangani di level DB Supabase (`ON DELETE CASCADE`), bukan di application layer.

## Pola Store Zustand

```ts
export const useXStore = create<XStore>((set) => ({
  items: [],
  fetchItems: async () => { set({ items: await getXs() }); },
  createItem: async (data) => {
    const item = await saveX(data);
    set({ items: await getXs() }); // re-fetch agar state sinkron
    return item;
  },
  // updateItem, deleteItem, refresh mengikuti pola yang sama
}));
```

## Fungsi Domain Murni

Logika domain (`schedule`, `standings`, `playerStats`, `quickMatchStats`) menyediakan dua bentuk:

- `xFromData(...)` — **murni**, menerima data mentah sebagai argumen. Inilah yang di-unit-test.
- `x(...)` async — mengambil data via `storage.ts` lalu memanggil varian `*FromData`.

Saat menambah logika baru, ikuti pemisahan ini agar tetap mudah dites.

## TypeScript & Style

- TypeScript strict (lihat `tsconfig.json`). Bahasa komentar & UI: **Bahasa Indonesia**.
- `schedule.ts` memakai `@ts-nocheck` — file kompleks; tetap hati-hati saat mengubahnya.
- Import dikelompokkan: library eksternal → modul internal, dengan path relatif.

## Design System (CSS)

`styles/main.css` memakai CSS variables sebagai design token (tema gelap). Gunakan token ini, jangan hardcode warna:

- Permukaan: `--bg`, `--panel`, `--panel-2`, `--panel-3`, `--border`, `--border-2`
- Teks: `--text`, `--text-2`, `--muted`
- Aksen/status: `--primary` (kuning), `--accent`/`--danger` (merah), `--success`, `--warning`
- Bentuk: `--radius`, `--radius-lg`, `--shadow`, `--header-height`, `--content-max`
- Font: `Barlow` (body) & `Barlow Condensed` (heading)
