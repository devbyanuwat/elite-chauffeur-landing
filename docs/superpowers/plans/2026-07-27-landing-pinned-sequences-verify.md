# Landing pinned sequences — Browser Verification Record

Task 7 of `2026-07-27-landing-pinned-sequences`. Run against `redesign/parallax-v1` at
commit `a7a9ee4e63a06b0093e7531d32d35f6c40d66da6`, on 2026-07-27. Environment: Node
v22.13.1, `npm run build` (astro check + astro build), dev server already running at
`http://localhost:4321/`.

**Tooling deviation (recorded, not guessed around):** the brief's prescribed tool —
the Claude-in-Chrome extension — never connected. `tabs_context_mcp` was called three
times and `navigate` once, all returning "Browser extension is not connected";
`list_connected_browsers` confirmed zero connected browsers. Per the brief's own
instruction ("if the extension does not respond after 2-3 attempts, stop and report"),
those attempts were stopped. In place of it, Steps 3-5 were run with the project's
`webapp-testing` skill: native Python Playwright driving a **real, already-installed,
already-cached local Chromium** (`~/Library/Caches/ms-playwright`, no new downloads —
this exact substitution is precedented in this repo by
`docs/superpowers/plans/2026-07-27-landing-motion-system-verify.md`, Task 6 of the
sibling plan, which used the same tool for the same reason). DevTools' Rendering panel
(unreachable without the extension) was substituted with Playwright's
`reduced_motion="reduce"` browser-context flag, which sets the real
`prefers-reduced-motion: reduce` media feature at the browser-engine level — not a
guess, a real equivalent, as the brief itself allows as a fallback.

## Headline finding: the pin never activates in a real browser

Before the step-by-step results: **the entire pinned-sequence feature (Tasks 1-6) is
inert in every real browser.** `.pin-ready` never appears in the live DOM, on any
viewport, under any reduced-motion setting, on this build. Root cause, confirmed
directly (not inferred):

`src/scripts/motion/index.ts:112` gates the pin/parallax block with:

```js
mm.add(`(min-width: ${FULL_TIER_MIN_WIDTH}px) and ${NOT_REDUCED_MOTION}`, () => { ... })
```

which resolves to the literal string
`"(min-width: 1024px) and not all and (prefers-reduced-motion: reduce)"`. Confirmed
this exact string ships in the production chunk too (not a dev-only artifact):

```
$ grep -o ".\{20\}min-width.\{80\}" dist/client/_astro/Base.astro_astro_type_script_index_1_lang.C3Plj7qw.js
atchMedia();r.add(`(min-width: ${Tu}px) and ${qo}`,()=>(ff(a),lf(a))),r.add(qo,()=>{...
```

Evaluated directly in real Chromium (Playwright, no mocking) at 1440×900:

```js
window.matchMedia('(min-width: 1024px) and not all and (prefers-reduced-motion: reduce)')
// -> { matches: false, media: 'not all' }
window.matchMedia('not all and (prefers-reduced-motion: reduce)')   // the same fragment alone
// -> { matches: true,  media: 'not all and (prefers-reduced-motion: reduce)' }
window.matchMedia('(min-width: 1024px)')                            // the same fragment alone
// -> { matches: true,  media: '(min-width: 1024px)' }
```

Both halves are individually true at this viewport with no reduced-motion preference —
but the combined string is not valid CSS Media Queries grammar (`and not <type> and
(...)` cannot follow a parenthesized feature in a single condition; a `not`-prefixed
media-type query can't be chained with `and` after a feature test). Per the CSS Media
Queries error-handling rule, a query that fails to parse is treated as `not all`, which
is *always false* — regardless of viewport width or reduced-motion state. This is
spec-mandated fallback behavior, not a Chromium quirk, so the same failure is expected
in Firefox and Safari too.

`gsap.matchMedia()`'s own source (`node_modules/gsap/gsap-core.js:4073`,
`mq = _win.matchMedia(conditions[p])`) passes the string straight to the browser's
native `matchMedia` with no reinterpretation — it has no way to work around this.
`mm.add()`'s callback (`applyParallax(root); return applyPins(root);`) therefore never
fires, so `applyPins()` never runs, so `.pin-ready` never gets added and no
`ScrollTrigger` pin timeline is ever built, on any device.

