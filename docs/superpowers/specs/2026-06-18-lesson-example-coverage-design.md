# Lesson example generation: full-coverage sampling + wide date range

**Date:** 2026-06-18
**Status:** Design — awaiting review
**Branch:** `feat/lesson-example-coverage`

## Problem

Lesson "examples" feel repetitive and don't span the space of possibilities. There are two
distinct kinds of example, generated two different ways:

1. **Worked examples** — the fully-solved walkthroughs in the lesson prose
   (`curriculum.ts`, `kind: 'example'`). Exactly **three exist**, all hard-coded, never
   varying: `thisyear` = 25 Dec 2030, `year` = Year 2005, `full` = 20 Jul 1969.

2. **Drill problems** — the interactive "Start exercises →" items
   (`useLessonDrill.ts` → `nextLessonProblem`). Randomized with `Math.random`, but the
   sampling is shallow and, in places, not random:
   - `leap` draws from a **fixed list of 16 years** → genuinely recycles.
   - `mod7` addend pairs only span `[3,6]`.
   - `century` has only 5 possible questions (inherent to the domain).
   - All weekday-answer stages rely on naive uniform draws over a short mastery window
     (4–5 reps), so the birthday-paradox effect clumps: the same month/answer repeats
     before others appear.

### Key insight: random ≠ coverage

Pure uniform `Math.random` does **not** produce coverage — over short windows it clumps.
Coverage comes from *structured* sampling: deal every meaningful variant once before
repeating. More randomness makes clumping worse, not better. This design replaces naive
uniform / fixed-pool sampling with coverage-guaranteeing sampling.

### Key insight: the algorithm's space is only 400 years wide

The Gregorian calendar is exactly periodic in weekdays every 400 years
(146,097 days = 20,871 weeks). So `weekday(Y,M,D) === weekday(Y+400,M,D)` for every date,
and **every distinct Doomsday problem** (century-anchor × year-doomsday × month-anchor ×
leap-trap × weekday-answer) is fully enumerated by *any* 400-year window. Widening the
date range adds **visual variety only**, never new algorithmic cases. Coverage is solved
by the sampler regardless of range.

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Scope | Both drill problems and worked examples |
| Drill smartness | Coverage only (pure, no DB reads / spaced-repetition) |
| Worked examples | Hybrid — keep bespoke hero, add a "Show another" engine walkthrough |
| Sampling backbone | Shuffled bag (categorical) + low-discrepancy fill (continuous) |
| Date range | Full proleptic Gregorian, **9999 BC – 9999 AD** |
| Year distribution | **Centered + long tail** — mostly ~1500–2600, occasional extremes |

## Architecture

Two new pure engine/feature primitives, a per-stage sampler, a worked-example generator,
and a small UI component. `engine/generate.ts` is untouched (Daily/Practice keep using it).

### 1. `src/engine/sampler.ts` — coverage primitives (pure, seedable)

- **`makeBag<T>(items, rng) → { next(): T }`** — sampling without replacement.
  Fisher–Yates shuffle → deal one at a time → reshuffle on empty, with a guard so the last
  card of one cycle ≠ the first of the next. Guarantees every variant appears once before
  any repeats.
