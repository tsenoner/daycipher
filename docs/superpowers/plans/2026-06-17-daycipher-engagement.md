# Daycipher Plan 6 — Engagement

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. TDD per task; **pnpm**; keep CI green on push (Node 22).

**Goal:** Add the engagement layer: a **Daily Challenge** (same dates for everyone each day, once/day, with a shareable result), a **Speedrun** practice mode (most correct in 60s), **achievements** computed from history, and a **first-run onboarding** banner. This is the last planned feature plan.

**Architecture:** Deterministic daily date generation and achievement computation are pure + tested (`daily.ts`, `achievements.ts`). A `useDaily` hook + `DailyChallenge` screen (route `/daily`); Speedrun added as a third Practice mode; achievements shown on Progress; an onboarding banner on Today for first-run. Share uses the Web Share API with a graceful text fallback. No new deps.

## Available APIs
- `engine`: `generateDate`, `makeRng`, `weekdayOfYMD`, type `Weekday`.
- `practice/drill`: `gradeProblem`, type `Problem`. `practice/selector`: `nextProblem`. components `WeekdayPicker`, `StepTrace`.
- `db`: `addAttempt`, `listAttempts`, `getMeta`/`setMeta`, `recordPracticeDay`, type `Attempt`. `lib/datekey`: `localDayKey`. `lib/format`: `formatDate`, `weekdayName`. `progress/stats`: `summarize`.

## Tasks

### Task 1 — `src/features/daily/daily.ts` (pure) + test
```ts
import { generateDate, makeRng } from '../../engine'
import type { Problem } from '../practice/drill'

function hashKey(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const RANGE = { minYear: 1900, maxYear: 2099 }

/** Deterministic set of dates for a given local day key (same for everyone, stable per day). */
export function dailyDates(dayKey: string, n = 5): Problem[] {
  const rng = makeRng(hashKey(dayKey))
  return Array.from({ length: n }, () => generateDate(RANGE, rng))
}
```
Test: same key → identical list; different keys → differ; length n; valid in-range dates. Commit `feat(daily): deterministic daily dates`.

### Task 2 — `src/features/progress/achievements.ts` (pure) + test
```ts
import type { Attempt } from '../../db/db'
import { summarize } from './stats'

export interface Achievement { id: string; label: string; desc: string; earned: boolean }

export function achievements(attempts: Attempt[], longestStreak: number): Achievement[] {
  const { total, accuracy } = summarize(attempts)
  const fast = attempts.filter((a) => a.correct && a.durationMs > 0 && a.durationMs < 3000).length
  return [
    { id: 'first', label: 'First Steps', desc: 'Solve your first date', earned: total >= 1 },
    { id: 'ten', label: 'Getting Warm', desc: 'Solve 10 dates', earned: total >= 10 },
    { id: 'hundred', label: 'Centurion', desc: 'Solve 100 dates', earned: total >= 100 },
    { id: 'streak7', label: 'Habit Formed', desc: 'Reach a 7-day streak', earned: longestStreak >= 7 },
    { id: 'streak30', label: 'Unbreakable', desc: 'Reach a 30-day streak', earned: longestStreak >= 30 },
    { id: 'sharp', label: 'Sharp', desc: '90% accuracy over 20+ solves', earned: total >= 20 && accuracy >= 0.9 },
    { id: 'speed', label: 'Speed Demon', desc: 'A correct solve under 3s', earned: fast >= 1 },
  ]
}
```
Test: empty → only nothing earned; tuned attempt sets flip specific achievements. Commit `feat(progress): achievements`.

### Task 3 — Daily Challenge (`useDaily.ts`, `DailyChallenge.tsx`, route, Today CTA)
- `useDaily.ts`: `dates = dailyDates(localDayKey())`; step index, per-date guess + correctness, running score; `answer(w)` grades (`gradeProblem` mode `'daily'`), logs, advances; on finish, persist `setMeta('daily:'+dayKey, { score, total })` and `recordPracticeDay`. Expose `done`, `score`, `total`, `index`, `current`, `answer`, `finished`.
- `DailyChallenge.tsx` (route `/daily`): if already done today (meta has `daily:<key>`), show "Done today — X/N, come back tomorrow" + Share button (`navigator.share?.({text})` else copy/alert). Else run the loop (date → WeekdayPicker → quick ✓/✕ → auto-next), then a final score card + Share + back to Today.
- routes: add `{ path: 'daily', element: <DailyChallenge/> }`.
- Today: a "Daily Challenge" CTA card linking to `/daily`, showing today's score if completed.
Commit `feat(daily): daily challenge flow + share`.

### Task 4 — Speedrun mode
- Add `'speed'` to the Practice toggle. `Speedrun.tsx` + `useSpeedrun.ts`: a 60s timer; present adaptive problems (`nextProblem`), tap weekday → instant next (no reveal), count correct/total; on timeout show score, persist `setMeta('speedrunBest', max(prev, correct))`, offer restart. Attempts logged with mode `'speedrun'`, `timed: true`.
Commit `feat(practice): speedrun mode`.

### Task 5 — Achievements on Progress + onboarding banner on Today
- ProgressScreen: load `longestStreak`; render an "Achievements" grid from `achievements(attempts, longestStreak)` — earned ones in `--gold`/full, locked ones muted with the desc.
- TodayScreen: if `getMeta('onboarded', false)` is false AND no attempts, show a dismissible welcome card ("New here? Start with Learn, then drill.") with links to `/learn` and `/practice`; a "Got it" button sets `setMeta('onboarded', true)`.
Commit `feat(engagement): achievements panel + onboarding`.

### Task 6 — verify & ship
`pnpm test/typecheck/lint/build`; preview + screenshot Daily Challenge + achievements; push + confirm CI green; `vercel deploy --prod`.

## Self-review
- Daily Challenge is deterministic per day, once/day, shareable. (Tasks 1, 3)
- Speedrun is a timed mode with a persisted best. (Task 4)
- Achievements computed purely and shown. (Tasks 2, 5)
- First-run onboarding guides new users. (Task 5)
- CI green on push. (Task 6)
