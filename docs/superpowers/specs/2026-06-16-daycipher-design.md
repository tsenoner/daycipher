# Daycipher — Design Spec

**Status:** Approved (2026-06-16)
**Supersedes:** the legacy Python/Tkinter `DayOfDate` app (moves to `legacy/`).

---

## 1. Vision

**Daycipher** is an offline-first, installable PWA that teaches anyone to compute the weekday of any date in their head (Conway's **Doomsday rule**), drills the skill adaptively, and tracks progress over time. It is mobile-first, usable one-handed, beautiful, and works fully offline after first load. Public and shareable.

One-liner: *Decipher any date into its weekday — learn it, drill it, master it.*

## 2. Goals & non-goals

**Goals**
- Teach the Doomsday rule from zero via a staged, interactive curriculum.
- Provide an addictive-but-healthy adaptive practice loop with instant feedback and step-by-step reasoning.
- Track history, accuracy, speed, streaks, and **where in the algorithm the user fails**.
- Work fully offline; installable to home screen; data stored on-device.
- Look and feel like a refined almanac; excellent mobile UX and accessibility.

**Non-goals (v1)**
- No backend, accounts, or cloud sync (architect data to allow sync later).
- No global/social leaderboards (opt-in "beat your past self" only).
- No support for Julian/pre-Gregorian dates (Gregorian 1583+; generation defaults 1600–2099).
- No native app stores — it's a PWA.

## 3. Audience

Two overlapping users, both served: the **curious beginner** (party-trick learner) and the **mental-math enthusiast** (Memoriad-style speed). The curriculum serves the first; Speedrun/pro modes serve the second.

## 4. The skill — algorithm ground truth

The engine is the source of truth and must be provably correct. Reference facts:

- **Weekday numbers:** Sunday=0 … Saturday=6 (internal). Mnemonics: Noneday/Oneday/Twosday/Treblesday/Foursday/Fiveday/Sixturday.
- **Month doomsday anchors:** even months self-reference 4/4, 6/6, 8/8, 10/10, 12/12; odd months via "9-to-5 at the 7-Eleven" = 9/5, 5/9, 7/11, 11/7; **Jan = 3 (common) / 4 (leap)**; **Feb = last day (28/29)**; March = 3/14 ("Pi Day") / "March 0".
- **Century anchors:** 1700s=Sun, 1800s=Fri, 1900s=Wed, 2000s=Tue, 2100s=Sun. Formula: `anchor = (5·(c mod 4) + 2) mod 7` with Sunday=0, c = ⌊year/100⌋; equivalently c mod 4 → {0:Tue, 1:Sun, 2:Fri, 3:Wed}.
- **Year doomsday — Odd+11 (taught first, used in default trace):** T = last two digits. (1) if T odd, T+=11; (2) T/=2; (3) if T odd, T+=11; (4) T = 7 − (T mod 7); (5) step T forward from the century anchor.
- **Year doomsday — Conway classic (offered as "the why"):** a=⌊y/12⌋, b=y mod 12, c=⌊b/4⌋, doomsday = (anchor + a + b + c) mod 7.
- **Final step:** from the target month's anchor, step ±days mod 7 (casting out sevens) to the target day.
- **#1 bug class:** leap-year Jan/Feb correction (e.g. **Feb 2, 2000 = Wednesday**, not Thursday). Exhaustively tested.

## 5. Curriculum (7 stages)

Guided; each stage unlocks when the prior is mastered (accuracy gate, then speed). Each stage = short lesson (worked example → fill-in-the-blank → full problem) + mnemonics + drills.

| Stage | Title | Goal |
|---|---|---|
| 0 | Mod-7 literacy | Think in weekday numbers 0–6; cast out sevens reflexively |
| 1 | Month anchors | Instant recall of each month's doomsday; **Jan/Feb leap rule taught here** |
| 2 | Current-year dates | Compute any date this year using this year's doomsday by rote → early real win |
| 3 | Century anchors | Recall the four anchors + the c mod 4 rule |
| 4 | Year doomsday | **Odd+11 first**; Conway classic later as the "why" |
| 5 | Full date assembly | The whole pipeline, interleaved across centuries/months/leap cases |
| 6 | Speed | Accuracy-gated, then a shrinking timer toward sub-5s / sub-2s |

A persistent **cheat-sheet/reference** is reachable from anywhere.

## 6. Information architecture

Bottom tab bar (thumb-reachable), 4 tabs + header settings:

- **Today** — daily habit anchor: streak ribbon, today's date + this year's doomsday (micro-lesson), Daily Challenge CTA, "continue learning," Quick Drill, mini heatmap.
- **Learn** — the 7 stages with progress; lessons + sub-skill drills + SRS flashcards; cheat-sheet.
- **Practice** — mode picker → drill loop.
- **Progress** — stats, heatmap, per-step analysis, breakdowns, export/import.
- **Settings** (header) — theme (System/Light/Dark), week-start (Mon/Sun), daily goal, sound/haptics mute, date-range/difficulty, install, data export/import, about.

## 7. Practice — modes & drill loop

**Drill loop (single screen, never navigate away):**
1. **Present** a date, large serif (e.g. "14 March 1986"), chosen by the adaptive selector.
2. **Answer** via a **7-button weekday grid, two rows (4+3), full-width, ≥56px tall**, in the bottom thumb arc. Recall, never multiple-choice.
3. **Grade** instantly on tap: green/red on the chosen button, always show the correct weekday, plus solve time. Sound is primary feedback (chime); haptics on Android only.
4. **Reveal** the step-trace as a staged, progressive-disclosure accordion (century anchor → year doomsday → month anchor → offset → result), the failed step highlighted. **Auto-expanded on wrong**, collapsed-but-tappable on correct. On wrong, nudge before full reveal.
5. **Advance** via a manual **Next** button, bottom-right (no silent auto-advance past the explanation).

**Modes:**
- **Quick Drill** (default) — adaptive random dates; per-step failure inferred heuristically from the wrong-answer offset.
- **Guided Solve** — user enters intermediate answers (century anchor, year doomsday, offset) → **exact** per-step attribution; on-screen scaffolds that fade with mastery.
- **Daily Challenge** — same 5 dates for everyone per day (deterministic from the date seed), shareable result card.
- **Speedrun** — Memoriad-style 125 dates (1600–2099) / 3 min, plus shorter variants.
- **Sub-skill drills** — focused minigames per stage (month anchors, century anchors, year doomsday, mod-7), scheduled by FSRS for the memorizable facts.

## 8. Adaptivity & spaced repetition

- **Fact decks** (century anchors, month doomsdays, weekday-number mnemonics, Odd+11 steps): scheduled with **FSRS** (`ts-fsrs`) at a configurable target retention (default 90%).
- **Date selection** (v1): a lightweight accuracy+latency-weighted bandit over ~30–40 **dimensions** (each century, decade, month, leap-case, mod-7), biasing toward the weakest/slowest while still **interleaving**. (Full BKT/IRT deferred.)
- **Accuracy-first, then speed:** new categories run untimed until an accuracy gate (~90%), then a progressively shrinking time budget.
- In-app note explains that interleaving lowers in-session scores but builds durable skill (so users don't disable the harder mode).

## 9. Stats & heatmap (Progress tab)

Single vertical scroll, lazy-rendered:
- **Tier 1 tiles:** current streak + personal best, overall accuracy, total solved, median solve time.
- **Heatmap:** hand-rolled CSS-grid (`grid-auto-flow: column`, 7 rows), **mobile default = last ~18 weeks**; toggles 1M/3M/6M/1Y (overflow-x scroll-snap, auto-scrolled to today; vertical month-stacked for full history). Built as a **semantic `<table>`** with full per-cell accessible labels; 4–5 warm color buckets; never color-alone.
- **Accuracy trend:** line with the ~85% productive-struggle target band; rolling 7/30-day.
- **"Where you lose points":** 3-bar per-step analysis (century anchor / year doomsday / final offset) with a "drill this step" CTA.
- **Breakdowns:** accuracy by century/decade/month/weekday (all derived from `targetDate` at query time) → surface the single weakest bucket as "Practice your weak spot."
- **Median, not mean** for solve time (right-skewed); show p25/p75.

## 10. The engine

Pure, dependency-free TypeScript module `src/engine/doomsday.ts`:

```
weekdayOf(date: Date): 0..6
explain(date: Date): StepTrace   // century anchor, year doomsday (Odd+11 + classic), month anchor, offset, result
generateDate(constraints): Date  // by dimension/difficulty, deterministic-seedable for Daily Challenge
isLeapYear(year): boolean
```

- Sunday=0 internally; display respects week-start setting (default Monday).
- **Built test-first** (TDD). Exhaustive correctness suite cross-checking `weekdayOf` against a reference (JS `Date` UTC) for **every day 1600-01-01 … 2099-12-31**, plus targeted leap-year Jan/Feb and century-boundary cases. `explain()` validated so its result equals `weekdayOf`.

## 11. Data model (IndexedDB via `idb`)

- **attempts** (autoincrement id): `timestamp`, `targetDate` (ISO), `correctWeekday`, `guessedWeekday`, `correct`, `durationMs`, `mode`, `anchorCorrect`/`yearDoomCorrect`/`offsetCorrect` (nullable 0/1), `timed`. Century/decade/month/weekday derived at query time — no migrations.
- **cards** (cardId): FSRS state per fact — `deck`, `difficulty`, `stability`, `due`, `reps`, `lapses`, `lastReview`, `lastGrade`.
- **skills** (dimension): `rollingAccuracy`, `medianLatencyMs` (+p25/p75), `attemptCount`, `masteryEstimate`, `masteredAt`, `lastSeen`.
- **meta** (key/value): `currentStreak`, `longestStreak`, `lastActiveDay` (timezone-resolved), `streakFreezesRemaining`, `retentionGoal`, `dailyGoal`, `theme`, `weekStart`, `soundEnabled`, `hapticsEnabled`, onboarding/unlock state.

All exportable as a single JSON document. Aggregates computed on read; `skills`/`meta` cache hot paths. Schema uses stable IDs + timestamps to stay sync-friendly.

## 12. Tech architecture

- **React 18 + TypeScript + Vite.**
- **Routing:** `react-router-dom` (4 tab routes + sub-routes).
- **State:** `zustand` (settings, active session) + the idb data layer; aggregates via small selectors.
- **PWA:** `vite-plugin-pwa` (generateSW). **Precache the whole build** (`globPatterns: **/*.{js,css,html,ico,png,svg,woff2}`, `navigateFallback: /index.html`, `cleanupOutdatedCaches`). **No runtimeCaching** (self-contained). `registerType: 'prompt'` + update toast. Manifest: name/short_name, `start_url:/`, `display: standalone`, `orientation: portrait`, Almanac theme/background colors, 192/512/512-maskable icons via `@vite-pwa/assets-generator`. iOS tags in `index.html`: `apple-touch-icon` 180×180 opaque, `apple-mobile-web-app-*`, `viewport-fit=cover` + `env(safe-area-inset-*)`.
- **Storage:** IndexedDB via `idb`; `navigator.storage.persist()` on first use; surface `storage.estimate()`.
- **Scheduling:** `ts-fsrs` for fact decks.
- **Styling:** CSS custom properties (design tokens) + CSS Modules per component. No CSS framework — bespoke Almanac system, small bundle. `color-scheme: light dark`; theme applied before first paint via inline `<head>` script (no FOUC); per-scheme `<meta name="theme-color">`.
- **Charts/heatmap:** hand-rolled SVG/CSS — no chart libraries.
- **Testing:** Vitest + Testing Library (unit/component); exhaustive engine suite; Playwright e2e for the drill loop and offline install (should).
- **Tooling:** ESLint + Prettier + TypeScript strict; GitHub Actions CI (typecheck, lint, test, build).
- **Deploy:** Vercel (static SPA; `vercel.json` SPA rewrite). HTTPS satisfies PWA.

### Project structure (target)
```
src/
  engine/        doomsday.ts, generate.ts, *.test.ts
  db/            db.ts (idb schema/versions), attempts.ts, cards.ts, skills.ts, meta.ts, backup.ts
  scheduler/     fsrs.ts, selector.ts (adaptive bandit)
  store/         settings.ts, session.ts (zustand)
  features/
    today/  learn/  practice/  progress/  settings/
  components/    WeekdayPicker, StepTrace, Heatmap, Tiles, UpdateToast, InstallPrompt, ...
  styles/        tokens.css, themes.css, base.css
  pwa/           registerSW.ts
  main.tsx, App.tsx, routes.tsx
public/          icons, apple-touch-icon, favicon
index.html       iOS meta + pre-paint theme script
vite.config.ts   VitePWA config
```

## 13. Visual design system — Almanac

- **Light tokens:** paper `#F4EDDD` / card `#FDFBF5`, ink `#2B2117`, muted `#90805F`, hairline `#E4D8BF`, accent burgundy `#8C2F39`, correct forest `#2F6B4F`, gold `#B5854A`.
- **Dark tokens:** bg `#1C1813` / card `#251F18`, text `#ECE0C9`, muted `#9A8A6B`, hairline `#3A3024`, accent ember `#D06A4E`, correct `#5BA17C`. (Near-black, not pure black.)
- **Heatmap ramp (light):** `#EFE9DA → #E6D2AC → #D6A972 → #BE7448 → #8C2F39`; dark: warm ember ramp.
- **Type:** **Fraunces** (serif) for dates & headings; **Inter** (sans) for UI/body; tabular figures for numbers. Self-hosted woff2 (offline).
- **Components:** paper cards with hairline borders, subtle texture, rounded-md; ledger rule-lines; restrained motion.
- **Right/wrong:** forest green / burgundy + icon + text (never color alone).

## 14. Gamification & engagement (healthy)

- **Streak** extends on a *single correct drill*; show current **and** best; never erase history on a miss ("never miss twice"); **one free auto-applied streak-freeze**.
- **Daily goal** user-set (Casual/Regular/Serious = 3/5/10 dates; default Regular); "quick 5" minimum.
- **XP** for effort + speed with within-session diminishing returns; **mastery-based levels** tied to real skill (e.g. "Anchor Days" → "Century Master" → "Sub-second Solver").
- **Achievements** that mark real accomplishment ("30 dates under 5s", "Perfect week", "Nailed a 1700s date") — no vanity badges.
- **Competition:** opt-in / "beat your past self" only.
- **Notifications:** at most one supportive daily reminder framed around the user's own goal; no guilt, no sad mascot, no pay-to-win streak repair, no fake urgency.

## 15. Accessibility & ergonomics

- Tap targets 48px min (answer buttons 56–64px, full thumb-width, ≥12px gaps); primary/destructive actions never in top corners; bottom controls padded with `env(safe-area-inset-bottom)`.
- Contrast: text ≥4.5:1, large ≥3:1 (aim 7:1 for repeated drill text), non-text/state ≥3:1.
- Never color-alone for state; `:focus-visible` rings (≥2px, ≥3:1, offset); `scroll-padding-bottom` so focus isn't hidden behind the sticky bar.
- Honor `prefers-reduced-motion` (e.g. gate confetti); `prefers-color-scheme` live updates in System mode.
- Icon-only buttons have accessible names (visually-hidden span + `aria-labelledby`); decorative icons `aria-hidden`.
- Heatmap = semantic table, keyboard-navigable, full per-cell labels.

## 16. Feedback (sound & haptics)

- **Sound is primary** (iOS has no Vibration API). Synthesized oscillator chimes <200ms (880Hz correct / 220Hz wrong); lazily create + `resume()` AudioContext on first tap; respect iOS silent switch by default.
- **Haptics**: feature-detect `navigator.vibrate`; short tick (~15ms) correct, double pulse `[10,60,10]` wrong — Android only.
- Persistent mute toggle (sound + haptics) in `localStorage`.

## 17. Offline & data resilience

- Entire app precached → works in airplane mode after first load.
- `navigator.storage.persist()` requested; usage shown via `storage.estimate()`.
- **JSON export/import is a v1 must** (download all stores as `daycipher-backup-YYYY-MM-DD.json`; import validates + bulk-puts).
- Install nudge: Android `beforeinstallprompt`; iOS "Share → Add to Home Screen" instructions.
- Update flow: `registerType: 'prompt'` → toast with Reload (never reload mid-drill).

## 18. Build sequence (all in scope; phased)

1. **Engine + exhaustive tests** (bedrock; TDD).
2. **Scaffold + app shell:** Vite/React/TS, routing, 4-tab nav, design tokens + themes, PWA offline/install/update, idb layer + export/import.
3. **Practice loop:** WeekdayPicker, StepTrace, Quick Drill, sound/haptics, attempt logging.
4. **Progress:** stats tiles, heatmap, trend, per-step analysis, breakdowns.
5. **Learn:** 7-stage curriculum, lessons, sub-skill drills, cheat-sheet.
6. **Adaptivity:** dimension tracking, weighted selector, FSRS fact decks, accuracy/speed gating, Guided Solve exact attribution.
7. **Engagement & extras:** streaks/goals/levels/achievements, Daily Challenge, Speedrun, onboarding, share cards, polish.

CI green (typecheck/lint/test/build) and Lighthouse PWA/installability + a11y checks gate each milestone.

## 19. Repo & deploy

- Rename local dir + `package.json` to `daycipher`; rename GitHub repo `DayOfDate → daycipher` (when the user authorizes the push).
- Move legacy Python app (`src/`, `data/`, `img/`, `doc/`) into `legacy/` (preserved, out of the way).
- Deploy to Vercel.

## 20. Risks & mitigations

- **Algorithm correctness** (load-bearing) → exhaustive 1600–2099 test suite before features; leap-year Jan/Feb + century cycle explicit.
- **iOS PWA** (no auto-install, ~7-day eviction) → install nudge, `storage.persist()`, prominent JSON export.
- **Data loss** (device-local) → export/import in v1, persistent storage.
- **Mobile heatmap overflow** → last-N-weeks default + scroll-snap/vertical for long ranges.
- **Per-step attribution accuracy** → exact in Guided Solve; heuristic (clearly labeled) in Quick Drill.
- **Desirable-difficulty perception** → explain interleaving tradeoff in UI.
- **Scope creep (FSRS/BKT)** → FSRS only for fact decks; simple bandit for date selection in v1.
- **Streak timezone edge cases** → resolve `lastActiveDay` by local day; one freeze; never punish.

## 21. Decisions locked

Name **Daycipher**; **Almanac** visual direction (light + dark); **React + TS + Vite**; deploy **Vercel**; **comprehensive** scope, phased; week-start default **Monday** (configurable); generation range default **1600–2099** (engine correct for all Gregorian); **Odd+11** is the primary taught/traced year method.
