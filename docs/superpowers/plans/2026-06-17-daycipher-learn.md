# Daycipher Plan 4 — Learn Curriculum

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. TDD per task; commit frequently. Package manager: **pnpm**.

**Goal:** Teach the Doomsday method from zero via the Learn tab: a list of 7 guided stages (each a short lesson with mnemonics + worked examples), a persistent cheat-sheet reference, and lightweight completion tracking — so the app finally *instructs* the skill, not just drills it.

**Architecture:** The curriculum is **static, typed content** (`curriculum.ts`) rendered by a small block renderer — no markdown dependency, fully testable. Completion state lives in `meta` (`learnDone: string[]`). Thin screens (`LearnScreen` list, `LessonScreen` detail, `CheatSheet`) and two new routes. No new dependencies.

## Content model
```ts
export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'mnemonic'; text: string }
  | { kind: 'example'; date: string; steps: string[]; answer: string }
export interface Stage { id: string; n: number; title: string; goal: string; blocks: Block[] }
export const CURRICULUM: Stage[]   // 7 stages, ids 'mod7'|'months'|'thisyear'|'century'|'year'|'full'|'speed'
export function getStage(id: string): Stage | undefined
```
The 7 stages (content authored in Task 1): **0 mod-7 literacy**, **1 month anchors** (+leap trap), **2 current-year dates**, **3 century anchors**, **4 year doomsday (Odd+11)**, **5 full date assembly**, **6 speed**. Each ends with a worked example whose `answer` matches the engine.

## File structure
```
src/features/learn/curriculum.ts        static content + getStage          (+ curriculum.test.ts)
src/features/learn/learnProgress.ts      meta-backed completion set         (+ learnProgress.test.ts)
src/components/LessonBlocks.tsx          renders Block[]                     (+ LessonBlocks.test.tsx)
src/features/learn/CheatSheet.tsx        reference tables (anchors etc.)
src/features/learn/LearnScreen.tsx       stage list + progress + cheat link (replaces stub)
src/features/learn/LessonScreen.tsx      one stage + "Mark complete" + drill link
src/routes.tsx                           add /learn/cheatsheet and /learn/:stageId
```

## Tasks
1. **`curriculum.ts`** — author all 7 stages as `Block[]` (accurate mnemonics + worked examples; verify each `example.answer` against the engine by hand). `getStage`. Test: 7 stages, unique ids, ascending `n`, every stage has ≥1 example, ids resolve via `getStage`. Commit `feat(learn): curriculum content`.
2. **`learnProgress.ts`** — `getDone(): Promise<string[]>` (from `getMeta('learnDone', [])`), `markDone(id): Promise<string[]>` (union, persisted), `isDone(id, done)`. TDD with fake-indexeddb. Commit `feat(learn): completion tracking`.
3. **`LessonBlocks.tsx`** — render each `Block` kind with Almanac styling (`p`→paragraph; `h`→`<h3>`; `list`→`<ul>`; `mnemonic`→highlighted callout card with `--gold`/`--card`; `example`→a card with the date in serif, numbered `steps`, and the `answer` in `--green`). Test: given a sample stage's blocks, the mnemonic text and the example answer render. Commit `feat(ui): lesson block renderer`.
4. **`CheatSheet.tsx`** — reference tables: weekday numbers (0–6), the 12 month anchors (note leap Jan/Feb), the 4 century anchors, and the Odd+11 steps. Plain accessible `<table>`s/lists. Commit `feat(learn): cheat-sheet reference`.
5. **`LearnScreen.tsx`** (replace stub) — load `getDone()`; render a "Cheat-sheet" link, an "X / 7 complete" progress line, and the 7 stages as tappable cards (`Link` to `/learn/:id`) each showing `n`, title, goal, and a ✓ when done. Commit `feat(learn): stage list`.
6. **`LessonScreen.tsx`** — `useParams` id → `getStage`; render title/goal + `<LessonBlocks>`; a "Mark complete" button (calls `markDone`, then shows ✓/"Completed"); a "Practice this →" `Link` to `/practice`; a back link to `/learn`. Unknown id → a "not found" + back link. Commit `feat(learn): lesson screen`.
7. **routes** — add `{ path: 'learn/cheatsheet', element: <CheatSheet/> }` and `{ path: 'learn/:stageId', element: <LessonScreen/> }` (keep `/learn` index = LearnScreen). Commit `feat(learn): routes`.
8. **verify & ship** — `pnpm test/typecheck/lint/build`; `pnpm preview` + screenshot Learn list & a lesson; `vercel deploy --prod`; push.

## Self-review
- All 7 stages authored with correct mnemonics + engine-verified worked examples. (Task 1)
- Learn is navigable: list → lesson → mark complete → practice; cheat-sheet reachable. (Tasks 5–7)
- Completion persists locally. (Task 2)
- Mastery-gated unlocking (accuracy thresholds) is deferred to Plan 5; Plan 4 allows free navigation with simple completion ticks.
