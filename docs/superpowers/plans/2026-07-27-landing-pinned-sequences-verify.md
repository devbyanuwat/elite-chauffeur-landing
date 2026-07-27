# Landing pinned sequences — Browser Verification Record

Task 7 of `2026-07-27-landing-pinned-sequences`, run against `redesign/parallax-v1` at
commit `a7a9ee4e63a06b0093e7531d32d35f6c40d66da6` on 2026-07-27, plus **fix round 1 of 5**
applied and re-verified the same day after the coordinator independently reproduced the
bug found below in Chrome for Testing 1228.

Environment: Node v22.13.1, `npm run build` (astro check + astro build), dev server
already running at `http://localhost:4321/`.

**Tooling deviation (recorded, not guessed around):** the brief's prescribed tool —
the Claude-in-Chrome extension — never connected. `tabs_context_mcp` was called three
times and `navigate` once, all returning "Browser extension is not connected";
`list_connected_browsers` confirmed zero connected browsers. Per the brief's own
instruction ("if the extension does not respond after 2-3 attempts, stop and report"),
those attempts were stopped. In place of it, all browser checks (initial and fix
re-verification) were run with the project's `webapp-testing` skill: native Python
Playwright driving a **real, already-installed, already-cached local Chromium**
(`~/Library/Caches/ms-playwright`, no new downloads — this exact substitution is
precedented in this repo by
`docs/superpowers/plans/2026-07-27-landing-motion-system-verify.md`, Task 6 of the
sibling plan). The coordinator separately and independently reproduced the same finding
using Chrome for Testing 1228 with `--dump-dom` — both are recorded below.
DevTools' Rendering panel (unreachable without the extension) was substituted with
Playwright's `reduced_motion="reduce"` browser-context flag, which sets the real
`prefers-reduced-motion: reduce` media feature at the browser-engine level.

## Headline finding (original run): the pin never activated in a real browser

Before the fix, the entire pinned-sequence feature (Tasks 1-6) was inert in every real
browser. `.pin-ready` never appeared in the live DOM, on any viewport, under any
reduced-motion setting. Root cause, confirmed directly (not inferred):

`src/scripts/motion/index.ts:112` gated the pin/parallax block with:

```js
mm.add(`(min-width: ${FULL_TIER_MIN_WIDTH}px) and ${NOT_REDUCED_MOTION}`, () => { ... })
```

which resolved to the literal string
`"(min-width: 1024px) and not all and (prefers-reduced-motion: reduce)"`. Confirmed
this exact string shipped in the production chunk too (not a dev-only artifact):

```
$ grep -o ".\{20\}min-width.\{80\}" dist/client/_astro/Base.astro_astro_type_script_index_1_lang.C3Plj7qw.js
atchMedia();r.add(`(min-width: ${Tu}px) and ${qo}`,()=>(ff(a),lf(a))),r.add(qo,()=>{...
```

**My probe** (Playwright, real Chromium, no mocking), 1440×900:

```js
window.matchMedia('(min-width: 1024px) and not all and (prefers-reduced-motion: reduce)')
// -> { matches: false, media: 'not all' }
window.matchMedia('not all and (prefers-reduced-motion: reduce)')   // the same fragment alone
// -> { matches: true,  media: 'not all and (prefers-reduced-motion: reduce)' }
window.matchMedia('(min-width: 1024px)')                            // the same fragment alone
// -> { matches: true,  media: '(min-width: 1024px)' }
```

**The coordinator's independent probe**, Chrome for Testing 1228, `--dump-dom`,
1440×900 (verbatim as reported to me):

```
false | parsed="not all"  | src=(min-width: 1024px) and not all and (prefers-reduced-motion: reduce)
TRUE  | parsed="not all and (prefers-reduced-motion: reduce)"        (standalone form, correct)
TRUE  | parsed="(min-width: 1024px) and (not (prefers-reduced-motion: reduce))"
```

