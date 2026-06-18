# Learn improvements — design

**Date:** 2026-06-18
**Scope:** Three coordinated improvements to the Learn feature of Daycipher.

1. **Practice-again** — let a learner redo a stage's exercises after it's been internalized.
2. **Leap-years stage** — a new, dedicated, drillable stage teaching how to decide whether a year is a leap year.
3. **Content rewrite** — a research-backed pass over every stage's copy and the cheat-sheet, fixing correctness/rot and tightening for clarity and concision.

All changes live in `src/features/learn/` plus two small shared components. There is **no data-model migration**: the only new persisted artifacts are one new attempt `mode` string (`learn:<stageId>:practice`) and one new answer kind (`boolean`). No-backwards-compat applies (no users yet), so changing the stage count and renumbering is free.

Ships as **one PR**.

---

## Background — current behavior (ground truth)

- `src/features/learn/curriculum.ts` — `CURRICULUM: Stage[]`, 7 stages (`mod7`, `months`, `thisyear`, `century`, `year`, `full`, `speed`). Each stage has `blocks: Block[]` (`p | h | list | mnemonic | example`), display number `n`, and optional `k`/`m` mastery thresholds and `timed`.
- `src/features/learn/useLessonDrill.ts` — generates problems (`nextLessonProblem`), grades, persists attempts under mode `learn:<stageId>`, derives live mastery from the **whole attempt log** plus in-session results, and latches completion via `markStageComplete` on the first DONE transition.
- `src/features/learn/learnMastery.ts` — `stageOutcomes` filters attempts by **exact** mode match `a.mode === 'learn:<stageId>'`; `stageProgress` is a sliding "K of last M" window. Stages 1–2 are 3-of-4; the rest default to 4-of-5.
- `src/features/learn/learnGate.ts` — sequential unlock by curriculum **order**; Practice unlocks once `CURRICULUM.every(s => completed.includes(s.id))` (or the one-shot latch is set). Completion (`learnCompleted`) is a sticky union — never removed.
- `src/features/learn/LessonScreen.tsx` — renders the blocks, a "Start exercises →" button, then `<LessonDrill>`. When the drill is `done`, it shows only a terminal nav block ("Back to Learn" / "Practice unlocked"); the problem widget is hidden. A completed stage is still reachable, but tapping "Start exercises" short-circuits straight to "✓ Internalized" because mastery is derived from the full log — **so re-drilling is currently impossible**.
- `src/features/daily/daily.ts` — Daily difficulty keys off the `century` **stage id** (`DAILY_FULL_RANGE_STAGE = 'century'`), explicitly "survives stage renumbering."
- `src/routes.tsx` — `learn/:stageId` is a catch-all param route (after `learn/cheatsheet`), so any new stage id routes through `LessonScreen` automatically.
- `src/engine/doomsday.ts` — `isLeapYear(year)` already implements `÷4 except ÷100 unless ÷400`. `src/engine/today.ts` — `CURRENT_YEAR` and `thisYearDoomsday()` are available for dynamic copy.

---

## Section 1 — Practice-again (redo after completion)

### Goal
A learner who has internalized a stage can re-drill its exercises freely, without it instantly reporting "done," and without disturbing their completion/mastery state.

### Hook: `useLessonDrill(stageId, { practice })`
Add an optional `practice?: boolean` to `LessonDrillOptions`. When `practice` is true:

- **Window source:** the live window is computed from **in-session `results` only** — `priorOutcomes` is initialized to `[]` instead of loaded from the log. So `done` starts false and the drill never short-circuits to the terminal screen.
- **No completion latch:** `markStageComplete` is **never** called in practice mode (neither the self-heal-on-mount call nor the first-DONE-transition call). `done`/`progress` in practice mode are display-only (used for the encouraging dots), not a gate.
- **Persistence:** answered rows persist under mode **`learn:<stageId>:practice`**:
  - Excluded from the stage's mastery window — `stageOutcomes` uses an exact match on `learn:<stageId>`, so the `:practice` suffix is invisible to mastery.
  - Excluded from Practice statistics — `practiceAttempts` filters out every `learn:*` row, and `:practice` rows are still `learn:*`.
  - **Daily streak still credited** on correct answers (correct → `recordAttempt`, wrong → `addAttempt`), so re-practicing keeps the streak alive — consistent with the speed stage's "drill daily keeps the streak" promise.
