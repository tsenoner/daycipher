# Daycipher Plan 2 — Practice Drill Loop

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. TDD per task; commit frequently. Package manager: **pnpm**.

**Goal:** Make Daycipher actually usable — a single-screen Quick Drill loop (present a date → tap the weekday → instant graded feedback with sound → reveal the step-by-step reasoning → Next), with every attempt logged to IndexedDB and the streak updated, plus a Today screen that shows the streak, today's weekday, and a Quick Drill entry point.

**Architecture:** Pure, testable logic (`lib/`) sits under thin React components. `engine` (done) computes/grades/explains; `db` (done) persists attempts + streaks. A `useDrill` hook orchestrates: generate date → collect answer → grade via engine → log via db → expose state. Feedback (Web Audio chime + Vibration) is a small side-effect module gated by settings. No new dependencies.

**Tech stack:** React + TS, Vitest + Testing Library, existing `engine`/`db`/`store`.

---

## Available APIs (already built)
- `engine`: `weekdayOfYMD(y,m,d): Weekday`, `explain(y,m,d): StepTrace`, `generateDate(constraints, rng?)`, `makeRng(seed)`, `WEEKDAY_NAMES`, type `Weekday` (0=Sun..6=Sat), `StepTrace`.
- `db`: `addAttempt(a: Attempt): Promise<number>`, `recordPracticeDay(day: string): Promise<StreakState>`, `getMeta`/`setMeta`, type `Attempt`.
- `store`: `useSettings()` → `{ weekStart: 0|1, soundEnabled, ... }`.

## File structure
```
src/lib/format.ts          date/weekday formatting + picker order   (+ format.test.ts)
src/lib/datekey.ts         local YYYY-MM-DD helper (shared)         (+ datekey.test.ts)
src/feedback/feedback.ts   web-audio chime + haptics + unlock        (+ feedback.test.ts)
src/features/practice/drill.ts     pure: makeAttempt + grade          (+ drill.test.ts)
src/features/practice/useDrill.ts  react hook orchestrating a session
src/components/WeekdayPicker.tsx   7-button (4+3) recall grid         (+ WeekdayPicker.test.tsx)
src/components/StepTrace.tsx       reasoning accordion                (+ StepTrace.test.tsx)
src/features/practice/PracticeScreen.tsx   the drill screen (replaces stub)
src/features/today/TodayScreen.tsx         streak + today + CTA (replaces stub)
src/features/practice/PracticeScreen.test.tsx  integration test of the loop
```

---

## Task 1: formatting helpers (`src/lib/format.ts`)

**TDD.** Test `src/lib/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { formatDate, weekdayShort, weekdayName, orderedWeekdays } from './format'

describe('format', () => {
  it('formatDate -> "14 March 1986"', () => {
    expect(formatDate(1986, 3, 14)).toBe('14 March 1986')
    expect(formatDate(2000, 1, 1)).toBe('1 January 2000')
  })
  it('weekday names', () => {
    expect(weekdayName(0)).toBe('Sunday')
    expect(weekdayShort(0)).toBe('Sun')
    expect(weekdayShort(6)).toBe('Sat')
  })
  it('orderedWeekdays respects week start', () => {
    expect(orderedWeekdays(1)).toEqual([1, 2, 3, 4, 5, 6, 0]) // Monday-first
    expect(orderedWeekdays(0)).toEqual([0, 1, 2, 3, 4, 5, 6]) // Sunday-first
  })
})
```
Implement:
```ts
import { WEEKDAY_NAMES, type Weekday } from '../engine'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatDate(year: number, month: number, day: number): string {
  return `${day} ${MONTHS[month - 1]} ${year}`
}

export const weekdayName = (w: Weekday): string => WEEKDAY_NAMES[w]
export const weekdayShort = (w: Weekday): string => WEEKDAY_NAMES[w].slice(0, 3)

/** Weekday values in display order. weekStart 1 = Monday-first, 0 = Sunday-first. */
export function orderedWeekdays(weekStart: 0 | 1): Weekday[] {
  const base: Weekday[] = [0, 1, 2, 3, 4, 5, 6]
  return weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : base
}
```
Commit: `feat(lib): date & weekday formatting helpers`

