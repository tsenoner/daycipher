# Daycipher Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation of Daycipher — a verified Doomsday engine, the project scaffold, the Almanac design system (light/dark), an IndexedDB data layer with JSON backup, and an installable offline-first React PWA shell with 4-tab navigation.

**Architecture:** Vite + React + TypeScript SPA. A pure, dependency-free `engine/` module is the math source of truth (TDD, exhaustively cross-checked vs JS `Date` over 1600–2099). A thin `db/` layer wraps IndexedDB via `idb` (tested with `fake-indexeddb`). A `vite-plugin-pwa` service worker precaches the whole build for true offline. Theming is CSS custom properties switched by a `data-theme` attribute applied before first paint. Screens are stubbed here; the drill loop and stats land in Plan 2.

**Tech Stack:** Vite 5, React 18, TypeScript (strict), Vitest + @testing-library/react + fake-indexeddb, idb, zustand, react-router-dom, vite-plugin-pwa + @vite-pwa/assets-generator, @fontsource/fraunces + @fontsource/inter, ESLint + Prettier. Deploy: Vercel.

---

## File Structure

```
package.json, tsconfig.json, vite.config.ts, vitest.config.ts, .eslintrc.cjs, .prettierrc, vercel.json
index.html                      iOS meta tags + pre-paint theme script
public/logo.svg                 source mark for icon generation
src/
  main.tsx                      app entry, mounts <App/>, registers SW
  App.tsx                       router + layout (BottomNav + <Outlet/>)
  routes.tsx                    route table
  engine/
    types.ts                    Weekday, StepTrace, GenerateConstraints
    doomsday.ts                 isLeapYear, monthAnchor, centuryAnchor, yearDoomsday*, weekdayOf*, explain
    generate.ts                 seeded RNG + generateDate
    doomsday.test.ts            unit + exhaustive cross-check
    generate.test.ts            generation tests
  db/
    db.ts                       idb openDB, schema, versions
    attempts.ts                 add/list/query attempts
    meta.ts                     get/set key-value meta + streak helpers
    backup.ts                   exportAll / importAll JSON
    db.test.ts, attempts.test.ts, meta.test.ts, backup.test.ts
  store/
    settings.ts                 zustand settings store (theme, weekStart, sound, dailyGoal)
  styles/
    tokens.css                  color/space/type tokens (light + dark)
    base.css                    resets, typography, layout primitives
  pwa/
    registerSW.ts               vite-plugin-pwa registration + callbacks
  components/
    BottomNav.tsx               4-tab nav
    UpdateToast.tsx             "new version" prompt
    InstallPrompt.tsx           Android beforeinstallprompt + iOS hint
    ThemeToggle.tsx             System/Light/Dark control
  features/
    today/TodayScreen.tsx       stub
    learn/LearnScreen.tsx       stub
    practice/PracticeScreen.tsx stub
    progress/ProgressScreen.tsx stub
    settings/SettingsScreen.tsx theme toggle + export/import + install + storage estimate
  test/setup.ts                 vitest setup (jest-dom, fake-indexeddb/auto)
.github/workflows/ci.yml        typecheck + lint + test + build
```

---

## Task 1: Scaffold the project

**Files:** Create all config files at repo root; move legacy app into `legacy/`.

- [ ] **Step 1: Archive the legacy Python app**

Run:
```bash
mkdir -p legacy
git mv src legacy/src && git mv data legacy/data && git mv img legacy/img && git mv doc legacy/doc
git commit -m "chore: move legacy Python app into legacy/"
```

- [ ] **Step 2: Create the Vite React-TS app in place**

Run:
```bash
npm create vite@latest . -- --template react-ts
```
If prompted that the directory is not empty, choose **"Ignore files and continue"**. This creates/overwrites `package.json`, `tsconfig*.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, and a few assets. (We replace most below.)

- [ ] **Step 3: Install dependencies**

Run:
```bash
npm install react-router-dom idb zustand ts-fsrs @fontsource/fraunces @fontsource/inter
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom fake-indexeddb vite-plugin-pwa @vite-pwa/assets-generator eslint prettier eslint-config-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react-hooks
```
(`ts-fsrs` is installed now for Plan 4; unused in this plan but harmless.)

- [ ] **Step 4: Configure TypeScript strict**

Replace `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Configure Vitest + setup**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```
Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
```

- [ ] **Step 6: Add npm scripts**

In `package.json`, set `"scripts"`:
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc --noEmit",
  "lint": "eslint . --ext ts,tsx --max-warnings 0",
  "format": "prettier --write ."
}
```

- [ ] **Step 7: ESLint + Prettier**

Create `.eslintrc.cjs`:
```js
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', 'legacy', 'dev-dist', '*.cjs'],
  rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
}
```
Create `.prettierrc`:
```json
{ "semi": false, "singleQuote": true, "printWidth": 100, "trailingComma": "all" }
```

- [ ] **Step 8: Verify the toolchain runs**

Run: `npm run typecheck && npm run build`
Expected: both succeed (the default Vite template still compiles).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React-TS app with Vitest, ESLint, Prettier"
```

---

## Task 2: Engine — calendar primitives (`isLeapYear`, `monthAnchor`, `centuryAnchor`)

**Files:**
- Create: `src/engine/types.ts`, `src/engine/doomsday.ts`
- Test: `src/engine/doomsday.test.ts`

- [ ] **Step 1: Define types**

Create `src/engine/types.ts`:
```ts
/** 0 = Sunday … 6 = Saturday (Doomsday convention). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const

export interface StepTrace {
  year: number
  month: number
  day: number
  leap: boolean
  centuryAnchor: Weekday
  yearDoomsday: Weekday
  /** worked Odd+11 substeps for display */
  oddEleven: { start: number; afterStep1: number; halved: number; afterStep3: number; finalAdd: number }
  monthAnchorDay: number
  /** weekday of the month's anchor date — equals yearDoomsday */
  monthAnchorWeekday: Weekday
  /** reduced day offset from the month anchor, in -3..3 */
  offset: number
  result: Weekday
}
```

