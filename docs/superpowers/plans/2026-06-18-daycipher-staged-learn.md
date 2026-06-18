# Daycipher — Learn→Practice Redesign: Final Design & Implementation Plan

**Date:** 2026-06-18 · **Scope:** R1–R6 · **DB version:** unchanged (no schema bump)

> Produced by a multi-agent design workflow (Map → 3 design tracks w/ proposals+judge → Synthesize → adversarial Critique → Finalize). Open product decisions in §10 are pending user confirmation.

---

## 1. Executive summary

Daycipher becomes a **guided, gated curriculum** before it becomes a free drill app. The seven learn stages are renumbered **1–7** and unlock **sequentially**: each stage shows its lesson, then a **stage-scoped drill of randomly generated instances** that tests *only* that stage's atom. A stage is **internalized** when the learner gets **4 of their last 5** attempts correct (derived purely from the attempt log — un-gameable, StrictMode-safe, forgives one slip). Internalizing a stage **unlocks the next** and **incrementally unlocks the matching Practice content**; the full free **Practice tab stays locked until all 7 stages are internalized**. While Practice is locked, **lesson reps keep the streak alive** (every *correct* lesson answer credits the day, exactly like a practice attempt), so learning — not idle tapping — sustains the streak. The **Daily Challenge stays reachable but scales its difficulty to unlocked stages** (this-year-only until century anchors are learned), so a beginner can actually score on the headline loop. Returning users are **grandfathered**: anyone who ever practiced, ever held a streak, or touched the old Learn is unlocked immediately — only genuinely new installs walk the curriculum.

---

## 2. Decisions per requirement

| Req | Chosen rule | Parameters | Rationale (one line) |
|---|---|---|---|
| **R1** | Renumber stage `.n` 0..6 → **1..7** | literals at `curriculum.ts:19,43,76,103,129,167,194`; test `[1..7]` | `.n` is display-only; no `n===0` special-casing exists. |
| **R2** | Each post-stage drill tests **only that stage's atom**; difficulty of any *Practice* content unlocked tracks stages learned | forward-only prompts (no reverse items); per-stage generator (§4) | Isolation is correct for atom acquisition; reverse items have grader collisions (cut, see R6). |
| **R3** | **Sequential unlock**: stage `i` opens iff stage `i-1` is in `learnCompleted` | `isStageUnlocked(id, completed)` (pure) | Keys off `s.id`/array order, never `.n`; monotonic latch can't un-unlock. |
| **R4** | Free **Practice tab locked** until **all 7** internalized; Practice content **unlocks progressively** per stage | `isPracticeUnlocked(completed, practiceUnlocked)` (pure) | Avoids a 35-rep motivation cliff with zero reward; gives a payoff every ~5 reps. |
| **R5** | Every **correct** lesson rep credits the day (streak); **no numeric goal** | `recordAttempt` per correct lesson answer; binary-per-day | Reuses the idempotent `recordPracticeDay` primitive; learning sustains the streak. |
| **R6** | Completion = **4 of last 5** correct, **per-stage tuned**, derived from the attempt log, latched | `{K,M}` table; default `K=4,M=5`; stage 1–2 `K=3,M=4`; stage 7 time-folded | Un-gameable, forgives a slip, needs no order-dependent persisted state. |

---

## 3. Data model

### Meta K/V keys (no DB version bump)

```
learnCompleted: string[]    // stage ids internalized. Sticky UNION, monotonic, never removes.
                            // The single completion signal -> drives R3 unlock + R4 lock.
                            // Replaces learnDone as the completion source.
practiceUnlocked: boolean   // one-shot latch. true => /practice open forever.
                            // Set by migration grandfather OR when learnCompleted covers all 7.

// UNCHANGED, reused via recordPracticeDay:
currentStreak, longestStreak, lastActiveDay
```

`learnDone` (legacy) is **read once** by migration, then ignored.

### Attempt rows (source of truth for mastery)

Lesson reps write **real `Attempt` rows** via `recordAttempt`, with:

