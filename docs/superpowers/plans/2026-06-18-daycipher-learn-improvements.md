# Daycipher Learn Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let learners re-drill completed stages, add a dedicated drillable "Leap years" stage, and rewrite all lesson/cheat-sheet copy to be clearer, shorter, and verifiably correct.

**Architecture:** Three coordinated changes to `src/features/learn/`, plus one new shared component (`BooleanPicker`) and one tweak to `LessonBlocks`. Practice-again is a new `practice` mode on the existing `useLessonDrill` hook — it ignores the prior log (fresh in-session window), never latches completion, and persists rows under a distinct `learn:<id>:practice` mode so they stay out of mastery and out of practice stats. The leap stage is a new `CURRICULUM` entry with a boolean (No/Yes) answer kind. The content rewrite is research-backed and guarded by a data-driven test that recomputes every worked example against the engine.

**Tech Stack:** Vite · React 18 + TypeScript · react-router-dom v6 · zustand · IndexedDB (`idb`) · Vitest + Testing Library + `fake-indexeddb`. Package manager: **pnpm**.

## Global Constraints

- Verification gates (all must pass, run from repo root): `pnpm typecheck && pnpm test && pnpm lint`. Lint is `eslint . --max-warnings 0` — zero warnings allowed.
- Weekday convention: **Sunday = 0** … Saturday = 6, throughout.
- Practice-again attempts persist under mode **`learn:<stageId>:practice`** (correct rows still credit the daily streak; never latch completion).
- `stageOutcomes` matches mode **exactly** (`a.mode === 'learn:<stageId>'`) — the `:practice` suffix keeps practice rows out of mastery. `practiceAttempts` excludes every `learn:*` row from practice stats.
- Curriculum after this work has **8 stages** in order: `mod7`, `leap`, `months`, `thisyear`, `century`, `year`, `full`, `speed`. Display numbers `n` are explicit (1..8); gating keys off **id/order**, never `n`.
- No data migration and **no backwards-compatibility** concerns (no users yet).
- Persistence discipline (must not regress): never double-write a `learn:*` row or double-credit the streak under React StrictMode; mastery is derived from the log, never a persisted counter.
- Worked-example correctness: every `example` block carrying a `check` must have its `answer` agree with the engine.

---

### Task 1: `BooleanPicker` shared component

**Files:**
- Create: `src/components/BooleanPicker.tsx`
- Test: `src/components/BooleanPicker.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `BooleanPicker({ graded, guessed, correct, onPick }: { graded: boolean; guessed?: 0 | 1 | null; correct?: 0 | 1 | null; onPick: (value: 0 | 1) => void })`. Renders two buttons: **No** (value 0) and **Yes** (value 1), inside a `role="group"` labelled "Choose yes or no". Mirrors `NumberPad`'s graded styling (green correct / burgundy wrong-pick, ✓ / ✕ marks, disabled when graded).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/BooleanPicker.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BooleanPicker } from './BooleanPicker'

describe('BooleanPicker', () => {
  it('renders No/Yes and reports 0 for No, 1 for Yes', async () => {
    const onPick = vi.fn()
    render(<BooleanPicker graded={false} onPick={onPick} />)
    expect(screen.getByRole('group', { name: /yes or no/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'No' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(onPick).toHaveBeenNthCalledWith(1, 0)
    expect(onPick).toHaveBeenNthCalledWith(2, 1)
  })

  it('disables both buttons when graded', () => {
    render(<BooleanPicker graded guessed={1} correct={0} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: /No/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Yes/ })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/BooleanPicker.test.tsx`
Expected: FAIL — `Cannot find module './BooleanPicker'`.

- [ ] **Step 3: Write the component**

```tsx
// src/components/BooleanPicker.tsx
interface BooleanPickerProps {
  graded: boolean
  guessed?: 0 | 1 | null
  correct?: 0 | 1 | null
  onPick: (value: 0 | 1) => void
}

const OPTIONS: { value: 0 | 1; label: string }[] = [
  { value: 0, label: 'No' },
  { value: 1, label: 'Yes' },
]

export function BooleanPicker({ graded, guessed, correct, onPick }: BooleanPickerProps) {
  return (
    <div
      role="group"
      aria-label="Choose yes or no"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}
    >
      {OPTIONS.map(({ value, label }) => {
        const isCorrect = graded && correct === value
        const isWrongPick = graded && guessed === value && correct !== value
        const bg = isCorrect ? 'var(--green)' : isWrongPick ? 'var(--burg)' : 'var(--card)'
        const fg = isCorrect || isWrongPick ? '#fff' : 'var(--ink)'
        const border = isCorrect ? 'var(--green)' : isWrongPick ? 'var(--burg)' : 'var(--line)'
        const mark = isCorrect ? ' ✓' : isWrongPick ? ' ✕' : ''
        return (
          <button
            key={value}
            type="button"
            disabled={graded}
            aria-label={label}
            onClick={() => onPick(value)}
            style={{
              minHeight: 'var(--tap)',
              borderRadius: 12,
              border: `1px solid ${border}`,
              background: bg,
              color: fg,
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            {label}
            {mark}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/BooleanPicker.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/BooleanPicker.tsx src/components/BooleanPicker.test.tsx
git commit -m "feat(learn): BooleanPicker (No/Yes) answer widget"
```

---

### Task 2: Boolean answer kind + leap-year problem generator