— and with `--force-prefers-reduced-motion` the third form correctly flips to `false`.
Both probes, run independently in two different Chromium builds by two different tools,
agree exactly: the compound `and not all and (...)` form collapses to `not all`
(always false, regardless of viewport or reduced-motion state); the standalone
`not all and (...)` form is fine on its own; and `(min-width: …) and (not (…))` is the
composable form that behaves correctly both ways.

Both halves were individually true at 1440×900 with no reduced-motion preference — but
the combined string was not valid CSS Media Queries grammar (`and not <type> and (...)`
cannot follow a parenthesized feature in a single condition). Per the CSS Media Queries
error-handling rule, a query that fails to parse is treated as `not all`, which is
*always false*. This is spec-mandated fallback behavior, not a Chromium quirk, so the
same failure applied in Firefox and Safari too — confirmed here across two different
Chromium builds (Playwright's bundled Chromium and Chrome for Testing 1228).

`gsap.matchMedia()`'s own source (`node_modules/gsap/gsap-core.js:4073`,
`mq = _win.matchMedia(conditions[p])`) passes the string straight to the browser's
native `matchMedia` with no reinterpretation. `mm.add()`'s callback
(`applyParallax(root); return applyPins(root);`) therefore never fired, so
`.pin-ready` never got added and no `ScrollTrigger` pin timeline was ever built — on
any device, including the parallax block, not just pinning.

Why the test suite (68/68 passing at the time) didn't catch this:
`tests/motion/index.test.ts` mocked `gsap.matchMedia()` entirely
(`matchMedia: () => ({ add: matchMediaAdd })`, `matchMediaAdd = vi.fn((_query, cb) =>
cb())` by default) — it fired the callback unconditionally regardless of the query
string's content (the file's own comment acknowledges this:
"matchMediaAdd (default mock) ยิงทุก callback เสมอไม่ว่า query จะเป็นอะไร"). `jsdom`
doesn't implement `window.matchMedia` at all. Nothing in the suite ever asked a real
CSS parser to evaluate the actual compound string — exactly the class of gap this task
exists to catch.

## Fix round 1

**1. `src/scripts/motion/index.ts`.** Kept `NOT_REDUCED_MOTION =
'not all and (prefers-reduced-motion: reduce)'` exactly as-is (it's correct standalone,
still used unmodified in the second `mm.add`). Added a second, composable constant:

```js
const NOT_REDUCED_MOTION_COMPOSABLE = '(not (prefers-reduced-motion: reduce))';
```

and changed the full-tier gate to:

```js
mm.add(`(min-width: ${FULL_TIER_MIN_WIDTH}px) and ${NOT_REDUCED_MOTION_COMPOSABLE}`, () => {
  applyParallax(root);
  return applyPins(root);
});
```

with a comment recording the measured reason (the `not all and (…)` whole-query
negation cannot be joined with `and`; parallax was dead from the moment that gate was
introduced, not just pinning).

**2. Regression test**, `tests/motion/index.test.ts` (new `it` block after the existing
full-tier query test): asserts the full-tier query registered via the `matchMediaAdd`
mock contains `(not (prefers-reduced-motion: reduce))`, and that **no** registered
query matches `/\)\s+and\s+not\s+all/`. The test's own comment explains its limit: the
mock only records/replays the query string, it never hands it to a real CSS parser, so
this test alone cannot catch the underlying parse bug — the real gate is the
browser-level check in this document.

**3-5. Re-verification** — see the rewritten Steps 3-5 below, all re-run against the
fixed build.

### Commands run, fix round 1

```
$ npm run test
 Test Files  8 passed (8)
      Tests  69 passed (69)          # 68 baseline + 1 new regression test
```

```
$ npx astro check && npm run build
Result (61 files):
- 0 errors
- 0 warnings
- 10 hints                            # same 2 pre-existing 'Props unused' hints as before, unrelated
...
✓ built in 891ms
✓ Complete!
```