| field | value for lesson rows |
|---|---|
| `mode` | `'learn:<stageId>'` (free-form string, type-safe today) |
| `targetDate` | real ISO `yyyy-mm-dd` for `thisyear`/`full`/`speed`; `''` for `mod7`/`months`/`century`/`year` |
| `correctWeekday`/`guessedWeekday` | the **actual numbers** (a weekday 0–6, or a day-of-month 3–29). Never `null` (the type forbids it). Isolation from weekday-named UI comes from the **`mode`-prefix filter**, not from nulling fields. |
| `anchorCorrect` | `0|1` for `century`; else `null` |
| `yearDoomCorrect` | `0|1` for `year`; else `null` |
| `offsetCorrect` | `null` for all lesson rows |
| `timed` | `true` only for `speed`; else `false` |
| `durationMs` | wall-clock; **injectable in tests** for stage 7 |

**Not persisted:** no per-stage counter, no `recentResults`, no mastery accumulator. Completion is recomputed from the log on demand — a double-apply can't corrupt a re-derivation.

### New / changed modules & signatures

**New (pure):**
```ts
// src/features/learn/learnMastery.ts
type StageRule = { K: number; M: number }
const STAGE_RULES: Record<string, StageRule>     // per-stage K/M
function perStageOutcome(a: Attempt, stageId: string): boolean
function stageProgress(outcomes: boolean[], rule: StageRule):
  { done: boolean; window: boolean[]; correctInWindow: number; remaining: number }
function isStageDone(attempts: Attempt[], stageId: string): boolean

// src/features/learn/learnGate.ts
function isStageUnlocked(id: string, completed: string[]): boolean
function isPracticeUnlocked(completed: string[], practiceUnlocked: boolean): boolean
function nextStageId(completed: string[]): string | null
function unlockedDailyMaxStageIndex(completed: string[]): number  // for Daily difficulty scaling
```

**New (DB/credit helpers) — `src/db/attempts.ts`:**
```ts
function isLearnAttempt(a: Attempt): boolean        // a.mode.startsWith('learn:')
function practiceAttempts(all: Attempt[]): Attempt[] // all.filter(a => !isLearnAttempt(a))
```

**New (grading) — `src/features/practice/drill.ts`:**
```ts
function gradeNumber(expected: number, guessed: number, mode: string,
                    durationMs: number, ts?: number): Attempt   // stages 1,2; targetDate=''
function gradeWeekday(expected: Weekday, guessed: Weekday, mode: string,
                     durationMs: number, ts?: number,
                     dimension?: 'anchor' | 'yearDoom'): Attempt // stages 4,5
```

**New (engine copy helpers) — `src/engine/today.ts`:**
```ts
const CURRENT_YEAR: number                       // new Date().getFullYear()
function thisYearDoomsday(): Weekday              // yearDoomsdayOddEleven(CURRENT_YEAR)
```

**New (UI/hooks):** `src/components/NumberPad.tsx`, `src/features/practice/PracticeLocked.tsx`, `src/features/learn/useLessonDrill.ts`.

**Changed:** `generate.ts` exports `pick` + `daysInMonth`; `learnProgress.ts` becomes a thin shim deriving `getDone`/`isDone` from `learnCompleted` (and `markDone` is **deleted**, not retargeted — see §8); `attempts.ts` adds the two filters; `stats.ts`/`selector.ts`/`achievements.ts` apply `practiceAttempts`; `daily.ts`/`useDaily.ts` accept a stage-scoped range.

---

## 4. Per-stage exercise spec

All draws deterministic via injected `rng`. **No reverse items** — they produced graders that mark correct answers wrong (`monthAnchor` day **4** = April *and* leap-January; `centuryAnchor` **Sunday** = 1700s *and* 2100s). Surface variety comes from the randomized forward generator, which is sufficient to kill prompt-pattern-matching.