Why the test suite (68/68 passing, confirmed again in this run) didn't catch this:
`tests/motion/index.test.ts` mocks `gsap.matchMedia()` entirely
(`matchMedia: () => ({ add: matchMediaAdd })`, `matchMediaAdd = vi.fn((_query, cb) =>
cb())` by default) — it fires the callback unconditionally regardless of the query
string's content, and the file's own comment acknowledges this
("matchMediaAdd (default mock) ยิงทุก callback เสมอไม่ว่า query จะเป็นอะไร"). `jsdom`
doesn't implement `window.matchMedia` at all (also noted in-file), so nothing in the
suite ever asks a real CSS parser to evaluate the actual compound string. This is
exactly the class of gap this task exists to catch.

Practical effect observed on `#fleet`, `#routes`, `#how`: sections never pin (their
`getBoundingClientRect().top` moves 1:1 with scroll the entire time, never sticks at
`0`); every `data-stage` card inside a section is simultaneously `opacity: 1` at every
scroll depth (confirmed by sampling roughly every 60px through and past each section).
Visually this looks exactly like the no-JS/reduced-motion fallback grid (Global
Constraint 4) — except it's happening unconditionally, with GSAP fully loaded, on a
plain 1440×900 desktop session. The "pin, then reveal one stage at a time" effect these
six tasks were built to produce is not observable anywhere on this build.

This is not something this task fixes (out of scope per the brief), but it changes what
"passing" means for several of the checks below — noted inline.

## Step 1 — Production bundle gzip size

```
npm run build
find dist -name '*.js' -exec sh -c 'printf "%s "; gzip -c "$1" | wc -c' _ {} \; | sort -k2 -n -r | head -8
```

```
188381  dist/client/_astro/three.module.Bx43vjkH.js
 46403  dist/client/_astro/Base.astro_astro_type_script_index_1_lang.C3Plj7qw.js
  3231  dist/client/_astro/Base.astro_astro_type_script_index_3_lang.SdxayQ_Z.js
  2425  dist/client/_astro/Base.astro_astro_type_script_index_0_lang.BVbJ7F2N.js
   877  dist/client/_astro/contract.DvWOoEB2.js
   459  dist/client/_astro/Base.astro_astro_type_script_index_2_lang.DwdY1jpB.js
   169  dist/client/_astro/tiers.CCBILwkt.js
```

| Chunk | Baseline (from plan doc, Global Constraint 9) | Measured now | Delta | Budget | Result |
|---|---|---|---|---|---|
| GSAP + ScrollTrigger + motion (`...index_1_lang...js`) | 46.0 KB gzip (46,0xx B) | **46,403 B** (45.32 KiB / 46.40 KB) | **+403 B (≈ +0.39 KB)** | ≤ +6 KB (+6,144 B) | **PASS** — well inside budget |
| three.js (`three.module...js`) | 188.4 KB gzip | **188,381 B** (188.38 KB) | ~0 (unchanged) | no regression expected (untouched by this plan) | **PASS** |

Also ran the test suite for a full regression check (not one of Task 7's numbered
steps, but a baseline the brief names): `npm run test` → **68 passed (68)**, 8 test
files, matches the stated baseline exactly. No regression.

## Step 2 — `data-stage` count and `pin-ready` absence in built HTML

```
node -e "... (script from brief) ..."
```

```
fleet data-stage: 4 | pin-ready in HTML: false
routes data-stage: 4 | pin-ready in HTML: false
how data-stage: 3 | pin-ready in HTML: false
```

All three match the brief's expected values exactly. Additionally confirmed globally:
`pin-ready` does not appear anywhere in `dist/client/index.html` (0 occurrences), and
`data-pin=` / `data-pin-length=` each appear exactly 3 times (fleet, route, how) — the
server-rendered HTML carries the full contract with no runtime-only class leaking in.
**PASS** on every sub-check.

## Step 3 — Browser checks, 1440×900

