import '@testing-library/jest-dom';
import { vi } from 'vitest';

const supabaseQuery = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: vi.fn(() => supabaseQuery),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  }),
}));

// Node.js 22+ defines localStorage as a non-functional stub (returns undefined)
// unless --localstorage-file is provided. Install an in-memory shim so that any
// module that accesses localStorage at import time (e.g. Zustand stores) works
// correctly in pure-Node test workers.
const storageMap = new Map<string, string>();
const memoryStorage: Storage = {
  get length() { return storageMap.size; },
  getItem: (key) => storageMap.get(key) ?? null,
  setItem: (key, value) => { storageMap.set(key, value); },
  removeItem: (key) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  key: (index) => [...storageMap.keys()][index] ?? null,
};

try {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    enumerable: true,
    value: memoryStorage,
  });
} catch {
  // Already configured as non-configurable (e.g. by jsdom) — safe to ignore.
}