| # | id | Tests (atom) | Prompt template | Random constraint | Correct-answer fn | Answer UI | New helper |
|---|---|---|---|---|---|---|---|
| **1** | `mod7` | reduce int mod 7; weekday number sense | "Cast out sevens: **{n}** → ?" or "**{a}+{b}** (mod 7) = ?" | `n = pick(15..69)`; addend form `a,b = pick(3..6)`; early draws smaller | `mod7(n)` / `mod7(a+b)` | **NumberPad** 0..6 | `gradeNumber`, `NumberPad` |
| **2** | `months` | doomsday day-of-month per month (+ leap Jan/Feb trap) | "Anchor day for **{Month}**{leap? ' (leap year)'}?" | `month = pick(1..12)`, `month∈{1,2}` ~30%; `leap = rng()<0.5` (labeled only Jan/Feb) | `monthAnchor(month, leap)` → {3..12,14,28,29} | **NumberPad** `options=ANCHOR_DAYS` | `gradeNumber` |
| **3** | `thisyear` | solve a **real date in the current year** (composite atom) | "**{d} {Month} {CURRENT_YEAR}** — weekday?" (sub: "this year's doomsday is {name}") | `generateDate({minYear:CURRENT_YEAR, maxYear:CURRENT_YEAR}, rng)` | `weekdayOfYMD(CURRENT_YEAR, m, d)` | **WeekdayPicker** (reuse) | `gradeProblem` (exists), `CURRENT_YEAR`/`thisYearDoomsday` |
| **4** | `century` | century anchor **weekday** | "The **{C}00s** — century anchor weekday?" | century ∈ {1700,1800,1900,2000,2100}; weight {1800,1900,2000} higher | `centuryAnchor(repYear)` | **WeekdayPicker** | `gradeWeekday(…, 'anchor')` |
| **5** | `year` | year doomsday via Odd+11, **in service of a date** (composite handoff) | "**{d} {Month} {year}** — weekday?" via **GuidedSolve** (century→year→offset) | `generateDate({minYear:1900, maxYear:2099}, rng)` | `weekdayOfYMD(y,m,d)`; substeps from `explain(...)` | **GuidedSolve** (reuse) | `gradeGuided` (exists) |
| **6** | `full` | full pipeline, any year (composite, single final answer) | "**{d} {Month} {year}** — weekday?" | `generateDate({minYear:1900, maxYear:2099}, rng)`; **~20% leap Jan/Feb** dates | `weekdayOfYMD(y,m,d)` | **WeekdayPicker** + `gradeProblem` | — |
| **7** | `speed` | automaticity of the full solve (NO new concept), timed | identical to stage 6, back-to-back with visible timer | `generateDate({minYear:1900, maxYear:2099}, rng)`; in Speedrun loop | `weekdayOfYMD(y,m,d)`, `timed:true` | **WeekdayPicker** in `Speedrun.tsx`/`useSpeedrun.ts` | `gradeProblem` (timed) |

**Why stage 5 is GuidedSolve, not isolated:** the doomsday method's hard part is the *handoffs* (century → year → offset), not the steps in isolation. Gating stage 5 on a raw year-doomsday weekday trains every step except the one that's actually hard. `gradeGuided` already exists and grades the three substeps. This leaves stage 4 (`century`) as the only *isolated raw-weekday* stage — its `gradeWeekday(…, 'anchor')` is the single new raw-weekday grader needed.

`ANCHOR_DAYS = [3,4,5,6,7,8,9,10,11,12,14,28,29]` (the NumberPad option set for stage 2). NumberPad is generalized: explicit `options: {value,label}[]`, `role="group"`, per-button `aria-label`, same graded/correct/wrong styling as `WeekdayPicker`.

---

## 5. Mastery / completion criterion (R6)

### Per-attempt outcome boolean (fed to the window)
```
stages 1–6:  outcome = attempt.correct
stage 7:     outcome = attempt.correct && attempt.timed && attempt.durationMs <= SPEED_MS
             SPEED_MS = 5000.  Stage 1 is NEVER time-gated.
```