## Task 2: local-day key (`src/lib/datekey.ts`)
Extract the local `YYYY-MM-DD` helper so practice + db share one impl. TDD.
```ts
// datekey.ts
export function localDayKey(ts: number = Date.now()): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
```
Test asserts `localDayKey(new Date(2026,5,17,9).getTime()) === '2026-06-17'`. Commit: `feat(lib): localDayKey helper`.

## Task 3: feedback (`src/feedback/feedback.ts`)
Web-Audio chime (880Hz correct / 220Hz wrong, <200ms), Vibration API (feature-detected; tick correct, double-buzz wrong), `unlockAudio()` to create/resume the AudioContext on first user gesture. All no-ops when disabled.
```ts
let ctx: AudioContext | null = null

export function unlockAudio(): void {
  if (typeof AudioContext === 'undefined') return
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
}

export function chime(ok: boolean): void {
  if (!ctx) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.frequency.value = ok ? 880 : 220
  g.gain.setValueAtTime(0.0001, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
  o.connect(g).connect(ctx.destination)
  o.start()
  o.stop(ctx.currentTime + 0.18)
}

export function haptic(ok: boolean): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(ok ? 15 : [10, 60, 10])
  }
}

export function playFeedback(ok: boolean, opts: { sound: boolean }): void {
  if (opts.sound) chime(ok)
  haptic(ok)
}
```
Test (`feedback.test.ts`): mock `navigator.vibrate` and assert `haptic(true)` calls it with `15`, `haptic(false)` with `[10,60,10]`; assert `playFeedback(true,{sound:false})` does not throw and still calls vibrate. (Audio is not unit-tested; just assert `chime` is a no-op without `unlockAudio`.) Commit: `feat(feedback): web-audio chime + haptics`.

## Task 4: drill core (`src/features/practice/drill.ts`)
Pure grading → an `Attempt` ready for `addAttempt`. TDD.
```ts
import { weekdayOfYMD, type Weekday } from '../../engine'
import type { Attempt } from '../../db/db'

export interface Problem { year: number; month: number; day: number }

export function gradeProblem(
  p: Problem,
  guessed: Weekday,
  durationMs: number,
  mode: string,
  timestamp: number = Date.now(),
): Attempt {
  const correctWeekday = weekdayOfYMD(p.year, p.month, p.day)
  const targetDate = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
  return {
    timestamp,
    targetDate,
    correctWeekday,
    guessedWeekday: guessed,
    correct: correctWeekday === guessed,
    durationMs,
    mode,
    anchorCorrect: null,
    yearDoomCorrect: null,
    offsetCorrect: null,
    timed: false,
  }
}
```
Test: `gradeProblem({year:1986,month:3,day:14}, 5, 4200, 'quick', 111)` → `correct:true, correctWeekday:5, targetDate:'1986-03-14'`; a wrong guess → `correct:false`. Commit: `feat(practice): pure problem grading`.

## Task 5: WeekdayPicker (`src/components/WeekdayPicker.tsx`)
Props:
```ts
interface WeekdayPickerProps {
  weekStart: 0 | 1
  graded: boolean
  guessed?: Weekday | null
  correct?: Weekday | null
  onPick: (w: Weekday) => void
}
```
Render a CSS grid (4 columns) of 7 buttons in `orderedWeekdays(weekStart)` order, each `min-height: var(--tap)` (56px), label `weekdayShort(w)`, `aria-label={weekdayName(w)}`. When `!graded`: tappable, neutral style, calls `onPick`. When `graded`: disabled; the `correct` weekday button → green (`--green`) with a ✓; if `guessed` is wrong, that button → burgundy (`--burg`) with a ✕; never color-only (include the icon/text). Use `font-weight:600`, `--card`/`--line` for neutral.
Test (`WeekdayPicker.test.tsx`): renders 7 buttons; Monday-first order has 'Mon' first; clicking 'Fri' calls `onPick(5)`; when `graded correct={5} guessed={3}`, the Friday button has accessible name containing 'Friday' and the role shows the correct/incorrect state (assert via text/`aria-label` + that buttons are disabled). Commit: `feat(ui): WeekdayPicker recall grid`.