```
$ for f in dist/client/_astro/*.js; do printf "%s\t%s\n" "$(gzip -c "$f" | wc -c)" "$f"; done | sort -k1 -n -r
188381  dist/client/_astro/three.module.Bx43vjkH.js
 46427  dist/client/_astro/Base.astro_astro_type_script_index_1_lang.C7SWi_dv.js
  3231  dist/client/_astro/Base.astro_astro_type_script_index_3_lang.SdxayQ_Z.js
  2425  dist/client/_astro/Base.astro_astro_type_script_index_0_lang.BVbJ7F2N.js
   877  dist/client/_astro/contract.DvWOoEB2.js
   459  dist/client/_astro/Base.astro_astro_type_script_index_2_lang.DwdY1jpB.js
   169  dist/client/_astro/tiers.CCBILwkt.js
```

Both green.

## Step 1 — Production bundle gzip size (before → after the fix)

| Chunk | Original baseline (plan doc, Global Constraint 9) | Before this fix (Task 7 initial measurement) | **After the fix** | Total delta from baseline | Budget | Result |
|---|---|---|---|---|---|---|
| GSAP + ScrollTrigger + motion | 46.0 KB gzip (46,0xx B) | 46,403 B | **46,427 B** | **+427 B (≈ +0.42 KB)** | ≤ +6 KB (+6,144 B) | **PASS** |
| three.js | 188.4 KB gzip | 188,381 B | **188,381 B** (unchanged) | ~0 | no regression expected | **PASS** |

The fix itself cost 24 bytes gzip (one extra string constant) — negligible.

Test suite: **69 passed (69)** — 68 baseline + the 1 new regression test. No
regression.

## Step 2 — `data-stage` count and `pin-ready` absence in built HTML

Unaffected by the fix (this is server-rendered markup; the bug and its fix are both
purely client-side JS). Re-confirmed after rebuilding:

```
fleet data-stage: 4 | pin-ready in HTML: false
routes data-stage: 4 | pin-ready in HTML: false
how data-stage: 3 | pin-ready in HTML: false
```

All three match exactly. `pin-ready` still does not appear anywhere in
`dist/client/index.html` (0 occurrences) — correct, it must only ever be added by JS
at runtime. **PASS** on every sub-check.

## Step 3 — Browser checks, 1440×900 (re-run against the fixed build)

**`.pin-ready` now appears on all three sections immediately at page load**, motion
allowed, 1440×900:

```js
{ fleet: true, routes: true, how: true }   // document.querySelectorAll('.pin-ready').length === 3
```

Each section was walked with fine-grained, well-settled sampling (30px steps for the
full-range pass, 10-30ms/80-120ms settle depending on pass) from just before its start
through well past its end, then walked back up the same range. Screenshots saved to
`mockups/` (git-ignored, described here in words):

| Section | Stages | `pin-ready` | Forward stage sequence | Reverse stage sequence | Pinned samples | Overlap with next section | Fast-scroll (one +1500px-past-range jump) |
|---|---|---|---|---|---|---|---|
| `#fleet` | 4 | true throughout | **[0, 1, 2, 3]** — clean, monotonic | **[3, 2, 1, 0]** — clean, monotonic | 73 / 88 samples | flush, `gap: 0px` against `#how`'s pin-spacer | landed at scrollY 9257 (target 9256.7), not trapped |
| `#routes` | 4 | true throughout | **[0, 1, 2, 3]** | **[3, 2, 1, 0]** | 73 / 88 | flush, `gap: 0px` against `#fleet`'s pin-spacer | landed at scrollY 6107 (target 6106.7) |
| `#how` | 3 | true throughout | **[0, 1, 2]** | **[2, 1, 0]** | 57 / 70 | flush, `gap: 0px` against `#why` (plain section) | landed at scrollY 12028 (target 12027.7) |

- `mockups/pin-fleet-stage0.png` / `mockups/pin-fleet-stage3.png` — single card each
  (Toyota Fortuner alone at stage 0; Toyota Corolla Altis alone, fully settled, at
  stage 3 — captured 85% through the pin range with a 400ms settle to avoid a
  crossfade-in-progress frame). One card visible at a time, exactly the intended
  Apple-style effect — a sharp visual contrast with the pre-fix screenshots, which
  showed all 4 cards simultaneously in a static grid.