### Per-stage parameters
```
STAGE_RULES = {
  mod7:     { K: 3, M: 4 },   // trivial on-ramp: clear in 4 reps, don't wall beginners on arithmetic
  months:   { K: 3, M: 4 },   // single-fact recall
  thisyear: { K: 4, M: 5 },
  century:  { K: 4, M: 5 },
  year:     { K: 4, M: 5 },
  full:     { K: 4, M: 5 },
  speed:    { K: 4, M: 5 },   // outcome already folds time
}
```

### Completion predicate (pure — no DB, no RNG)
```
outcomes = listAttempts()                         // newest-first (attempts.ts:25)
             .filter(a => a.mode === `learn:${stageId}`)
             .reverse()                           // oldest-first
             .map(a => perStageOutcome(a, stageId))
window   = outcomes.slice(-M)
DONE  iff  outcomes.length >= M  &&  countTrue(window) >= K
// structural min-attempts floor = M (impossible to be "K of last M" before M attempts exist)
```

### Latching (monotonic — drives R3/R4)
On the **first** transition to DONE: `markStageComplete(stageId)` → sticky union into `learnCompleted` (idempotent), then flip `practiceUnlocked=true` if `learnCompleted` now covers all 7 stage ids. **Once latched, a later bad window can never un-complete a stage or re-lock** — unlock/lock read `learnCompleted`, never the live window.

### Progress UI & reset rules
- Render the trailing **M dots** (oldest→newest): filled-green = correct, red = miss, hollow = not-yet-attempted. Stage 7 dots carry a small clock glyph.
- Label computes the **true** remaining count from the live window, never a hardcoded "one more": e.g. window `[T,T,T,F]` after another miss → `[T,T,F,F]` = "2 to go", not "1 more".
- A single red dot among greens **visibly does not wipe the others** — that *is* the message ("a slip is fine, keep going").
- **No reset, no wipe:** the window slides. A wrong answer drops `correctInWindow` by at most 1; the next correct refills it. Reload/leave/close has no effect (derived from persisted rows).
- On a miss: a **new random instance appears immediately** with concrete microcopy ("Not quite — it's Thu. {remaining} more good answers to internalize this.").
- On DONE: dots lock to a checkmark "Internalized" state; the next stage card **unlocks with a visible celebratory transition**; if this was stage 7, the **Practice tab unlock is a prominent moment**.
- The legacy **"Mark complete" button is removed** — `learnCompleted` is written only by the mastery gate (R6). A separate **"Start exercises →"** affordance moves the user from the reading view into the drill.

---

## 6. Gating

### Sequential unlock (R3, pure)
```
isStageUnlocked(id, completed):
  i = CURRICULUM.findIndex(s => s.id === id)
  return i <= 0 || completed.includes(CURRICULUM[i-1].id)
```
`LearnScreen` renders unlocked stages as Links, locked stages as **disabled cards that name the concrete next action** ("Internalize *Month anchors* first — {remaining} more good answers"), never a bare lock glyph. A locked `LessonScreen` redirects to `nextStageId(learnCompleted)`.

### Practice lock (R4, pure)
```
isPracticeUnlocked(completed, practiceUnlocked):
  return practiceUnlocked || CURRICULUM.every(s => completed.includes(s.id))
```

**Progressive content unlock (mitigates the cold-start cliff):** while the *tab* is locked, the practice *content a user has earned* is still reachable inside the lesson flow — stage 3 opens this-year solving, stage 6 opens full-range, stage 7 opens speedrun. The free **Practice tab** itself opens only at full completion.

### Entry points to lock + locked-state UX