**Files:**
- Modify: `src/features/learn/useLessonDrill.ts`
- Test: `src/features/learn/useLessonDrill.test.ts`

**Interfaces:**
- Consumes: `isLeapYear`, `pick` from `../../engine`; `gradeNumber` from `../practice/drill`.
- Produces:
  - `LessonProblem.answerKind: 'number' | 'weekday' | 'boolean'`.
  - `nextLessonProblem('leap', rng)` → `{ stageId:'leap', mode:'learn:leap', prompt:'Is <year> a leap year?', answerKind:'boolean', correct: isLeapYear(year) ? 1 : 0, date: null, timed: false }`.
  - `gradeLesson` grades a `boolean` problem via `gradeNumber` (stored 0/1 in `correctWeekday`, mode `learn:leap`).

- [ ] **Step 1: Write the failing test** (append to `useLessonDrill.test.ts`, inside the existing `describe('nextLessonProblem', …)` block, plus a new gradeLesson case)

```ts
// inside describe('nextLessonProblem', ...)
it('stage leap asks a yes/no leap-year question graded by isLeapYear', () => {
  const p = nextLessonProblem('leap', makeRng(31))
  expect(p.answerKind).toBe('boolean')
  expect([0, 1]).toContain(p.correct)
  expect(p.prompt).toMatch(/leap year\?/i)
  // The prompt's year and the correct flag must agree with the engine.
  const year = Number(p.prompt.match(/\d{4}/)![0])
  expect(p.correct).toBe(isLeapYear(year) ? 1 : 0)
})

// inside describe('gradeLesson', ...)
it('a leap answer writes a learn:leap row carrying the 0/1 guess', () => {
  const p = nextLessonProblem('leap', makeRng(31))
  const a = gradeLesson(p, p.correct, 0, 10)
  expect(a.mode).toBe('learn:leap')
  expect(a.targetDate).toBe('')
  expect(a.correct).toBe(true)
})
```

Add `isLeapYear` to the test's engine import:

```ts
import { makeRng, isLeapYear } from '../../engine'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/learn/useLessonDrill.test.ts`
Expected: FAIL — `nextLessonProblem` throws `unknown lesson stage: leap`.

- [ ] **Step 3: Implement**

In `src/features/learn/useLessonDrill.ts`:

(a) Add `isLeapYear` to the engine import list:

```ts
import {
  centuryAnchor,
  daysInMonth,
  generateDate,
  isLeapYear,
  mod7,
  monthAnchor,
  pick,
  thisYearDoomsday,
  weekdayOfYMD,
  yearDoomsdayOddEleven,
  CURRENT_YEAR,
  type Weekday,
} from '../../engine'
```

(b) Widen the `answerKind` union on `LessonProblem`:

```ts
  /** Drives the answer widget: NumberPad (number) · WeekdayPicker (weekday) · BooleanPicker (boolean). */
  answerKind: 'number' | 'weekday' | 'boolean'
```

(c) Add the leap-year drill year helper (place beside `leapJanFebDate`):

```ts
// Years that exercise the ÷100 / ÷400 rules, mixed with ordinary years, so a
// guesser who ignores the century rule fails the leap stage (§ leap).
const LEAP_DRILL_YEARS = [
  1600, 1700, 1800, 1900, 2000, 2100, 2200, 2400, // century edge cases
  2024, 2020, 1996, 2008, 2025, 2023, 2026, 1997, // ordinary: some ÷4, some not
]

function leapDrillYear(rng: () => number): number {
  return LEAP_DRILL_YEARS[pick(rng, 0, LEAP_DRILL_YEARS.length - 1)]
}
```

(d) Add the `leap` case to `nextLessonProblem` (before `case 'thisyear':`):

```ts
    case 'leap': {
      const year = leapDrillYear(rng)
      return {
        stageId,
        mode,
        prompt: `Is ${year} a leap year?`,
        answerKind: 'boolean',
        correct: isLeapYear(year) ? 1 : 0,
        date: null,
        timed,
      }
    }
```

(e) Grade boolean problems like numbers — update the first branch of `gradeLesson`:

```ts
  if (p.answerKind === 'number' || p.answerKind === 'boolean') {
    return gradeNumber(p.correct, guess, p.mode, durationMs, timestamp)
  }
```

(f) Widen the `feedback` state type so `setFeedback({ …, answerKind: p.answerKind })` still type-checks:

```ts
  const [feedback, setFeedback] = useState<{
    correct: boolean
    answer: number
    answerKind: 'number' | 'weekday' | 'boolean'
  } | null>(null)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/learn/useLessonDrill.test.ts`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm typecheck
