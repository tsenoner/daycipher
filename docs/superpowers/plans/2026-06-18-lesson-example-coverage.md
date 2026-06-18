# Lesson Example Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace repetitive/fixed lesson example generation with tuned weighted sampling (plus a without-replacement coverage guarantee on the two small-domain stages), and widen the date range to the full proleptic Gregorian calendar (9999 BC – 9999 AD).

**Architecture:** Keep the drill's problem generator a pure function. Fix three latent modulo bugs so the engine is correct for negative (BC) years. Add a pure `warpYear` to spread years over a wide, centered, long-tailed distribution. Extract the per-stage generator into its own file, then rework `leap`/`century` to deal variants without replacement (pure, keyed on a per-run seed + the answer index the hook already tracks) and widen `year`/`full`/`speed`. Add a hybrid "Show another" engine-generated worked example to the three lesson stages that have one.

**Tech Stack:** TypeScript, React 18, Vite, Vitest, `@testing-library/react`, IndexedDB (fake-indexeddb in tests).

## Global Constraints

- Package manager: **pnpm**. Run tests with `pnpm test` (= `vitest run`) or a single file via `pnpm vitest run <path>`.
- Type-check must pass: `pnpm typecheck` (`tsc --noEmit`). Lint clean: `pnpm lint` (`eslint . --max-warnings 0`).
- **No backwards-compatibility burden** — there are no users/persisted data to grandfather; restructure freely.
- Weekday convention: `Sunday = 0 … Saturday = 6` (`Weekday = 0|1|2|3|4|5|6`).
- Years are **astronomical integers** internally (year 0 = 1 BC, −1 = 2 BC). Supported range: `[-9998, 9999]`.
- Lesson copy stays tight and research-backed; generated example answers must be engine-verified.
- All work is on branch `feat/lesson-example-coverage` and lands via PR.
- Existing public import surface: tests import `nextLessonProblem`, `gradeLesson`, `ANCHOR_DAYS`, `type LessonProblem` from `./useLessonDrill`. Preserve these imports (re-export after the extraction).

---

### Task 1: Engine modulo fixes for negative years

The engine is only exercised on 1900–2099 today; negative years hit unnormalized `%` and silently return wrong answers. Fix `centuryAnchor`, `yearDoomsdayOddEleven`, `yearDoomsdayConway`, and `explain`'s `start`.

**Files:**
- Modify: `src/engine/doomsday.ts`
- Test: `src/engine/doomsday.test.ts`

**Interfaces:**
- Consumes: existing `weekdayOfYMD`, `centuryAnchor`, `yearDoomsdayOddEleven`, `yearDoomsdayConway`, `explain`, `isLeapYear` (signatures unchanged).
- Produces: same signatures, now correct for `year ∈ [-9998, 9999]`.

- [ ] **Step 1: Write the failing tests**

Add to the end of `src/engine/doomsday.test.ts` (inside the file; create a new `describe`):

```ts
import { weekdayOfYMD, yearDoomsdayOddEleven, yearDoomsdayConway, centuryAnchor } from './doomsday'

/** Independent oracle: proleptic-Gregorian weekday via Julian Day Number, Sunday = 0. */
function refWeekday(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  const jdn =
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  return (((jdn + 1) % 7) + 7) % 7
}

describe('proleptic Gregorian across the wide range', () => {
  it('weekdayOfYMD matches the JDN reference, including BC years', () => {
    const rng = makeRng(20260618)
    for (let i = 0; i < 2000; i++) {
      const y = -9998 + Math.floor(rng() * (9999 - -9998 + 1))
      const m = 1 + Math.floor(rng() * 12)
      const d = 15 // valid in every month
      expect(weekdayOfYMD(y, m, d)).toBe(refWeekday(y, m, d))
    }
  })

  it('is exactly periodic every 400 years (incl. across year 0)', () => {
    for (const y of [-800, -401, -100, 0, 99, 1582, 1900, 2024]) {
      expect(weekdayOfYMD(y, 7, 15)).toBe(weekdayOfYMD(y + 400, 7, 15))
    }
  })

  it('Conway and Odd+11 agree on the year doomsday for BC years', () => {
    for (const y of [-4999, -1200, -400, -1, 0]) {
      expect(yearDoomsdayConway(y)).toBe(yearDoomsdayOddEleven(y))
    }
  })

  it('centuryAnchor is normalized for negative centuries (no negative mod leak)', () => {
    // 4/4 is an anchor, so its weekday equals the year doomsday for any year.
    for (const y of [-4300, -300, -7, 0]) {
      expect(weekdayOfYMD(y, 4, 4)).toBe(yearDoomsdayOddEleven(y))
    }
  })
})
```

Note: `makeRng` is already imported at the top of `doomsday.test.ts`? It is NOT — add `import { makeRng } from './generate'` to the test file's imports if absent.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/engine/doomsday.test.ts`
Expected: FAIL — the new `describe` fails (wrong weekdays for negative years; `t/2` produces non-integers in `yearDoomsdayOddEleven`).

- [ ] **Step 3: Apply the fixes in `src/engine/doomsday.ts`**

Replace `centuryAnchor`:

```ts
/** Century anchor weekday. anchor = (5·(c mod 4) + 2) mod 7, c = floor(year/100), Tuesday(2) base. */
export function centuryAnchor(year: number): Weekday {
  const c = Math.floor(year / 100)
  return mod7(5 * (((c % 4) + 4) % 4) + 2)
}
```

Replace `yearDoomsdayOddEleven`:

```ts
/** Year's doomsday weekday via the Fong–Walters "Odd+11" method. */
export function yearDoomsdayOddEleven(year: number): Weekday {
  let t = ((year % 100) + 100) % 100
  if (t % 2 === 1) t += 11
  t = t / 2
  if (t % 2 === 1) t += 11
  t = 7 - (t % 7)
  return mod7(centuryAnchor(year) + t)
}
```

Replace `yearDoomsdayConway`'s first line:

```ts
export function yearDoomsdayConway(year: number): Weekday {
  const y = ((year % 100) + 100) % 100
  const a = Math.floor(y / 12)
  const b = y % 12
  const c = Math.floor(b / 4)
  return mod7(centuryAnchor(year) + a + b + c)
}
```

In `explain`, replace `const start = year % 100` with:

```ts
  const start = ((year % 100) + 100) % 100
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/engine/doomsday.test.ts`
Expected: PASS (all suites, old and new).

- [ ] **Step 5: Commit**

```bash
git add src/engine/doomsday.ts src/engine/doomsday.test.ts
git commit -m "fix(engine): normalize modulo so doomsday math is correct for BC years"
```

---

### Task 2: `warpYear` — wide, centered, long-tailed year distribution

A pure function mapping a uniform `u ∈ [0,1)` to an integer year, dense near a center (~2050), with heavy tails reaching the BC / far-future extremes.

**Files:**
- Modify: `src/engine/generate.ts`
- Test: `src/engine/generate.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `warpYear(u: number, opts?: { center?: number; scale?: number; min?: number; max?: number }): number`. Defaults `center = 2050`, `scale = 180`, `min = -9998`, `max = 9999`. Exported from `src/engine` (via `export * from './generate'`).

- [ ] **Step 1: Write the failing test**

Add to `src/engine/generate.test.ts` (new `describe`, and add `warpYear` to the import from `./generate`):

```ts
import { warpYear } from './generate'

