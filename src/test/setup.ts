import '@testing-library/jest-dom';

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
