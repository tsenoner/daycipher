# Lesson example generation: weighted sampling + wide date range

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
   - All dates are confined to **1900–2099**, so it always *looks* like 19xx/20xx.

### Insight 1: random ≠ coverage, but coverage only bites when the window is small

Pure uniform `Math.random` does not produce coverage over short sequences — it clumps. But
how much that matters depends on **window size vs. domain size**. A learner internalizes a
stage in ~4–5 correct answers (M=4 or 5):

- **Large-domain stages** (`months`/`full`/`mod7` = 12–14 variants, `thisyear` = 12): window
  ≪ domain, so the learner never sees most variants regardless of method. Tuned **weights**
  are as good as anything fancier here.
- **Small-domain stages** where domain ≤ window: `leap` (4 rule-classes), `century`
  (5 centuries). Here weights are *not* enough. With equal probabilities over `leap`'s 4
  classes in a 5-problem run, **P(seeing all four leap rules) ≈ 23%** — so ~¾ of learners
  would pass the leap stage *without ever meeting a ÷100 or ÷400 century case*, which is the
  whole point of the stage. No weighting fixes this; only sampling **without replacement**
  guarantees it.

So: **weighted sampling everywhere, plus a without-replacement coverage guarantee only on
`leap` and `century`.**

### Insight 2: the algorithm's space is only 400 years wide

The Gregorian calendar is exactly periodic in weekdays every 400 years
(146,097 days = 20,871 weeks). So `weekday(Y,M,D) === weekday(Y+400,M,D)` for every date —
every distinct Doomsday problem is fully enumerated by *any* 400-year window. Widening the
date range adds **visual variety only**, never new algorithmic cases.

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Scope | Both drill problems and worked examples |
| Drill smartness | Coverage only (no DB reads / spaced-repetition) |
| Worked examples | Hybrid — keep bespoke hero, add a "Show another" engine walkthrough |
| Sampling backbone | **Tuned weighted sampling (pure)**, with a without-replacement guarantee only on the small-domain stages (`leap`, `century`) |
| ~~Low-discrepancy fill~~ | **Dropped** — indistinguishable from plain random over a 4–5 window, and stateful. Keep only the pure `warpYear` for the year distribution |
| Date range | Full proleptic Gregorian, **9999 BC – 9999 AD** |
| Year distribution | **Centered + long tail** — mostly ~1500–2600, occasional extremes |

This keeps `nextLessonProblem` a **pure function** — so `useLessonDrill`'s
problem-generation wiring barely changes (no mutable sampler, no StrictMode ref dance).

## Architecture

### 1. Pure helpers (no mutable state)

- **`warpYear(u, { center, spread, min, max }) → number`** (in `engine/generate.ts`):
  monotonic inverse-CDF warp of a uniform `u ∈ [0,1)` (from `rng()`) into a **centered,
  long-tailed** year distribution (logistic / Cauchy-style: dense near `center`, heavy tails
  reaching `min`/`max`, then clamp). Tuned so ≈80% of draws land in ~1500–2600 and the tails
  still reach the BC / far-future extremes. Years are **astronomical** integers
  (year 0 = 1 BC); range `[-9998, 9999]`.
- **`coveringPick(domain, runSeed, index) → T`** (small helper, e.g. in `lessonSampler.ts`):
  deals `domain` **without replacement** as a pure function of a per-run seed and the
  problem index — conceptually `concat(shuffle(domain, seed·0), shuffle(domain, seed·1), …)`
  indexed at `index`. No mutable bag; the "state" is just the `index` the hook already has.
  Used only by `leap` and `century`.

### 2. `nextLessonProblem(stageId, rng, ctx)` — pure per-stage generator

Stays where it is (or moves to a sibling `lessonSampler.ts` for file size); remains pure.
`ctx = { index, runSeed }` is threaded in for the covering stages; weighted stages ignore it.

