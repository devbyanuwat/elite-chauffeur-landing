# Landing motion system (SABUY-52) — Browser Verification Record

Task 6 of `2026-07-27-landing-motion-system`. Real-browser checks (Playwright/Chromium)
and a real production build, run against `redesign/parallax-v1` on 2026-07-27.
All numbers below were observed directly in this run — none carried over from the brief.

Environment: Node v22.13.1, Astro build (`astro check && astro build`), Chromium via
Playwright (system Python `/Library/Frameworks/Python.framework/Versions/3.12/bin/python3`).

## Step 1 — Production bundle gzip size

```
npm run build
for f in dist/_astro/*.js; do printf '%s %s\n' "$(gzip -c "$f" | wc -c)" "$f"; done | sort -rn | head -5
```

**Deviation from brief:** this project's `astro.config.mjs` uses `output: 'static'` with
the `@astrojs/node` adapter, which places client assets under `dist/client/_astro/`, not
`dist/_astro/`. The literal command in the brief matches zero files
(`no matches found: dist/_astro/*.js`). Re-ran against the real path:

```
for f in dist/client/_astro/*.js; do printf '%s %s\n' "$(gzip -c "$f" | wc -c)" "$f"; done | sort -rn | head -5
```

Output:

```
46543 dist/client/_astro/Base.astro_astro_type_script_index_0_lang.B0bSWNip.js
 3231 dist/client/_astro/Base.astro_astro_type_script_index_1_lang.SdxayQ_Z.js
```

Confirmed the 46543-byte chunk is the one containing GSAP + ScrollTrigger + the motion
module (not just guessing from size):

```
grep -o "gsap\|ScrollTrigger\|matchMedia" dist/client/_astro/Base.astro_astro_type_script_index_0_lang.B0bSWNip.js | sort | uniq -c
   6 ScrollTrigger
  64 gsap
  19 matchMedia
```

head of the file starts with the GSAP 3.15.0 license banner, confirming identity.
The 3231-byte chunk is the i18n bundle (`data-i18n`, `lang-toggle`, `innerHTML` all
present in it) — this confirms the documented chunk-index ordering (motion chunk =
`index_0`, i18n chunk = `index_1`), which loads before i18n in the emitted `<script>`
tags. This is the accepted, already-documented ordering; not re-litigated here.

**Result: 46543 bytes gzip.** Budget is ≤ 61440 bytes (60 KB). **PASS** — headroom is
`(61440 − 46543) / 61440 = 14897 / 61440 = 0.242464... ≈ 24.2% under budget` (equivalently,
`46543 / 61440 = 0.757536... ≈ 75.8%` of the budget is used — corrected from an earlier,
wrong "17.6% under budget" claim that was never recomputed against these raw inputs). This
matches the number the task author had already spot-checked (46543) — no mismatch to flag
on the raw byte count, only on the derived percentage above.

## Step 2 — Preview server

```
npm run preview
```

Started in background (nohup), confirmed via log output:

```
13:11:41 [@astrojs/node] Enabling sessions with filesystem storage
13:11:41 [@astrojs/node] Server listening on http://localhost:4321
```

`curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/` → `200`. Server was
stopped (`kill`) after all checks completed; confirmed down via a follow-up curl
returning no response (`000`).

## Step 3 — Three-tier Playwright check

Ran the exact script from the brief against `http://localhost:4321/`. Real output:

```
desktop hidden after scroll: 4
reduced-motion hidden: 0
no-js hidden: 32
no-js text length: 5265
```

Reading against the brief's expected values (`reduced-motion hidden` = 0, `no-js hidden`
= 0, `no-js text length` > 1000, `desktop hidden after scroll` = 0):

| Check | Expected | Observed | Result |
|---|---|---|---|
| desktop hidden after scroll | 0 | 4 | **FAIL** |
| reduced-motion hidden | 0 | 0 | PASS |
| no-js hidden | 0 | 32 | **FAIL** |
| no-js text length | > 1000 | 5265 | PASS |

Two of four checks fail. Diagnosed both rather than reporting bare numbers:

**`no-js hidden: 32` — root cause isolated.** A follow-up script split the count by
selector under `java_script_enabled=False`:

```
{'dataReveal': 0, 'legacyReveal': 32, 'hasJsMotionClass': False}
```

The new `[data-reveal]` system (built in Tasks 1–5, gated by `.js-motion` in
`src/styles/motion.css`) has **zero** hidden elements without JS — the no-JS safety
property holds perfectly for it, and `js-motion` is correctly absent from
`<html>` when JS is off. All 32 hidden elements come from the **legacy** `.reveal`
class defined in `src/styles/global.css:303` (`opacity: 0` unconditionally, not gated
by `.js-motion` at all). Those elements are only unhidden by
`applyLegacyReveal()` in `src/scripts/motion/index.ts` (IntersectionObserver adding
`.in`), which never runs when JS is disabled.