describe('warpYear', () => {
  it('maps the midpoint to the center and stays within bounds', () => {
    expect(warpYear(0.5)).toBe(2050)
    for (let i = 1; i < 1000; i++) {
      const y = warpYear(i / 1000)
      expect(y).toBeGreaterThanOrEqual(-9998)
      expect(y).toBeLessThanOrEqual(9999)
      expect(Number.isInteger(y)).toBe(true)
    }
  })

  it('keeps ~80% of draws in the relatable core yet reaches both extremes', () => {
    const N = 20000
    let inCore = 0
    let min = Infinity
    let max = -Infinity
    for (let i = 1; i < N; i++) {
      const y = warpYear(i / N)
      if (y >= 1500 && y <= 2600) inCore++
      min = Math.min(min, y)
      max = Math.max(max, y)
    }
    const frac = inCore / (N - 1)
    expect(frac).toBeGreaterThan(0.7)
    expect(frac).toBeLessThan(0.9)
    expect(min).toBe(-9998) // deep BC tail (clamped)
    expect(max).toBe(9999) // deep future tail (clamped)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/engine/generate.test.ts`
Expected: FAIL with "warpYear is not a function" / not exported.

- [ ] **Step 3: Implement `warpYear` in `src/engine/generate.ts`**

Append:

```ts
export interface WarpYearOpts {
  center?: number
  scale?: number
  min?: number
  max?: number
}

/**
 * Map a uniform u∈[0,1) to an integer year via the Cauchy inverse-CDF: dense near
 * `center`, heavy symmetric tails that reach `min`/`max` (then clamp). Monotonic, so it
 * preserves the spread of whatever stream feeds it. Years are astronomical (0 = 1 BC).
 */
export function warpYear(u: number, opts: WarpYearOpts = {}): number {
  const { center = 2050, scale = 180, min = -9998, max = 9999 } = opts
  const clamped = Math.min(Math.max(u, 1e-9), 1 - 1e-9)
  const raw = center + scale * Math.tan(Math.PI * (clamped - 0.5))
  return Math.min(max, Math.max(min, Math.round(raw)))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/engine/generate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/generate.ts src/engine/generate.test.ts
git commit -m "feat(engine): add warpYear for a wide centered long-tailed year distribution"
```

---

### Task 3: Era-aware date formatting

Add `formatYear` (BC/AD label) and route `formatDate` through it. Lock negative-year `ymdKey` behavior with a test (the implementation already works — this guards it).

**Files:**
- Modify: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`, `src/lib/datekey.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `formatYear(year: number): string` ("1200 BC" for `year ≤ 0`, else the plain number). `formatDate(year, month, day)` now renders the era label.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/format.test.ts` (import `formatYear`, `formatDate`):

```ts
import { formatYear, formatDate } from './format'

describe('era-aware year/date formatting', () => {
  it('labels BC for astronomical years <= 0', () => {
    expect(formatYear(2005)).toBe('2005')
    expect(formatYear(1)).toBe('1')
    expect(formatYear(0)).toBe('1 BC')
    expect(formatYear(-1)).toBe('2 BC')
    expect(formatYear(-1199)).toBe('1200 BC')
  })

  it('formatDate renders the era label', () => {
    expect(formatDate(2030, 12, 25)).toBe('25 December 2030')
    expect(formatDate(-1199, 3, 14)).toBe('14 March 1200 BC')
  })
})
```

Add to `src/lib/datekey.test.ts` (import `ymdKey` if not already):

```ts
it('keys negative (BC) years without corruption', () => {
  expect(ymdKey(-1200, 3, 14)).toBe('-1200-03-14')
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run src/lib/format.test.ts src/lib/datekey.test.ts`
Expected: `format.test.ts` FAILS ("formatYear is not a function"); the `datekey` case PASSES already (acceptable — it locks current behavior). Confirm the format failure.

- [ ] **Step 3: Implement in `src/lib/format.ts`**

Add `formatYear` and update `formatDate`:

```ts
/** Human label for an astronomical year: y <= 0 -> "<1-y> BC", else the plain year. */
export const formatYear = (year: number): string => (year <= 0 ? `${1 - year} BC` : String(year))

export function formatDate(year: number, month: number, day: number): string {
  return `${day} ${MONTHS[month - 1]} ${formatYear(year)}`
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run src/lib/format.test.ts src/lib/datekey.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts src/lib/datekey.test.ts
git commit -m "feat(lib): era-aware formatYear/formatDate; lock BC ymdKey"
```

---

### Task 4: Extract the pure generator into `lessonGen.ts`

`useLessonDrill.ts` is already large; the pure problem generator and grader will grow. Move them out, re-export for compatibility. **Pure refactor — no behavior change.**

**Files:**
- Create: `src/features/learn/lessonGen.ts`
- Modify: `src/features/learn/useLessonDrill.ts`

**Interfaces:**
- Produces (from `lessonGen.ts`): `type AnswerKind`, `interface LessonProblem`, `const ANCHOR_DAYS`, `function nextLessonProblem(stageId, rng)`, `function gradeLesson(...)`.
- `useLessonDrill.ts` re-exports all of the above so existing test imports keep working.

- [ ] **Step 1: Create `src/features/learn/lessonGen.ts`**

Move (cut) from `useLessonDrill.ts` the following symbols verbatim — `ANCHOR_DAYS`, `AnswerKind`, `LessonProblem`, `CENTURY_WEIGHTS`, `nextLessonProblem`, `leapJanFebDate`, `LEAP_DRILL_YEARS`, `leapDrillYear`, `gradeLesson` — into the new file, with their imports:

```ts
import {
  centuryAnchor,
  daysInMonth,
  generateDate,
  isLeapYear,
  mod7,
  monthAnchor,
  pick,
  pickFrom,
  thisYearDoomsday,
  weekdayOfYMD,
  yearDoomsdayOddEleven,
  CURRENT_YEAR,
  type Weekday,
} from '../../engine'
import { gradeNumber, gradeProblem, gradeWeekday } from '../practice/drill'
import type { Attempt } from '../../db/db'
import { monthName, weekdayName } from '../../lib/format'
import { getStage } from './curriculum'

// ...(moved ANCHOR_DAYS, AnswerKind, LessonProblem, CENTURY_WEIGHTS, nextLessonProblem,
//     leapJanFebDate, LEAP_DRILL_YEARS, leapDrillYear, gradeLesson exactly as they were)
```

- [ ] **Step 2: Update `src/features/learn/useLessonDrill.ts`**

Remove the moved symbols and their now-unused imports from `useLessonDrill.ts`. Import what the hook still needs from `lessonGen`, and re-export the public surface:

```ts
import { nextLessonProblem, gradeLesson, type LessonProblem, type AnswerKind } from './lessonGen'

// ...hook code unchanged...

// Preserve the public import surface used by tests and screens.
export { nextLessonProblem, gradeLesson, ANCHOR_DAYS } from './lessonGen'
export type { LessonProblem, AnswerKind } from './lessonGen'
```

Note: the hook body still references `nextLessonProblem`, `gradeLesson`, `LessonProblem`, `AnswerKind` — now via the import above. `ANCHOR_DAYS` is only re-exported (the hook doesn't use it directly).

- [ ] **Step 3: Run the full suite to verify nothing changed**

Run: `pnpm vitest run && pnpm typecheck`
Expected: PASS — identical behavior; all existing `useLessonDrill.test.ts` tests green.

- [ ] **Step 4: Commit**

```bash
git add src/features/learn/lessonGen.ts src/features/learn/useLessonDrill.ts
git commit -m "refactor(learn): extract pure problem generator into lessonGen"
```

---

### Task 5: Thread a per-run seed + answer index through the drill

Add a no-op `ctx` parameter to `nextLessonProblem` and feed it a stable `runSeed` plus the per-mount served-problem `index` from the hook. **No stage uses `ctx` yet — behavior unchanged.**

**Files:**
- Modify: `src/features/learn/lessonGen.ts`, `src/features/learn/useLessonDrill.ts`
- Test: `src/features/learn/useLessonDrill.test.ts`

**Interfaces:**
- Produces: `interface LessonCtx { index?: number; runSeed?: number }`; `nextLessonProblem(stageId: string, rng: () => number, ctx?: LessonCtx): LessonProblem`. `LessonDrillOptions` gains `runSeed?: number`.

- [ ] **Step 1: Write the failing test**

Add to `src/features/learn/useLessonDrill.test.ts` in the `nextLessonProblem` describe:

```ts
it('accepts an optional ctx without changing weighted-stage output', () => {
  const a = nextLessonProblem('full', makeRng(99))
  const b = nextLessonProblem('full', makeRng(99), { index: 3, runSeed: 7 })
  expect(b).toEqual(a) // weighted stages ignore ctx
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/features/learn/useLessonDrill.test.ts -t "optional ctx"`
Expected: FAIL — `nextLessonProblem` takes 2 args (TS error / arity), or the third arg is rejected by types.

- [ ] **Step 3: Add the `ctx` param in `src/features/learn/lessonGen.ts`**

```ts
export interface LessonCtx {
  /** Per-mount served-problem index (0-based); used by without-replacement stages. */
  index?: number
  /** Stable per-run seed; used by without-replacement stages. */
  runSeed?: number
}

export function nextLessonProblem(
  stageId: string,
  rng: () => number,
  ctx: LessonCtx = {},
): LessonProblem {
  void ctx // unused until leap/century adopt without-replacement (Tasks 6–7)
  const mode = `learn:${stageId}`
  // ...rest unchanged...
}
```

Re-export the new type from `useLessonDrill.ts`:

```ts
export type { LessonProblem, AnswerKind, LessonCtx } from './lessonGen'
```

- [ ] **Step 4: Thread `runSeed` + `index` in `src/features/learn/useLessonDrill.ts`**

Add to `LessonDrillOptions`:

```ts
  /** Stable per-run seed for without-replacement stages (default: random). */
  runSeed?: number
```

In the hook, after the existing refs, add:

```ts
  const runSeedRef = useRef<number>(opts.runSeed ?? Math.floor(Math.random() * 0x7fffffff))
  const servedRef = useRef(0) // per-mount count of problems served (the ctx index source)
```

Define a small helper inside the hook for the next ctx:

```ts
  const serve = useCallback(() => {
    const index = servedRef.current
    servedRef.current = index + 1
    return nextLessonProblem(stageId, rngRef.current, { index, runSeed: runSeedRef.current })
  }, [stageId])
```

Replace **every** `nextLessonProblem(stageId, rngRef.current)` call site (both branches of the load effect and the one in `answer`) with `serve()`. In the load effect, the practice and non-practice branches each set `setProblem(serve())`. Because `serve()` increments `servedRef`, the load path serves index 0 (servedRef → 1) and `answer` continues from there.

Note (StrictMode): `runSeedRef`/`servedRef` are set once and `serve()` is only called from effects/callbacks, mirroring the file's existing ref discipline; a dev double-invoke at most re-serves index 0 (same ctx), which is harmless.

- [ ] **Step 5: Run the full drill suite to verify it passes and nothing regressed**

Run: `pnpm vitest run src/features/learn/useLessonDrill.test.ts && pnpm typecheck`
Expected: PASS (new test green; all prior tests green).

- [ ] **Step 6: Commit**

```bash
git add src/features/learn/lessonGen.ts src/features/learn/useLessonDrill.ts src/features/learn/useLessonDrill.test.ts
git commit -m "feat(learn): thread runSeed+index ctx into the problem generator (no-op)"
```

---

### Task 6: `leap` stage — without-replacement over the 4 rule-classes, wide range

Replace the fixed 16-year pool with a `coveringPick` over the four leap-rule classes, each instantiated to a real year from the wide distribution.

**Files:**
- Modify: `src/features/learn/lessonGen.ts`
- Test: `src/features/learn/lessonGen.test.ts` (create), `src/features/learn/useLessonDrill.test.ts` (update the leap case)

**Interfaces:**
- Consumes: `warpYear`, `makeRng`, `isLeapYear` from `../../engine`; `formatYear` from `../../lib/format`; `LessonCtx` (Task 5).
- Produces: `coveringPick<T>(domain: readonly T[], runSeed: number, index: number): T` (exported for tests).

- [ ] **Step 1: Write the failing tests**

Create `src/features/learn/lessonGen.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { coveringPick, nextLessonProblem } from './lessonGen'
import { makeRng, isLeapYear } from '../../engine'

describe('coveringPick', () => {
  it('deals every item once per cycle before repeating', () => {
    const domain = ['a', 'b', 'c', 'd'] as const
    const cycle0 = [0, 1, 2, 3].map((i) => coveringPick(domain, 42, i))
    const cycle1 = [4, 5, 6, 7].map((i) => coveringPick(domain, 42, i))
    expect(new Set(cycle0).size).toBe(4)
    expect(new Set(cycle1).size).toBe(4)
  })
})

describe('leap stage', () => {
  it('covers all four leap-rule classes within the first four problems', () => {
    const rng = makeRng(5)
    const flags = [0, 1, 2, 3].map((index) => {
      const p = nextLessonProblem('leap', rng, { index, runSeed: 99 })
      const year = Number(p.prompt.replace(/[^\d-]/g, '').match(/-?\d+/)?.[0])
      return { correct: p.correct, leap: isLeapYear(year) ? 1 : 0 }
    })
    // Across a covering cycle we must see both leap (1) and non-leap (0) answers.
    expect(new Set(flags.map((f) => f.correct))).toEqual(new Set([0, 1]))
    // Every prompt's stated flag agrees with the engine.
    for (const f of flags) expect(f.correct).toBe(f.leap)
  })

  it('reaches century cases beyond the old 1900-2099 pool over many runs', () => {
    const years = new Set<number>()
    for (let s = 0; s < 200; s++) {
      const p = nextLessonProblem('leap', makeRng(s), { index: 0, runSeed: s })
      years.add(Number(p.prompt.replace(/[^\d-]/g, '').match(/-?\d+/)?.[0]))
    }
    // The wide distribution must produce at least one year outside 1900-2099.
    expect([...years].some((y) => y < 1900 || y > 2099)).toBe(true)
  })
})
```

Update the existing leap test in `src/features/learn/useLessonDrill.test.ts` — replace the `stage leap asks a yes/no…` test body (it can no longer assume a 4-digit AD year) with:

```ts
it('stage leap asks a yes/no leap-year question with a 0/1 answer', () => {
  const p = nextLessonProblem('leap', makeRng(31), { index: 0, runSeed: 1 })
  expect(p.answerKind).toBe('boolean')
  expect([0, 1]).toContain(p.correct)
  expect(p.prompt).toMatch(/leap year\?/i)
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run src/features/learn/lessonGen.test.ts`
Expected: FAIL — `coveringPick` is not exported; leap still uses the fixed pool (the "century cases beyond" / "all four classes" assertions fail).

- [ ] **Step 3: Implement in `src/features/learn/lessonGen.ts`**

Add `makeRng` and `warpYear` to the engine import and `formatYear` to the format import. Add the covering primitive and leap helpers (place near the top, after the imports). Delete `LEAP_DRILL_YEARS` and `leapDrillYear`.

```ts
/** Fisher–Yates shuffle of a copy, driven by `rng`. */
function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Deal `domain` without replacement as a pure fn of (runSeed, index): every item
 *  appears once per cycle of length `domain.length` before any repeats. */
export function coveringPick<T>(domain: readonly T[], runSeed: number, index: number): T {
  const n = domain.length
  const cycle = Math.floor(index / n)
  const pos = ((index % n) + n) % n
  return shuffle(domain, makeRng((runSeed + cycle * 0x9e3779b1) >>> 0))[pos]
}

type LeapClass = 'div4not100' | 'div100not400' | 'div400' | 'notdiv4'
const LEAP_CLASSES: readonly LeapClass[] = ['div4not100', 'div100not400', 'div400', 'notdiv4']
const LEAP_PRED: Record<LeapClass, (y: number) => boolean> = {
  div4not100: (y) => y % 4 === 0 && y % 100 !== 0,
  div100not400: (y) => y % 100 === 0 && y % 400 !== 0,
  div400: (y) => y % 400 === 0,
  notdiv4: (y) => y % 4 !== 0,
}

/** A year of the given leap class, near the wide centered distribution. */
function leapClassYear(klass: LeapClass, rng: () => number): number {
  const base = warpYear(rng())
  const pred = LEAP_PRED[klass]
  for (let d = 0; d <= 800; d++) {
    if (base + d <= 9999 && pred(base + d)) return base + d
    if (base - d >= -9998 && pred(base - d)) return base - d
  }
  return klass === 'div400' ? 2000 : klass === 'div100not400' ? 1900 : klass === 'div4not100' ? 2024 : 2025
}
```

Replace the `case 'leap':` block in `nextLessonProblem`:

```ts
    case 'leap': {
      const klass = coveringPick(LEAP_CLASSES, ctx.runSeed ?? 0, ctx.index ?? 0)
      const year = leapClassYear(klass, rng)
      return {
        stageId,
        mode,
        prompt: `Is ${formatYear(year)} a leap year?`,
        answerKind: 'boolean',
        correct: isLeapYear(year) ? 1 : 0,
        date: null,
        timed,
      }
    }
```

Remove the now-dead `void ctx` line added in Task 5 (ctx is used now).

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run src/features/learn/lessonGen.test.ts src/features/learn/useLessonDrill.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/learn/lessonGen.ts src/features/learn/lessonGen.test.ts src/features/learn/useLessonDrill.test.ts
git commit -m "feat(learn): leap stage covers all 4 rule-classes over the wide range"
```

---

### Task 7: `century` covering + wide `year`/`full`/`speed` + widened `mod7`

Deal the five taught centuries without replacement; widen `year`/`full`/`speed` to the proleptic range via `warpYear`; widen the `mod7` addend pairs; route year-bearing prompts through `formatYear`.

**Files:**
- Modify: `src/features/learn/lessonGen.ts`
- Test: `src/features/learn/lessonGen.test.ts`

**Interfaces:**
- Consumes: `warpYear`, `coveringPick` (Task 6), `formatYear`, `daysInMonth`, `weekdayOfYMD`, `centuryAnchor`, `yearDoomsdayOddEleven`, `isLeapYear`, `pick`.
- Produces: no new exports (internal stage reworks).

- [ ] **Step 1: Write the failing tests**

Append to `src/features/learn/lessonGen.test.ts`:

```ts
import { centuryAnchor, weekdayOfYMD, yearDoomsdayOddEleven, daysInMonth } from '../../engine'

describe('century stage', () => {
  it('deals all five taught centuries within five problems', () => {
    const rng = makeRng(3)
    const prompts = [0, 1, 2, 3, 4].map(
      (index) => nextLessonProblem('century', rng, { index, runSeed: 8 }).prompt,
    )
    const decades = new Set(prompts.map((p) => p.match(/\d+/)![0]))
    expect(decades).toEqual(new Set(['1700', '1800', '1900', '2000', '2100']))
  })

  it('answers each century with its engine anchor', () => {
    const p = nextLessonProblem('century', makeRng(1), { index: 0, runSeed: 0 })
    const year = Number(p.prompt.match(/\d+/)![0])
    expect(p.correct).toBe(centuryAnchor(year))
  })
})

describe('wide year/full stages', () => {
  it('year draws beyond 1900-2099 over many seeds and grades via the engine', () => {
    const years = new Set<number>()
    for (let s = 0; s < 300; s++) {
      const p = nextLessonProblem('year', makeRng(s))
      const sign = /BC/.test(p.prompt) ? -1 : 1
      const mag = Number(p.prompt.match(/\d+/)![0])
      const year = sign < 0 ? 1 - mag : mag
      years.add(year)
      expect(p.correct).toBe(yearDoomsdayOddEleven(year))
    }
    expect([...years].some((y) => y < 1900 || y > 2099)).toBe(true)
  })

  it('full produces valid, engine-correct dated problems incl. BC', () => {
    let sawWide = false
    for (let s = 0; s < 300; s++) {
      const p = nextLessonProblem('full', makeRng(s))
      expect(p.date).not.toBeNull()
      const { year, month, day } = p.date!
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(daysInMonth(year, month))
      expect(p.correct).toBe(weekdayOfYMD(year, month, day))
      if (year < 1900 || year > 2099) sawWide = true
    }
    expect(sawWide).toBe(true)
  })
})

describe('mod7 stage', () => {
  it('uses a widened addend-pair range', () => {
    // Over many seeds the pair branch must produce an addend above the old max of 6.
    let sawWide = false
    for (let s = 0; s < 400 && !sawWide; s++) {
      const p = nextLessonProblem('mod7', makeRng(s))
      const m = p.prompt.match(/^(\d+) \+ (\d+)/)
      if (m && (Number(m[1]) > 6 || Number(m[2]) > 6)) sawWide = true
    }
    expect(sawWide).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run src/features/learn/lessonGen.test.ts`
Expected: FAIL — century still weighted (random, not all five guaranteed), `year`/`full` still 1900–2099, `mod7` pairs capped at 6.

- [ ] **Step 3: Implement in `src/features/learn/lessonGen.ts`**

Add a taught-centuries constant and a wide-leap helper near the leap helpers; delete `CENTURY_WEIGHTS` and `leapJanFebDate` (replaced):

```ts
const TAUGHT_CENTURIES: readonly number[] = [1700, 1800, 1900, 2000, 2100]

/** Nearest leap year to `base` within the supported range (for the full-stage Jan/Feb trap). */
function nearestLeapYear(base: number): number {
  for (let d = 0; d <= 8; d++) {
    if (base + d <= 9999 && isLeapYear(base + d)) return base + d
    if (base - d >= -9998 && isLeapYear(base - d)) return base - d
  }
  return 2000
}
```

Rework the `mod7` pair branch — change `pick(rng, 3, 6)` to `pick(rng, 2, 9)` for both `a` and `b`:

```ts
      const a = pick(rng, 2, 9)
      const b = pick(rng, 2, 9)
```

Replace the `case 'century':` block:

```ts
    case 'century': {
      const year = coveringPick(TAUGHT_CENTURIES, ctx.runSeed ?? 0, ctx.index ?? 0)
      return {
        stageId,
        mode,
        prompt: `The ${year}s — century anchor weekday?`,
        answerKind: 'weekday',
        correct: centuryAnchor(year),
        date: null,
        dimension: 'anchor',
        timed,
      }
    }
```

Replace the `case 'year':` block:

```ts
    case 'year': {
      const year = warpYear(rng())
      return {
        stageId,
        mode,
        prompt: `Doomsday of ${formatYear(year)}?`,
        answerKind: 'weekday',
        correct: yearDoomsdayOddEleven(year),
        date: null,
        dimension: 'yearDoom',
        timed,
      }
    }
```

Replace the `case 'full': case 'speed':` block:

```ts
    case 'full':
    case 'speed': {
      // ~20% leap Jan/Feb dates (the recurring trap), else a wide proleptic date.
      let year: number
      let month: number
      if (stageId === 'full' && rng() < 0.2) {
        year = nearestLeapYear(warpYear(rng()))
        month = pick(rng, 1, 2)
      } else {
        year = warpYear(rng())
        month = pick(rng, 1, 12)
      }
      const day = pick(rng, 1, daysInMonth(year, month))
      return {
        stageId,
        mode,
        prompt: `${day} ${monthName(month)} ${formatYear(year)} — weekday?`,
        answerKind: 'weekday',
        correct: weekdayOfYMD(year, month, day),
        date: { year, month, day },
        timed,
      }
    }
```

Note: `generateDate` is still used by the `thisyear` case (current year) — keep its import. Remove the import of anything now unused (e.g. if `leapJanFebDate` was the only consumer of something). Run `pnpm lint` to catch unused symbols.

- [ ] **Step 4: Run to verify they pass (plus the full drill suite)**

Run: `pnpm vitest run src/features/learn/lessonGen.test.ts src/features/learn/useLessonDrill.test.ts && pnpm typecheck && pnpm lint`
Expected: PASS, no type/lint errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/learn/lessonGen.ts src/features/learn/lessonGen.test.ts
git commit -m "feat(learn): century covering + wide year/full/speed + widened mod7"
```

---

### Task 8: `workedExample.ts` — engine-generated walkthroughs

Generate a fresh, illustrative, engine-correct worked example for `thisyear` / `year` / `full`, formatted to match each hero's depth, with a computed century-anchor step for exotic centuries.

**Files:**
- Create: `src/features/learn/workedExample.ts`
- Test: `src/features/learn/workedExample.test.ts`

**Interfaces:**
- Consumes: `explain`, `weekdayOfYMD`, `yearDoomsdayOddEleven`, `daysInMonth`, `pick`, `warpYear`, `CURRENT_YEAR`, `type StepTrace` from `../../engine`; `monthName`, `weekdayName`, `formatYear` from `../../lib/format`.
- Produces: `generateWorkedExample(stageId: 'thisyear' | 'year' | 'full', rng: () => number): { date: string; steps: string[]; answer: string; check: ExampleCheck }` (matches the curriculum `example` block shape; `ExampleCheck` imported from `./curriculum`). `WORKED_STAGES: readonly string[]`.

- [ ] **Step 1: Write the failing tests**

Create `src/features/learn/workedExample.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateWorkedExample, WORKED_STAGES } from './workedExample'
import { makeRng, weekdayOfYMD, yearDoomsdayOddEleven } from '../../engine'
import { weekdayName } from '../../lib/format'

describe('generateWorkedExample', () => {
  it('exposes exactly the three example-bearing stages', () => {
    expect([...WORKED_STAGES].sort()).toEqual(['full', 'thisyear', 'year'])
  })

  it('thisyear/full answers agree with the engine and avoid a zero-offset (illustrative)', () => {
    for (const stage of ['thisyear', 'full'] as const) {
      for (let s = 0; s < 50; s++) {
        const e = generateWorkedExample(stage, makeRng(s))
        const c = e.check as { kind: 'ymd'; year: number; month: number; day: number }
        expect(c.kind).toBe('ymd')
        expect(e.answer.startsWith(weekdayName(weekdayOfYMD(c.year, c.month, c.day)))).toBe(true)
        expect(e.steps.length).toBeGreaterThan(0)
      }
    }
  })

  it('year answers agree with the engine', () => {
    for (let s = 0; s < 50; s++) {
      const e = generateWorkedExample('year', makeRng(s))
      const c = e.check as { kind: 'yearDoom'; year: number }
      expect(c.kind).toBe('yearDoom')
      expect(e.answer.startsWith(weekdayName(yearDoomsdayOddEleven(c.year)))).toBe(true)
    }
  })

  it('shows a computed-anchor step for exotic (non-taught) centuries', () => {
    // Force exotic years by scanning seeds until one lands outside 1700-2100.
    let found = false
    for (let s = 0; s < 500 && !found; s++) {
      const e = generateWorkedExample('full', makeRng(s))
      const c = e.check as { kind: 'ymd'; year: number }
      if (c.year < 1700 || c.year > 2100) {
        found = true
        expect(e.steps.some((step) => /mod 4|5\s*×/.test(step))).toBe(true)
      }
    }
    expect(found).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/features/learn/workedExample.test.ts`
Expected: FAIL — module/exports do not exist.

- [ ] **Step 3: Implement `src/features/learn/workedExample.ts`**

```ts
import {
  explain,
  weekdayOfYMD,
  yearDoomsdayOddEleven,
  daysInMonth,
  pick,
  warpYear,
  CURRENT_YEAR,
  type StepTrace,
} from '../../engine'
import { monthName, weekdayName, formatYear } from '../../lib/format'
import type { ExampleCheck } from './curriculum'

export const WORKED_STAGES = ['thisyear', 'year', 'full'] as const
export type WorkedStage = (typeof WORKED_STAGES)[number]

export interface GeneratedExample {
  date: string
  steps: string[]
  answer: string
  check: ExampleCheck
}

/** The century-anchor line: recalled for taught centuries, computed for exotic ones. */
function anchorStep(year: number, anchor: number): string {
  const century = Math.floor(year / 100) * 100
  if (century >= 1700 && century <= 2100) {
    return `The ${century}s anchor is ${weekdayName(anchor as 0 | 1 | 2 | 3 | 4 | 5 | 6)}`
  }
  const c = Math.floor(year / 100)
  return `Century anchor: (5 × (${c} mod 4) + 2) mod 7 = ${weekdayName(anchor as 0 | 1 | 2 | 3 | 4 | 5 | 6)}`
}

/** The Odd+11 substeps as display lines. */
function oddElevenSteps(t: StepTrace): string[] {
  const o = t.oddEleven
  return [
    o.start % 2 === 1 ? `T = ${o.start} is odd → +11 = ${o.afterStep1}` : `T = ${o.start} is even`,
    `Halve: ${o.afterStep1} ÷ 2 = ${o.halved}`,
    o.halved % 2 === 1 ? `${o.halved} is odd → +11 = ${o.afterStep3}` : `${o.halved} is even → leave it`,
    `7 − (${o.afterStep3} mod 7) = ${o.finalAdd}`,
  ]
}

/** The "step forward from the month anchor" line. */
function offsetStep(t: StepTrace, day: number): string {
  const diff = day - t.monthAnchorDay
  return `From the ${t.monthAnchorDay}th to the ${day}th: ${day} − ${t.monthAnchorDay} = ${diff} → ${weekdayName(t.result)}`
}

function datedExample(stage: WorkedStage, year: number, month: number, day: number): GeneratedExample {
  const t = explain(year, month, day)
  const steps =
    stage === 'thisyear'
      ? [
          `${formatYear(year)}'s doomsday = ${weekdayName(t.yearDoomsday)}`,
          `Nearest ${monthName(month)} anchor: the ${t.monthAnchorDay}th = ${weekdayName(t.monthAnchorWeekday)}`,
          offsetStep(t, day),
        ]
      : [
          anchorStep(year, t.centuryAnchor),
          ...oddElevenSteps(t),
          `${formatYear(year)} doomsday = ${weekdayName(t.yearDoomsday)}`,
          `${monthName(month)} anchor: the ${t.monthAnchorDay}th = ${weekdayName(t.monthAnchorWeekday)}`,
          offsetStep(t, day),
        ]
  return {
    date: `${day} ${monthName(month)} ${formatYear(year)}`,
    steps,
    answer: weekdayName(t.result),
    check: { kind: 'ymd', year, month, day },
  }
}

/** Generate a fresh, illustrative, engine-correct worked example for the stage. */
export function generateWorkedExample(stage: WorkedStage, rng: () => number): GeneratedExample {
  if (stage === 'year') {
    const year = warpYear(rng())
    const t = explain(year, 4, 4) // any anchor date exposes the year doomsday
    return {
      date: `Year ${formatYear(year)}`,
      steps: [anchorStep(year, t.centuryAnchor), ...oddElevenSteps(t), ``].filter(Boolean).concat([
        `${weekdayName(t.centuryAnchor)} + ${t.oddEleven.finalAdd} → ${weekdayName(t.yearDoomsday)}`,
      ]),
      answer: `${weekdayName(t.yearDoomsday)} — every doomsday date in ${formatYear(year)} is a ${weekdayName(t.yearDoomsday)}`,
      check: { kind: 'yearDoom', year },
    }
  }
  // thisyear / full: reject a zero offset so "step forward, cast out 7" is visible.
  const baseYear = stage === 'thisyear' ? CURRENT_YEAR : warpYear(rng())
  for (let tries = 0; tries < 25; tries++) {
    const year = stage === 'thisyear' ? baseYear : warpYear(rng())
    const month = pick(rng, 1, 12)
    const day = pick(rng, 1, daysInMonth(year, month))
    if (explain(year, month, day).offset !== 0) return datedExample(stage, year, month, day)
  }
  // Fallback: accept whatever the last draw was.
  const year = stage === 'thisyear' ? baseYear : warpYear(rng())
  const month = pick(rng, 1, 12)
  const day = pick(rng, 1, daysInMonth(year, month))
  return datedExample(stage, year, month, day)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/features/learn/workedExample.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/learn/workedExample.ts src/features/learn/workedExample.test.ts
git commit -m "feat(learn): engine-generated illustrative worked examples"
```

---

### Task 9: `WorkedExample` component + "Show another" wiring

Render the bespoke hero example by default with a "Show another" button that swaps in a generated walkthrough; reset returns to the hero. Thread `stageId` through `LessonBlocks`.

**Files:**
- Create: `src/components/WorkedExample.tsx`
- Modify: `src/components/LessonBlocks.tsx`, `src/features/learn/LessonScreen.tsx`
- Test: `src/components/WorkedExample.test.tsx`

**Interfaces:**
- Consumes: `generateWorkedExample`, `WORKED_STAGES` (Task 8); `type Block` from `../features/learn/curriculum`.
- Produces: `WorkedExample({ stageId, hero, rng? }: { stageId: string; hero: Extract<Block, { kind: 'example' }>; rng?: () => number })`. `LessonBlocks` gains a required `stageId: string` prop.

- [ ] **Step 1: Write the failing test**

Create `src/components/WorkedExample.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkedExample } from './WorkedExample'
import { makeRng } from '../engine'
import { getStage, type Block } from '../features/learn/curriculum'

const hero = getStage('full')!.blocks.find((b): b is Extract<Block, { kind: 'example' }> => b.kind === 'example')!

describe('WorkedExample', () => {
  it('shows the hero by default and swaps to a generated one on "Show another"', async () => {
    render(<WorkedExample stageId="full" hero={hero} rng={makeRng(3)} />)
    expect(screen.getByText(hero.date)).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: /show another/i }))
    // The hero date is gone; a generated "→ <Weekday>" answer is shown.
    expect(screen.queryByText(hero.date)).toBeNull()
    expect(screen.getByText(/→ \w+day/)).toBeTruthy()

    // Reset returns to the hero.
    await userEvent.click(screen.getByRole('button', { name: /back to the lesson example/i }))
    expect(screen.getByText(hero.date)).toBeTruthy()
  })

  it('renders no "Show another" for a stage without a generator', () => {
    render(<WorkedExample stageId="mod7" hero={hero} rng={makeRng(1)} />)
    expect(screen.queryByRole('button', { name: /show another/i })).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/WorkedExample.test.tsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `src/components/WorkedExample.tsx`**

Moves the example-card markup here so `LessonBlocks` can delegate.

```tsx
import { useState } from 'react'
import type { Block } from '../features/learn/curriculum'
import {
  generateWorkedExample,
  WORKED_STAGES,
  type GeneratedExample,
  type WorkedStage,
} from '../features/learn/workedExample'

type Hero = Extract<Block, { kind: 'example' }>

function Card({ date, steps, answer }: { date: string; steps: string[]; answer: string }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        padding: 14,
        margin: '12px 0',
      }}
    >
      <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>
        {date}
      </div>
      <ol style={{ lineHeight: 1.7, paddingLeft: 20, marginTop: 8 }}>
        {steps.map((s, j) => (
          <li key={j}>{s}</li>
        ))}
      </ol>
      <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--green)' }}>→ {answer}</div>
    </div>
  )
}

export function WorkedExample({
  stageId,
  hero,
  rng = Math.random,
}: {
  stageId: string
  hero: Hero
  rng?: () => number
}) {
  const supported = (WORKED_STAGES as readonly string[]).includes(stageId)
  const [extra, setExtra] = useState<GeneratedExample | null>(null)

  const shown = extra ?? hero
  return (
    <div>
      <Card date={shown.date} steps={shown.steps} answer={shown.answer} />
      {supported && (
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            type="button"
            onClick={() => setExtra(generateWorkedExample(stageId as WorkedStage, rng))}
            style={{
              background: 'none',
              border: 0,
              padding: 0,
              color: 'var(--burg)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Show another →
          </button>
          {extra && (
            <button
              type="button"
              onClick={() => setExtra(null)}
              style={{ background: 'none', border: 0, padding: 0, color: 'var(--muted)', cursor: 'pointer' }}
            >
              Back to the lesson example
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Wire `LessonBlocks` to delegate and accept `stageId`**

In `src/components/LessonBlocks.tsx`: add the import and the `stageId` prop, and replace the inline `case 'example':` rendering with the component.

```tsx
import { WorkedExample } from './WorkedExample'

export function LessonBlocks({ blocks, stageId }: { blocks: Block[]; stageId: string }) {
  // ...existing map...
        case 'example':
          return <WorkedExample key={i} stageId={stageId} hero={b} />
  // ...
}
```

In `src/features/learn/LessonScreen.tsx`, pass the id:

```tsx
      <LessonBlocks blocks={stage.blocks} stageId={stage.id} />
```

- [ ] **Step 5: Run the affected tests + the full suite**

Run: `pnpm vitest run src/components/WorkedExample.test.tsx src/components/LessonBlocks.test.tsx && pnpm vitest run && pnpm typecheck && pnpm lint`
Expected: PASS. If `LessonBlocks.test.tsx` renders `<LessonBlocks blocks={...} />` without `stageId`, update those render calls to pass a `stageId` (e.g. `stageId="full"`).

- [ ] **Step 6: Commit**

```bash
git add src/components/WorkedExample.tsx src/components/WorkedExample.test.tsx src/components/LessonBlocks.tsx src/features/learn/LessonScreen.tsx
git commit -m "feat(learn): hero + 'Show another' generated worked examples"
```

---

## Self-Review

**1. Spec coverage** (each spec section → task):
- Weighted sampling everywhere, generator stays pure → Tasks 4–7.
- Without-replacement guarantee for `leap` + `century` (seed + index, no mutable bag) → Tasks 5, 6, 7 (`coveringPick`).
- Low-discrepancy fill dropped; only `warpYear` kept → Task 2 (no bag/quasi anywhere).
- Wide range 9999 BC–9999 AD, centered + long tail → Task 2 (`warpYear`), applied in Tasks 6–7.
- Engine modulo fixes (centuryAnchor, Odd+11, Conway, explain) → Task 1.
- `century`/`thisyear` stay narrow; `leap`/`year`/`full`/`speed` widen → Tasks 6–7 (`thisyear` untouched; `century` uses taught list).
- Hybrid hero + "Show another", engine-derived, illustrative constraint, computed-anchor for exotic centuries → Tasks 8–9.
- Era formatter + negative `ymdKey` → Task 3.
- Tests: periodicity + JDN reference, coverage, worked-example correctness → Tasks 1, 6, 7, 8.
- `useLessonDrill` minimal wiring (runSeed + index, no mutable sampler) → Task 5.

No spec requirement is left without a task.

**2. Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". Every code step shows complete code. ✓

**3. Type consistency:** `nextLessonProblem(stageId, rng, ctx?: LessonCtx)` defined in Task 5, used with `ctx` in Tasks 6–7. `coveringPick(domain, runSeed, index)` defined Task 6, used Task 7. `generateWorkedExample(stage, rng)` / `WORKED_STAGES` / `GeneratedExample` / `WorkedStage` defined Task 8, consumed Task 9. `formatYear` defined Task 3, used Tasks 6–8. `warpYear` defined Task 2, used Tasks 6–8. `LessonBlocks` `stageId` prop added Task 9 (and its existing test render calls updated in the same task). ✓

One watch-item for the implementer: in Task 4, after moving symbols, run `pnpm lint` to surface any import left unused in `useLessonDrill.ts` (e.g. engine helpers only the generator used) and delete them.