| Stage | Mechanism | Year / fill | Range |
|---|---|---|---|
| `mod7` | weighted: ensure both modes (cast-out, pair-add) appear; **widen** pair range beyond `[3,6]` | concrete `n` / `a,b` | n/a |
| `leap` | **without-replacement over the 4 rule-classes** (÷4·not÷100, ÷100·not÷400, ÷400, not÷4) via `coveringPick` | a year of that class, **wide** (centered+tail) | 9999 BC–9999 AD |
| `months` | weighted; **over-weight the Jan/Feb leap trap** | — (anchor exact) | n/a |
| `thisyear` | weighted month | day-of-month | current year only |
| `century` | **without-replacement over the taught 5 centuries** via `coveringPick` | — | **unchanged** (anchors are recalled, not computed) |
| `year` | weighted single year draw (no answer-keying needed) | year, **wide** (centered+tail) | 9999 BC–9999 AD |
| `full` / `speed` | weighted month; **over-weight the Jan/Feb leap trap** | year via `warpYear`, day | 9999 BC–9999 AD |

Notes:
- `century`/`thisyear` deliberately **do not** widen. Century anchors are *recalled* (only 5
  taught, with mnemonics); arbitrary centuries are a different (computed) skill.
- `leap`/`year` are century-agnostic, so the wide range adds variety with no difficulty
  spike. `full`/`speed` need the century anchor; the centered distribution means exotic
  centuries (requiring the formula `(5·(c mod 4)+2) mod 7`) appear only occasionally.
