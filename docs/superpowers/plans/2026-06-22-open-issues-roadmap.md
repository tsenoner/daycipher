# Open-issues roadmap (post-Levels) — research-backed

> Built from a deep-research pass (11 agents: 7 per-issue reconcilers vs current code,
> 3 content verifiers — executable math, learning-science web, Doomsday pedagogy — and an
> ordering synthesizer). Every issue's line refs were re-located against today's tree; the
> issues predate the Levels merge, PR #16 (Guided per-step feedback) and PR #17 (speed-stage
> removal), so several bodies are partly stale. Reconciled scope below supersedes the issue text.

## Order (each = its own small PR)

| # | Issue | Why here | Effort | Risk |
|---|-------|----------|--------|------|
| 1 | **#21** first Practice problem ignores unlocked level | Only **live** bug; protects the just-shipped Levels feature | S | low |
| 2 | **#18** drill screens use vh not container height | Trivial, safe quick win; land before Guided churn | S | low |
| 3 | **#7** Stage 2 leap last-two-digits ÷4 shortcut | Sibling copy edit; same file as #8 | S | low |
| 4 | **#8** Stage 3 month-anchor common/leap labels | Sibling of #7; amortize curriculum.ts review | S | low |
| 5 | **#12** tighten per-stage mastery thresholds | Also curriculum.ts; cluster the curriculum edits | S | low |
| 6 | **#10** Guided Solve month-anchor step | Heaviest; rewrites the Guided state machine | M | med |
| 7 | **#11** "Walk me through it" walkthrough | Builds on #10's final Guided shape | M | low |

**#10 before #11** (both edit GuidedSolve; #11 sits on the finished machine). **#7 before #8**
(same file, curriculum order). **#21 before #10** (lands in useDrill/useGuided before #10 churns useGuided).

## Verified content facts (executable + web)

- **#7 leap shortcut is exact for ALL non-century years** across −9999..9999 (0 mismatches vs `isLeapYear`).
  → drop the artificial "2001–2099" framing; `xx00 → ÷400` is the only carve-out. Standard Conway shortcut.
- **#8 month anchors are engine-exact**: common Jan 3 / Feb 28, leap Jan 4 / Feb 29; months 3–12 are
  provably leap-invariant → do **not** add leap qualifiers to even months or the 9-to-5 mnemonic.
- **#11 walkthrough generator is engine-correct** for normal, leap-Feb, BC, and max-year dates. All
  mnemonics (9-to-5/7-Eleven, even doubles, Pi Day, Odd+11/Fong–Walters, century anchors) are standard.
- **Learning science**: VanLehn 2011 + Andes "flag feedback" cited correctly; "immediate beats delayed"
  is directionally right but **temper** absolute phrasing (not user-facing copy here, so no action). #12's
  ~90%/streak rationale is supported (ABA 50/80/90 dose-response; BKT mastery ≈0.95) — but `K=M=5` is a
  local **100%** bar, *stricter* than the ~90% evidence; see #12 decision.
- **Consistency gap (both copy issues miss it):** `CheatSheet.tsx` repeats the same framings
  (`:40` "2001–2099 just ÷4"; `:4-5` bare Jan/Feb parentheticals) → update CheatSheet in #7 and #8.

## Decisions still open (recommendation in **bold**)

- **#12 — `mod7` bar.** `K=M=5` is a no-slip 100% gate. Evidence backs ~90%, and `mod7` is the gentlest
  on-ramp. **Recommend: atoms `{5,5}` = `leap`, `months`, `century`, `year`; soften the very first stage
  `mod7` to `{5,6}` (and keep composites `thisyear`, `full` at `{4,5}`).** Owner may instead want all five
  atoms at `{5,5}`. (Note: the issue's old `speed` row and `5/6 thisyear/year` tier are dropped — speed stage is gone.)
- **#8 — wording.** **Recommend "common year"** (calendar-standard) for the lead value, stated **once** in
  the framing paragraph, parentheticals kept; lock with a copy test.
- **#10 — `monthAnchorDay` pick** added to `GuidedAnswers`/`Attempt`, graded independently (no cascade);
  fork a number-aware summary row + `NumberPad`; read `trace.monthAnchorDay` (issue's `monthAnchor(year,month)`
  arg order is wrong). Widening `Attempt` forces `monthAnchorCorrect: null` into ~9 fixture files.
- **#11** — export `WorkedExampleCard`, add `walkthroughFor(y,m,d)` over `datedExample('full', …)`,
  wrong-answer-only toggle in QuickDrill + GuidedSolve; test QuickDrill via the read-the-rendered-date pattern (no rng seam).

## #21 — first issue, implementation approach

`useUnlockedLevel()` resolves the level async into a ref (no re-render); the `useState` initializer in
`useDrill`/`useGuided` seeds problem #1 from `levelRef.current` while it is still `0`. Now that level tests
write `meta.unlockedLevel`, a level-2 user gets a level-0 first problem.

**Fix:** `useUnlockedLevel()` also exposes the resolved `level` + `loaded` flag; `useDrill`/`useGuided` keep
the lazy seed for first paint and add a **once-guarded** effect that regenerates problem #1 when the level
resolves — only if it differs from the seed (skip when resolved level is 0, so default users never see a
swap) and only while still unanswered (phase `answering`, no pick, `attempt === null`). `useSpeedrun` is
unaffected (its first problem is generated in user-triggered `start()` after the read resolves) — leave it.
StrictMode-safe (effect keyed on `loaded`/`level`, guarded by a `firstRegenDone` ref).
