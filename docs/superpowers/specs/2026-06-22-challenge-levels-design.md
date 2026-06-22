# Levels — range progression + speed tiers

**Issue:** #13 (Challenge section). **Related:** #14 (narrow default range — subsumed here), #5 (speed gate removed — merged), #12 (mastery thresholds).
**Status:** Design approved 2026-06-22. Next: implementation plan (writing-plans).

## 1. Motivation

Two problems with the current Learn → Practice loop:

1. Practice draws full-date problems from the **entire proleptic-Gregorian range** (9999 BC–9999 AD, `selector.ts` → `generateWideDate`). That firehose of unfamiliar BC / far-future years is demoralizing before the method is fluent.
2. The old timed Stage 8 "Getting fast" was a **progression blocker** (removed in #5). Speed is motivating as an *opt-in* goal, not a gate.

**Levels** replaces both with a single progression surface:

- A **range ladder** the learner climbs by passing accuracy challenges, widening the years that appear in Practice from a comfortable base outward.
- An **optional speed challenge** (speedcubing-style Average of 5) that awards mastery tiers without gating anything.

Core principle (confirmed during design): because Gregorian century anchors cycle every 400 years, mastering 1700–2000 already covers *every* year mathematically. Wider Levels are therefore about **confidence and breadth** (and the BC/proleptic wrinkle), not a new skill — which is why widening is opt-in and the base range is generous.

## 2. Goals / non-goals

**Goals**

- Default Practice to a narrow, comfortable range; let the learner widen it deliberately. (This delivers #14.)
- A clear, gated range ladder with a low-friction pass rule.
- An optional, motivating speed challenge that succeeds the deleted Stage 8.
- Keep the Learn curriculum stable and unaffected.

**Non-goals**

- Speed as a gating mechanism (speed tiers are badges only).
- Leaderboards, per-Level cosmetic themes, additional tiers, themed date sets.
- Any user-data migration (no users yet — no backwards-compat work).
- Reviving the old `Stage.timed` / `SPEED_MS` machinery (deleted in #5; the speed challenge is a fresh Ao5 model).

## 3. The range ladder

Three levels. The learner is always at exactly one **unlocked** level; the next is reached by passing its test.

| Level | id | Range | Label | How reached |
|------:|------|-------|-------|-------------|
| 0 | `recent` | 1700–2100 | "Recent (1700–2100)" | Auto, the moment Learn unlocks Practice |
| 1 | `ad` | 1–9999 AD | "All AD years" | Pass the Level 1 test |
| 2 | `full` | 9999 BC–9999 AD | "Full range" | Pass the Level 2 test |

- **Storage:** `meta.unlockedLevel: number` (index, default `0`).
- **Sequential:** only the single next level (`unlockedLevel + 1`) is takeable. No skipping; no need to re-take a passed level.
- **Range used by Practice:** `selector.nextProblem`'s wide-draw uses `rangeForLevel(unlockedLevel)`:
  - L0 → `generateDate({ minYear: 1700, maxYear: 2100 })`
  - L1 → `generateDate({ minYear: 1, maxYear: 9999 })`
  - L2 → `generateWideDate()` (the existing centered-with-tails proleptic warp)
  - The ~50% weakness-targeting over **taught** centuries (1700–2099 buckets) is unchanged — it never draws outside taught centuries regardless of Level.
  - At L0 the wide-draw collapses to 1700–2100, which **is** #14's "narrow default range." #13 thus implements #14.

### Level test (the gate)

- **Format:** 10 full-date weekday solves drawn from the **target** level's range (you prove you can handle the wider years *before* they unlock).
- **Pass rule:** ≥ **9 / 10** correct → unlock (`unlockedLevel = max(unlockedLevel, target)`), show a celebratory unlock; otherwise offer retry.
- **Untimed**, accuracy only. **Immediate per-question ✓/✕** (reuse the `WeekdayPicker` graded feedback + the per-step reveal pattern from #16). Score summary at the end.
- **Retry** restarts a fresh 10.

## 4. The speed challenge (Average of 5)

Speedcubing-style **Ao5**, succeeding the deleted Stage 8.

- **Format:** 5 timed full-date solves drawn from the **base** range (1700–2100 — where recall is feasible; matches old Stage 8's modern-range intent). Solve as fast as you can; correctness is tracked per solve.
- **Scoring (Ao5):** each solve contributes its time if correct, or **DNF** (treated as the slowest) if wrong. Drop the single fastest and single slowest, then **average the middle 3**.
  - One wrong solve is harmless (it becomes the dropped worst).
  - **Two or more DNFs ⇒ the result is DNF** (a DNF survives into the middle 3), no tier, retry.
- **Tiers** (Conway's targets), from the Ao5 time:
  - 🥇 Gold `< 2 s` · 🥈 Silver `< 5 s` · 🥉 Bronze `< 10 s` · (slower or DNF → no tier)
- **Non-gating:** tiers never unlock ranges. Pure mastery badges.
- **Storage:** `meta.speedBestAo5: number` (best/lowest ms, `0` = none) and `meta.speedBestTier: number` (highest tier index earned, `0` = none).
- **Intro blurb:** relocate the old Stage 8 copy — "Accuracy first… lean on the shortcuts: anything that adds to 7 becomes 0, and +6 is the same as −1… aim for under 5 seconds, then under 2, the way Conway did."

## 5. Surface & navigation

- **Bottom nav unchanged** (Today / Learn / Practice / Progress).
- **New route** `/levels` → `LevelsScreen`.
- **Entry:** a prominent **Levels card** at the top of the Practice tab (above the Quick/Guided/Speedrun mode buttons) showing: current Level name, "Level X of 2" + progress to next, and the best Speed tier badge. Tapping opens `/levels`.
- **LevelsScreen** has two sections:
  1. **Range Levels** — the ladder: current level highlighted, locked levels dimmed, a "Take the Level N test" CTA for the single next locked level (or "Full range unlocked 🎉" at the top).
  2. **Speed (Ao5)** — best tier + best Ao5, intro blurb, "Start Ao5" CTA.
- The Levels card and `/levels` are only meaningful once **Practice is unlocked** (Levels lives behind the same gate as Practice). When Practice is locked, the card is absent. `DEV_UNLOCK_ALL` should also reveal Levels (mirrors `PracticeScreen`).

## 6. Data model

**`meta` keys** (all via the existing `getMeta`/`setMeta` key-value store):

| Key | Type | Default | Meaning |
|-----|------|---------|---------|
| `unlockedLevel` | `number` | `0` | Highest range Level unlocked |
| `speedBestTier` | `number` | `0` | Highest speed tier earned (0 none, 1 bronze, 2 silver, 3 gold) |
| `speedBestAo5` | `number` | `0` | Best (lowest) Ao5 in ms; `0` = none yet |

**Attempt rows.** Test/challenge solves are recorded (for history/feedback) but **must not pollute Practice stats**:

- Level-test solves → mode `level:test`.
- Speed-challenge solves → mode `speed:challenge` (`timed: true`).
- `practiceAttempts()` (in `db/attempts.ts`) must filter these out so the Progress/selector accuracy stats stay scoped to genuine practice (`quick`/`guided`/`speedrun`). Verify the existing filter and exclude the two new modes.

## 7. Components & file structure

New feature folder `src/features/levels/`:

- **`levels.ts`** — pure, no React/DB. The single source of truth:
  - `LEVELS` table (id, range, label) and `MAX_LEVEL`.
  - `rangeForLevel(level): GenerateConstraints | 'wide'` and a `generateForLevel(level, rng)` helper (delegates to `generateDate`/`generateWideDate`).
  - `nextTakeableLevel(unlocked): number | null`.
  - `gradeLevelTest(correctCount): boolean` (≥ 9).
  - `ao5(solves: {ms: number; correct: boolean}[]): number | null` (null = DNF) and `tierForAo5(ms): 0|1|2|3`.
  - `TIER_LABELS`, thresholds.
- **`useLevelTest.ts`** — runs the 10-problem test: serves problems from the target range, records `level:test` attempts, tracks the running score, on completion grades + writes `unlockedLevel`.
- **`useSpeedChallenge.ts`** — runs the 5-solve Ao5: times each solve, records `speed:challenge` attempts, computes Ao5 + tier, writes `speedBestAo5`/`speedBestTier`.
- **`LevelsScreen.tsx`** — the two-section screen; consumes the two hooks.
- **`LevelsCard.tsx`** — the Practice-tab entry card (reads `unlockedLevel`, `speedBestTier`).
- Co-located `*.test.ts(x)`.

**Modified:**

- `src/routes.tsx` — add `/levels`.
- `src/features/practice/PracticeScreen.tsx` — render `LevelsCard` above the mode buttons.
- `src/features/practice/selector.ts` — `nextProblem` takes the unlocked level (or a resolved range) and uses `generateForLevel` for the wide-draw instead of always `generateWideDate`. Keep it pure: the **caller** supplies the level.
- `src/features/practice/useDrill.ts`, `useGuided.ts`, `useSpeedrun.ts` — load `meta.unlockedLevel` and pass it to `nextProblem`. (Default to `0` while loading so nothing draws wide before the value resolves.)
- `src/db/attempts.ts` — exclude `level:test` / `speed:challenge` from `practiceAttempts()`.

**Reused:** `WeekdayPicker`, `gradeProblem` (`drill.ts`), `generateDate`/`generateWideDate` (`engine`), `meta` store, `feedback` (chime/haptic), the per-step ✓/✕ reveal from #16.

## 8. Edge cases & error handling

- **Practice locked:** no Levels card, `/levels` shows the locked state (reuse `PracticeLocked` or redirect). `DEV_UNLOCK_ALL` reveals it.
- **Already at max level:** the ladder shows "Full range unlocked"; no test CTA.
- **Sequential enforcement:** the screen only ever offers the `unlockedLevel + 1` test.
- **Abandoned runs:** leaving mid-test/mid-Ao5 records nothing new and does not change unlocks/bests (write only on completion).
- **Ao5 DNF:** ≥ 2 wrong → no tier, no `speedBestAo5` write; clear "DNF — try again" messaging.
- **L1 distribution:** uniform 1–9999 skews to large unfamiliar years by design (tests the 400-cycle). Days remain valid via `daysInMonth`.
- **Idempotent writes:** `unlockedLevel`/bests are monotonic (`max`), so a double-invoke can't regress them.

## 9. Testing strategy

vitest + @testing-library, co-located.

- **`levels.test.ts`** (pure, exhaustive): `rangeForLevel` per level; `gradeLevelTest` boundary (8 fail / 9 pass / 10 pass); `ao5` — trimmed mean of 5, one-DNF tolerated, two-DNF → null; `tierForAo5` boundaries (1999/2000, 4999/5000, 9999/10000); `nextTakeableLevel`.
- **`useLevelTest.test.ts`:** passing a test sets `unlockedLevel`; failing doesn't; retry; problems fall within the target range.
- **`useSpeedChallenge.test.ts`:** Ao5 computed from injected durations; best tier/Ao5 stored; DNF path.
- **`selector.test.ts`** (extend): wide-draw respects the supplied level (L0 dates ∈ 1700–2100; L2 can exceed); weakness-targeting unchanged.
- **`LevelsScreen` / `LevelsCard`:** locked vs unlocked, current-level display, "full range unlocked" state, tier badge.

## 10. Sequencing (suggested implementation slices → PRs)

Each slice is an independent PR off `main`:

1. **`levels.ts` pure core + tests** — table, ranges, `gradeLevelTest`, `ao5`, `tierForAo5`. No UI.
2. **Selector + Practice range (delivers #14)** — `selector.ts` + the three practice hooks read `unlockedLevel`; `nextProblem` widens by level. Clamp the Learn `full` stage to base 1700–2100 here too. (Closes #14.)
3. **Range Levels UI** — `/levels` route, `LevelsScreen` range section, `LevelsCard`, `useLevelTest`, attempt-mode filter. (Range half of #13.)
4. **Speed challenge** — `useSpeedChallenge`, the Speed section + tier badges, intro blurb. (Speed half of #13.)

## 11. Open questions

None blocking. (Tier badge visual treatment and exact card copy to be finalized during UI implementation.)
