# Daycipher

**Decipher any date into its weekday — learn it, drill it, master it.**

Daycipher is an offline-first, installable **PWA** that teaches you to compute the weekday of
any date in your head, using [Conway's Doomsday rule](https://en.wikipedia.org/wiki/Doomsday_rule)
(devised by [John Horton Conway](https://en.wikipedia.org/wiki/John_Horton_Conway)). Learn the
method step by step, drill it with instant step-by-step feedback, and track your progress over
time — all on your phone, fully offline.

A good intro to the method: [YouTube explanation](https://www.youtube.com/watch?v=714LTMNJy5M&t=140s).

## Status

Rebuilt from the original Python/Tkinter prototype (now in [`legacy/`](./legacy)) into a
mobile-first React PWA. See the design spec and implementation plans in
[`docs/superpowers/`](./docs/superpowers).

## Tech stack

Vite · React + TypeScript · IndexedDB (`idb`) · `vite-plugin-pwa` · Vitest. Deployed on Vercel.
Package manager: **pnpm**.

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # run the test suite
pnpm typecheck
pnpm lint
pnpm build        # production build (generates the offline service worker)
pnpm preview      # serve the production build locally
```

## Project layout

```
src/engine/    Pure Doomsday-rule engine (weekday math), exhaustively tested
src/db/        On-device IndexedDB data layer + JSON backup
src/store/     Settings (zustand)
src/pwa/       Service-worker registration + update flow
src/features/  Today · Learn · Practice · Progress · Settings screens
src/components/ Shared UI (nav, install/update prompts)
src/styles/    Almanac design tokens + base styles
legacy/        Original Python/Tkinter prototype
```