Screenshots saved to `mockups/` (git-ignored, not committed — described here in words
per the brief's instruction):

- `mockups/pin-fleet-stage0.png` — all 4 fleet cards (Toyota Alphard/Fortuner/Xpander/
  Corolla) visible side by side in a plain 4-column grid, right as `#fleet`'s top
  reaches the viewport top.
- `mockups/pin-routes-stage0.png` — all 4 route cards (Suvarnabhumi/Pattaya/Hua Hin/
  Don Mueang) visible side by side in a plain grid, same moment.
- `mockups/pin-how-stage0.png` — all 3 "how" steps (01/02/03) visible side by side in a
  plain 3-column grid, same moment.

**No "last stage" screenshots exist** (`pin-fleet-stage3.png` etc. were never written)
because, per the headline finding, no section ever advances past its first/only
visible state — every `data-stage` card in a section sits at `opacity: 1`
simultaneously at every sampled scroll depth (roughly every 60px, from before the
section until well past it, and back). There is no distinguishable "last stage" to
screenshot; stating this plainly rather than manufacturing a screenshot that doesn't
correspond to anything real.

Measured, per section (sampled ~60px steps forward through +2600px, then back):

| Section | `pin-ready` ever seen | Section ever pins (`top` sticks near 0) | Max distinct stage index observed | Reverse scroll returns to stage 0 |
|---|---|---|---|---|
| `#fleet` | never (false at every sample) | no — `top` moves 1:1 with scroll | 0 (all 4 cards always visible together) | trivially yes (never left 0) |
| `#routes` | never | no | 0 (all 4 cards always visible together) | trivially yes |
| `#how` | never | no | 0 (all 3 steps always visible together) | trivially yes |

Because of the headline finding, the three visual checks the brief asks for land as
follows:

- **"ค้างจอแล้วปล่อย ไม่มี section ถัดไปทับ ไม่มี footer กระตุก"** — no pin ever
  engages, so there is nothing to "release," but the underlying geometry is sound: for
  every section→next-section boundary, `sectionBottom === nextSectionTop` exactly
  (routes→fleet: 529.578/529.578; fleet→how: 815.422/815.422; how→why: 397.531/
  397.531) — no overlap, no gap. Footer: `getBoundingClientRect().top` at the bottom of
  the page was **identical across two independent full-page scroll round-trips**
  (503.71875 both times), and `document.documentElement.scrollHeight` was unchanged
  (8082 before and after all scrolling). No overlap, no footer jump — **PASS on the
  geometry actually measured**, but this does not exercise the pin-spacer / release
  logic (`pinSpacing: true`) the constraint is really about, since that logic is never
  invoked.
- **"scroll ย้อนขึ้นแล้วเรื่องเล่นย้อนกลับได้ ไม่ค้างที่ stage สุดท้าย"** —
  inapplicable: there is no "last stage" ever reached to get stuck at, and no
  narrative to reverse. Not a meaningful pass or fail; reported as **not exercised**.
- **"scroll เร็วผ่านทีเดียวแล้วผ่านได้จริง ไม่ติดกับดัก"** — tested with one instant
  `window.scrollTo` jump of +4000px from each section's start: all three landed at
  `scrollY ≈ 7182` (the page's actual max scroll), i.e. nothing trapped the jump.
  **PASS on the literal check**, but trivially true given nothing pins in the first
  place — this does not exercise `anticipatePin`/pin-trap-avoidance under a real
  running pin.

## Step 4 — Reduced motion

Ran via Playwright's `reduced_motion="reduce"` browser context (real
`prefers-reduced-motion: reduce` at the engine level) against a fresh page load,
1440×900:

```js
document.querySelectorAll('.pin-ready').length
// -> 0
[...document.querySelectorAll('#fleet [data-stage], #routes [data-stage], #how [data-stage]')]
  .filter((el) => getComputedStyle(el).opacity === '0' || getComputedStyle(el).visibility === 'hidden').length
// -> 0
```

| Check | Expected | Observed | Result |
|---|---|---|---|
| `.pin-ready` present in DOM | absent | 0 elements | **PASS** (though for the same "gate is always false" reason as Step 3, not specifically the reduced-motion branch — see headline finding) |
| Hidden `data-stage` elements | 0 | 0 | **PASS** |
| `#fleet` stage count | 4 | 4 | **PASS** |
| `#routes` stage count | 4 | 4 | **PASS** |
| `#how` stage count | 3 | 3 | **PASS** |

Also confirmed sections scroll normally under reduced motion rather than sticking:
scrolled 400px past `#fleet`'s top, and its `getBoundingClientRect().top` moved from
the alignment point to `-400.4px` — full 1:1 movement, no stickiness, consistent with
the expected fallback.

## Step 5 — Language switch mid-pin

Could not be tested in the sense the brief intends — "switch language while a section
is actively pinned/mid-stage" presupposes a pin state that (per the headline finding)
never exists in a real browser on this build. There is no "mid-pin" moment to catch.

What was measured instead: scrolled deep into `#fleet`'s area (`scrollY = 4352`,
section already mostly above the viewport — `top: -1080px`, `bottom: -29.6px`), then
clicked `button[data-lang="en"]`:

```
before: { pinReady: false, opacities: [1,1,1,1], stageCount: 4, scrollY: 4352 }
after:  { pinReady: false, opacities: [1,1,1,1], stageCount: 4, scrollY: 4532 }
document.documentElement.lang -> "en"
```

- Language did switch (`lang` → `en`). **No card disappeared and no card's opacity
  dropped** — all 4 `data-stage` elements remained present and fully opaque before and
  after. On content-completeness grounds alone, nothing broke.