- `year` no longer keys on the 7 weekday answers (a 5-window can't cover 7 anyway) — a wide
  centered+tail year draw varies the answer naturally.

### 3. `src/features/learn/useLessonDrill.ts` — minimal wiring change

- Keep a single stable `runSeed` (set once at mount from `Math.random`; injectable for
  tests; StrictMode-safe because it's set once and never mutated).
- Pass `ctx = { runSeed, index }` to `nextLessonProblem`, where `index` is the per-mount
  served-problem count the hook already tracks. No mutable sampler object.
- "Practice again" already remounts (keyed by `mode`) → new `runSeed` → fresh sequence.

### 4. `src/features/learn/workedExample.ts` — generated walkthroughs

- `generateWorkedExample(stageId, rng) → { date, steps, answer, check }` for
  `thisyear`/`year`/`full`. Every number derived from the engine's `explain()` (correct by
  construction); steps formatted to match each hero's depth. Pure `f(stageId, rng)`.
- **Illustrative constraint** via bounded rejection sampling (≈20 tries, fallback to last):
  reject degenerate dates — e.g. reduced offset = 0 — so "step forward, cast out 7" is shown.
- **Honest century-anchor step:** when the drawn century is outside the taught 1700–2100,
  show the anchor *computed* via the formula rather than implying recall.
- `year`/`full` draw years from the wide range (centered + tail); `thisyear` is the current
  year.

### 5. `src/components/WorkedExample.tsx` + rendering wiring

- Renders the hero `example` block (unchanged default) plus a **"Show another"** button.
  On click it generates a fresh walkthrough into the same card layout (a reset returns to
  the hero). State is local; generation on click, not per render.
- `stageId` threaded `LessonScreen → LessonBlocks → WorkedExample`. `LessonBlocks` gains a
  `stageId` prop; other block kinds unchanged.
- "Show another" appears **only** on the three stages with hero examples
  (`thisyear`, `year`, `full`).

### 6. Engine correctness fixes (required for negative years)

The engine is only exercised on 1900–2099 today, so negative years hit unnormalized modulo
and silently return wrong answers. Fixes:

- `centuryAnchor`: `c % 4` is negative for BC centuries → normalize to `((c % 4) + 4) % 4`.
- `yearDoomsdayOddEleven`: `t = year % 100` goes negative (breaks `t/2`) → normalize to
  `t = ((year % 100) + 100) % 100`.
- `yearDoomsdayConway`: same `year % 100` issue → normalize.
- `isLeapYear`, `centuryOf`, `monthAnchor`, `daysInMonth` already behave for negatives
  (verified) — no change. `weekdayOfYMD` inherits the two fixes.

### 7. Calendar & display

- **Proleptic Gregorian**, **astronomical year numbering** internally (year 0 = 1 BC).
  Supported range astronomical `[-9998, 9999]`.
- New era-aware formatter (extend `lib/format.ts`): astronomical `y ≤ 0` → `"<1−y> BC"`,
  else the plain year. Used by drill prompts and generated worked examples.
- `ymdKey` handles negative years for `targetDate` (string key only; BC dates never reach
  the present-anchored heatmap).
- A short **"proleptic Gregorian"** honesty note where wide/BC dates are introduced (the
  pre-1582 weekday is a mathematical projection, not the historical Julian weekday).

## Testing

- `generate.test.ts` (extend): `warpYear` lands ≈80% in the core window yet reaches both
  extremes; output always within `[-9998, 9999]`; deterministic per seed.
- `lessonSampler.test.ts`: `coveringPick` deals every item before any repeat (per cycle);
  `leap` covers all 4 classes within 4 problems and `century` all 5 within 5; weighted
  stages produce valid problems whose `correct` matches the engine; over many simulated runs
  the leap trap / both `mod7` modes appear at the intended rates.
- `workedExample.test.ts`: generated examples satisfy the illustrative constraint; `answer`
  matches the engine; exotic-century examples render the computed-anchor step.
- `doomsday.test.ts` (extend): periodicity invariant `weekdayOfYMD(y,m,d) ===
  weekdayOfYMD(y+400,m,d)` across the full range incl. BC; cross-check a spread of dates
  (incl. BC) against an independent reference (Sakamoto / Julian-Day) in the test; AD dates
  cross-checked against `Date.UTC` where in range.
- `useLessonDrill.test.ts` (update): seeded `runSeed` injection; covering stages produce the
  expected deterministic sequence.
- `curriculum.test.ts`: unchanged — hero examples still engine-verified.
- `format.test.ts` (extend): BC / AD era formatting.

## Files

**New:** `features/learn/workedExample.ts`, `components/WorkedExample.tsx` (+ tests).
(`coveringPick` lives alongside the per-stage generator; no separate `sampler.ts`.)

**Edit:** `engine/doomsday.ts` (3 modulo fixes), `engine/generate.ts` (add `warpYear`),
`features/learn/useLessonDrill.ts` (thread `ctx`; weighted + covering generator),
`components/LessonBlocks.tsx` (render `WorkedExample`, accept `stageId`),
`features/learn/LessonScreen.tsx` (pass `stageId`), `lib/format.ts` (era-aware formatter),
`lib/datekey.ts` (negative-year `ymdKey`).

**Untouched:** `features/practice/*` (Daily/Practice keep `generateDate`).

## Out of scope (YAGNI)

- Shuffled-bag / low-discrepancy sampling on every stage (dropped — marginal over short
  windows, and stateful). Without-replacement is kept only for `leap`/`century`.
- Weakness-targeting / spaced-repetition in the lesson drill (Practice covers that).
- Widening the Daily range or the `century`/`thisyear` stages.
- Worked examples for stages that don't currently have one.

**Follow-up (2026-06-19):** Practice (`selector.ts`) was widened to the same full
proleptic range (centered + long tail via `warpYear`); its century weakness-targeting
still uses the taught 1700–2099 buckets. This required `stats.ts` to parse the year
from `targetDate` via `slice(0, -6)` (robust to BC/short years) instead of `slice(0,4)`.
A dev-only `DEV_UNLOCK_ALL` (`src/lib/devFlags.ts`, `MODE === 'development'`) unlocks
every Learn stage and Practice in the `vite dev` server (off in tests/production).

## Build order

1. Engine modulo fixes + periodicity/reference tests (`doomsday.ts`).
2. `warpYear` in `generate.ts` + tests.
3. Weighted per-stage generator + `coveringPick` for `leap`/`century` + tests; thread `ctx`
   through `useLessonDrill`.
4. Era-aware formatter + `ymdKey` negatives + tests.
5. `workedExample.ts` + tests.
6. `WorkedExample.tsx` + thread `stageId`; render in `LessonBlocks`.
7. Full suite green; manual pass through each stage's drill + "Show another".
