/**
 * Dev-only escape hatch: in the Vite dev server, treat every Learn stage and the
 * Practice tab as unlocked so you can jump straight to any screen without grinding
 * through mastery.
 *
 * Gated on `MODE === 'development'`, NOT `import.meta.env.DEV` — Vitest runs with
 * `DEV === true`, so using `DEV` would silently unlock screens inside the test
 * suite and break the locked-flow tests. `MODE` is `'development'` only in
 * `vite dev`; it is `'test'` under Vitest and `'production'` in builds, so this is
 * false in both tests and shipped code.
 */
export const DEV_UNLOCK_ALL = import.meta.env.MODE === 'development'