git add src/features/learn/useLessonDrill.ts src/features/learn/useLessonDrill.test.ts
git commit -m "feat(learn): boolean answer kind + leap-year drill generator"
```

---

### Task 3: Insert the "Leap years" stage and renumber

**Files:**
- Modify: `src/features/learn/curriculum.ts`
- Test: `src/features/learn/curriculum.test.ts`, `src/features/learn/learnGate.test.ts`, `src/features/learn/learnMastery.test.ts`

**Interfaces:**
- Consumes: `LessonProblem` leap generation (Task 2).
- Produces: `CURRICULUM` with 8 stages in order `mod7, leap, months, thisyear, century, year, full, speed`; `getStage('leap')` resolves. `leap` uses default mastery (K=4/M=5).

- [ ] **Step 1: Update the failing tests first**

`curriculum.test.ts` — replace the count test:

```ts
  it('has 8 stages with unique ids and ascending n', () => {
    expect(CURRICULUM).toHaveLength(8)
    expect(new Set(CURRICULUM.map((s) => s.id)).size).toBe(8)
    expect(CURRICULUM.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
  it('teaches leap-year determination as its own stage', () => {
    expect(getStage('leap')?.title).toBe('Leap years')
    expect(CURRICULUM.findIndex((s) => s.id === 'leap')).toBe(1) // right after mod7
  })
```

`learnGate.test.ts` — update the order-sensitive assertions:

```ts
  it('a later stage opens iff the previous one is completed', () => {
    expect(isStageUnlocked('leap', [])).toBe(false)
    expect(isStageUnlocked('leap', ['mod7'])).toBe(true)
    expect(isStageUnlocked('months', ['mod7'])).toBe(false)
    expect(isStageUnlocked('months', ['mod7', 'leap'])).toBe(true)
  })
```

```ts
  it('opens when every stage is completed', () => {
    expect(isPracticeUnlocked(ALL, false)).toBe(true)
  })
  it('stays locked while any stage is missing and no latch', () => {
    expect(isPracticeUnlocked(ALL.slice(0, -1), false)).toBe(false)
  })
```

```ts
  it('is the first not-yet-completed stage in order', () => {
    expect(nextStageId(['mod7'])).toBe('leap')
    expect(nextStageId(['mod7', 'leap'])).toBe('months')
    expect(nextStageId(['mod7', 'leap', 'months', 'thisyear'])).toBe('century')
  })
  it('ignores out-of-order completion gaps and returns the earliest hole', () => {
    expect(nextStageId(['mod7', 'thisyear'])).toBe('leap')
  })
```

```ts
  it('does not flip practiceUnlocked until every stage is present', async () => {
    for (const id of ALL.slice(0, -1)) await markStageComplete(id)
    expect(await getMeta('practiceUnlocked', false)).toBe(false)
  })

  it('flips practiceUnlocked once learnCompleted covers every stage', async () => {
    for (const id of ALL) await markStageComplete(id)
    expect(await getMeta('practiceUnlocked', false)).toBe(true)
  })
```

`learnMastery.test.ts` — include `leap` in the default-rule assertion:

```ts
  it('on-ramp stages are K=3/M=4, the rest are K=4/M=5', () => {
    expect(STAGE_RULES.mod7).toEqual({ K: 3, M: 4 })
    expect(STAGE_RULES.months).toEqual({ K: 3, M: 4 })
    for (const id of ['leap', 'thisyear', 'century', 'year', 'full', 'speed']) {
      expect(STAGE_RULES[id]).toEqual({ K: 4, M: 5 })
    }
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/features/learn/curriculum.test.ts src/features/learn/learnGate.test.ts src/features/learn/learnMastery.test.ts`
Expected: FAIL — leap stage absent; length 7; `nextStageId(['mod7'])` is `'months'`.

- [ ] **Step 3: Insert the leap stage and renumber**

In `src/features/learn/curriculum.ts`, insert this object **immediately after** the `mod7` stage object (between the `mod7` `}` and the `months` `{`):

```ts
  {
    id: 'leap',
    n: 2,
    title: 'Leap years',
    goal: 'Decide whether a year is a leap year at a glance.',
    blocks: [
      {
        kind: 'p',
        text: 'A leap year adds February 29. Three steps: divisible by 4 is a leap year — except years divisible by 100, which are not — except those divisible by 400, which are.',
      },
      { kind: 'mnemonic', text: '÷4 yes · ÷100 no · ÷400 yes again.' },
      {
        kind: 'list',
        items: ['2024 ✓ (÷4)', '1900 ✗ (÷100, not ÷400)', '2000 ✓ (÷400)', '2100 ✗ (÷100, not ÷400)'],
      },
      {
        kind: 'p',
        text: 'Why it matters here: only January and February gain the extra day, so only their anchors shift — Jan 3→4, Feb 28→29. Every other month is unchanged.',
      },
    ],
  },
```

Renumber the `n` field of every stage after `leap`: `months` → `n: 3`, `thisyear` → `n: 4`, `century` → `n: 5`, `year` → `n: 6`, `full` → `n: 7`, `speed` → `n: 8`.

In the `months` stage, replace the trailing leap-warning paragraph so it leans on the new stage (final wording refined in Task 9):

```ts
      {
        kind: 'p',
        text: 'Remember the previous stage: in a leap year, January and February shift by one — Jan 4, Feb 29. That trap catches everyone.',
      },
```

- [ ] **Step 4: Run the full suite to verify green**

Run: `pnpm test`
Expected: PASS. (The leap stage now exists; its drill was wired in Task 2. Boolean rendering lands in Task 4 — no leap-UI test runs yet.)

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm typecheck && pnpm lint
git add src/features/learn/curriculum.ts src/features/learn/curriculum.test.ts src/features/learn/learnGate.test.ts src/features/learn/learnMastery.test.ts
git commit -m "feat(learn): add Leap years stage (now 8 stages), renumber"
```

---

### Task 4: Render `BooleanPicker` (and boolean feedback) in the lesson drill

**Files:**
- Modify: `src/features/learn/LessonScreen.tsx`
- Test: `src/features/learn/LessonScreen.test.tsx`

**Interfaces:**
- Consumes: `BooleanPicker` (Task 1); `leap` stage (Task 3); `LessonProblem.answerKind === 'boolean'` (Task 2).
- Produces: the `LessonDrill` renders `BooleanPicker` for boolean problems and formats boolean feedback as "Yes"/"No".

- [ ] **Step 1: Write the failing test** (append to `LessonScreen.test.tsx`)

```tsx
it('leap stage drills with a Yes/No picker after Start exercises', async () => {
  renderAt('/learn/leap')
  await screen.findByRole('heading', { name: 'Leap years' })
  await userEvent.click(screen.getByRole('button', { name: /Start exercises/ }))
  expect(await screen.findByRole('group', { name: /yes or no/i })).toBeInTheDocument()
})
```

Note: `leap` (stage 2) is unlocked only after `mod7`. Seed completion so the stage is reachable — add at the top of this test, before `renderAt`:

```tsx
  const { markStageComplete } = await import('./learnGate')
  await markStageComplete('mod7')
```

Also make `beforeEach` await the DB delete so the seed can't race a pending delete — replace the body of `beforeEach`:

```tsx
  beforeEach(async () => {
    _resetDbForTests()
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('daycipher')
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/learn/LessonScreen.test.tsx`
Expected: FAIL — no `group` named "yes or no" (boolean falls through to `WeekdayPicker`).

- [ ] **Step 3: Implement**

In `src/features/learn/LessonScreen.tsx`:

(a) Add the import:

```ts
import { BooleanPicker } from '../../components/BooleanPicker'
```

(b) In `LessonDrill`, replace the answer-widget ternary with a three-way branch:

```tsx
              {current.answerKind === 'number' ? (
                <NumberPad
                  options={current.options ?? []}
                  graded={false}
                  onPick={(n) => drill.answer(n)}
                />
              ) : current.answerKind === 'boolean' ? (
                <BooleanPicker graded={false} onPick={(n) => drill.answer(n)} />
              ) : (
                <WeekdayPicker
                  weekStart={weekStart}
                  graded={false}
                  onPick={(w) => drill.answer(w)}
                />
              )}
```

(c) Update the feedback text to format a boolean answer as Yes/No:

```tsx
          {feedback.correct
            ? '✓ Correct'
            : `✕ Not quite — it was ${
                feedback.answerKind === 'weekday'
                  ? weekdayName(feedback.answer as Weekday)
                  : feedback.answerKind === 'boolean'
                    ? feedback.answer === 1
                      ? 'Yes'
                      : 'No'
                    : feedback.answer
              }`}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/learn/LessonScreen.test.tsx`
Expected: PASS (existing + new).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm typecheck && pnpm lint
git add src/features/learn/LessonScreen.tsx src/features/learn/LessonScreen.test.tsx
git commit -m "feat(learn): render BooleanPicker + Yes/No feedback for the leap drill"
```

---

### Task 5: `practice` mode in `useLessonDrill`

**Files:**
- Modify: `src/features/learn/useLessonDrill.ts`
- Test: `src/features/learn/useLessonDrill.test.ts`

**Interfaces:**
- Consumes: existing hook internals.
- Produces: `useLessonDrill(stageId, { practice: true })` — a fresh in-session window (prior log ignored), never calls `markStageComplete`, persists rows under `learn:<stageId>:practice`, and still credits the streak on correct answers.

- [ ] **Step 1: Write the failing test** (append to `describe('useLessonDrill', …)` in `useLessonDrill.test.ts`)

Add the import at the top of the file:

```ts
import { stageOutcomes } from './learnMastery'
```

```ts
  it('practice mode logs :practice rows, never latches completion, and credits the streak', async () => {
    const { result } = renderHook(() => useLessonDrill('mod7', { rng: makeRng(21), practice: true }))
    await waitFor(() => expect(result.current.current).not.toBeNull())

    for (let i = 0; i < 5; i++) await answerCorrect(result)

    const all = await listAttempts()
    expect(all).toHaveLength(5)
    expect(all.every((a) => a.mode === 'learn:mod7:practice')).toBe(true)
    // :practice rows are invisible to the stage's mastery window …
    expect(stageOutcomes(all, 'mod7')).toEqual([])
    // … and never latch completion …
    expect(await getMeta<string[]>('learnCompleted', [])).not.toContain('mod7')
    // … but a correct practice rep still keeps the daily streak alive.
    expect(await getMeta<number>('currentStreak', 0)).toBe(1)
  })

  it('practice mode starts a fresh window even when the stage is already internalized', async () => {
    // Internalize mod7 the normal way first.
    const learn = renderHook(() => useLessonDrill('mod7', { rng: makeRng(22) }))
    await waitFor(() => expect(learn.result.current.current).not.toBeNull())
    for (let i = 0; i < 4; i++) await answerCorrect(learn.result)
    await waitFor(() => expect(learn.result.current.done).toBe(true))
    learn.unmount()

    // Re-enter in practice mode: done must be false (fresh window), not resumed from the log.
    const practice = renderHook(() => useLessonDrill('mod7', { rng: makeRng(23), practice: true }))
    await waitFor(() => expect(practice.result.current.current).not.toBeNull())
    expect(practice.result.current.done).toBe(false)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/learn/useLessonDrill.test.ts`
Expected: FAIL — rows are saved as `learn:mod7` (not `:practice`) and `done` resumes `true` from the log.

- [ ] **Step 3: Implement**

In `src/features/learn/useLessonDrill.ts`:

(a) Add `practice` to the options interface:

```ts
export interface LessonDrillOptions {
  /** Deterministic RNG for the instance stream (default `Math.random`). */
  rng?: () => number
  /** Inject the answer duration (default: wall-clock); used to drive stage-7 timing in tests. */
  durationMs?: number
  /** Practice-again: fresh in-session window, never latches completion, logs `:practice` rows. */
  practice?: boolean
}
```

(b) Destructure it:

```ts
  const { rng = Math.random, durationMs, practice = false } = opts
```

(c) Replace the load effect so practice mode skips the log entirely and never self-heals completion:

```ts
  useEffect(() => {
    let active = true
    void (async () => {
      if (practice) {
        // Practice-again: never resume prior outcomes, never latch. The window is
        // session-only, so `done` starts false and the drill keeps serving problems.
        if (!active) return
        latchedRef.current = false
        setPriorOutcomes([])
        setProblem(nextLessonProblem(stageId, rngRef.current))
        startRef.current = performance.now()
        return
      }
      const [all, completed] = await Promise.all([listAttempts(), getCompleted()])
      if (!active) return
      const outcomes = stageOutcomes(all, stageId)
      const done = stageProgress(outcomes, rule).done
      latchedRef.current = done
      setPriorOutcomes(outcomes)
      setProblem(nextLessonProblem(stageId, rngRef.current))
      startRef.current = performance.now()
      if (done && !completed.includes(stageId)) await markStageComplete(stageId)
    })()
    return () => {
      active = false
    }
  }, [stageId, rule, practice])
```

(d) Replace the persist effect so practice rows get the `:practice` suffix and never latch:

```ts
  useEffect(() => {
    if (priorOutcomes === null) return // wait until the load settles
    const fresh = results.slice(persistedRef.current)
    if (fresh.length === 0) return
    persistedRef.current = results.length
    const done = progress.done
    void (async () => {
      for (const r of fresh) {
        const row = practice ? { ...r.attempt, mode: `${r.attempt.mode}:practice` } : r.attempt
        if (row.correct) await recordAttempt(row)
        else await addAttempt(row)
      }
      // Practice never completes a stage — only the first DONE transition of a
      // real mastery run latches.
      if (!practice && done && !latchedRef.current) {
        latchedRef.current = true
        await markStageComplete(stageId)
      }
    })()
  }, [results, priorOutcomes, progress.done, stageId, practice])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/learn/useLessonDrill.test.ts`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm typecheck && pnpm lint
git add src/features/learn/useLessonDrill.ts src/features/learn/useLessonDrill.test.ts
git commit -m "feat(learn): practice-again mode in useLessonDrill (fresh window, no latch)"
```

---

### Task 6: Practice-again UI in `LessonScreen`

**Files:**
- Modify: `src/features/learn/LessonScreen.tsx`
- Test: `src/features/learn/LessonScreen.test.tsx`

**Interfaces:**
- Consumes: `useLessonDrill` `practice` option (Task 5); `isDone` from `./learnProgress`.
- Produces: a completed stage shows **"Practice again"** (instead of "Start exercises →") and the drill runs endlessly with a **"Done →"** exit; a just-completed normal run also offers "Practice again".

- [ ] **Step 1: Write the failing tests** (append to `LessonScreen.test.tsx`)

```tsx
it('a completed stage offers Practice again instead of Start exercises', async () => {
  const { markStageComplete } = await import('./learnGate')
  await markStageComplete('mod7')
  renderAt('/learn/mod7')
  await screen.findByRole('heading', { name: 'Think in 7s' })
  expect(await screen.findByRole('button', { name: /Practice again/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Start exercises/ })).toBeNull()
})

it('Practice again starts an endless drill, not the Internalized screen', async () => {
  const { markStageComplete } = await import('./learnGate')
  await markStageComplete('mod7')
  renderAt('/learn/mod7')
  await userEvent.click(await screen.findByRole('button', { name: /Practice again/ }))
  expect(await screen.findByRole('group', { name: /Choose the number/ })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Done/ })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/features/learn/LessonScreen.test.tsx`
Expected: FAIL — a completed stage still shows "Start exercises →"; no "Done" link.

- [ ] **Step 3: Implement**

In `src/features/learn/LessonScreen.tsx`:

(a) Add the import:

```ts
import { getCompleted, isStageUnlocked } from './learnGate'
import { isDone } from './learnProgress'
```

(b) Replace the `started` state and the start-button block. Swap `const [started, setStarted] = useState(false)` for:

```ts
  const [mode, setMode] = useState<'idle' | 'learn' | 'practice'>('idle')
```

(c) Compute whether the stage is done (after `locked` is computed, before the `return`):

```ts
  const stageDone = stage != null && completed != null && isDone(stage.id, completed)
```

(d) Replace the `{started ? (...) : (<button>Start exercises</button>)}` block with:

```tsx
      {mode !== 'idle' ? (
        <LessonDrill
          stageId={stage.id}
          practice={mode === 'practice'}
          onPracticeAgain={() => setMode('practice')}
        />
      ) : (
        <button
          type="button"
          onClick={() => setMode(stageDone ? 'practice' : 'learn')}
          style={{
            marginTop: 16,
            width: '100%',
            minHeight: 'var(--tap)',
            borderRadius: 12,
            border: 0,
            background: 'var(--green)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {stageDone ? 'Practice again' : 'Start exercises →'}
        </button>
      )}
```

(e) Update the `LessonDrill` signature and behaviour. Change its declaration to:

```tsx
function LessonDrill({
  stageId,
  practice = false,
  onPracticeAgain,
}: {
  stageId: string
  practice?: boolean
  onPracticeAgain?: () => void
}) {
  const drill = useLessonDrill(stageId, { practice })
  const weekStart = useSettings((s) => s.weekStart)
  const rule = ruleFor(stageId)
```

(f) Replace the progress label so practice mode reads as practice, not completion:

```tsx
      <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
        {practice
          ? 'Practice mode — drill as long as you like'
          : progress.done
            ? '✓ Internalized'
            : `${progress.remaining} more good answer(s) to internalize`}
      </div>
```

(g) Replace the `{done ? (...terminal...) : (current && ...)}` block so practice mode never shows the terminal block and always offers an exit:

```tsx
      {!practice && done ? (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {stageId === LAST_STAGE_ID ? (
            <Link
              to="/practice"
              style={{ color: 'var(--burg)', fontWeight: 700, textDecoration: 'none' }}
            >
              Practice unlocked → Start practicing
            </Link>
          ) : (
            <Link
              to="/learn"
              style={{ color: 'var(--burg)', fontWeight: 700, textDecoration: 'none' }}
            >
              Back to Learn →
            </Link>
          )}
          <button
            type="button"
            onClick={onPracticeAgain}
            style={{
              minHeight: 'var(--tap)',
              borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--card)',
              color: 'var(--ink)',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Practice again
          </button>
        </div>
      ) : (
        <>
          {current && (
            <div style={{ marginTop: 16 }}>
              <div className="serif" style={{ fontSize: 20, fontWeight: 600 }}>
                {current.prompt}
              </div>
              {current.sub && (
                <div className="muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 12 }}>
                  {current.sub}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                {current.answerKind === 'number' ? (
                  <NumberPad
                    options={current.options ?? []}
                    graded={false}
                    onPick={(n) => drill.answer(n)}
                  />
                ) : current.answerKind === 'boolean' ? (
                  <BooleanPicker graded={false} onPick={(n) => drill.answer(n)} />
                ) : (
                  <WeekdayPicker
                    weekStart={weekStart}
                    graded={false}
                    onPick={(w) => drill.answer(w)}
                  />
                )}
              </div>
            </div>
          )}
          {practice && (
            <div style={{ marginTop: 16 }}>
              <Link to="/learn" style={{ color: 'var(--burg)', fontWeight: 700, textDecoration: 'none' }}>
                Done →
              </Link>
            </div>
          )}
        </>
      )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/features/learn/LessonScreen.test.tsx`
Expected: PASS (existing + 2 new). The earlier "reveals the drill question after Start exercises" test still passes (mod7 is not done → button reads "Start exercises →").

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm typecheck && pnpm lint
git add src/features/learn/LessonScreen.tsx src/features/learn/LessonScreen.test.tsx
git commit -m "feat(learn): Practice again on completed stages (endless drill + Done exit)"
```

---

### Task 7: Dynamic "this year's doomsday" via token interpolation

**Files:**
- Modify: `src/components/LessonBlocks.tsx`, `src/features/learn/curriculum.ts`
- Test: `src/components/LessonBlocks.test.tsx`

**Interfaces:**
- Consumes: `CURRENT_YEAR`, `thisYearDoomsday` from `../engine`; `weekdayName` from `../lib/format`.
- Produces: `LessonBlocks` replaces `{thisYear}` → the current year and `{thisYearDoomsday}` → its weekday name in `p` text. The `thisyear` stage uses these tokens instead of a hardcoded year.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/LessonBlocks.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LessonBlocks } from './LessonBlocks'
import { CURRENT_YEAR, thisYearDoomsday } from '../engine'
import { weekdayName } from '../lib/format'

describe('LessonBlocks token interpolation', () => {
  it('replaces {thisYear} and {thisYearDoomsday} in paragraph text', () => {
    render(<LessonBlocks blocks={[{ kind: 'p', text: 'For {thisYear} it is {thisYearDoomsday}.' }]} />)
    const expected = `For ${CURRENT_YEAR} it is ${weekdayName(thisYearDoomsday())}.`
    expect(screen.getByText(expected)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/LessonBlocks.test.tsx`
Expected: FAIL — the literal `{thisYear}` text is rendered, not interpolated.

- [ ] **Step 3: Implement**

In `src/components/LessonBlocks.tsx`, add imports and an `interpolate` helper, then apply it to the `p` case:

```ts
import type { Block } from '../features/learn/curriculum'
import { CURRENT_YEAR, thisYearDoomsday } from '../engine'
import { weekdayName } from '../lib/format'

/** Replace runtime tokens so "this year" facts never go stale in the copy. */
function interpolate(text: string): string {
  return text
    .replaceAll('{thisYear}', String(CURRENT_YEAR))
    .replaceAll('{thisYearDoomsday}', weekdayName(thisYearDoomsday()))
}
```

In the `case 'p':` branch, wrap the text:

```tsx
          case 'p':
            return (
              <p key={i} style={{ lineHeight: 1.6 }}>
                {interpolate(b.text)}
              </p>
            )
```

In `src/features/learn/curriculum.ts`, change the `thisyear` stage's first paragraph (drop the hardcoded "2026 … Saturday"):

```ts
      {
        kind: 'p',
        text: "You can solve real dates today with just the month anchors plus one fact: this year's doomsday. For {thisYear} it is {thisYearDoomsday}.",
      },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/LessonBlocks.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm typecheck && pnpm lint
git add src/components/LessonBlocks.tsx src/components/LessonBlocks.test.tsx src/features/learn/curriculum.ts
git commit -m "fix(learn): render this year's doomsday dynamically (no hardcoded 2026)"
```

---

### Task 8: Machine-verifiable worked examples (`check` field + engine test)

**Files:**
- Modify: `src/features/learn/curriculum.ts`
- Test: `src/features/learn/curriculum.test.ts`

**Interfaces:**
- Consumes: `weekdayOfYMD`, `yearDoomsdayOddEleven` from `../../engine`; `weekdayName` from `../../lib/format`.
- Produces: `Block` `example` gains an optional `check?: ExampleCheck`; every concrete worked example carries one, and a test asserts each example's `answer` agrees with the engine.

```ts
export type ExampleCheck =
  | { kind: 'ymd'; year: number; month: number; day: number }
  | { kind: 'yearDoom'; year: number }
```

- [ ] **Step 1: Write the failing test** — replace the existing `it('the full-date worked example resolves to Friday', …)` in `curriculum.test.ts` with a data-driven check:

```ts
import { weekdayOfYMD, yearDoomsdayOddEleven } from '../../engine'
import { weekdayName } from '../../lib/format'

// … inside describe('curriculum', …)

it('every checked worked example agrees with the engine', () => {
  const examples = CURRICULUM.flatMap((s) =>
    s.blocks.filter((b): b is Extract<Block, { kind: 'example' }> => b.kind === 'example'),
  )
  const checked = examples.filter((e) => e.check)
  expect(checked.length).toBeGreaterThan(0) // guard: don't silently check nothing
  for (const e of checked) {
    const w =
      e.check!.kind === 'ymd'
        ? weekdayOfYMD(e.check!.year, e.check!.month, e.check!.day)
        : yearDoomsdayOddEleven(e.check!.year)
    expect(e.answer.startsWith(weekdayName(w))).toBe(true)
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/learn/curriculum.test.ts`
Expected: FAIL — `check` is not a property on the example blocks; `checked.length` is 0 (and `e.check` is a type error).

- [ ] **Step 3: Implement**

In `src/features/learn/curriculum.ts`:

(a) Add the `ExampleCheck` type and extend the `example` variant of `Block`:

```ts
export type ExampleCheck =
  | { kind: 'ymd'; year: number; month: number; day: number }
  | { kind: 'yearDoom'; year: number }

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'mnemonic'; text: string }
  | { kind: 'example'; date: string; steps: string[]; answer: string; check?: ExampleCheck }
```

(b) Add a `check` to each concrete worked example:

- `thisyear` (25 December 2026 → Friday): `check: { kind: 'ymd', year: 2026, month: 12, day: 25 }`
- `year` (Year 2005 → Monday): `check: { kind: 'yearDoom', year: 2005 }`
- `full` (14 March 1986 → Friday): `check: { kind: 'ymd', year: 1986, month: 3, day: 14 }`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/learn/curriculum.test.ts`
Expected: PASS — the three checks recompute to Friday / Monday / Friday and match the `answer` strings.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm typecheck && pnpm lint
git add src/features/learn/curriculum.ts src/features/learn/curriculum.test.ts
git commit -m "test(learn): engine-verify worked examples via a check field"
```

---

### Task 9: Research-backed content rewrite (all stages + cheat-sheet)

**Files:**
- Modify: `src/features/learn/curriculum.ts` (all stage `blocks`), `src/features/learn/CheatSheet.tsx`
- Test: `src/features/learn/curriculum.test.ts` (kept green; update `check` tuples if an example's date changes)

**This is a content task.** The mechanism is already in place (Tasks 7–8); this task produces the final copy. It is gated by the engine-verification test, typecheck, lint, and a human read — not by new unit tests.

**Process:**

- [ ] **Step 1: Research.** Run a deep-research pass on Doomsday-rule pedagogy (the `deep-research` skill or a `Workflow` fan-out). Cover: Conway's original framing and mnemonics, the Fong–Walters "Odd+11" method, the standard even-month / "9-to-5 at 7-Eleven" / century mnemonics, and the most common learner mistakes. Capture sources and the clearest phrasings.

- [ ] **Step 2: Rewrite each stage's `blocks`.** Constraints:
  - **Concise:** each stage stays a handful of short blocks; no wall-of-text paragraph.
  - **Keep proven mnemonics** ("I work 9-to-5 at the 7-Eleven" → 9/5, 5/9, 7/11, 11/7; "Y-Tues-K"; "March 0"/Pi-Day). Replace or restructure **only where it clearly reads better**.
  - **Every `example` block keeps a `check`** (Task 8) so the verification test still guards it. Worked examples use **fixed** concrete dates (never the dynamic current year — that fact lives only in the `{thisYear}`/`{thisYearDoomsday}` tokens of a `p` block).
  - **Consistent framing:** Sunday = 0; one consistent name for "casting out sevens"; the Odd+11 step list reads identically in the lesson and on the cheat-sheet.
  - Per-stage intent to preserve: `mod7` (weekday numbers + mod-7 / cast-out-sevens), `leap` (the ÷4/÷100/÷400 rule + the Jan/Feb anchor shift — refine Task 3's draft), `months` (the 12 anchors via even-month and odd-month mnemonics, leaning on `leap`), `thisyear` (solve within the current year from the dynamic doomsday fact), `century` (the four century anchors + formula), `year` (Odd+11), `full` (the four-step pipeline end-to-end), `speed` (memorize, drill daily, sub-5s).
  - Shape reference (one stage, to anchor the style):

    ```ts
    {
      id: 'century', n: 5, title: 'Century anchors',
      goal: 'Know the anchor weekday for each century.',
      blocks: [
        { kind: 'list', items: ['1700s → Sunday', '1800s → Friday', '1900s → Wednesday', '2000s → Tuesday', '2100s → Sunday'] },
        { kind: 'mnemonic', text: '1900s “We-in-dis-day” (Wed) · 2000s “Y-Tues-K” (Tue).' },
        { kind: 'p', text: 'The cycle repeats every 400 years: Tue, Sun, Fri, Wed. For century c, anchor = (5·(c mod 4) + 2) mod 7.' },
      ],
    },
    ```

- [ ] **Step 3: Rewrite `CheatSheet.tsx`.** Keep it to one screen: weekday numbers, the 12 month anchors (with leap variants for Jan/Feb), the 5 century anchors, and the Odd+11 steps — wording identical to the `year` stage. Add a one-line leap-year rule (`÷4 yes · ÷100 no · ÷400 yes`) so the cheat-sheet covers the new stage.

- [ ] **Step 4: If any example's date changed, update its `check` tuple** in the same edit so the verification test stays meaningful.

- [ ] **Step 5: Verify and commit**

Run: `pnpm typecheck && pnpm test && pnpm lint`
Expected: PASS — in particular the "every checked worked example agrees with the engine" test is green for the new copy.

```bash
git add src/features/learn/curriculum.ts src/features/learn/CheatSheet.tsx src/features/learn/curriculum.test.ts
git commit -m "docs(learn): research-backed rewrite of all stages + cheat-sheet"
```

---

### Task 10: Full verification + pull request

**Files:** none (verification + PR).

- [ ] **Step 1: Run the full gate suite**

Run: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`
Expected: all green; the production build (with the offline service worker) succeeds.

- [ ] **Step 2: Manual smoke (optional but recommended)**

Run: `pnpm dev`, then in the browser: open Learn → confirm 8 stages with "Leap years" as Stage 2 → complete `mod7` and `leap` via their drills (the leap drill shows No/Yes) → reopen a completed stage and confirm "Practice again" runs an endless drill with a "Done →" exit and the ✓ on the Learn map is unchanged afterward → open the cheat-sheet and confirm the leap rule line. Confirm the `thisyear` lesson shows the correct current-year doomsday.

- [ ] **Step 3: Create the PR** (per the project's PR-review workflow — all work goes through PRs)

```bash
git push -u origin HEAD
gh pr create --title "Learn: practice-again, leap-year stage, content rewrite" --body "$(cat <<'EOF'
Implements docs/superpowers/specs/2026-06-18-learn-improvements-design.md.

- Practice-again: completed stages re-drill endlessly; completion latch + mastery untouched; rows logged as learn:<id>:practice (excluded from mastery and practice stats, still credit the daily streak).
- New Stage 2 "Leap years" with a No/Yes BooleanPicker drill (4-of-5 mastery, century-edge-case weighting); curriculum is now 8 stages.
- Research-backed rewrite of all stage copy + cheat-sheet; every worked example engine-verified; "this year's doomsday" now rendered dynamically (no hardcoded 2026).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Practice-again → Tasks 5 (hook) + 6 (UI). ✓ Streak credit, no-latch, `:practice` mode, mastery exclusion all covered and tested.
- Leap stage → Tasks 1 (widget), 2 (generator + boolean kind), 3 (curriculum + gate/mastery tests), 4 (rendering). ✓ 4-of-5 default, edge-case weighting, 8-stage renumber, auto-correct gating.
- Content rewrite → Tasks 7 (dynamic this-year), 8 (verification harness), 9 (rewrite + cheat-sheet). ✓ Engine-verified examples, rot fix, concision, mnemonics preserved.
- Testing + one-PR delivery → Task 10. ✓

**Placeholder scan:** No "TBD"/"implement later". Task 9 is intentionally a content task with enforceable acceptance criteria (engine-verification test + lint + typecheck) rather than fabricated final prose — the mechanism code it relies on (Tasks 7–8) is complete and verbatim.

**Type consistency:** `answerKind` widened to `'number' | 'weekday' | 'boolean'` in Task 2 and consumed in Task 4; `feedback.answerKind` widened in the same task (Task 2) so assignment type-checks. `practice` option added in Task 5 and consumed in Task 6's `LessonDrill`. `BooleanPicker` `onPick: (value: 0 | 1) => void` matches `drill.answer(n: number)` (0|1 ⊆ number). `ExampleCheck` defined in Task 8 and used by the same task's test. `markStageComplete`/`stageOutcomes`/`isDone` names match their source modules.