- [ ] **Step 2: Write the failing test**

Create `src/engine/doomsday.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isLeapYear, monthAnchor, centuryAnchor } from './doomsday'

describe('isLeapYear', () => {
  it.each([[2000, true], [1900, false], [2024, true], [2023, false], [1600, true], [2100, false]])(
    'year %i -> %s',
    (y, expected) => expect(isLeapYear(y)).toBe(expected),
  )
})

describe('monthAnchor', () => {
  it('even months self-reference', () => {
    expect(monthAnchor(4, false)).toBe(4)
    expect(monthAnchor(6, false)).toBe(6)
    expect(monthAnchor(8, false)).toBe(8)
    expect(monthAnchor(10, false)).toBe(10)
    expect(monthAnchor(12, false)).toBe(12)
  })
  it('odd months 9-to-5 at the 7-Eleven', () => {
    expect(monthAnchor(5, false)).toBe(9)
    expect(monthAnchor(9, false)).toBe(5)
    expect(monthAnchor(7, false)).toBe(11)
    expect(monthAnchor(11, false)).toBe(7)
  })
  it('Jan/Feb shift in leap years, March = 14', () => {
    expect(monthAnchor(1, false)).toBe(3)
    expect(monthAnchor(1, true)).toBe(4)
    expect(monthAnchor(2, false)).toBe(28)
    expect(monthAnchor(2, true)).toBe(29)
    expect(monthAnchor(3, false)).toBe(14)
  })
})

describe('centuryAnchor (Sunday=0)', () => {
  it.each([[1700, 0], [1800, 5], [1900, 3], [2000, 2], [2100, 0], [1600, 2]])(
    'year %i -> weekday %i',
    (y, w) => expect(centuryAnchor(y)).toBe(w),
  )
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- doomsday`
Expected: FAIL — `doomsday` module has no exports yet.

- [ ] **Step 4: Implement the primitives**

Create `src/engine/doomsday.ts`:
```ts
import type { Weekday } from './types'

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

const mod7 = (n: number): Weekday => (((n % 7) + 7) % 7) as Weekday

/** Day-of-month of the month's doomsday anchor. month is 1-12. */
export function monthAnchor(month: number, leap: boolean): number {
  switch (month) {
    case 1: return leap ? 4 : 3
    case 2: return leap ? 29 : 28
    case 3: return 14
    case 4: return 4
    case 5: return 9
    case 6: return 6
    case 7: return 11
    case 8: return 8
    case 9: return 5
    case 10: return 10
    case 11: return 7
    case 12: return 12
    default: throw new RangeError(`invalid month: ${month}`)
  }
}

/** Century anchor weekday. anchor = (5·(c mod 4) + 2) mod 7, c = floor(year/100), Tuesday(2) base. */
export function centuryAnchor(year: number): Weekday {
  const c = Math.floor(year / 100)
  return mod7(5 * (c % 4) + 2)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- doomsday`
Expected: PASS (all primitive tests green).

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/doomsday.ts src/engine/doomsday.test.ts
git commit -m "feat(engine): leap-year, month anchors, century anchor"
```

---

## Task 3: Engine — year doomsday (Odd+11 and Conway)

**Files:** Modify `src/engine/doomsday.ts`; Test `src/engine/doomsday.test.ts`.

- [ ] **Step 1: Add the failing tests**

Append to `src/engine/doomsday.test.ts`:
```ts
import { yearDoomsdayOddEleven, yearDoomsdayConway } from './doomsday'