- The generator (`nextLessonProblem`) is unchanged; practice mode reuses the same per-stage instances. Note the persisted `Attempt.mode` for practice rows is `learn:<stageId>:practice` while the problem's own `mode` field stays `learn:<stageId>`; the drill stamps the practice mode at persist time.

### UI: `LessonScreen` + `LessonDrill`
`LessonScreen` tracks a small local state `mode: 'idle' | 'learn' | 'practice'` (replacing the current `started` boolean) and knows whether the stage is done via `isDone(stage.id, completed)` (it already loads `completed`).

- **Idle, stage not done** → primary button **"Start exercises →"** → `mode = 'learn'` (current behavior, unchanged).
- **Idle, stage done** → the lesson text remains rendered above; primary button reads **"Practice again"** → `mode = 'practice'`. (A first-time mastery run is pointless on a done stage — it would just show ✓.)
- **`mode === 'learn'`** → `<LessonDrill practice={false}>`. When it reaches `done`, the terminal block additionally shows a **"Practice again"** button beside "Back to Learn" / "Practice unlocked" → switches `mode = 'practice'`.
- **`mode === 'practice'`** → `<LessonDrill practice={true}>`: endless problems, encouraging dots, **no** terminal "done" block. A persistent **"Done →"** link (back to `/learn`) lets the learner leave anytime.

`LessonDrill` takes a `practice` prop and forwards it to `useLessonDrill`. In practice mode it never renders the terminal completion block; it always renders the current problem plus the exit link.

### Acceptance
- Opening a completed stage shows the lesson text and a "Practice again" affordance; tapping it serves a fresh problem (not "✓ Internalized").
- Practicing a completed stage never changes `learnCompleted` and never alters the stage's mastery window.
- A correct practice answer advances the daily streak.
- Practice rows do not appear in Practice statistics.

---

## Section 2 — New Stage 2 "Leap years"

### Goal
Teach the learner to decide whether a given year is a leap year, and connect that to why only January and February anchors shift — currently mentioned only as a "trap," never taught.

### Curriculum
Insert a new stage between `mod7` and `months`:

```
1  mod7      Think in 7s
2  leap      Leap years          ← NEW
3  months    Month anchors
4  thisyear  Dates in this year
5  century   Century anchors
6  year      The year's doomsday (Odd+11)
7  full       Any date, end to end
8  speed     Getting fast
```

- `id: 'leap'`, `n: 2`; renumber `months`…`speed` to 3…8.
- `k: 4, m: 5` (the default; binary answers but edge-case-weighted generation — see below — keeps lucky streaks unlikely).
- Content (concise, final wording produced by the Section 3 research pass):
  - The rule: divisible by 4 → leap; **except** divisible by 100 → not; **except** divisible by 400 → leap again.
  - Worked checks: 2000 ✓, 1900 ✗, 2024 ✓, 2100 ✗.
  - The Doomsday tie-in: only Jan & Feb gain/lose the day, so only their anchors shift (Jan 3→4, Feb 28→29). The `months` stage copy then references this stage instead of re-explaining the rule.

### Drill
Add `case 'leap'` to `nextLessonProblem`:
- Pick a year **weighted toward century edge-cases** — a mix of century years (1700/1800/1900/2000/2100/2400) and ordinary years (some divisible by 4, some not) — so a guesser who ignores the ÷100/÷400 rule fails.
- Prompt: `Is {year} a leap year?`
- `answerKind: 'boolean'`, `correct: isLeapYear(year) ? 1 : 0`.
- Graded with `gradeNumber` (stored as 0/1 in `correctWeekday`, consistent with the existing number-kind stages `mod7`/`months`).

### Widget: `BooleanPicker`
New `src/components/BooleanPicker.tsx`, mirroring `NumberPad`'s prop shape (`graded`, `guessed`, `correct`, `onPick`). Renders two large buttons **No** / **Yes** mapping to 0 / 1, with the same green/burgundy graded styling. `LessonProblem.answerKind` gains `'boolean'`; `LessonDrill` adds a `boolean` branch that renders `BooleanPicker` and calls `drill.answer(0|1)`. The drill's **feedback line** also gains a `boolean` branch so a wrong answer reads *"it was Yes"* / *"it was No"* rather than a bare `0`/`1` (today it formats weekday-name vs. bare number).