| # | Entry point | file:line | Locked treatment |
|---|---|---|---|
| 1 | Route / screen (authoritative gate) | `routes.tsx:8,22` / `PracticeScreen.tsx` | render `<PracticeLocked>` — "X / 7 stages internalized", CTA → `nextStageId(completed)`; **no drill mounted** |
| 2 | BottomNav tab | `BottomNav.tsx:6` | lock glyph; tap → `/learn` while locked |
| 3 | Lesson "Practice this →" | `LessonScreen.tsx:66` | repurposed to the stage's **own in-lesson drill** (R2); never the free tab while locked |
| 4 | Today welcome-banner inline link | `TodayScreen.tsx:57/64` | **lock-aware copy** "Start with Learn — Practice unlocks as you go"; link → `/learn` |
| 5 | Today "Quick Drill →" CTA | `TodayScreen.tsx:144` | → "Continue learning →" `/learn` while locked (**update `TodayScreen.test.tsx:14`**) |
| 6 | Progress empty-state "Start drilling →" | `ProgressScreen.tsx:63` | → `/learn` while locked |
| 7 | Progress weakest-century "drill it →" | `ProgressScreen.tsx:149` | hidden while locked |
| 8 | Daily Challenge CTA | `TodayScreen.tsx:118`, `routes.tsx /daily` | **stays reachable**, but Daily *difficulty* is scaled to unlocked stages (§7); never auto-unlocks Practice |

---

## 7. Daily-goal crediting (R5)

### Mechanism — decoupled from completion, fires on every **correct** graded attempt
```
each graded lesson/daily/practice answer:
  if (attempt.correct) recordAttempt(attempt)   // addAttempt + recordPracticeDay(localDayKey(ts))
  else                 addAttempt(attempt)       // row recorded, NO day credit
```
- **First correct rep of the day credits the streak; later correct reps are free no-ops** via `recordPracticeDay`'s `last !== day` guard (`meta.ts:39`).
- **Day-credit is gated on correctness**: a *wrong* one-tap answer must not sustain the streak. Keeps the streak a habit-of-*learning* signal and keeps `streak7`/`streak30` honest.
- **No numeric daily goal** (zero refs in repo). The streak *is* the daily goal.

### Heatmap / streak / stats consistency
- **Heatmap stays unfiltered** — lesson days must show. `tallyByDay` counts rows by `timestamp`, so `learn:*` rows with `targetDate=''` appear correctly.
- **REQUIRED pollution filter (`practiceAttempts`)** so lesson reps don't inflate "solved"/accuracy or feed the adaptive picker, applied at:
  - `stats.ts`: `summarize`, `accuracyByDimension`, `weakest`
  - `selector.ts`: `nextProblem` (wrap `attempts` **before** `accuracyByDimension`, else weakest-century steers off the `'unknown'` bucket)
  - `achievements.ts`: `total`/`fast`/accuracy-derived badges
- **Guard `dimKeyLabel` (`stats.ts:42`)**: `if (a.mode.startsWith('learn:')) skip` — defends the `a.correctWeekday as Weekday` cast against a day-of-month (e.g. 29) leaking in.
- **Daily rows (`mode='daily'`) are NOT filtered** out of milestone badges — a Daily solve is a genuine full-difficulty solve.

### Achievement taxonomy (split along learn/practice line)
- **New learning milestones:** `firstLesson` ("Complete your first lesson exercise"), `internalized` ("Internalize all 7 stages → Practice unlocked", keyed on `learnCompleted.length === 7`).
- **Existing** `first`/`ten`/`hundred`/`sharp` keyed on `practiceAttempts` (incl. `daily`) so they stay reachable and un-inflated.
- `streak7`/`streak30` unchanged (lessons build them — intended).

---

## 8. Migration (run once at App mount; idempotent; `practiceUnlocked` early-return)

```
if (practiceUnlocked) return                                  // already unlocked

learnDone   = getMeta('learnDone', [])
attempts    = listAttempts()

grandfathered =
     learnDone.length > 0                                     // ANY prior old-Learn engagement (widened)
  || practiceAttempts(attempts).length > 0                    // any non-learn:* attempt = practice OR daily history

if (grandfathered) {
  setMeta('practiceUnlocked', true)
  if (learnDone.length) setMeta('learnCompleted', learnDone)  // seed so Learn shows prior progress
}
```

