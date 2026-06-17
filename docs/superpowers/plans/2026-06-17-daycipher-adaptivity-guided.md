# Daycipher Plan 5 — Adaptivity & Guided Solve

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. TDD per task; commit frequently. **pnpm**. CI must stay green on push (Node 22 workflow).

**Goal:** Make practice smarter and more diagnostic: (1) **adaptive selection** biases Quick Drill toward the user's weakest century; (2) a **Guided Solve** mode collects the three intermediate answers (century anchor → year doomsday → final weekday), giving exact per-step grading; (3) a **"where you lose points"** breakdown in Progress turns that captured data into actionable feedback.

**Architecture:** New pure modules (`selector.ts`, plus `gradeGuided` in `drill.ts`, `stepStats` in `stats.ts`) are fully unit-tested. `useDrill` consumes the selector; a new `useGuided` hook + `GuidedSolve` component drive the multi-step UI; `PracticeScreen` gains a Quick/Guided mode toggle; `ProgressScreen` renders the per-step bars when guided data exists.

**Deferred:** full FSRS flashcard decks for declarative facts (own future plan) — Plan 5 focuses on adaptive date selection + guided per-step attribution.

## Available APIs
- `engine`: `weekdayOfYMD`, `explain(y,m,d)→StepTrace` (`centuryAnchor`,`yearDoomsday`,`result`), `generateDate(constraints,rng?)`, type `Weekday`.
- `db`: type `Attempt` (per-step fields `anchorCorrect`/`yearDoomCorrect`/`offsetCorrect` are `0|1|null`), `addAttempt`, `listAttempts`, `recordPracticeDay`.
- `progress/stats`: `accuracyByDimension`, `weakest`. `practice/drill`: `gradeProblem`, type `Problem`. `lib/datekey`: `localDayKey`.
- components: `WeekdayPicker`, `StepTrace`. `store/settings`: `useSettings`. `feedback`: `unlockAudio`,`playFeedback`.

## Tasks

### Task 1 — `selector.ts` (pure, adaptive)
`src/features/practice/selector.ts`:
```ts
import { generateDate } from '../../engine'
import type { Attempt } from '../../db/db'
import { accuracyByDimension, weakest } from '../progress/stats'

const FULL = { minYear: 1900, maxYear: 2099 }
const CENTURY: Record<string, { minYear: number; maxYear: number }> = {
  '1700': { minYear: 1700, maxYear: 1799 },
  '1800': { minYear: 1800, maxYear: 1899 },
  '1900': { minYear: 1900, maxYear: 1999 },
  '2000': { minYear: 2000, maxYear: 2099 },
}

/** ~50% of the time, target the weakest century (needs >=5 attempts there); else full range. */
export function nextProblem(attempts: Attempt[], rng: () => number = Math.random) {
  const weak = weakest(accuracyByDimension(attempts, 'century'), 5)
  if (weak && CENTURY[weak.key] && rng() < 0.5) return generateDate(CENTURY[weak.key], rng)
  return generateDate(FULL, rng)
}
```
Test: with ≥5 wrong 1800s + ≥5 right 2000s and `rng=()=>0.1`, the result year ∈ [1800,1899]; with `rng=()=>0.9`, full-range. Commit `feat(practice): adaptive weak-spot selector`.

### Task 2 — `gradeGuided` in `drill.ts`
Append:
```ts
import { explain } from '../../engine'

export interface GuidedAnswers { century: Weekday; yearDoom: Weekday; final: Weekday }
const m7 = (n: number) => ((n % 7) + 7) % 7

export function gradeGuided(
  p: Problem, g: GuidedAnswers, durationMs: number, timestamp: number = Date.now(),
): Attempt {
  const t = explain(p.year, p.month, p.day)
  const targetDate = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
  return {
    timestamp, targetDate, correctWeekday: t.result, guessedWeekday: g.final,
    correct: g.final === t.result, durationMs, mode: 'guided',
    anchorCorrect: g.century === t.centuryAnchor ? 1 : 0,
    yearDoomCorrect: g.yearDoom === t.yearDoomsday ? 1 : 0,
    offsetCorrect: m7(g.final - g.yearDoom) === m7(t.result - t.yearDoomsday) ? 1 : 0,
    timed: false,
  }
}
```
Test (1986-03-14, trace Wed/Fri/Fri): all-correct → all three `1`, `correct`; wrong year-doom but right stepping → `yearDoomCorrect:0`, `offsetCorrect:1`, `correct:false`. Commit `feat(practice): guided per-step grading`.

### Task 3 — `stepStats` in `stats.ts`
Append:
```ts
export interface StepStat { step: 'anchor' | 'year' | 'offset'; label: string; wrong: number; total: number }

export function stepStats(attempts: Attempt[]): StepStat[] {
  const defs: [('anchorCorrect'|'yearDoomCorrect'|'offsetCorrect'), StepStat['step'], string][] = [
    ['anchorCorrect', 'anchor', 'Century anchor'],
    ['yearDoomCorrect', 'year', 'Year doomsday'],
    ['offsetCorrect', 'offset', 'Final offset'],
  ]
  return defs.map(([field, step, label]) => {
    const graded = attempts.filter((a) => a[field] === 0 || a[field] === 1)
    return { step, label, wrong: graded.filter((a) => a[field] === 0).length, total: graded.length }
  })
}
```
Test: a mix of guided attempts → correct wrong/total per step; quick-only attempts (null fields) → total 0. Commit `feat(progress): per-step stats`.

### Task 4 — Guided Solve UI + adaptive Quick Drill
- `src/features/practice/useGuided.ts` — hook: `problem` (from `nextProblem(attempts)`), `step` (0 century /1 year /2 final /done), `picks`, `attempt`; `pick(w)` advances and on the 3rd pick calls `gradeGuided`, `addAttempt`, `recordPracticeDay`, appends to the session attempts; `next()` resets.
- `src/features/practice/GuidedSolve.tsx` — shows the date, a prompt per step ("Century anchor?" → "Year's doomsday?" → "The weekday?"), a `WeekdayPicker` per step, a running summary of picks with ✓/✕ after grading, then `StepTrace` (defaultOpen) + per-step result line + Next.
- `useDrill.ts` — load `listAttempts()` once on mount; generate via `nextProblem(attempts, ...)`; append each graded attempt to the in-memory list so weak-spot adapts within the session.
- `PracticeScreen.tsx` — add a Quick / Guided segmented toggle at top; render `QuickDrill` (existing body, factor out if needed) or `GuidedSolve`.
Light integration test: in Guided mode, answering all three steps reaches a graded state showing the reasoning. Commit `feat(practice): Guided Solve mode + adaptive selection`.

### Task 5 — per-step bars in Progress
In `ProgressScreen`, compute `stepStats(attempts)`; if any step has `total>0`, render a "Where you lose points" section: 3 bars (wrong-rate per step, `--burg`), each `label — X% missed (n)`, with a note "Use Guided Solve to populate this." Hidden entirely when no guided data. Commit `feat(progress): where-you-lose-points breakdown`.

### Task 6 — verify & ship
`pnpm test/typecheck/lint/build`; preview + screenshot Guided Solve + the per-step bars; **push and confirm CI is green** (`gh run watch`); `vercel deploy --prod`.

## Self-review
- Adaptive selection biases to weakest century while still hitting the full range. (Task 1, 4)
- Guided Solve captures + grades all three steps with honest offset attribution. (Tasks 2, 4)
- Progress shows per-step weaknesses only when guided data exists. (Tasks 3, 5)
- CI green on push (Node 22). (Task 6)
