# Editions Scroll Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the landing's four story sections as Editions-style pinned chapters (desktop) with a lively no-pin motion tier (mobile), and reorder the page to Reviews → FAQ → Booking → Blog per the spec.

**Architecture:** `mockups/pinned-editions.html` is the **Absolute Reference** — it contains working, user-approved markup/CSS/JS for every behavior. Tasks port its blocks into the existing Astro components and the `src/scripts/motion/` system (GSAP + ScrollTrigger already installed; tier gating via `gsap.matchMedia()` per the existing pattern in `src/scripts/motion/pin.ts` / `tiers.ts`). No new libraries.

**Tech Stack:** Astro 5, GSAP 3 + ScrollTrigger (already a dependency — never CDN), existing i18n (`data-i18n` + `src/i18n/{th,en}.json`), vitest, `scripts/measure-viewport.mjs` for browser verification.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-03-editions-scroll-story-design.md` — governs everything below.
- Mockup wins conflicts: `mockups/pinned-editions.html` (on disk, gitignored — READ IT before each task; adapt paths `../public/images/…` → `/images/…`).
- JS budget: all client chunks ≤ **240KB gzip** total, measured fresh from `npm run build` output (`gzip -c dist/client/_astro/*.js | wc -c` per chunk).
- Banned assets: `parallax/service/business/*` (taxi sign), `service-rental.webp`, `service-airport.webp`, `service-business.webp`, `route-huahin.webp` (baked-in text). Allowed: `parallax/hero`, `parallax/airport`, `parallax/trust`, `parallax/service/rental`, `parallax/close`, `car1-4.webp`, `service-van-hero.webp`, `service-charter-hero.webp`, `review-*.webp`, `hero-bg.travelv1-baseline.webp`.
- Do NOT touch: `src/components/Hero.astro`, `src/components/BookingForm.astro` internals, JSON-LD/meta in `Base.astro`/`index.astro` heads, `src/scripts/motion/hero-depth.ts`.
- Desktop tier gate: `(min-width: 1024px) and (not (prefers-reduced-motion: reduce))` — NEVER the broken `… and not all and (…)` form (regression-tested).
- Mobile tier gate: `(max-width: 1023px) and (not (prefers-reduced-motion: reduce))`.
- Reduced motion / JS disabled: full static layout, zero hidden elements.
- Every new user-facing string: Thai first, EN key in `src/i18n/en.json`, wired via `data-i18n`. Before each commit run the thai-natural-copy check: `grep -nE "หมู่คณะ|ยานพาหนะ|ทำการ[จชสด]|ดำเนินการ|เริ่มต้นการใช้งาน|ตอบโจทย์|โซลูชั่น|เหนือระดับ" <changed files>` → must be empty.
- All 72 existing vitest tests stay green after every task; new motion modules get unit tests in the same style as `src/scripts/motion/*.test.ts` files (see `npx vitest list` for naming).
- Commits per task with the message given in the task; trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Preview for measurement: `npm run build && npm run preview` serves :4321 (output lands in `dist/client/`).

## File Structure

- `src/pages/index.astro` — section order + new imports (T1)
- `src/components/StickyCta.astro` — new floating CTA (T1)
- `src/components/sections/BlogTeaser.astro` — new 3-card blog strip w/ covers (T1)
- `src/components/sections/IntroStory.astro` — new Chapter 0, replaces `Services.astro` usage (T2)
- `src/components/sections/Fleet.astro` — Chapter 1 rework (T3)
- `src/components/sections/How.astro` — Chapter 2 rework incl. mobile blocks (T4)
- `src/components/sections/Routes.astro` — Chapter 3 rework (T5)
- `src/components/sections/Reviews.astro` + `StaticReviews.astro` — slider (T6)
- `src/scripts/motion/editions.ts` — desktop chapter timelines (T2-T5 add stages here; created T2)
- `src/scripts/motion/mobile-lite.ts` — mobile drift + bouncy reveals + slider drift (T6/T7)
- `src/scripts/motion/index.ts` — register the two new modules inside the correct matchMedia blocks
- `src/i18n/th.json` + `src/i18n/en.json` — new keys per task

---

### Task 1: Page order, StickyCta, BlogTeaser

**Files:**
- Modify: `src/pages/index.astro:42-65` (section order)
- Create: `src/components/StickyCta.astro`
- Create: `src/components/sections/BlogTeaser.astro`
- Modify: `src/i18n/th.json`, `src/i18n/en.json` (keys `sticky.cta`, `blogteaser.*`)

**Interfaces:**
- Produces: main order `Hero, IntroStoryPlaceholder(Services for now), Fleet, How, Routes, Reviews, Faq, Booking, BlogTeaser, Cta` — T2 swaps Services→IntroStory. StickyCta markup `<a id="sticky-cta" class="sticky-cta" href="#booking">`; JS visibility comes in T7 (until then CSS `.sticky-cta{}` hidden by default is acceptable only if a no-JS fallback keeps it hidden — it starts `opacity:0;pointer-events:none` per mockup, which satisfies that).
- Consumes: `src/lib/blog-api.ts` — read it first; use its existing fetch/list function for the 3 latest posts at build/render time following how `src/pages/blog/index.astro` does it, incl. its error fallback pattern. Cover image field: whatever the blog index page uses; fallback when absent = `<div class="cover cover-fallback"><span class="tag">{category}</span></div>` with `background:var(--bg-secondary)`.

- [ ] Step 1: Reorder `index.astro` main to: `<Hero/> <Stats/> <Services/> <Routes/> <Fleet/> <How/> <Why/> [reviews section] <Faq/> <Booking/> <BlogTeaser/> <Cta/> <StickyCta/>` — i.e. Booking moves from position 2 to after Faq; BlogTeaser new after Booking. (Chapter reordering to spec order Services→Fleet→How→Routes happens naturally since those are already adjacent; put them in spec order now: `Services, Fleet, How, Routes`.)
- [ ] Step 2: Create `StickyCta.astro` — port `.sticky-cta` markup+CSS from the mockup verbatim (scoped `<style>`), text `ขอใบเสนอราคา` with `data-i18n="sticky.cta"`.
- [ ] Step 3: Create `BlogTeaser.astro` — port the mockup's `.blog` section (head + `.blog-grid` + `.blog-card` with `.cover`) with real posts from blog-api (max 3, newest). Section heading `บทความ` / `วางแผนทริปให้ง่ายขึ้น`, link `ดูทั้งหมด →` to `/blog/`. If the API returns nothing (build offline), render nothing (empty section suppressed) — same behavior the blog index uses.
- [ ] Step 4: Add i18n keys to both json files (`sticky.cta`: "Get a quote"; `blogteaser.eyebrow/title/all` per mockup copy).
- [ ] Step 5: `npm test` (72 green) + `npm run build` clean + thai-copy grep clean.
- [ ] Step 6: Commit `feat(landing): reorder the page for conversion and add the sticky cta and blog teaser`.

### Task 2: Chapter 0 — IntroStory + editions.ts skeleton

**Files:**
- Create: `src/components/sections/IntroStory.astro`
- Create: `src/scripts/motion/editions.ts` + Test: `src/scripts/motion/editions.test.ts`
- Modify: `src/scripts/motion/index.ts` (register inside the full-tier mm.add block)
- Modify: `src/pages/index.astro` (swap `<Services/>` → `<IntroStory/>`; remove Services import)
- Modify: `src/i18n/{th,en}.json` (`intro.*` keys)

**Interfaces:**
- Produces: `applyEditionsPins(ctx)` exported from `editions.ts`, called from `index.ts` full-tier block; it queries `[data-chapter]` sections and builds each chapter's ScrollTrigger. `IntroStory.astro` root: `<section class="chapter intro-chapter" id="services" data-chapter="intro" data-chapter-len="420">` (keep `id="services"` so existing nav anchors keep working — check `Nav.astro` for the anchor it uses and match it).
- Consumes: mockup section `#intro` (markup/CSS) and its JS block "chapter 0 · hero → services transform" (phase A compress + phase B service stages) — port into `editions.ts` as `buildIntroChapter(section)`.

- [ ] Step 1: Write failing test `editions.test.ts`: `collectChapters(doc)` returns `[{name:'intro', len:420, el}]` for a fixture DOM with the section above; invalid/missing `data-chapter-len` falls back to 300 and clamps to [100,600]. (Mirror the parse/clamp test style of `pin.ts` tests.)
- [ ] Step 2: Run `npx vitest run src/scripts/motion/editions.test.ts` — FAIL (module missing).
- [ ] Step 3: Implement `editions.ts`: `collectChapters` + `applyEditionsPins` + `buildIntroChapter` (port mockup JS; images swap via `.svc-img` opacity/scale tweens; stage index from `st.progress` exactly as mockup). No `Date.now`, no timers — scrub-driven only, plus the discrete stage timeline pattern already used (mockup `fleetStage` style is allowed: tweens fired from `onUpdate` stage changes).
- [ ] Step 4: Component markup/CSS ported from mockup `#intro` + the mobile `<1024` overrides (photo band 46svh, copy anchored `top:46svh; transform:translateY(calc(-100% - 1.1rem))` — the fixed version, see mockup), all copy via `data-i18n="intro.*"`, service items link to `/airport-transfer/suvarnabhumi-bkk/`, `/charter/`, `/van/`, `#booking` respectively (real pages from the segment work).
- [ ] Step 5: Register in `index.ts` full tier; confirm no-JS: section renders photo + all four services visible (CSS default state must NOT hide anything without `.js-motion`).
- [ ] Step 6: `npm test` + build + `MEASURE_URL=http://localhost:4321/ node scripts/measure-viewport.mjs 1440 900 desktop none 'JSON.stringify({pins:document.querySelectorAll(".pin-spacer").length})'` → expect ≥4 (3 old + intro).
- [ ] Step 7: Commit `feat(landing): open the story with the hero-to-services transform chapter`.

### Task 3: Chapter 1 — Fleet rework

**Files:**
- Modify: `src/components/sections/Fleet.astro` (full body/CSS rework; keep the existing "choose this car → prefill booking" script contract at the bottom of the file — read it first, its selectors must keep working or be updated together)
- Modify: `src/scripts/motion/editions.ts` (+`buildFleetChapter`), test file (+stage-math cases)
- Modify: `src/i18n/{th,en}.json`

**Interfaces:**
- Produces: section root `<section class="chapter fleet-chapter" id="fleet" data-chapter="fleet" data-chapter-len="380">`. Car data stays in the Astro component as a `const CARS` array (name, ghost word, price, chips, img, vtype for booking prefill — vtypes must match `BookingForm.astro:301` map values).
- Consumes: mockup `#fleet` markup/CSS/JS (ghost layer, car layer, meta layer, rail, counter, directional stage swap) + mobile tabs variant (`.fleet-tabs`, tap to swap).

- [ ] Step 1: Port markup/CSS (desktop layers + rail + counter; mobile single card + numbered tabs). Static default = stage 0 fully rendered, others swapped by JS only — no-JS shows Alphard card complete.
- [ ] Step 2: `buildFleetChapter` in `editions.ts` ports the mockup stage logic incl. direction-aware exits; rail buttons scroll to `sectionTop + (i+0.5)/4 * len/100 * innerHeight`.
- [ ] Step 3: Extend the test: stage index for progress p with 4 stages = `min(3, floor(p*4))` — table-test 0, .24, .26, .5, .99.
- [ ] Step 4: Wire mobile tabs (plain JS in component script, same pattern as its existing script) calling the same stage-swap tween.
- [ ] Step 5: `npm test` + build + measure: fleet pin present, ghost word element exists, no horizontal overflow at 1440/390.
- [ ] Step 6: Commit `feat(landing): stage the fleet chapter in three depth layers`.

### Task 4: Chapter 2 — How rework (desktop collage + mobile step blocks)

**Files:**
- Modify: `src/components/sections/How.astro` (desktop collage + separate `.how-mobile` per-step blocks)
- Modify: `src/scripts/motion/editions.ts` (+`buildHowChapter`) and `src/scripts/motion/mobile-lite.ts` gets the `.hm-step` in/out timelines **in T7** — in this task the mobile blocks are static-visible.
- Modify: `src/i18n/{th,en}.json`

**Interfaces:**
- Produces: `<section class="chapter how-chapter" id="how" data-chapter="how" data-chapter-len="300">`; desktop images per step: `parallax/hero/color.webp`, `parallax/airport/color.webp`, `parallax/trust/color.webp` (spec asset rules — NOT service/business); `.hm-step` blocks carry the same three images.
- Consumes: mockup `#how` + `.how-mobile` markup/CSS; `buildHowChapter` ports numeral swap + image `.on` toggling + gold progress line.

- [ ] Step 1: Port desktop collage markup/CSS + step list (active step h3 1.15→1.5rem, pill tags) — all strings `data-i18n="how.*"`; step copy verbatim from mockup (already thai-natural-checked).
- [ ] Step 2: Port `.how-mobile` blocks + `<1024` CSS (`.how-grid{display:none}`), static (all visible, no animation yet).
- [ ] Step 3: `buildHowChapter` in editions.ts (stage = `min(2, floor(p*3))`, line height = `p*100%`). Extend the stage-math test for 3 stages.
- [ ] Step 4: `npm test` + build + measure both viewports: desktop `.how-media img.on` count 1; mobile `.hm-step` count 3 visible, `.how-grid` hidden.
- [ ] Step 5: Commit `feat(landing): stage the three booking steps as a photo collage chapter`.

### Task 5: Chapter 3 — Routes rework

**Files:**
- Modify: `src/components/sections/Routes.astro`
- Modify: `src/scripts/motion/editions.ts` (+`buildRoutesChapter`)
- Modify: `src/i18n/{th,en}.json`

**Interfaces:**
- Produces: `<section class="chapter routes-chapter" id="routes" data-chapter="routes" data-chapter-len="360">`, dark theme (`--bg-dark`), horizontal track of 4 cards. Card data/prices: read the CURRENT `Routes.astro` + `src/content/routes/*.yaml` and reuse its real figures — never type prices from memory. Card links: `/routes/bangkok-to-pattaya/`, `/routes/bangkok-to-hua-hin/`, `/airport-transfer/suvarnabhumi-bkk/`, `#booking`.
- Consumes: mockup `#routes` markup/CSS/JS (track x = `-p*(scrollWidth-clientWidth+64)`, per-card img `xPercent = p_card*10`, progress bar scaleX). Hua-Hin card image: `parallax/service/rental/color.webp` for now (route-huahin.webp banned — baked text); leave an HTML comment `<!-- TODO(asset): generate clean hua-hin scene via gen-media -->`.
- [ ] Step 1: Port markup/CSS (dark chapter chrome; mobile = scroll-snap row 84vw, `transform:none!important` guard).
- [ ] Step 2: `buildRoutesChapter` in editions.ts; no stage math — pure scrub sets.
- [ ] Step 3: `npm test` + build + measure: desktop track translates (evaluate mid-pin x < 0 via measure script after `ScrollTrigger.update()`), mobile row scrollable (scrollWidth > clientWidth), no page horizontal overflow either viewport.
- [ ] Step 4: Commit `feat(landing): send the routes chapter dark with a scroll-driven track`.

### Task 6: Reviews slider + wiring real data

**Files:**
- Modify: `src/components/sections/Reviews.astro` and `StaticReviews.astro` (same card/track classes so the server:defer fallback shares CSS)
- Create: `src/scripts/motion/mobile-lite.ts` (starts here with `startReviewDrift(track)`; T7 adds the rest) + Test: `src/scripts/motion/mobile-lite.test.ts`
- Modify: `src/scripts/motion/index.ts` (drift runs on ALL widths — it is not a pin; gate only on `(not (prefers-reduced-motion: reduce))`)

**Interfaces:**
- Produces: `.rev-track` with cloned card set for seamless loop; `startReviewDrift(track)` — rAF drift 0.45px/frame, `scrollLeft -= scrollWidth/2` wrap, pause on `pointerenter/touchstart/focusin`, resume on the mirror events; arrows `.rev-arrow[data-dir]` scroll by one card. MUST call `ScrollTrigger.refresh()` is NOT needed (no pin), but the `server:defer` island swap re-runs cloning — listen for Astro's island hydration (`astro:after-swap` is view-transitions-only; instead run init from a `MutationObserver` on the reviews container or re-init after the island replaces the fallback — read how `Reviews.astro` server:defer currently signals readiness and hook there; the existing STATE doc notes `ScrollTrigger.refresh()` on island load was already needed once — same hook point).
- Consumes: real reviews from the existing `Reviews.astro` data source (`src/lib/reviews-api.ts`); card layout from mockup `.rev-card` (photo + quote + name·occasion). Mockup quotes are placeholders — NEVER ship them; render API fields.

- [ ] Step 1: Test `mobile-lite.test.ts`: `startReviewDrift` pauses on pointerenter and resumes on pointerleave (jsdom + fake rAF, style matching existing motion tests); wrap math: given scrollWidth 1000/clientWidth 400, scrollLeft 501 wraps to 1.
- [ ] Step 2: Run test — FAIL. Implement. PASS.
- [ ] Step 3: Rework both review components to the mockup card/track markup, arrows, cloning; reduced-motion: no drift (gate at module registration), manual scroll + arrows still work.
- [ ] Step 4: `npm test` + build + measure 1440+390: track present, drift moves scrollLeft after 1s (evaluate twice), pauses under `Emulation.setEmulatedMedia prefers-reduced-motion` if scriptable — otherwise assert module not registered by checking a `data-drift="on"` attribute set only when active.
- [ ] Step 5: Commit `feat(landing): let the reviews drift in a seamless loop`.

### Task 7: Mobile motion tier + StickyCta behavior

**Files:**
- Modify: `src/scripts/motion/mobile-lite.ts` (+`applyMobileLite(ctx)`), test file
- Modify: `src/scripts/motion/index.ts` (register in a NEW mm.add block `(max-width: 1023px) and (not (prefers-reduced-motion: reduce))`; StickyCta trigger registers in BOTH tiers' blocks)

**Interfaces:**
- Consumes: mockup JS blocks "mobile motion tier" and "sticky CTA" and the `.hm-step` bouncy timelines. Selectors: drift `[data-drift-img]` (add the attribute in the components from T2/T4/T1 to intro photo, how-mobile imgs, blog covers — this task adds those attributes), reveals `.svc,.route-card,.rev-card,.blog-card,.fleet-meta,.ch-head,.faq-item`, numerals `.svc .n`.
- Produces: `applyMobileLite` building: image drift (`scale:1.15`, `yPercent -amt→amt` scrub), bouncy reveals (`back.out(1.8)`, once), `.svc .n` pop (`back.out(3)`), `.hm-step` in/out timelines (img `x:44,rotate:1.2→0 power3.out`; numeral `elastic.out(1,0.45)`; body children stagger `back.out(2.2)`; play/reverse on enter/leave both directions); `initStickyCta()` — show after `#services` (intro) `top -30%`, hide at `#booking top 70%`.

- [ ] Step 1: Tests: `applyMobileLite` creates one ScrollTrigger per `.hm-step` (3 in fixture); reveal targets get `once:true`; reduced-motion path = module never registered (assert via registration guard unit, same as tiers tests).
- [ ] Step 2: FAIL → implement → PASS.
- [ ] Step 3: `npm test` + build + measure 390x844: scroll down 2 viewports, `.hm-step` first block opacity 1 & second still 0 before reaching it; sticky CTA `.show` class present mid-page, absent at top and at `#booking`.
- [ ] Step 4: Disable-JS check both viewports: `Emulation.setScriptExecutionDisabled` → count elements with computed opacity 0 or visibility hidden inside main = 0.
- [ ] Step 5: Commit `feat(landing): give mobile its own lively motion tier`.

### Task 8: Full verification + docs

**Files:**
- Modify: `docs/superpowers/plans/2026-07-27-landing-redesign-STATE.md` (new section for this branch)

- [ ] Step 1: `npm test` full suite; `npm run build`; gzip-sum every `dist/client/_astro/*.js` — total ≤ 240KB; record numbers.
- [ ] Step 2: Browser pass at 1440x900: each chapter pins in order, stage counts (intro 4 services, fleet 4 cars, how 3 steps, routes 4 cards), release gap 0px to next section (compare boundingRect bottoms), page order Reviews→Faq→Booking→BlogTeaser, sticky CTA lifecycle, EN toggle sweep = 0 stuck-Thai `[data-i18n]` elements.
- [ ] Step 3: 390x844 pass: no pins (`.pin-spacer` count 0), hm-steps animate, snap rows scroll, no horizontal overflow, EN toggle sweep clean.
- [ ] Step 4: SEO regression: `grep -c 'application/ld+json' dist/client/index.html` unchanged vs before branch (4 blocks + Organization); meta description/OG intact (diff `<head>` against pre-branch build).
- [ ] Step 5: Update STATE doc with results; commit `docs(landing): record the editions scroll story verification`.