- `mockups/pin-routes-stage0.png` / `mockups/pin-routes-stage3.png` — Pattaya card
  alone at stage 0; Hua Hin card alone at stage 3, SVG line drawn almost fully (see
  below).
- `mockups/pin-how-stage0.png` / `mockups/pin-how-stage2.png` — step "01" alone at
  stage 0; step "03" alone (mid-crossfade with "02") at stage 2.

**Note on a screenshot artifact caught and corrected during this re-verification:** an
earlier attempt at `#fleet`'s last-stage screenshot (30px steps, only 80ms settle, taken
at the very last in-range sample before release) caught a visually messy frame with two
section headings appearing to overlap. Investigated directly rather than reported as-is:
a fine 10px-step, 120ms-settle walk across the exact release boundary (`#fleet` →
`#how`) showed **zero overlap at any sampled point** — `fleetBottom` and `#how`'s
pin-spacer top matched exactly (to sub-pixel rounding) at every single sample through
the transition, and `#how`'s own content never entered the 900px viewport until well
after `#fleet` had fully released. The messy frame was a transient rendering artifact
of instant synthetic `scrollTo()` teleporting (not something a real, continuous user
scroll can produce), not a real overlap bug. Replaced that screenshot with a
cleanly-settled one; recording this here rather than silently swapping it out.

**SVG line draw in `#routes`** (`stroke-dashoffset` sampled at 5 points through the
pinned range, `stroke-dasharray` constant at `1170.56`):

| Position in pin | Active stage | `strokeDashoffset` | % drawn |
|---|---|---|---|
| start | 0 | 1101px | 6% |
| 1/4 | 1 | 907px | 22% |
| 1/2 | 1 | 614px | 48% |
| 3/4 | 2 | 321px | 73% |
| end | 3 | 28px | 97.6% |

Monotonically decreasing, tied to scroll — the line genuinely draws across the pin.

**Parallax on `[data-parallax]`:** the gate that was silently swallowing it is fixed —
`applyParallax(root)` now executes inside the matched full-tier context, confirmed by
the same `mq_diag` check above. However, **there is nothing in the live markup for it
to move**: `grep -rn 'data-parallax="' src/ --include="*.astro"` returns zero matches
across the entire component tree, and a live DOM query
(`document.querySelectorAll('[data-parallax]').length`) also returned **0** on the
running page. The parallax code path is reachable now, but no component wires the
attribute in yet — the same "built, unit-tested, not wired into any live component"
gap this codebase's sibling verify doc already found for `[data-reveal]`. Nothing to
observe moving; stating that plainly rather than claiming a visual check that has no
subject.

Visual checks against the brief's asks, now genuinely exercised:

- **"ค้างจอแล้วปล่อย ไม่มี section ถัดไปทับ ไม่มี footer กระตุก"** — **PASS, for real.**
  Each section pins (top holds at ~0 across dozens of consecutive samples), releases
  cleanly (top departs 0 and resumes normal 1:1 scroll-linked movement), and the
  boundary with the next section is flush with zero gap and zero overlap at every
  sampled point, including a fine 10px-resolution pass across the exact release
  instant. Footer: unchanged from the original run — `getBoundingClientRect().top`
  identical across two independent full-page scroll round-trips, `scrollHeight`
  unchanged.
- **"scroll ย้อนขึ้นแล้วเรื่องเล่นย้อนกลับได้ ไม่ค้างที่ stage สุดท้าย"** — **PASS.**
  Reverse walks for all three sections show the exact mirror sequence of the forward
  walk (`[3,2,1,0]`, `[3,2,1,0]`, `[2,1,0]`) — the narrative genuinely reverses, and
  none get stuck at their last stage.
- **"scroll เร็วผ่านทีเดียวแล้วผ่านได้จริง ไม่ติดกับดัก"** — **PASS, now against a real
  running pin** (unlike the original run, where this passed only because nothing was
  pinned to trap in). A single instant `window.scrollTo` jump of 1500px past each
  section's full pin range landed within 1px of target every time — no trapping.