> **Correction to the original design (do not re-add the streak clause).** An
> earlier draft also grandfathered on `longestStreak > 0 || lastActiveDay != null`.
> That is WRONG once R5 ships: correct *lesson* answers build the streak, so a
> brand-new user who answers a single lesson question and reloads would have
> `longestStreak ≥ 1`, trip the streak clause, and unlock Practice — defeating R4.
> The streak clause is also redundant: any *pre-migration* streak was earned by a
> practice/daily attempt, and those rows are `Attempt` rows the attempt clause
> already catches. `practiceAttempts` excludes only `learn:*` (NOT `daily`), so
> daily history satisfies the attempt clause directly.

### Every existing-user state, resolved

| State | Covered by | Outcome |
|---|---|---|
| **A** Returning power user, hundreds of practice attempts, never did Learn | `practiceAttempts(attempts) > 0` | Unlocked. |
| **B** Finished old Learn (all 7), or touched any of it | `learnDone.length > 0` (**widened** from "covers all 7") | Unlocked — tutorial-skimmers are NOT re-gated. |
| **C** Pre-migration streak holder | always had practice/daily `Attempt` rows → `practiceAttempts > 0` | Unlocked via the attempt clause (streak clause unnecessary). |
| **D** Daily-only user (`mode='daily'` rows) | `daily` rows are kept by `practiceAttempts` → attempt clause | Unlocked. |
| **E** `onboarded` flag | **deliberately NOT consulted** | It's "dismissed banner," not completion. |
| **F** Brand-new install (no learnDone, no attempts) | fails all clauses | **Gated** — a population R4 bites. Correct. |
| **G** New user answers a few *lesson* questions (builds a lesson streak), then reloads | `practiceAttempts` excludes `learn:*`; learnDone empty; **streak clause removed** | **Stays gated** — the critical fix: neither `learn:*` rows nor the lesson-built streak may grandfather a new user, or R4 dies on the first reload. |
| **H** New user does a few *Daily* questions, then reloads | `daily` rows satisfy the attempt clause | **Unlocked** (matches confirmed decision #1 — a Daily-engaged newcomer is a real user). |

**Grandfather/derived disagreement:** a grandfathered user's `learnCompleted` may contain stages the live 4-of-5 predicate would call not-done. **The latch always wins** — unlock/lock read `learnCompleted`; the predicate only *writes* it. Cosmetic-only. Do not "reconcile" it.

**`markDone` deletion:** after the LessonScreen button is removed, `grep markDone` must return zero callers. **Delete `markDone`** rather than retarget it — a retargeted `markDone` writing `learnCompleted` would let a stage complete without passing 4-of-5. `learnProgress.ts` keeps only the read shim.

---

## 9. Implementation plan (sequenced, TDD-able)

House conventions: pure-logic test → DB/migration test → hook test → screen test. DB tests reset with `_resetDbForTests()` + `indexedDB.deleteDatabase('daycipher')` in `beforeEach`. RNG via `makeRng(seed)`. Attempt factory `mk()`/`many()` (`selector.test.ts:5-11`).

**Task 1 — Renumber + copy helpers (R1)**
- Edit `curriculum.ts` `n:` literals → 1..7; `curriculum.test.ts:8` → `toEqual([1,2,3,4,5,6,7])`.
- New `engine/today.ts` (`CURRENT_YEAR`, `thisYearDoomsday`) + `today.test.ts`. Export `pick`, `daysInMonth` from `generate.ts`.
- Commit: `feat(learn): renumber stages 1..7; add CURRENT_YEAR/thisYearDoomsday helpers`

**Task 2 — Graders + attempt filters (pure/DB)**
- `drill.ts`: `gradeNumber`, `gradeWeekday` + tests (incl. `gradeNumber(29,29,'learn:months',0)` row; assert `accuracyByDimension([that],'weekday')` does NOT throw).
- `attempts.ts`: `isLearnAttempt`, `practiceAttempts` + tests.
- Commit: `feat(practice): add gradeNumber/gradeWeekday + learn-attempt filters`

**Task 3 — Mastery + gate (pure, core of R6/R3/R4)**
- `learnMastery.ts` + tests: table tests over `boolean[]` — not done before M; done at K-of-M; slip slides without reset (`[F,F,F,T,T,T,T]` → done); per-stage K/M; stage-7 speed predicate.
- `learnGate.ts` + tests: `isStageUnlocked`, `isPracticeUnlocked`, `nextStageId`, `unlockedDailyMaxStageIndex`, `markStageComplete` union-idempotency.
- Commit: `feat(learn): mastery (4-of-5 derived) + sequential gate predicates`

**Task 4 — Migration (DB)**
- `App.tsx` migration effect + `migration.test.ts`: seed each state A–H; assert `practiceUnlocked`; **seed only `learn:mod7` rows + run twice → `false`** (state G); one `quick` row → `true`.
- Commit: `feat(app): one-time grandfather migration for practice unlock`

**Task 5 — `useLessonDrill` hook (R5/R6, StrictMode discipline)**
- New `useLessonDrill.ts` = `useDaily`'s cursor model (`persistedRef`, persist `results.slice(...)`, advance cursor before await) + per-answer credit (`recordAttempt` on correct / `addAttempt` on wrong).
- Tests (inject `makeRng(seed)` and `durationMs`): K-of-M correct → `learnCompleted` includes stageId; first *correct* → `currentStreak===1` AND mastery NOT done; first *wrong* → `currentStreak===0`; StrictMode remount → no duplicate `learn:` rows.
- Commit: `feat(learn): useLessonDrill — derived mastery, per-correct streak credit`

**Task 6 — NumberPad + PracticeLocked + Daily scaling**
- `NumberPad.tsx`, `PracticeLocked.tsx` (+ tests). `daily.ts`/`useDaily.ts`: accept stage-scoped `{minYear,maxYear}` from `unlockedDailyMaxStageIndex` (+ test).
- Commit: `feat(ui): NumberPad, PracticeLocked, stage-scoped Daily difficulty`

**Task 7 — Wire screens (R2/R3/R4) + downstream filters**
- `LessonScreen`: remove "Mark complete"; add "Start exercises →"; mount `useLessonDrill`; M-dot progress; locked-stage redirect.
- `LearnScreen`: lock/unlock cards, next-action copy, celebratory unlock. `PracticeScreen`/`routes`: `PracticeLocked` when locked. `BottomNav`, `TodayScreen` (#4/#5), `ProgressScreen` (#6/#7).
- Apply `practiceAttempts` in `stats.ts`/`selector.ts`/`achievements.ts`; add `firstLesson`/`internalized` badges. Update affected tests. Delete `markDone`; convert `learnProgress.ts` to read shim.
- Commit: `feat(learn): gate stages sequentially, lock Practice, scope downstream stats`

---

## 10. Decisions — CONFIRMED by user (2026-06-18)

1. **Daily Challenge as a grandfather signal (state H):** **leave as-is** (default) — a Daily-only newcomer is grandfathered because `daily` rows satisfy the attempt clause (`practiceAttempts` keeps `daily`). Not flagged for change.
2. **Daily difficulty scaling:** **scale Daily to unlocked stages** — this-year-only until `century` is internalized (`unlockedDailyMaxStageIndex`), then full 1900–2099.
3. **Stage-7 speed:** **required `≤ SPEED_MS (5000ms)` to complete** (time folded into the stage-7 outcome predicate); sub-2000ms lights an optional badge.
4. **Per-stage K/M:** **`K=3/M=4` for stages 1–2 (`mod7`, `months`), `K=4/M=5` for stages 3–7.** Completion = rolling "K of last M" (not 3-in-a-row); window slides, no reset.
5. **Day-credit gated on correctness:** **only a *correct* answer credits the streak** — wrong answers record an `Attempt` row (`addAttempt`) but do not call `recordPracticeDay`.