This is not a regression introduced by this branch. `git log -- src/layouts/Base.astro`
shows the exact same logic (same IntersectionObserver, same
`prefers-reduced-motion`/`IntersectionObserver`-absent fallback, same lack of any
no-JS fallback) existed as an inline `<script>` in Base.astro before the motion-system
refactor, itself commented as "ported from live index.html inline script (~2935-2946)" —
i.e. this gap predates the Astro migration entirely. Tasks 1–5 preserved it verbatim
per the plan's own constraint ("`.reveal` เดิมที่ยังใช้ใน 3 component ต้องทำงานเหมือนเดิมทุกประการ").

Also worth flagging: that constraint says "3 component" still use legacy `.reveal`, but
`grep -rl 'class="[^"]*\breveal\b'` currently finds it in **14** files
(`Hero.astro`, `Why.astro`, `Routes.astro`, `Faq.astro`, `Cta.astro`, `Stats.astro`,
`How.astro`, `BlogCard.astro`, `Services.astro`, `Fleet.astro`, `index.astro`,
`routes/[slug].astro`, `airport-transfer/[slug].astro`, `blog/index.astro`), while
the new `data-reveal=` attribute has **zero** real usages in markup (only referenced in
`motion.css` selectors) — the new system exists and is unit-tested but isn't wired into
any live component yet. That wiring is evidently deferred to a later phase (the plan's
own notes point to "S3").

**`desktop hidden after scroll: 4` — root cause isolated.** Dumping the 4 stuck
elements showed all 4 belong to the `why` section (`section-head reveal`, three
`why-item reveal` divs), positioned far above the final viewport
(`rect.top` ≈ −1860 to −2058px) after `window.scrollTo(0, document.body.scrollHeight)`.
The brief's check does one instant jump straight to the bottom. Because this jump is a
single synchronous scroll (not incremental), the browser never paints a frame where the
`why` section's elements are inside the viewport — so their `IntersectionObserver`
(same legacy `.reveal` mechanism above) never fires `isIntersecting`, and they stay at
`opacity: 0` permanently (confirmed stable after an extra 4s wait — not a timing issue).

Re-ran with a 20-step incremental scroll (each step pausing 150ms) instead of one jump:
result was **0 hidden** — confirming the elements do reveal correctly under normal
scroll, and the 4-stuck-elements failure is specifically about **instant/jump scrolling**
(e.g. End key, scrollbar drag-to-bottom, anchor-link jump, browser find-in-page jump) —
a real robustness gap in the legacy IntersectionObserver-only reveal, also pre-existing
and not introduced by Tasks 1–5.

**Net read:** the motion system built in Tasks 1–5 (the `data-*` contract, `.js-motion`
gate, tier selection) passes every no-JS/reduced-motion check cleanly. The two failures
against the brief's expected values are real and reproducible, but they trace entirely
to the **legacy** `.reveal`/IntersectionObserver mechanism that predates this branch and
was intentionally ported unchanged. They are not fixed here per this task's scope
(verification only, no source changes) — reporting them as-is per instructions.

## Step 4 — Language switch check

Ran the exact script from the brief:

```
th: เดินทาง สบาย ๆ กับคนขับ มืออาชีพ
en: Travel with ease with a professional driver
ASSERTION PASSED
```

`h1` text changed from Thai to English, non-empty, different from before. **PASS.**
This confirms `applyReveals`/ScrollTrigger's `[data-split]` handling does not clobber
`i18n.ts`'s `innerHTML` rewrite of `[data-i18n]` elements, despite the motion chunk
loading before the i18n chunk (documented ordering from Step 1).

## Summary

| Check | Result |
|---|---|
| Step 1: GSAP+ScrollTrigger+motion chunk gzip ≤ 60 KB | PASS — 46543 bytes, `(61440−46543)/61440 ≈ 24.2%` under budget |
| Step 3: reduced-motion hidden = 0 | PASS |
| Step 3: no-js hidden = 0 | **FAIL — 32** (all from legacy `.reveal`, pre-existing, not from Tasks 1–5's new system) |
| Step 3: no-js text length > 1000 | PASS — 5265 |
| Step 3: desktop hidden after scroll = 0 | **FAIL — 4** (legacy `.reveal` + instant-scroll-jump gap, pre-existing) |
| Step 4: language switch text swap | PASS |

Two of six checks fail. Both failures are isolated to the pre-existing legacy `.reveal`
mechanism (not the new `data-*` motion system this plan built), confirmed via
git history predating the Astro migration. The new system's own no-JS/reduced-motion
guarantees hold with zero exceptions. Recommend opening a follow-up card for the legacy
`.reveal` no-JS/instant-scroll gap rather than blocking this plan's closure on it, since
fixing it is out of this task's scope (verification only, no source edits) and the plan
explicitly required byte-for-bit preservation of legacy `.reveal` behavior.