- One open, unexplained observation: `scrollY` shifted by **+180px**
  (4352 → 4532) on the click alone. Not root-caused — candidates not distinguished
  between: Playwright's `click()` auto-scrolling the target into view vs.
  `watchLanguageChange()`'s `ScrollTrigger.refresh()` nudging scroll position for one
  of the *other*, non-pin ScrollTriggers still active on the page (reveals/counts/
  split-text, which are correctly gated by the simpler, valid
  `not all and (prefers-reduced-motion: reduce)` query alone and do run). Recorded as
  an open item, not asserted as pass or fail.

## Summary table

| # | Check | Expected | Observed | Result |
|---|---|---|---|---|
| 1 | Motion chunk gzip | ≤ baseline (46.0 KB) + 6 KB | 46,403 B (+403 B / +0.39 KB over baseline) | **PASS** |
| 1 | three.js chunk gzip | no regression from 188.4 KB | 188,381 B (188.4 KB, unchanged) | **PASS** |
| 1 | Test suite | 68 passing (baseline) | 68 passed (68) | **PASS** |
| 2 | `#fleet` / `#routes` / `#how` `data-stage` count (built HTML) | 4 / 4 / 3 | 4 / 4 / 3 | **PASS** |
| 2 | `pin-ready` absent from built HTML | absent ×3 | absent ×3 | **PASS** |
| 3 | `.pin-ready` present at runtime, desktop, no reduced motion | should appear once a pin timeline builds | **never appears — 0 at every sample** | **FAIL — feature inert, root-caused above** |
| 3 | Sections actually pin and step through stages | pin, fade stage 0→N | never pins; all stage cards permanently visible together | **FAIL** (consequence of the same root cause) |
| 3 | No section overlap / no footer jump | true | geometry confirmed flush and stable | **PASS** (geometry only; pin-release logic itself unexercised) |
| 3 | Reverse scroll un-reveals narrative | true | not exercised — no narrative was ever entered | **not exercised** |
| 3 | Fast scroll passes a pinned section, no trap | true | landed past every section on one jump | **PASS** (trivial — nothing to trap in) |
| 4 | Reduced motion: `pin-ready` absent | true | 0 | **PASS** |
| 4 | Reduced motion: hidden `data-stage` count | 0 | 0 | **PASS** |
| 4 | Reduced motion: stage counts | 4 / 4 / 3 | 4 / 4 / 3 | **PASS** |
| 5 | Language switch mid-pin preserves stage | no loss/jump | no "mid-pin" state exists to test; content/opacity preserved regardless; unexplained +180px scroll shift on the switch, not root-caused | **not exercised as intended / partial** |

## What could not be checked, and why

- **Chrome-in-browser extension driven checks**: the extension never connected (3×
  `tabs_context_mcp`, 1× `navigate`, confirmed by `list_connected_browsers` → `[]`).
  Substituted with local headless Chromium via Playwright (already cached, zero
  downloads), same engine family the extension itself would have driven.
- **DevTools Rendering-panel reduced-motion simulation**: unreachable without the
  extension. Substituted with Playwright's `reduced_motion="reduce"` context flag,
  a real engine-level equivalent per the brief's own allowed fallback.
- **Pin release / reverse-narrative / anticipatePin trap-avoidance under a real,
  running pin**: not exercisable on this build at all, because the pin never engages
  (headline finding) — every related "PASS" above is a geometry-only pass, not a
  pass of the pin machinery itself.
- **Root cause of the +180px scroll shift on language switch** (Step 5): observed, not
  isolated. Candidates (Playwright's own scroll-into-view on click vs.
  `ScrollTrigger.refresh()` moving the page for a different, active ScrollTrigger) were
  not distinguished.

## Files referenced

- `src/scripts/motion/index.ts:112,117` — the broken gate and the working sibling gate
- `src/scripts/motion/pin.ts` — `applyPins()`, never invoked in a real browser on this build
- `node_modules/gsap/gsap-core.js:4054-4086` — `MatchMedia.add()`, confirms the raw string is passed straight to `window.matchMedia`
- `tests/motion/index.test.ts:3-27` — the mock that hides this from the unit suite
- `dist/client/_astro/Base.astro_astro_type_script_index_1_lang.C3Plj7qw.js` — production chunk, confirmed to contain the identical malformed query
- `mockups/pin-fleet-stage0.png`, `mockups/pin-routes-stage0.png`, `mockups/pin-how-stage0.png` — not committed (`mockups/` is git-ignored); described above in words
