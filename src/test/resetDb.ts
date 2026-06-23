import { _resetDbForTests } from '../db/db'

/**
 * Reset IndexedDB to a clean slate between tests.
 *
 * Awaits the cached connection's close BEFORE deleting the database: an
 * un-awaited close races the delete and leaks state into the next test (see
 * the warning on `_resetDbForTests`). Use as `beforeEach(resetTestDb)`.
 */
export async function resetTestDb(): Promise<void> {
  await _resetDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('daycipher')
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}