## Step 4 — Reduced motion (re-run against the fixed build)

```js
document.querySelectorAll('.pin-ready').length
// -> 0
[...document.querySelectorAll('#fleet [data-stage], #routes [data-stage], #how [data-stage]')]
  .filter((el) => getComputedStyle(el).opacity === '0' || getComputedStyle(el).visibility === 'hidden').length
// -> 0
```

| Check | Expected | Observed | Result |
|---|---|---|---|
| `.pin-ready` present in DOM | absent | 0 elements | **PASS** — and now for the *correct* reason: the fixed full-tier query genuinely evaluates false under `reduced_motion="reduce"` (confirmed the standalone `NOT_REDUCED_MOTION`/composable forms both correctly gate off), not because the gate was broken regardless of state |
| Hidden `data-stage` elements | 0 | 0 | **PASS** |
| `#fleet` / `#routes` / `#how` stage counts | 4 / 4 / 3 | 4 / 4 / 3 | **PASS** |
| Section sticks/pins under reduced motion | should not | does not — scrolled 400px past `#fleet`'s top, `top` moved to `-400.4px` (full 1:1), no stickiness | **PASS** |

## Step 5 — Language switch mid-pin (re-run with a real pin state, root cause pursued)

Scrolled to ~40% through `#fleet`'s pin range (`top ≈ -0.3px`, i.e. genuinely pinned;
active stage index **1**), then switched language.

**Root-caused the +180px-class scroll shift seen in the original (pre-fix) run**, which
that run could only observe, not explain (there was no real pin state to test against
at the time). This time, ran the switch two ways to isolate the cause:

1. `page.mouse.click(x, y)` at the toggle button's exact viewport coordinates — this
   bypasses Playwright's locator-based auto-scroll-into-view entirely (it's a raw
   mouse event at fixed screen coordinates, no actionability checks).
2. Playwright's locator `.click('button[data-lang="en"]')` — which *can*
   auto-scroll a target into view if it judges the element isn't interactable.

Both produced the **identical** `scrollY` shift: `6461 → 6587` (+126px). Since the raw
`mouse.click()` path — which cannot invoke Playwright's own scroll-into-view logic —
shows the exact same shift as the locator click, **Playwright's tooling is ruled out as
the cause**. The remaining, and only, explanation is the app's own
`watchLanguageChange()` → `ScrollTrigger.refresh()` call: refreshing recalculates every
trigger's pixel start/end after the language switch changes text lengths elsewhere on
the page (Nav links, headings above `#fleet`, etc. all reflow between Thai and
English), which shifts `#fleet`'s absolute document position, and GSAP's own
documented `refresh()` behavior re-syncs `window.scrollY` to preserve the visually
active pin progress after such a layout shift. This matches the code comment already
in `index.ts` explaining exactly why `watchLanguageChange()` exists.

Crucially, across that shift: `top` before/after was `-0.297px` / `0px` (both fully
pinned, no un-pin), **active stage index was 1 before and 1 after** (unchanged), and
`stageCount` was 4 before and after. **No stage was lost or jumped** — the visually
displayed card did not change, and the section stayed correctly pinned throughout. The
126px `scrollY` adjustment is `ScrollTrigger.refresh()` correctly keeping the pin's
visual position in sync with a layout shift it caused, not a narrative jump.