- **`makeQuasi(rng) → { next1d(): number; next2d(): [number, number] }`** — low-discrepancy
  generator using the R2 sequence (Roberts' plastic-constant additive recurrence):
  `xₙ = frac(x₀ + n·α)`, `α = (1/φ₂, 1/φ₂²)`, `φ₂ ≈ 1.32471795724475`. Fills [0,1) far more
  evenly than independent uniform draws. `x₀` seeded from `rng` so streams vary per session
  but are deterministic under an injected seed.
- **`quasiInt(u, min, max) → number`** — map a [0,1) value to an inclusive integer range.
- **`warpYear(u, { center, spread, min, max }) → number`** — monotonic inverse-CDF warp of a
  uniform/low-discrepancy `u` into a **centered, long-tailed** year distribution (logistic /
  Cauchy-style: dense near `center`, heavy tails reaching `min`/`max`, then clamp). Because
  the warp is monotonic it preserves the low-discrepancy property of the input stream.
  Tuned so ≈80% of draws land in ~1500–2600 and the tails still reach the BC / far-future
  extremes. Years are **astronomical** integers (year 0 = 1 BC), range `[-9998, 9999]`.

### 2. `src/features/learn/lessonSampler.ts` — per-stage variants

Each stage declares its variant set (the bag) and an `instantiate(variant, quasi, rng)`.
`makeLessonSampler(stageId, rng) → { next(): LessonProblem }` holds bag + quasi state in a
closure. The per-stage `switch` currently inside `useLessonDrill.nextLessonProblem` moves
here; `LessonProblem`/`gradeLesson` stay where they are (or move alongside — see Build order).

Bag picks the categorical variant; quasi fills the numbers.

| Stage | Bag (categorical) | Quasi / year fill | Range |
|---|---|---|---|
| `mod7` | 14 cards = {cast-out, pair-add} × {answer 0–6} | concrete `n` (or widened `a,b`) hitting that residue | n/a |
| `leap` | 4 leap-rule classes: ÷4·not÷100, ÷100·not÷400, ÷400, not÷4 | a year of that class, drawn over the **wide** range (centered+tail) | 9999 BC–9999 AD |
| `months` | 14 cards: 12 months + Jan-leap + Feb-leap | — (anchor is exact) | n/a |
| `thisyear` | 12 months (current year) | day-of-month | current year only |
| `century` | the taught 5 centuries (1700–2100) | — | **unchanged** (anchors are recalled, not computed) |
| `year` | 7 answer-weekdays (0–6) | a year yielding that doomsday, **wide** (centered+tail) | 9999 BC–9999 AD |
| `full` / `speed` | 14 cards: 12 months + Jan/Feb-leap | R2-paired (year via `warpYear`, day) | 9999 BC–9999 AD |

Notes:
- `century` and `thisyear` deliberately **do not** adopt the wide range. Century anchors are
  *recalled* (only 5 are taught, with mnemonics) — arbitrary centuries are a different skill.
- `leap` and `year` are century-agnostic skills, so the wide range adds variety with no
  difficulty spike. `full`/`speed` need the century anchor; the centered distribution means
  exotic centuries (requiring the formula `(5·(c mod 4)+2) mod 7`) appear only occasionally.

### 3. `src/features/learn/useLessonDrill.ts` — wiring

- Create `makeLessonSampler(stageId, rngRef.current)` **once at mount** via a lazy ref
  initializer guarded against StrictMode double-invoke; call `samplerRef.current.next()`
  everywhere `nextLessonProblem(stageId, rng)` is called today (load effect + `answer`).
- "Practice again" already remounts the drill (keyed by `mode`) → a fresh sampler / fresh
  shuffle. No persistence-discipline changes; the sampler is in-memory only.
- Tests inject a seeded `rng` for deterministic sequences.

### 4. `src/features/learn/workedExample.ts` — generated walkthroughs

- `generateWorkedExample(stageId, rng) → { date: string; steps: string[]; answer: string;
  check }` for `thisyear` / `year` / `full`. Every number is derived from the engine's
  `explain()` (correct by construction); steps are formatted to match each hero's depth.
- **Illustrative constraint** via bounded rejection sampling (≈20 tries, fallback to last):
  reject degenerate dates — e.g. reduced offset = 0 (where "step forward, cast out 7" would
  be invisible) for `thisyear`/`full`.
- **Honest century-anchor step:** when the drawn century is outside the taught 1700–2100,
  the walkthrough shows the anchor *computed* via the formula rather than implying recall.
- `year`/`full` draw years from the wide range (centered + long tail); `thisyear` uses the
  current year.

### 5. `src/components/WorkedExample.tsx` + rendering wiring

- Renders the hero `example` block (unchanged default) plus a **"Show another"** button.
  On click it generates a fresh walkthrough and swaps it into the same card layout
  (a "Reset"/back affordance returns to the hero). State is local; generation happens on
  click, not per render.
- `stageId` is threaded `LessonScreen → LessonBlocks → WorkedExample`. `LessonBlocks` gains a
  `stageId` prop and renders `WorkedExample` for `kind: 'example'` blocks; other block kinds
  are unchanged.
- "Show another" appears **only** on the three stages that have hero examples
  (`thisyear`, `year`, `full`). No worked examples are added to stages that lack them.

### 6. Engine correctness fixes (required for negative years)

The engine is only exercised on 1900–2099 today, so negative years hit unnormalized modulo
and silently return wrong answers. Fixes:

- `centuryAnchor`: `c % 4` is negative for BC centuries → normalize to `((c % 4) + 4) % 4`.
- `yearDoomsdayOddEleven`: `t = year % 100` goes negative (breaks the `t/2` step) → normalize
  to `t = ((year % 100) + 100) % 100`.
- `yearDoomsdayConway`: same `year % 100` issue → normalize.
- `isLeapYear`, `centuryOf`, `monthAnchor`, `daysInMonth` already behave correctly for
  negatives (verified) — no change.
- `weekdayOfYMD` inherits the two fixes; no direct change.

### 7. Calendar & display

- **Proleptic Gregorian**, **astronomical year numbering** internally (year 0 = 1 BC,
  −1 = 2 BC). The supported range is astronomical `[-9998, 9999]`.
- New era-aware formatter (extend `lib/format.ts`): astronomical `y ≤ 0` → `"<1−y> BC"`,
  else the plain year (AD). Used by both drill prompts and generated worked examples.
- `ymdKey` must handle negative years for `targetDate` (string key only — no zero-padding
  requirement since BC dates never reach the heatmap, which is anchored near the present).
- A short **"proleptic Gregorian"** honesty note appears where wide/BC dates are introduced
  (the pre-1582 weekday is a mathematical projection, not the historical Julian weekday).

## Testing

- `sampler.test.ts`: bag covers all items before any repeat + no adjacent-cycle repeat;
  `makeQuasi` has lower discrepancy than uniform over N draws; `warpYear` lands ≈80% in the
  core window yet reaches both extremes; determinism under a fixed seed.
- `lessonSampler.test.ts`: per stage, one full cycle hits every variant (leap → all 4
  classes, months → 12 + Jan/Feb-leap, year → all 7 answers, full → 12 months + leap trap);
  every generated problem's `correct` matches the engine.
- `workedExample.test.ts`: generated examples satisfy the illustrative constraint; `answer`
  matches the engine; exotic-century examples render the computed-anchor step.
- `doomsday.test.ts` (extend): periodicity invariant `weekdayOfYMD(y,m,d) ===
  weekdayOfYMD(y+400,m,d)` across the full range incl. BC; cross-check a spread of dates
  (incl. BC) against an independent reference (Sakamoto / Julian-Day) written in the test;
  AD dates cross-checked against `Date.UTC` where in range.
- `useLessonDrill.test.ts` (update): sampler injection with a seeded rng.
- `curriculum.test.ts`: unchanged — hero examples still engine-verified.
- `format.test.ts` (extend): BC / AD era formatting.

## Files

**New:** `engine/sampler.ts`, `features/learn/lessonSampler.ts`, `features/learn/workedExample.ts`,
`components/WorkedExample.tsx` (+ 4 test files).

**Edit:** `engine/doomsday.ts` (3 modulo fixes), `features/learn/useLessonDrill.ts`
(use sampler; move the per-stage switch out), `components/LessonBlocks.tsx` (render
`WorkedExample`, accept `stageId`), `features/learn/LessonScreen.tsx` (pass `stageId`),
`lib/format.ts` (era-aware date formatter), `lib/datekey.ts` (negative-year `ymdKey`).

**Untouched:** `engine/generate.ts`, `features/practice/*` (Daily/Practice keep `generateDate`).

## Out of scope (YAGNI)

- Weakness-targeting / spaced-repetition in the lesson drill (Practice already covers that).
- Widening the Daily/Practice ranges or the `century`/`thisyear` stages.
- Worked examples for stages that don't currently have one.
- Low-discrepancy fill for `mod7`/`months`/`century` (no continuous dimension to spread).

## Build order

1. Engine modulo fixes + periodicity/reference tests (`doomsday.ts`).
2. `sampler.ts` (bag, quasi, `warpYear`) + tests.
3. `lessonSampler.ts` (per-stage variants) + tests; wire into `useLessonDrill`.
4. Era-aware formatter + `ymdKey` negatives + tests.
5. `workedExample.ts` + tests.
6. `WorkedExample.tsx` + thread `stageId`; render in `LessonBlocks`.
7. Full suite green; manual pass through each stage's drill + "Show another".