describe('year doomsday', () => {
  // Sunday=0; known doomsdays: 2005=Mon(1), 1966=Mon(1), 2000=Tue(2), 1900=Wed(3), 2023=Tue(2)
  it.each([[2005, 1], [1966, 1], [2000, 2], [1900, 3], [2023, 2], [1986, 5]])(
    'Odd+11 %i -> %i',
    (y, w) => expect(yearDoomsdayOddEleven(y)).toBe(w),
  )
  it.each([[2005, 1], [1966, 1], [2000, 2], [1900, 3], [2023, 2], [1986, 5]])(
    'Conway %i -> %i',
    (y, w) => expect(yearDoomsdayConway(y)).toBe(w),
  )
  it('both methods agree across 1600-2099', () => {
    for (let y = 1600; y <= 2099; y++) {
      expect(yearDoomsdayOddEleven(y)).toBe(yearDoomsdayConway(y))
    }
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- doomsday`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement both methods**

Append to `src/engine/doomsday.ts`:
```ts
/** Year's doomsday weekday via the Fong–Walters "Odd+11" method. */
export function yearDoomsdayOddEleven(year: number): Weekday {
  let t = year % 100
  if (t % 2 === 1) t += 11
  t = t / 2
  if (t % 2 === 1) t += 11
  t = 7 - (t % 7)
  return mod7(centuryAnchor(year) + t)
}

/** Year's doomsday weekday via Conway's classic divide-by-12 method. */
export function yearDoomsdayConway(year: number): Weekday {
  const y = year % 100
  const a = Math.floor(y / 12)
  const b = y % 12
  const c = Math.floor(b / 4)
  return mod7(centuryAnchor(year) + a + b + c)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- doomsday`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/doomsday.ts src/engine/doomsday.test.ts
git commit -m "feat(engine): year doomsday via Odd+11 and Conway"
```

---

## Task 4: Engine — `weekdayOf` with exhaustive cross-check

**Files:** Modify `src/engine/doomsday.ts`; Test `src/engine/doomsday.test.ts`.

- [ ] **Step 1: Add the failing tests (incl. exhaustive reference check)**

Append to `src/engine/doomsday.test.ts`:
```ts
import { weekdayOfYMD, weekdayOf } from './doomsday'

/** Reference weekday using JS Date in UTC (proleptic Gregorian). Valid for year >= 100. */
function refWeekday(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

describe('weekdayOfYMD', () => {
  it('known dates', () => {
    expect(weekdayOfYMD(1986, 3, 14)).toBe(5) // Friday
    expect(weekdayOfYMD(2000, 2, 2)).toBe(3) // Wednesday (leap-year trap)
    expect(weekdayOfYMD(1776, 7, 4)).toBe(4) // Thursday
    expect(weekdayOfYMD(2026, 6, 16)).toBe(2) // Tuesday
  })
  it('matches the reference for EVERY day 1600-01-01 .. 2099-12-31', () => {
    const daysInMonth = (y: number, m: number) =>
      [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
    let mismatches = 0
    let firstMismatch = ''
    for (let y = 1600; y <= 2099; y++) {
      for (let m = 1; m <= 12; m++) {
        for (let d = 1; d <= daysInMonth(y, m); d++) {
          if (weekdayOfYMD(y, m, d) !== refWeekday(y, m, d)) {
            mismatches++
            if (!firstMismatch) firstMismatch = `${y}-${m}-${d}`
          }
        }
      }
    }
    expect(`${mismatches} (first: ${firstMismatch})`).toBe('0 (first: )')
  })
})

describe('weekdayOf(Date)', () => {
  it('reads UTC components', () => {
    expect(weekdayOf(new Date(Date.UTC(1986, 2, 14)))).toBe(5)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- doomsday`
Expected: FAIL — `weekdayOfYMD` / `weekdayOf` not exported.

- [ ] **Step 3: Implement**

Append to `src/engine/doomsday.ts`:
```ts
/** Weekday (Sunday=0) of the given Gregorian Y/M/D. */
export function weekdayOfYMD(year: number, month: number, day: number): Weekday {
  const doomsday = yearDoomsdayOddEleven(year)
  const anchor = monthAnchor(month, isLeapYear(year))
  return mod7(doomsday + (day - anchor))
}

/** Weekday (Sunday=0) of a Date, read in UTC. */
export function weekdayOf(date: Date): Weekday {
  return weekdayOfYMD(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- doomsday`
Expected: PASS — including the ~182,000-day exhaustive check.

- [ ] **Step 5: Commit**

```bash
git add src/engine/doomsday.ts src/engine/doomsday.test.ts
git commit -m "feat(engine): weekdayOf with exhaustive 1600-2099 verification"
```

---

## Task 5: Engine — `explain` step trace

**Files:** Modify `src/engine/doomsday.ts`; Test `src/engine/doomsday.test.ts`.

- [ ] **Step 1: Add the failing test**

Append to `src/engine/doomsday.test.ts`:
```ts
import { explain } from './doomsday'

describe('explain', () => {
  it('produces a consistent trace for 14 March 1986', () => {
    const t = explain(1986, 3, 14)
    expect(t.centuryAnchor).toBe(3) // Wed
    expect(t.yearDoomsday).toBe(5) // Fri
    expect(t.monthAnchorDay).toBe(14)
    expect(t.monthAnchorWeekday).toBe(5)
    expect(t.offset).toBe(0)
    expect(t.result).toBe(5)
  })
  it('reduced offset stays within -3..3', () => {
    const t = explain(2000, 2, 2)
    expect(t.result).toBe(3) // Wed
    expect(Math.abs(t.offset)).toBeLessThanOrEqual(3)
  })
  it('trace result always equals weekdayOfYMD across a sample', () => {
    for (let y = 1601; y <= 2099; y += 7) {
      for (const [m, d] of [[1, 1], [2, 28], [7, 4], [12, 31]] as const) {
        expect(explain(y, m, d).result).toBe(weekdayOfYMD(y, m, d))
      }
    }
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- doomsday`
Expected: FAIL — `explain` not exported.

- [ ] **Step 3: Implement**

Append to `src/engine/doomsday.ts`:
```ts
import type { StepTrace } from './types'

/** Reduce an integer offset to the range -3..3 (mod 7), for human-friendly counting. */
function reduceOffset(diff: number): number {
  let r = ((diff % 7) + 7) % 7
  if (r > 3) r -= 7
  return r
}

export function explain(year: number, month: number, day: number): StepTrace {
  const leap = isLeapYear(year)
  const cAnchor = centuryAnchor(year)
  const yearDoomsday = yearDoomsdayOddEleven(year)
  const anchorDay = monthAnchor(month, leap)
  const offset = reduceOffset(day - anchorDay)
  const result = mod7(yearDoomsday + offset)

  // Recompute Odd+11 substeps for display
  const start = year % 100
  const afterStep1 = start % 2 === 1 ? start + 11 : start
  const halved = afterStep1 / 2
  const afterStep3 = halved % 2 === 1 ? halved + 11 : halved
  const finalAdd = 7 - (afterStep3 % 7)

  return {
    year, month, day, leap,
    centuryAnchor: cAnchor,
    yearDoomsday,
    oddEleven: { start, afterStep1, halved, afterStep3, finalAdd },
    monthAnchorDay: anchorDay,
    monthAnchorWeekday: yearDoomsday,
    offset,
    result,
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- doomsday`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/doomsday.ts src/engine/doomsday.test.ts src/engine/types.ts
git commit -m "feat(engine): explain() step trace with worked Odd+11"
```

---

## Task 6: Engine — date generation (seeded + constrained)

**Files:** Create `src/engine/generate.ts`, `src/engine/generate.test.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/engine/generate.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { generateDate, makeRng } from './generate'
import { isLeapYear } from './doomsday'

describe('generateDate', () => {
  it('always returns a valid date within the year range', () => {
    const rng = makeRng(42)
    for (let i = 0; i < 1000; i++) {
      const { year, month, day } = generateDate({ minYear: 1600, maxYear: 2099 }, rng)
      expect(year).toBeGreaterThanOrEqual(1600)
      expect(year).toBeLessThanOrEqual(2099)
      expect(month).toBeGreaterThanOrEqual(1)
      expect(month).toBeLessThanOrEqual(12)
      const dim = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(dim)
    }
  })
  it('is deterministic for the same seed (Daily Challenge)', () => {
    const a = Array.from({ length: 5 }, (_, i) => generateDate({ minYear: 1600, maxYear: 2099 }, makeRng(2026_167)))
    const b = Array.from({ length: 5 }, (_, i) => generateDate({ minYear: 1600, maxYear: 2099 }, makeRng(2026_167)))
    expect(a).toEqual(b)
  })
  it('respects a month constraint', () => {
    const rng = makeRng(7)
    for (let i = 0; i < 200; i++) {
      expect(generateDate({ minYear: 1900, maxYear: 1999, month: 2 }, rng).month).toBe(2)
    }
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- generate`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/engine/generate.ts`:
```ts
import { isLeapYear } from './doomsday'

export interface GenerateConstraints {
  minYear: number
  maxYear: number
  month?: number
}

/** mulberry32 — small deterministic PRNG returning [0,1). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const daysInMonth = (year: number, month: number): number =>
  [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]

const pick = (rng: () => number, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1))

export function generateDate(
  c: GenerateConstraints,
  rng: () => number = Math.random,
): { year: number; month: number; day: number } {
  const year = pick(rng, c.minYear, c.maxYear)
  const month = c.month ?? pick(rng, 1, 12)
  const day = pick(rng, 1, daysInMonth(year, month))
  return { year, month, day }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- generate`
Expected: PASS.

- [ ] **Step 5: Add the constraint type to engine barrel & commit**

Create `src/engine/index.ts`:
```ts
export * from './types'
export * from './doomsday'
export * from './generate'
```
Run: `npm test && npm run typecheck`
Expected: PASS.
```bash
git add src/engine/generate.ts src/engine/generate.test.ts src/engine/index.ts
git commit -m "feat(engine): seeded, constrained date generation"
```

---

## Task 7: Design tokens, base styles, and pre-paint theme

**Files:** Create `src/styles/tokens.css`, `src/styles/base.css`; rewrite `index.html`.

- [ ] **Step 1: Create the design tokens (Almanac, light + dark)**

Create `src/styles/tokens.css`:
```css
:root {
  color-scheme: light dark;
  --paper: #f4eddd;
  --card: #fdfbf5;
  --ink: #2b2117;
  --muted: #90805f;
  --line: #e4d8bf;
  --burg: #8c2f39;
  --green: #2f6b4f;
  --gold: #b5854a;
  --hm-0: #efe9da; --hm-1: #e6d2ac; --hm-2: #d6a972; --hm-3: #be7448; --hm-4: #8c2f39;
  --space: 8px;
  --radius: 14px;
  --font-serif: 'Fraunces', Georgia, serif;
  --font-sans: 'Inter', system-ui, sans-serif;
  --tap: 56px;
}
[data-theme='dark'] {
  --paper: #1c1813;
  --card: #251f18;
  --ink: #ece0c9;
  --muted: #9a8a6b;
  --line: #3a3024;
  --burg: #d06a4e;
  --green: #5ba17c;
  --gold: #c79a5a;
  --hm-0: #241d16; --hm-1: #4a3826; --hm-2: #7a5230; --hm-3: #b06038; --hm-4: #e08a5a;
}
```

- [ ] **Step 2: Create base styles**

Create `src/styles/base.css`:
```css
@import '@fontsource/fraunces/400.css';
@import '@fontsource/fraunces/600.css';
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/600.css';
@import './tokens.css';

* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, .serif { font-family: var(--font-serif); font-weight: 600; }
.tabnums { font-variant-numeric: tabular-nums; }
button { font-family: inherit; }
:focus-visible { outline: 3px solid var(--burg); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
.app-shell {
  max-width: 540px;
  margin: 0 auto;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
.screen { flex: 1; padding: 16px; }
.visually-hidden {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip-path: rect(1px 1px 1px 1px); white-space: nowrap;
}
```

- [ ] **Step 3: Rewrite `index.html` with iOS meta + pre-paint theme**

Replace `index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="description" content="Learn and train the skill of finding the weekday of any date — the Doomsday rule. Offline-first." />
    <meta name="theme-color" content="#f4eddd" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#1c1813" media="(prefers-color-scheme: dark)" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Daycipher" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <title>Daycipher — master the weekday of any date</title>
    <script>
      // Apply theme before first paint to avoid FOUC.
      (function () {
        try {
          var t = localStorage.getItem('daycipher-theme') || 'system'
          var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
          if (dark) document.documentElement.setAttribute('data-theme', 'dark')
        } catch (e) {}
      })()
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS (fonts resolve, CSS imports OK).

- [ ] **Step 5: Commit**

```bash
git add src/styles index.html
git commit -m "feat(ui): Almanac design tokens, base styles, pre-paint theme"
```

---

## Task 8: Data layer — idb schema (`db.ts`)

**Files:** Create `src/db/db.ts`, `src/db/db.test.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/db/db.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getDb, STORES } from './db'

describe('getDb', () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase('daycipher')
  })
  it('creates all object stores', async () => {
    const db = await getDb()
    for (const s of Object.values(STORES)) expect(db.objectStoreNames.contains(s)).toBe(true)
  })
  it('attempts store has a by-timestamp index', async () => {
    const db = await getDb()
    const tx = db.transaction(STORES.attempts)
    expect(tx.store.indexNames.contains('byTimestamp')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- db.test`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the schema**

Create `src/db/db.ts`:
```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export const STORES = {
  attempts: 'attempts',
  cards: 'cards',
  skills: 'skills',
  meta: 'meta',
} as const

export interface Attempt {
  id?: number
  timestamp: number
  targetDate: string // ISO yyyy-mm-dd
  correctWeekday: number
  guessedWeekday: number
  correct: boolean
  durationMs: number
  mode: string
  anchorCorrect: 0 | 1 | null
  yearDoomCorrect: 0 | 1 | null
  offsetCorrect: 0 | 1 | null
  timed: boolean
}

export interface MetaRecord {
  key: string
  value: unknown
}

interface DaycipherDB extends DBSchema {
  attempts: { key: number; value: Attempt; indexes: { byTimestamp: number } }
  cards: { key: string; value: Record<string, unknown> }
  skills: { key: string; value: Record<string, unknown> }
  meta: { key: string; value: MetaRecord }
}

let dbPromise: Promise<IDBPDatabase<DaycipherDB>> | null = null

export function getDb(): Promise<IDBPDatabase<DaycipherDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DaycipherDB>('daycipher', 1, {
      upgrade(db) {
        const attempts = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true })
        attempts.createIndex('byTimestamp', 'timestamp')
        db.createObjectStore('cards', { keyPath: 'cardId' })
        db.createObjectStore('skills', { keyPath: 'dimension' })
        db.createObjectStore('meta', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

/** Test helper: drop the cached connection so a fresh deleteDatabase takes effect. */
export function _resetDbForTests(): void {
  dbPromise = null
}
```

- [ ] **Step 4: Fix the test to reset the cached connection**

Update the `beforeEach` in `src/db/db.test.ts`:
```ts
import { getDb, STORES, _resetDbForTests } from './db'
// ...
  beforeEach(async () => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- db.test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/db/db.ts src/db/db.test.ts
git commit -m "feat(db): idb schema with attempts/cards/skills/meta stores"
```

---

## Task 9: Data layer — attempts store

**Files:** Create `src/db/attempts.ts`, `src/db/attempts.test.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/db/attempts.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { addAttempt, listAttempts, countByDay } from './attempts'
import { _resetDbForTests } from './db'

const base = {
  targetDate: '1986-03-14', correctWeekday: 5, guessedWeekday: 5, correct: true,
  durationMs: 4200, mode: 'quick', anchorCorrect: null, yearDoomCorrect: null,
  offsetCorrect: null, timed: false,
}

describe('attempts', () => {
  beforeEach(async () => { _resetDbForTests(); indexedDB.deleteDatabase('daycipher') })

  it('adds and lists attempts ordered by timestamp desc', async () => {
    await addAttempt({ ...base, timestamp: 100 })
    await addAttempt({ ...base, timestamp: 300 })
    await addAttempt({ ...base, timestamp: 200 })
    const list = await listAttempts()
    expect(list.map((a) => a.timestamp)).toEqual([300, 200, 100])
  })

  it('counts attempts per local day', async () => {
    const d = new Date(2026, 5, 16, 9).getTime()
    await addAttempt({ ...base, timestamp: d })
    await addAttempt({ ...base, timestamp: d + 1000 })
    const counts = await countByDay()
    expect(counts['2026-06-16']).toBe(2)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- attempts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/db/attempts.ts`:
```ts
import { getDb, type Attempt } from './db'

export async function addAttempt(a: Attempt): Promise<number> {
  const db = await getDb()
  return db.add('attempts', a) as Promise<number>
}

/** All attempts, newest first. */
export async function listAttempts(): Promise<Attempt[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('attempts', 'byTimestamp')
  return all.reverse()
}

const localDayKey = (ts: number): string => {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Map of local-day -> attempt count, for the heatmap. */
export async function countByDay(): Promise<Record<string, number>> {
  const all = await listAttempts()
  const out: Record<string, number> = {}
  for (const a of all) out[localDayKey(a.timestamp)] = (out[localDayKey(a.timestamp)] ?? 0) + 1
  return out
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- attempts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/attempts.ts src/db/attempts.test.ts
git commit -m "feat(db): attempts add/list/countByDay"
```

---

## Task 10: Data layer — meta & streak helpers

**Files:** Create `src/db/meta.ts`, `src/db/meta.test.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/db/meta.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getMeta, setMeta, recordPracticeDay } from './meta'
import { _resetDbForTests } from './db'

describe('meta', () => {
  beforeEach(async () => { _resetDbForTests(); indexedDB.deleteDatabase('daycipher') })

  it('round-trips values with a default', async () => {
    expect(await getMeta('theme', 'system')).toBe('system')
    await setMeta('theme', 'dark')
    expect(await getMeta('theme', 'system')).toBe('dark')
  })

  it('increments streak on consecutive days and resets after a gap', async () => {
    expect((await recordPracticeDay('2026-06-14')).currentStreak).toBe(1)
    expect((await recordPracticeDay('2026-06-14')).currentStreak).toBe(1) // same day, no change
    expect((await recordPracticeDay('2026-06-15')).currentStreak).toBe(2)
    const afterGap = await recordPracticeDay('2026-06-18') // missed 16,17
    expect(afterGap.currentStreak).toBe(1)
    expect(afterGap.longestStreak).toBe(2)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- meta`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/db/meta.ts`:
```ts
import { getDb } from './db'

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb()
  const rec = await db.get('meta', key)
  return rec ? (rec.value as T) : fallback
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb()
  await db.put('meta', { key, value })
}

const dayDiff = (a: string, b: string): number =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

export interface StreakState {
  currentStreak: number
  longestStreak: number
  lastActiveDay: string
}

/** Register that the user practiced on `day` (local YYYY-MM-DD). Idempotent per day. */
export async function recordPracticeDay(day: string): Promise<StreakState> {
  const last = await getMeta<string | null>('lastActiveDay', null)
  let current = await getMeta<number>('currentStreak', 0)
  let longest = await getMeta<number>('longestStreak', 0)

  if (last === day) return { currentStreak: current, longestStreak: longest, lastActiveDay: day }
  const gap = last ? dayDiff(last, day) : Infinity
  current = gap === 1 ? current + 1 : 1
  longest = Math.max(longest, current)

  await setMeta('currentStreak', current)
  await setMeta('longestStreak', longest)
  await setMeta('lastActiveDay', day)
  return { currentStreak: current, longestStreak: longest, lastActiveDay: day }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- meta`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/meta.ts src/db/meta.test.ts
git commit -m "feat(db): meta key-value store and streak tracking"
```

---

## Task 11: Data layer — JSON backup (export/import)

**Files:** Create `src/db/backup.ts`, `src/db/backup.test.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/db/backup.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { exportAll, importAll } from './backup'
import { addAttempt, listAttempts } from './attempts'
import { setMeta, getMeta } from './meta'
import { _resetDbForTests } from './db'

const base = {
  targetDate: '1986-03-14', correctWeekday: 5, guessedWeekday: 5, correct: true,
  durationMs: 4200, mode: 'quick', anchorCorrect: null, yearDoomCorrect: null,
  offsetCorrect: null, timed: false,
}

describe('backup', () => {
  beforeEach(async () => { _resetDbForTests(); indexedDB.deleteDatabase('daycipher') })

  it('exports then re-imports all data', async () => {
    await addAttempt({ ...base, timestamp: 111 })
    await setMeta('theme', 'dark')
    const dump = await exportAll()
    expect(dump.version).toBe(1)
    expect(dump.attempts).toHaveLength(1)

    _resetDbForTests(); indexedDB.deleteDatabase('daycipher')
    await importAll(dump)
    expect(await listAttempts()).toHaveLength(1)
    expect(await getMeta('theme', 'system')).toBe('dark')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- backup`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/db/backup.ts`:
```ts
import { getDb, STORES } from './db'

export interface Backup {
  version: 1
  exportedAt: number
  attempts: unknown[]
  cards: unknown[]
  skills: unknown[]
  meta: unknown[]
}

export async function exportAll(): Promise<Backup> {
  const db = await getDb()
  const [attempts, cards, skills, meta] = await Promise.all([
    db.getAll(STORES.attempts), db.getAll(STORES.cards),
    db.getAll(STORES.skills), db.getAll(STORES.meta),
  ])
  return { version: 1, exportedAt: Date.now(), attempts, cards, skills, meta }
}

export async function importAll(data: Backup): Promise<void> {
  if (data.version !== 1) throw new Error(`Unsupported backup version: ${data.version}`)
  const db = await getDb()
  const tx = db.transaction([STORES.attempts, STORES.cards, STORES.skills, STORES.meta], 'readwrite')
  await Promise.all([
    ...data.attempts.map((v) => tx.objectStore(STORES.attempts).put(v as never)),
    ...data.cards.map((v) => tx.objectStore(STORES.cards).put(v as never)),
    ...data.skills.map((v) => tx.objectStore(STORES.skills).put(v as never)),
    ...data.meta.map((v) => tx.objectStore(STORES.meta).put(v as never)),
  ])
  await tx.done
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- backup`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/backup.ts src/db/backup.test.ts
git commit -m "feat(db): JSON export/import backup"
```

---

## Task 12: Settings store (zustand) persisted to meta

**Files:** Create `src/store/settings.ts`, `src/store/settings.test.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/store/settings.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useSettings, applyTheme } from './settings'

describe('settings store', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    useSettings.setState({ theme: 'system', weekStart: 1, soundEnabled: true, dailyGoal: 5 })
  })

  it('applyTheme sets data-theme for dark and persists', () => {
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('daycipher-theme')).toBe('dark')
  })

  it('applyTheme removes data-theme for light', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
  })

  it('setTheme updates state', () => {
    useSettings.getState().setTheme('dark')
    expect(useSettings.getState().theme).toBe('dark')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- settings`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/store/settings.ts`:
```ts
import { create } from 'zustand'

export type Theme = 'system' | 'light' | 'dark'

/** Apply a theme to <html> and persist for the pre-paint script. */
export function applyTheme(theme: Theme): void {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  const root = document.documentElement
  if (dark) root.setAttribute('data-theme', 'dark')
  else root.removeAttribute('data-theme')
  try {
    localStorage.setItem('daycipher-theme', theme)
  } catch {
    /* ignore */
  }
}

interface SettingsState {
  theme: Theme
  weekStart: 0 | 1 // 0 = Sunday, 1 = Monday
  soundEnabled: boolean
  dailyGoal: number
  setTheme: (t: Theme) => void
  setWeekStart: (w: 0 | 1) => void
  setSoundEnabled: (s: boolean) => void
  setDailyGoal: (g: number) => void
}

export const useSettings = create<SettingsState>((set) => ({
  theme: (localStorage.getItem('daycipher-theme') as Theme) ?? 'system',
  weekStart: 1,
  soundEnabled: true,
  dailyGoal: 5,
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  setWeekStart: (weekStart) => set({ weekStart }),
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  setDailyGoal: (dailyGoal) => set({ dailyGoal }),
}))
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- settings`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/settings.ts src/store/settings.test.ts
git commit -m "feat(store): zustand settings with theme application"
```

---

## Task 13: PWA configuration (vite-plugin-pwa + icons)

**Files:** Create `public/logo.svg`; rewrite `vite.config.ts`; add `pwa-assets.config.ts`.

- [ ] **Step 1: Create a source logo**

Create `public/logo.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#f4eddd"/>
  <rect x="96" y="120" width="320" height="296" rx="28" fill="#fdfbf5" stroke="#8c2f39" stroke-width="16"/>
  <rect x="96" y="120" width="320" height="64" rx="28" fill="#8c2f39"/>
  <circle cx="176" cy="108" r="20" fill="#8c2f39"/>
  <circle cx="336" cy="108" r="20" fill="#8c2f39"/>
  <text x="256" y="340" font-family="Georgia, serif" font-size="150" font-weight="700" fill="#2b2117" text-anchor="middle">7</text>
</svg>
```

- [ ] **Step 2: PWA assets config**

Create `pwa-assets.config.ts`:
```ts
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/logo.svg'],
})
```

- [ ] **Step 3: Rewrite `vite.config.ts`**

Replace `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      pwaAssets: { config: true },
      manifest: {
        name: 'Daycipher',
        short_name: 'Daycipher',
        description: 'Learn and train the weekday of any date — the Doomsday rule. Offline-first.',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#f4eddd',
        background_color: '#f4eddd',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: { enabled: false },
    }),
  ],
})
```

- [ ] **Step 4: Generate icons**

Add to `package.json` scripts: `"generate-pwa-assets": "pwa-assets-generator"`.
Run:
```bash
npm run generate-pwa-assets
```
Expected: writes `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`, `public/favicon.ico`.

- [ ] **Step 5: Verify build produces a service worker**

Run: `npm run build`
Expected: PASS; `dist/sw.js` and `dist/manifest.webmanifest` exist.

- [ ] **Step 6: Commit**

```bash
git add public vite.config.ts pwa-assets.config.ts package.json
git commit -m "feat(pwa): vite-plugin-pwa, manifest, generated icons"
```

---

## Task 14: PWA registration + Update/Install UI

**Files:** Create `src/pwa/registerSW.ts`, `src/components/UpdateToast.tsx`, `src/components/InstallPrompt.tsx`.

- [ ] **Step 1: SW registration with a tiny event bus**

Create `src/pwa/registerSW.ts`:
```ts
import { registerSW } from 'virtual:pwa-register'

type Listener = () => void
const needRefresh = new Set<Listener>()
let doUpdate: (reload?: boolean) => Promise<void> = async () => {}

export function initPWA(): void {
  doUpdate = registerSW({
    immediate: true,
    onNeedRefresh() { needRefresh.forEach((l) => l()) },
    onOfflineReady() { /* could toast "ready offline" */ },
  })
}

export function onNeedRefresh(l: Listener): () => void {
  needRefresh.add(l)
  return () => needRefresh.delete(l)
}

export function applyUpdate(): void {
  void doUpdate(true)
}
```

- [ ] **Step 2: Add the PWA virtual-module type**

Create `src/vite-env.d.ts` (overwrite if present):
```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
```

- [ ] **Step 3: UpdateToast component**

Create `src/components/UpdateToast.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { onNeedRefresh, applyUpdate } from '../pwa/registerSW'

export function UpdateToast() {
  const [show, setShow] = useState(false)
  useEffect(() => onNeedRefresh(() => setShow(true)), [])
  if (!show) return null
  return (
    <div
      role="status"
      style={{
        position: 'fixed', left: 16, right: 16, bottom: 'calc(76px + env(safe-area-inset-bottom))',
        background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
        padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        maxWidth: 508, margin: '0 auto', boxShadow: '0 10px 24px rgba(60,40,20,.18)',
      }}
    >
      <span>A new version is ready.</span>
      <button
        onClick={applyUpdate}
        style={{ background: 'var(--burg)', color: '#fff', border: 0, borderRadius: 10, padding: '10px 14px', minHeight: 44 }}
      >
        Reload
      </button>
    </div>
  )
}
```

- [ ] **Step 4: InstallPrompt component (Android event + iOS hint)**

Create `src/components/InstallPrompt.tsx`:
```tsx
import { useEffect, useState } from 'react'

interface BIPEvent extends Event { prompt: () => Promise<void> }

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const standalone = matchMedia('(display-mode: standalone)').matches

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (standalone) return null
  if (deferred) {
    return (
      <button onClick={() => void deferred.prompt()} style={{ minHeight: 44 }}>
        Install Daycipher
      </button>
    )
  }
  if (isIOS) return <p className="muted">To install: tap Share, then “Add to Home Screen”.</p>
  return null
}
```

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pwa src/components/UpdateToast.tsx src/components/InstallPrompt.tsx src/vite-env.d.ts
git commit -m "feat(pwa): SW registration, update toast, install prompt"
```

---

## Task 15: App shell, routing, and bottom navigation

**Files:** Create `src/components/BottomNav.tsx`, `src/routes.tsx`, feature stubs; rewrite `src/App.tsx`, `src/main.tsx`.

- [ ] **Step 1: Feature screen stubs**

Create these four files:

`src/features/today/TodayScreen.tsx`:
```tsx
export function TodayScreen() {
  return (
    <div className="screen">
      <h1>Daycipher</h1>
      <p className="muted">Your daily practice lives here. (Coming in Plan 2.)</p>
    </div>
  )
}
```
`src/features/learn/LearnScreen.tsx`:
```tsx
export function LearnScreen() {
  return (
    <div className="screen">
      <h1>Learn</h1>
      <p className="muted">The Doomsday curriculum will appear here.</p>
    </div>
  )
}
```
`src/features/practice/PracticeScreen.tsx`:
```tsx
export function PracticeScreen() {
  return (
    <div className="screen">
      <h1>Practice</h1>
      <p className="muted">The drill loop arrives in Plan 2.</p>
    </div>
  )
}
```
`src/features/progress/ProgressScreen.tsx`:
```tsx
export function ProgressScreen() {
  return (
    <div className="screen">
      <h1>Progress</h1>
      <p className="muted">Stats and your activity heatmap arrive in Plan 2.</p>
    </div>
  )
}
```

- [ ] **Step 2: Settings screen (functional)**

Create `src/features/settings/SettingsScreen.tsx`:
```tsx
import { useSettings, type Theme } from '../../store/settings'
import { InstallPrompt } from '../../components/InstallPrompt'
import { exportAll, importAll, type Backup } from '../../db/backup'

export function SettingsScreen() {
  const { theme, setTheme } = useSettings()

  async function onExport() {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daycipher-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const data = JSON.parse(await file.text()) as Backup
    await importAll(data)
    alert('Backup imported.')
  }

  return (
    <div className="screen">
      <h1>Settings</h1>

      <h3>Theme</h3>
      <div role="radiogroup" aria-label="Theme" style={{ display: 'flex', gap: 8 }}>
        {(['system', 'light', 'dark'] as Theme[]).map((t) => (
          <button
            key={t}
            aria-pressed={theme === t}
            onClick={() => setTheme(t)}
            style={{
              minHeight: 44, padding: '8px 14px', borderRadius: 10,
              border: `1px solid ${theme === t ? 'var(--burg)' : 'var(--line)'}`,
              background: theme === t ? 'var(--burg)' : 'var(--card)',
              color: theme === t ? '#fff' : 'var(--ink)', textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <h3>Your data</h3>
      <button onClick={onExport} style={{ minHeight: 44 }}>Export backup (JSON)</button>
      <p>
        <label>
          Import backup:{' '}
          <input type="file" accept="application/json" onChange={onImport} />
        </label>
      </p>

      <h3>Install</h3>
      <InstallPrompt />
    </div>
  )
}
```

- [ ] **Step 3: BottomNav**

Create `src/components/BottomNav.tsx`:
```tsx
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Today', end: true },
  { to: '/learn', label: 'Learn' },
  { to: '/practice', label: 'Practice' },
  { to: '/progress', label: 'Progress' },
]

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        display: 'flex', justifyContent: 'space-around',
        background: 'var(--card)', borderTop: '1px solid var(--line)',
        paddingBottom: 'env(safe-area-inset-bottom)', maxWidth: 540, margin: '0 auto',
      }}
    >
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          style={({ isActive }) => ({
            flex: 1, textAlign: 'center', padding: '12px 0', minHeight: 56,
            textDecoration: 'none', fontWeight: 600,
            color: isActive ? 'var(--burg)' : 'var(--muted)',
          })}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Routes**

Create `src/routes.tsx`:
```tsx
import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { TodayScreen } from './features/today/TodayScreen'
import { LearnScreen } from './features/learn/LearnScreen'
import { PracticeScreen } from './features/practice/PracticeScreen'
import { ProgressScreen } from './features/progress/ProgressScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <TodayScreen /> },
      { path: 'learn', element: <LearnScreen /> },
      { path: 'practice', element: <PracticeScreen /> },
      { path: 'progress', element: <ProgressScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
    ],
  },
])
```

- [ ] **Step 5: App layout**

Replace `src/App.tsx`:
```tsx
import { Link, Outlet } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { UpdateToast } from './components/UpdateToast'

export function App() {
  return (
    <div className="app-shell">
      <header
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', borderBottom: '1px solid var(--line)',
        }}
      >
        <span className="serif" style={{ fontSize: 20 }}>
          Day<span style={{ color: 'var(--burg)' }}>cipher</span>
        </span>
        <Link to="/settings" aria-label="Settings" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
          ⚙
        </Link>
      </header>
      <Outlet />
      <BottomNav />
      <UpdateToast />
    </div>
  )
}
```

- [ ] **Step 6: Entry point**

Replace `src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { initPWA } from './pwa/registerSW'
import './styles/base.css'

initPWA()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```
Delete the leftover template files if present: `src/App.css`, `src/index.css`, `src/assets/react.svg`.

- [ ] **Step 7: Smoke test the shell renders**

Create `src/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { App } from './App'
import { TodayScreen } from './features/today/TodayScreen'

describe('App shell', () => {
  it('renders the Today screen and nav', () => {
    const router = createMemoryRouter(
      [{ path: '/', element: <App />, children: [{ index: true, element: <TodayScreen /> }] }],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Daycipher' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 8: Run tests, typecheck, lint, build**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add src/ index.html
git commit -m "feat(app): shell, routing, bottom nav, settings with backup"
```

---

## Task 16: Deploy config + CI

**Files:** Create `vercel.json`, `.github/workflows/ci.yml`; update `README.md`.

- [ ] **Step 1: Vercel SPA config**

Create `vercel.json`:
```json
{
  "rewrites": [{ "source": "/((?!.*\\.).*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: CI workflow**

Create `.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push: { branches: [main, daycipher] }
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

- [ ] **Step 3: Rewrite README**

Replace `README.md`:
```markdown
# Daycipher

Learn and train the skill of finding the **weekday of any date** in your head — based on
[Conway's Doomsday rule](https://en.wikipedia.org/wiki/Doomsday_rule). An offline-first,
installable PWA: learn the method, drill it with instant step-by-step feedback, and track
your progress over time.

## Develop
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # run the test suite
npm run build      # production build (PWA service worker)
```

The legacy Python/Tkinter prototype lives in `legacy/`.
```

- [ ] **Step 4: Verify everything one last time**

Run: `npm ci && npm run typecheck && npm run lint && npm test && npm run build`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add vercel.json .github README.md
git commit -m "chore: Vercel SPA config, CI workflow, README"
```

---

## Self-Review

**Spec coverage (Plan 1 scope):**
- Engine correctness, Odd+11 + Conway, explain, generation, exhaustive verification → Tasks 2–6. ✓
- Almanac design tokens + light/dark + pre-paint theme → Task 7. ✓
- IndexedDB data model (attempts/cards/skills/meta), streaks, backup → Tasks 8–11. ✓
- Settings + theme application → Task 12, 15. ✓
- PWA precache/offline/manifest/iOS/update/install → Tasks 13–14. ✓
- App shell + 4-tab nav + stubs → Task 15. ✓
- Deploy + CI → Task 16. ✓
- Deferred to later plans (intentionally): drill loop, stats/heatmap UI, curriculum, adaptivity/FSRS, gamification, Daily Challenge/Speedrun, sound/haptics, onboarding. (cards/skills stores are created now so the schema is stable.)

**Placeholder scan:** No TBD/TODO; every code step has complete code and exact commands.

**Type consistency:** `Attempt`, `Backup`, `Theme`, `StepTrace`, `Weekday`, `STORES`, `getDb`, `_resetDbForTests`, `getMeta/setMeta/recordPracticeDay`, `addAttempt/listAttempts/countByDay`, `exportAll/importAll`, `applyTheme/useSettings`, `initPWA/onNeedRefresh/applyUpdate` are defined once and reused consistently across tasks.