## Task 6: StepTrace (`src/components/StepTrace.tsx`)
Props: `{ trace: StepTrace; weekStart: 0 | 1; defaultOpen?: boolean }`. Renders a `<details>`-based accordion ("How it works", open when `defaultOpen`) listing the steps from `trace`:
1. `{centuryAnchor → weekdayName}` "century anchor"
2. `{year} doomsday (Odd+11)` → `weekdayName(trace.yearDoomsday)` (optionally show worked `trace.oddEleven`)
3. `{monthName} anchor → day {trace.monthAnchorDay}` → `weekdayName(trace.monthAnchorWeekday)`
4. `Result` → `weekdayName(trace.result)` (green)
Use semantic `<details>/<summary>` for native a11y + progressive disclosure; rows are `dt/dd`-like or simple flex rows with `--line` separators. Test: given `explain(1986,3,14)`, the trace contains 'Wednesday' (century), 'Friday' (year doomsday & result), and 'March'. Commit: `feat(ui): StepTrace reasoning accordion`.

## Task 7: useDrill hook (`src/features/practice/useDrill.ts`)
```ts
// returns { problem, phase: 'answering'|'graded', guessed, attempt, answer(w), next() }
```
Behavior:
- On mount and on `next()`: `generateDate({ minYear, maxYear })` (defaults `minYear:1900, maxYear:2099` for Plan 2; read range later from settings), set `phase='answering'`, record `startedAt = performance.now()`.
- `answer(w)`: compute `durationMs = performance.now() - startedAt`; `const attempt = gradeProblem(problem, w, durationMs, 'quick')`; `void addAttempt(attempt)`; `void recordPracticeDay(localDayKey())`; set `phase='graded'`, store `guessed=w`, `attempt`.
- Guard: ignore `answer()` when already graded.
Use `useState`/`useCallback`/`useEffect`. (No test required for the hook itself; it's covered by the PracticeScreen integration test, but a light renderHook test is welcome.) Commit: `feat(practice): useDrill session hook`.

## Task 8: PracticeScreen (`src/features/practice/PracticeScreen.tsx`)
Compose: header line ("Quick Drill"), the large serif date (`formatDate`), `WeekdayPicker`, a result banner on grade (✓ Correct — {weekday} · {s}s  /  ✕ Not quite — it's {weekday}), `StepTrace` (defaultOpen when wrong), and a primary "Next →" button (burgundy) in the lower area. On the first pick call `unlockAudio()` then `playFeedback(correct, { sound: soundEnabled })`. Pull `weekStart`/`soundEnabled` from `useSettings`.
Integration test (`PracticeScreen.test.tsx`): render within a router/provider as needed; a date is shown; tapping a weekday transitions to graded state showing either "Correct" or "Not quite" and reveals the reasoning; "Next" shows a new problem in answering state. (Use the engine to compute the right answer for the displayed date so the test is deterministic — read the displayed date text, parse it, compute `weekdayOfYMD`, click that weekday, assert "Correct".)
Commit: `feat(practice): Quick Drill screen`.

## Task 9: TodayScreen (`src/features/today/TodayScreen.tsx`)
Replace the stub with: the streak ribbon (`getMeta('currentStreak',0)` / `longestStreak`), a "Today" card showing today's date (`formatDate`) and **this year's doomsday** (`weekdayName(yearDoomsdayOddEleven(thisYear))` — add an export if needed, or compute via `explain(thisYear, 4, 4).yearDoomsday`), and a prominent **Quick Drill** button linking to `/practice` (react-router `Link`). Keep it a simple, clean Almanac card layout. Light async load of streak via `useEffect`. Commit: `feat(today): streak, today's doomsday, drill CTA`.

## Task 10: verify + ship
- `pnpm test` (all pass), `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- Manual: run `pnpm preview`, screenshot the drill (answering + graded) to confirm.
- `vercel deploy --prod --yes` to update the live site.

---

## Self-review checklist
- Drill loop logs an Attempt AND updates the streak on every answer. ✓ (Tasks 7-8)
- Recall input (tap), never multiple-choice; ≥56px targets, a11y labels. ✓ (Task 5)
- Reasoning revealed via accordion, auto-open on wrong. ✓ (Tasks 6, 8)
- Sound primary + haptics feature-detected, gated by settings. ✓ (Tasks 3, 8)
- No per-step attribution highlight yet (Guided Solve = Plan 5); Quick Drill stores null per-step fields. (Intentional.)