### Ripples (all automatic; only comments change)
- **Routing:** `learn/:stageId` catch-all already serves `leap` — no route change.
- **Gating / Practice unlock:** order-based and `CURRICULUM.every(...)` — auto-correct. Stale "all 7"/"7 stages" comments updated to be count-agnostic.
- **Daily difficulty:** keys off the `century` id, not its index — unaffected. (The learner reaches full-range Daily one stage later, which is acceptable.)
- **Mastery rules map:** `STAGE_RULES` is built from `CURRICULUM`, so `leap` is included automatically.

### Acceptance
- "Leap years" appears as Stage 2; `months`…`speed` show as 3…8.
- The leap drill generates valid yes/no problems, graded correctly against `isLeapYear`.
- Completing all 8 stages unlocks Practice; completing 7 does not.

---

## Section 3 — Research-backed content rewrite

### Goal
Make every stage's explanation and the cheat-sheet clearer, shorter, and verifiably correct.

### Scope
All stage `blocks` in `curriculum.ts` (including the new `leap` stage) and `src/features/learn/CheatSheet.tsx`.

### Method (during implementation)
1. **Research** authoritative Doomsday-rule pedagogy: Conway's original framing, the Fong–Walters "Odd+11" method, established mnemonics, and common learner pitfalls.
2. **Redraft** each stage: clearer and shorter. Keep proven mnemonics ("I work 9-to-5 at the 7-Eleven," "Y-Tues-K," etc.); replace or restructure **only where it clearly reads better**.
3. **Adversarially verify** every worked `example`'s arithmetic against the engine (`weekdayOfYMD`, `yearDoomsdayOddEleven`, `centuryAnchor`, `monthAnchor`) — no example may be wrong. This is enforced by a test that recomputes each example from the engine.

### Specific fixes already identified
- **Rot:** Stage 3 (`thisyear`) hardcodes *"For 2026 it is Saturday."* Render the current year's doomsday **dynamically** from `thisYearDoomsday()` / `CURRENT_YEAR`. Mechanism: a small token interpolation in `LessonBlocks` (e.g. `{thisYear}` → `2026`, `{thisYearDoomsday}` → `Saturday`) so curriculum data stays static while the rendered copy tracks the calendar. The drill's `sub` line already does this dynamically — bring the lesson text in line.
- Tighten the Odd+11 steps to match the cheat-sheet exactly; consistent "cast out sevens" and weekday-number framing throughout.
- Keep each stage to a handful of short blocks; the cheat-sheet stays one screen.

### Acceptance
- No worked example disagrees with the engine.
- No hardcoded current-year fact remains; the "this year's doomsday" copy is correct in any calendar year.
- Copy is materially tighter; mnemonics preserved unless a clearly better one is adopted.

---

## Testing

Mirror existing test patterns (Vitest + Testing Library, `fake-indexeddb`):

- **curriculum.test.ts** — `leap` present at `n:2`; `n` values are 1..8 contiguous and match order; **every `example` block recomputed against the engine**.
- **useLessonDrill.test.ts** — `leap` generates valid boolean problems graded against `isLeapYear`; **practice mode**: never calls `markStageComplete`, persists rows under `learn:<id>:practice`, those rows are excluded from `stageOutcomes`, and a correct practice answer credits the streak.
- **learnGate.test.ts / learnMastery.test.ts** — updated for 8 stages; Practice unlocks only after all 8.
- **LessonScreen.test.tsx** — completed stage shows "Practice again" (idle and post-run); practice mode shows a problem rather than "✓ Internalized."
- **BooleanPicker.test.tsx** — renders No/Yes, maps to 0/1, graded styling.

Gates: `pnpm typecheck && pnpm test && pnpm lint` all green.

---

## Out of scope
- No changes to the engine math (already correct).
- No changes to Practice, Progress, Settings, or the Daily generator logic (only the auto-correcting stage-id gate is touched indirectly).
- No reset/un-complete affordance (practice-again leaves completion intact, by decision).
