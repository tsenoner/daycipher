import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// Node 18+ exposes a native `localStorage` global that is disabled (undefined)
// unless `--localstorage-file` is passed, and it shadows jsdom's implementation.
// Provide a minimal in-memory polyfill so storage-backed code works in tests.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  const localStoragePolyfill: Storage = {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, String(value))
    },
    removeItem: (key) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStoragePolyfill,
    configurable: true,
    writable: true,
  })
}
