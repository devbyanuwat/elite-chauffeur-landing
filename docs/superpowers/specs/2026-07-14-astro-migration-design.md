# Astro Migration — Elite Chauffeur Landing (design)

Date: 2026-07-14
Branch: `migrate/astro-v2` (off `main`)
Status: approved design, pending implementation plan

## Problem

The landing site (sabuygo.com) is five static marketing pages — `index.html` plus four
SEO subpages (`airport-transfer/suvarnabhumi-bkk`, `airport-transfer/don-mueang-dmk`,
`routes/bangkok-to-hua-hin`, `routes/bangkok-to-pattaya`). Each page inlines its own
copy of the nav, footer, `<head>`/SEO block, CSS design tokens, and i18n table. A single
nav or design-token edit costs >30 min across five duplicated files, and every new
airport/route page multiplies the copy-paste. This is the maintenance pain that triggers
the migration — not a need for new interactivity.

An earlier migration attempt (`migrate/astro-v1`, ran to "phase 10") is now ~18 commits
behind `main` and, critically, punted on the exact pain point: it kept the four SEO
subpages as raw static passthrough in `public/`, so their duplication was never solved.
That branch is kept as a reference blueprint only; it is not the base for this work.

## Goal & non-goals

Goal: eliminate cross-page duplication by componentizing the landing site in Astro, while
producing output that matches the current live design pixel-for-pixel.

Non-goals (explicitly out of scope):
- The `.impeccable` font/redesign (Anuphan / Bai Jamjuree Thai face, muted-gold refresh).
  This migration preserves the current live look exactly; visual redesign is a separate cycle.
- New interactive features (live pricing, multi-step booking). Behavior is ported as-is.
- Any change to the blog subsystem.

## Approach

Fresh migration from the current live `main`, using `migrate/astro-v1` as a blueprint for
component boundaries, i18n pattern, and Docker/nginx config — but re-extracting every
component from today's known-good HTML so the output matches the live design. This avoids
hand-reconciling two diverged designs (the risk of adopting the stale `astro-v1` branch).

## Stack

- Astro 5, `output: 'static'`, `trailingSlash: 'always'`, `build.format: 'directory'`.
- No UI framework. All components are `.astro`; interactivity is vanilla JS in scoped
  `<script>` blocks. This protects the near-zero-JS profile that carries the 93/100 SEO
  and Core Web Vitals scores.
- Plain CSS. Port the live design tokens and base styles into a single `global.css`;
  component-specific styles live in per-component scoped `<style>` blocks. No Tailwind
  (adopting it would mean rewriting every hand-tuned style and risking visual drift).
- `schema-dts` for typed JSON-LD.

## Components

Extracted from the live `index.html`:

- `layouts/Base.astro` — document shell: `<head>` (title, meta, canonical, OG, fonts),
  `lang` attribute, `global.css` import, JSON-LD slot, body wrapper. Per-page SEO fields
  passed as props.
- `Nav.astro`
- `Footer.astro`
- `Hero.astro` — hero background, eyebrow, headline.
- `ServiceTabs.astro` — service-type tabs (mobile 2x2 grid), vanilla JS.
- `BookingForm.astro` — date picker + 24h time as a 15-minute-slot dropdown, service
  select. Vanilla JS.
- Index content sections: fleet rail, services, reviews (three real customer photos),
  pricing, FAQ, CTA. Split into focused components where a section is non-trivial.
- `InquiryModal.astro` — booking submit to the BOS inquiry endpoint via `lib/bos.ts`.
- `CookieBanner.astro`
- `LineFab.astro` — floating LINE contact button.
- `JsonLd.astro` — typed JSON-LD emitter.

## Subpages — content collections

This is the fix `astro-v1` skipped. Two collections:

- `airports` — entries: `suvarnabhumi-bkk`, `don-mueang-dmk`.
- `routes` — entries: `bangkok-to-hua-hin`, `bangkok-to-pattaya`.

Each entry is a data file (yaml/md frontmatter) holding the page's variable content:
display names, codes/distance, rate-card figures, copy blocks, image references, and the
fields needed for that page's JSON-LD. Templates `pages/airport-transfer/[slug].astro`
and `pages/routes/[slug].astro` render entries through the shared Base/Nav/Footer and
reuse `BookingForm`. Adding a fifth/sixth/seventh page becomes one data file — the
duplication pain is removed at the root.

## i18n

Reuse the `astro-v1` pattern: `src/i18n/th.json` + `src/i18n/en.json` with a
`src/lib/i18n.ts` helper. In-place client-side language toggle, a single URL per page,
`lang="th"` as default. This preserves both the current toggle behavior and the
one-URL-per-page SEO shape.

## Interactivity

All client behavior is vanilla JS in scoped `.astro <script>` blocks — no framework
runtime shipped. Interactive islands: language toggle, service tabs, booking date/time,
cookie banner, inquiry modal, LINE FAB.

## SEO (load-bearing — port exactly)

- Per-page `<title>`, meta description, canonical, and Open Graph tags via Base props.
- JSON-LD: `LimousineService` with `areaServed` and `sameAs` (matching the current
  main graph) emitted via `JsonLd.astro`. Subpage schema is built from collection data.
- Keep the hand-authored `sitemap.xml` in `public/` rather than auto-generating, to
  preserve the exact priority/changefreq signals behind the 93 score. `robots.txt` and
  `sitemap_index.xml` also move to `public/`.
- `privacy` becomes a real `.astro` page on Base (sharing nav/footer), not a passthrough.

## Blog — untouched

The blog stays external: BOS generates static HTML into a shared volume, and nginx serves
it at `/blog`. Astro never owns `/blog`. The nginx `location /blog` block is preserved.

## Deploy

Multi-stage Dockerfile: a node stage runs the Astro build, and an nginx stage serves the
built `dist/` plus the `/blog` volume. The `astro-v1` phase-9 `nginx.conf` and
`docker-compose.yml` are adapted as a blueprint (gzip, cache headers, trailing-slash
handling, blog location block).

## Acceptance gate

- `astro check` and `astro build` complete clean.
- All five pages resolve at the same trailing-slash URLs as live.
- Structural parity vs the live pages (key sections match; no dropped content).
- Lighthouse: performance and accessibility >=95, SEO >=90 (target: preserve 93).
- seo-drift baseline captured from live before migration, compared after — no regressions.
- All JSON-LD validates against schema.org; OG tags present; canonicals correct.
- Manual pass: language toggle, booking date/time, mobile viewport, LINE FAB, and cookie
  banner all function.

## Implementation phases (to be detailed by the plan)

1. Scaffold Astro 5 (static). Port live design tokens/base into `global.css`.
2. `Base` layout + `Nav` + `Footer` + head/SEO + i18n JSON and helper.
3. Index components (Hero, ServiceTabs, BookingForm, content sections, InquiryModal,
   CookieBanner, LineFab) from live `index.html`.
4. Content collections (`airports`, `routes`) + `[slug]` templates → four subpages.
5. `privacy.astro`; JSON-LD, hand-authored `sitemap.xml`, `robots.txt` into `public/`.
6. Multi-stage Dockerfile + nginx (with blog block) + docker-compose.
7. Verify against the acceptance gate: parity, Lighthouse, seo-drift, JSON-LD validation.
