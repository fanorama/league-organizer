# Phase 07: Update Tests

## Objective

Update semua test files agar mock Supabase client, bukan localStorage. Test untuk storage functions dan Zustand stores tetap bisa jalan tanpa koneksi Supabase nyata.

## Scope

- Files/modules this phase may touch:
  - `src/lib/storage.test.ts`
  - `src/store/useLeagueStore.test.ts`
  - `src/store/useTeamStore.test.ts`
  - `src/store/useSeasonStore.test.ts`
  - `src/store/useMatchStore.test.ts`
  - `src/store/usePlayerStore.test.ts`
  - `src/test/setup.ts`
- Files/modules this phase must not touch:
  - `src/lib/storage.ts`
  - `src/store/*.ts` (source, bukan test)
  - `src/lib/schedule.ts`
  - Test lain yang tidak terkait: `api.test.ts`, `standings.test.ts`, `schedule.test.ts`, `playerStats.test.ts`, `playerAssignment.test.ts`

## Preconditions

- Phase 03 dan 04 selesai: storage.ts dan stores sudah async

## Tasks

### 1. Setup global mock Supabase di `src/test/setup.ts`

Tambahkan mock `@supabase/supabase-js` agar semua test tidak perlu koneksi nyata:

```ts
import { vi } from 'vitest';

// Mock @supabase/supabase-js secara global
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  }),
}));
```

### 2. Rewrite `src/lib/storage.test.ts`

Test sekarang perlu mock return value dari Supabase queries. Contoh pola:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabase';
import { getLeagues, saveLeague, deleteLeague } from './storage';

describe('getLeagues', () => {
  it('mengembalikan array leagues dari Supabase', async () => {
    vi.mocked(supabase.from('leagues').select('*').order).mockResolvedValueOnce({
      data: [
        { id: 'uuid-1', name: 'Liga A', description: null, settings: {}, created_at: '2026-01-01T00:00:00Z' }
      ],
      error: null,
    } as any);

    const leagues = await getLeagues();
    expect(leagues).toHaveLength(1);
    expect(leagues[0].name).toBe('Liga A');
    expect(leagues[0].createdAt).toBe('2026-01-01T00:00:00Z');
  });

  it('mengembalikan array kosong jika error', async () => {
    // ... test error handling
  });
});
```

Karena mock chaining (`from().select().order()`) cukup kompleks, pertimbangkan mock di level storage function:

```ts
import * as storage from './storage';

vi.spyOn(storage, 'getLeagues').mockResolvedValue([...]);
```

Pilih pendekatan yang paling mudah ditest dan konsisten.

### 3. Update `src/store/useLeagueStore.test.ts` dan stores lainnya

Store tests sekarang perlu mock storage functions (bukan localStorage). Pola:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as storage from '../lib/storage';
import { useLeagueStore } from './useLeagueStore';

vi.mock('../lib/storage');

describe('useLeagueStore', () => {
  beforeEach(() => {
    vi.mocked(storage.getLeagues).mockResolvedValue([]);
    useLeagueStore.setState({ leagues: [] });
  });

  it('fetchLeagues mengisi state', async () => {
    const mockLeague = { id: 'uuid-1', name: 'Liga A', createdAt: '2026-01-01', settings: { meetingsPerSeason: 2, continuousSeasons: false } };
    vi.mocked(storage.getLeagues).mockResolvedValue([mockLeague]);

    await useLeagueStore.getState().fetchLeagues();

    expect(useLeagueStore.getState().leagues).toHaveLength(1);
    expect(useLeagueStore.getState().leagues[0].name).toBe('Liga A');
  });
});
```

### 4. Jalankan semua tests dan perbaiki yang gagal

```bash
npm run test:run
```

Fix satu per satu test yang gagal. Test yang tidak terkait storage/stores (standings, schedule, playerStats, dll.) tidak seharusnya terpengaruh.

## Acceptance Criteria

- `npm run test:run` semua pass (atau skip yang sengaja di-skip)
- Tidak ada test yang hit Supabase atau localStorage secara nyata
- Coverage tetap di level yang sama atau lebih baik

## Verification

```bash
npm run test:run
npm run coverage
```

Expected:
- Semua tests pass
- Coverage report muncul tanpa error

## Idempotence and Recovery

- Test file edits idempoten
- Jika test masih gagal karena mock yang salah, debug satu per satu dengan `npm test` (watch mode)

## Exit Criteria

- [ ] `src/test/setup.ts` diupdate dengan global mock Supabase
- [ ] `storage.test.ts` diupdate
- [ ] Semua 5 store test files diupdate
- [ ] `npm run test:run` semua pass
- [ ] `npm run build` tetap sukses
