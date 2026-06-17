# Daycipher Plan 3 — Progress & Stats

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. TDD per task; commit frequently. Package manager: **pnpm**.

**Goal:** Turn the Progress tab into a real stats dashboard fed by the IndexedDB attempt history: tier-1 tiles (current/longest streak, accuracy, total solved, median solve time), a mobile-friendly GitHub-style **activity heatmap** (hand-rolled, accessible), and accuracy **breakdowns** (by century and weekday) that surface the user's weakest area — plus a friendly empty state.

**Architecture:** Pure aggregation functions over `Attempt[]` (`stats.ts`) and a pure heatmap-model builder (`heatmap.ts`), both fully unit-tested with injected "today" so they're deterministic. Thin React components render the models. No new dependencies; charts are hand-rolled CSS/SVG.

**Out of scope (later plans):** per-step "where you lose points" bars need intermediate-answer capture (Guided Solve, Plan 5); accuracy-over-time line + period toggles can come later. Quick Drill stores `null` per-step fields today, so per-step analysis is intentionally deferred.

## Available APIs
- `db/attempts`: `listAttempts(): Promise<Attempt[]>` (newest-first), `countByDay(): Promise<Record<string,number>>`.
- `db/meta`: `getMeta`.
- `db/db`: type `Attempt` (`correct`, `durationMs`, `correctWeekday`, `targetDate` ISO `yyyy-mm-dd`, …).
- `lib/format`: `weekdayName`, `weekdayShort`; `lib/datekey`: `localDayKey`.
- `engine`: type `Weekday`.

## File structure
```
src/features/progress/stats.ts            pure aggregations              (+ stats.test.ts)
src/features/progress/heatmap.ts          pure heatmap model builder     (+ heatmap.test.ts)
src/components/Heatmap.tsx                 semantic <table> renderer      (+ Heatmap.test.tsx)
src/features/progress/ProgressScreen.tsx  compose tiles + heatmap + breakdown (replaces stub)
```

---

## Task 1 — `stats.ts` (pure aggregations)
**API:**
```ts
export interface Summary { total: number; correct: number; accuracy: number; medianMs: number | null }
export function summarize(attempts: Attempt[]): Summary
export type Dimension = 'century' | 'weekday'
export interface Bucket { key: string; label: string; total: number; correct: number; accuracy: number }
export function accuracyByDimension(attempts: Attempt[], dim: Dimension): Bucket[]  // sorted by key asc
export function weakest(buckets: Bucket[], minCount = 3): Bucket | null  // lowest accuracy with >= minCount
```
- `summarize`: accuracy = correct/total (0 if empty); medianMs = median of positive `durationMs` (null if none).
- `accuracyByDimension('century')`: group by `Math.floor(year/100)*100` parsed from `targetDate`; label like `"1900s"`.
- `accuracyByDimension('weekday')`: group by `correctWeekday`; label via `weekdayName`.
- `weakest`: among buckets with `total >= minCount`, the one with lowest accuracy (tie → fewest correct); null if none qualify.

**Tests** (representative): summarize over a mix → correct counts + median; empty → zeros/null; century grouping splits 1985 vs 2001 into "1900s"/"2000s"; weakest picks the low-accuracy bucket and ignores under-`minCount` buckets. Commit `feat(progress): stats aggregations`.

## Task 2 — `heatmap.ts` (pure model)
**API:**
```ts
export interface HeatCell { date: string; count: number; level: 0|1|2|3|4; weekday: number }
export interface HeatModel { weeks: HeatCell[][]; maxCount: number } // weeks = columns of 7 (Sun..Sat), oldest->newest
export function bucket(count: number, max: number): 0|1|2|3|4
export function buildHeatmap(countByDay: Record<string, number>, todayKey: string, weeks?: number): HeatModel // default weeks=18
```
- Window ends on the Saturday of `todayKey`'s week; spans `weeks*7` days back to a Sunday; each day's `count` from `countByDay` (0 if absent); `level = bucket(count, maxCount)`; group into columns of 7.
- `bucket`: 0 when count 0 or max 0; else `clamp(ceil(count/max*4), 1, 4)`.

**Tests:** `buildHeatmap({'2026-06-17':5}, '2026-06-17', 2)` → 2 columns, 14 cells, `maxCount 5`, the 2026-06-17 cell `count 5 level 4`, days after today (same week) `count 0 level 0`; `bucket(0,10)===0`, `bucket(10,10)===4`, `bucket(1,10)===1`. Commit `feat(progress): heatmap model builder`.

## Task 3 — `Heatmap.tsx`
Render `HeatModel` as a semantic `<table>` (role grid is fine via native table): 7 `<tr>` (one per weekday Sun..Sat), one `<td>` per week-column. Each `<td>` contains a sized `<span>` colored `var(--hm-{level})`, with `aria-label` like `"3 problems on 2026-06-17"` / `"No practice on 2026-06-15"` and a matching `title`. Cells ~`13px` with `2px` gap via inline styles or a CSS module; wrap in `overflow-x:auto`. Include a small legend (Less ▢▢▢▢▢ More) using the same `--hm-*` swatches with text labels (not color-only). 
**Test:** given a tiny model, renders 7 rows; a high-count cell has an accessible label containing its count and date; a zero cell's label says "No practice". Commit `feat(ui): accessible activity heatmap`.

## Task 4 — `ProgressScreen.tsx` (replace stub)
On mount, load `listAttempts()`, `countByDay()`, and `getMeta('currentStreak',0)`/`getMeta('longestStreak',0)`. While loading, render nothing/skeleton. 
- **Empty state** (no attempts): a friendly Almanac card — "No drills yet — your stats and activity grid will grow here." + a `Link` to `/practice` ("Start drilling →").
- **Populated:** 
  - Tier-1 tiles grid (2×2): Streak (current · best), Accuracy (`Math.round(accuracy*100)%`), Solved (total), Median (`medianMs` → `x.xs` or "—").
  - `<Heatmap>` from `buildHeatmap(countByDay, localDayKey())` under a "Last 18 weeks" label.
  - Breakdown: `accuracyByDimension(attempts,'century')` as labeled accuracy bars (`--burg` fill on `--line` track, % text); if `weakest(...)` exists, a line "Weakest: {label} ({pct}%) — drill it" linking to `/practice`.
**Light test** (optional): renders the empty state when no attempts (use `_resetDbForTests` + clear). Commit `feat(progress): stats dashboard with heatmap & breakdowns`.

## Task 5 — verify & ship
`pnpm test` · `pnpm typecheck` · `pnpm lint` · `pnpm build`. Manually: `pnpm preview`, do a few drills, open Progress, screenshot tiles + heatmap. `vercel deploy --prod --yes`. Push.

---

## Self-review
- Tiles, heatmap, breakdowns all read real logged attempts. ✓
- Heatmap is hand-rolled, mobile-windowed (18 weeks), accessible (semantic table + per-cell labels, not color-only). ✓
- Pure modules take an injected `todayKey`/array → deterministic tests. ✓
- Per-step "where you lose points" deferred to Plan 5 (needs Guided Solve data). Noted.