| Check | Result |
|---|---|
| Language switches (`documentElement.lang`) | PASS — became `en` |
| Card/stage lost or jumped mid-pin | **PASS — none**, active stage index identical (1 → 1) before/after |
| Section stays pinned through the switch | PASS — `top` stayed at ~0 before and after |
| `scrollY` shift observed | +126px, now root-caused: `ScrollTrigger.refresh()` re-syncing scroll position after a text-length-driven layout shift elsewhere on the page (confirmed not caused by Playwright's click/scroll mechanics, via the mouse-click-vs-locator-click comparison above) |

## Summary table (final, post-fix)

| # | Check | Expected | Observed | Result |
|---|---|---|---|---|
| 1 | Motion chunk gzip | ≤ baseline (46.0 KB) + 6 KB | 46,427 B (+427 B / +0.42 KB over baseline; fix itself cost +24 B) | **PASS** |
| 1 | three.js chunk gzip | no regression | 188,381 B (unchanged) | **PASS** |
| 1 | Test suite | green | 69 passed (69) | **PASS** |
| 2 | `data-stage` counts (built HTML) | 4 / 4 / 3 | 4 / 4 / 3 | **PASS** |
| 2 | `pin-ready` absent from built HTML | absent ×3 | absent ×3 | **PASS** |
| 3 | `.pin-ready` present at runtime, desktop | should appear | **true on all 3, at load** | **PASS (fixed)** |
| 3 | Sections pin, advance through stages, release | pin → fade 0→N → release | fleet/routes `[0,1,2,3]`→release, how `[0,1,2]`→release, all clean | **PASS (fixed)** |
| 3 | No section overlap / no footer jump | true | flush (`gap: 0px`) at every sampled point, footer geometry stable | **PASS** |
| 3 | Reverse scroll un-reveals narrative | true | exact mirror sequence, no stall at last stage | **PASS (fixed)** |
| 3 | Fast scroll passes a pinned section, no trap | true | landed within 1px of target past every section's real pin range | **PASS (fixed, now against a real pin)** |
| 3 | `#routes` SVG line draws | offset → 0 | 1101px → 907 → 614 → 321 → 28px (of 1170.56) | **PASS** |
| 3 | `[data-parallax]` moves | — | code path fixed and reachable, but **zero live elements carry the attribute** — nothing to observe | **N/A — pre-existing gap, not this bug** |
| 4 | Reduced motion: `pin-ready` absent | true | 0 | **PASS (now for the correct reason)** |
| 4 | Reduced motion: hidden `data-stage` count | 0 | 0 | **PASS** |
| 4 | Reduced motion: stage counts | 4 / 4 / 3 | 4 / 4 / 3 | **PASS** |
| 5 | Language switch mid-pin preserves stage | no loss/jump | active stage unchanged (1→1), section stayed pinned | **PASS** |
| 5 | Scroll shift on language switch | — | +126px, root-caused to `ScrollTrigger.refresh()` re-syncing after a text-length layout shift; confirmed not a Playwright artifact | **explained, not a defect** |

## What could not be checked, and why

- **Chrome-in-browser extension driven checks**: the extension never connected (3×
  `tabs_context_mcp`, 1× `navigate`, confirmed by `list_connected_browsers` → `[]`).
  Substituted with local headless Chromium via Playwright (already cached, zero
  downloads) — the same substitution the coordinator's own independent Chrome for
  Testing probe validated.
- **DevTools Rendering-panel reduced-motion simulation**: unreachable without the
  extension. Substituted with Playwright's `reduced_motion="reduce"` context flag.
- Everything else asked for in this task was, after the fix, actually measured against
  real pin behavior — nothing remaining is a "could not check."

## Files referenced

- `src/scripts/motion/index.ts:8-34,112` — the fixed gate and the comment recording why
- `src/scripts/motion/pin.ts` — `applyPins()`, confirmed now invoked and building real ScrollTrigger timelines for all 3 sections
- `tests/motion/index.test.ts` — new regression test asserting the composable query shape and rejecting the broken shape
- `node_modules/gsap/gsap-core.js:4054-4086` — `MatchMedia.add()`, confirms the raw string is passed straight to `window.matchMedia`
- `dist/client/_astro/Base.astro_astro_type_script_index_1_lang.C7SWi_dv.js` — production chunk after the fix
- `mockups/pin-fleet-stage0.png`, `mockups/pin-fleet-stage3.png`, `mockups/pin-routes-stage0.png`, `mockups/pin-routes-stage3.png`, `mockups/pin-how-stage0.png`, `mockups/pin-how-stage2.png` — not committed (`mockups/` is git-ignored); described above in words
