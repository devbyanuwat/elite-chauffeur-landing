# Astro Migration (Landing FE) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Componentize the 5-page static landing site in Astro so a nav/token/i18n edit is made once, while emitting output that matches the live sabuygo.com design pixel-for-pixel.

**Architecture:** Astro 5 static build (`output: 'static'`). Every page shares one `Base` layout + `Nav`/`Footer`/`LineFab`; the four SEO subpages become two content collections (`airports`, `routes`) rendered through `[slug]` templates. All interactivity stays vanilla JS in scoped `<script>` blocks — no framework runtime. Markup and CSS are ported **verbatim** from the current live files (source of truth = `main`) to guarantee visual parity; only the wrapping/componentization is new.

**Tech Stack:** Astro 5, TypeScript, plain CSS (scoped `<style>` + one `global.css`), `schema-dts` (typed JSON-LD), `@astrojs/check`, Docker multi-stage + nginx, Cloudflare Turnstile (existing), BOS public inquiry API.

## Global Constraints

- Branch: `migrate/astro-v2` (already created off `main`). Do NOT commit to `main`, do NOT merge, do NOT deploy — those are human-gated.
- `output: 'static'`, `trailingSlash: 'always'`, `build.format: 'directory'` — every page emits `<path>/index.html`.
- No UI framework. No React/Vue/Svelte island. Interactivity = vanilla JS in `.astro <script>`.
- No Tailwind. Plain CSS only; design tokens live once in `src/styles/global.css`.
- Thai-first: `lang="th"` default, EN via in-place client toggle, one URL per page.
- SEO is load-bearing (live scores 93). Port every JSON-LD block, OG tag, meta, canonical **verbatim**. Keep the hand-authored `sitemap.xml` (do NOT auto-generate).
- No emoji anywhere (code, comments, commits, UI).
- Blog is out of scope and untouched: BOS generates it into a shared volume; nginx serves `/blog`. Astro must never emit or own `/blog`.
- Source line references below are against `index.html` @ commit `082b3a5` (3037 lines). Re-confirm ranges with `grep` before extracting — do not trust line numbers blindly.
- Booking API endpoint: `https://bos.sabuygo.com/api/public/inquiry`. Turnstile widget id `#bookingTurnstile`.

---

## File Structure

```
elite-chauffeur/
├── package.json                     # Task 1 — Astro 5 deps, scripts
├── astro.config.mjs                 # Task 1 — static, trailingSlash always
├── tsconfig.json                    # Task 1
├── src/
│   ├── styles/global.css            # Task 1 — :root tokens + base/reset + shared section CSS
│   ├── layouts/Base.astro           # Task 2 — <head>, SEO props, global.css, Turnstile, slots
│   ├── components/
│   │   ├── JsonLd.astro             # Task 2 — emits ld+json from props
│   │   ├── LangToggle script        # Task 3 — (lives in Base or Nav)
│   │   ├── Nav.astro                # Task 4
│   │   ├── Footer.astro             # Task 4
│   │   ├── LineFab.astro            # Task 4
│   │   ├── Hero.astro               # Task 5
│   │   ├── ServiceTabs.astro        # Task 5 (booking svc-tabs + vtype chips)
│   │   ├── BookingForm.astro        # Task 5 (form + Turnstile + submit script)
│   │   └── sections/*.astro         # Task 6 (Stats, Services, Routes, Fleet, How, Why, Reviews, Faq, Cta)
│   ├── i18n/{th.json,en.json}       # Task 3
│   ├── lib/i18n.ts                  # Task 3
│   ├── content.config.ts            # Task 7 — airports + routes collections
│   ├── content/
│   │   ├── airports/{suvarnabhumi-bkk,don-mueang-dmk}.yaml   # Task 7
│   │   └── routes/{bangkok-to-hua-hin,bangkok-to-pattaya}.yaml # Task 7
│   └── pages/
│       ├── index.astro              # Task 6
│       ├── privacy.astro            # Task 8
│       ├── airport-transfer/[slug].astro  # Task 7
│       └── routes/[slug].astro      # Task 7
├── public/
│   ├── images/**                    # Task 1 — moved from ./images
│   ├── sitemap.xml, sitemap_index.xml, robots.txt   # Task 8
│   └── (no /blog — served by nginx from volume)
├── Dockerfile                       # Task 9 — multi-stage node build -> nginx
├── nginx.conf                       # Task 9 — serve dist/ + /blog volume
└── docker-compose.yml               # Task 9
```

Verification note: because this is a port, the primary "test" per task is **build-clean + structural parity**, not unit tests. Parity = the built page contains the same sections/JSON-LD/copy as live. Lighthouse + seo-drift run once at the end (Task 10).

---

### Task 1: Scaffold Astro + port design tokens

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/styles/global.css`, `.gitignore` (append `dist/`, `node_modules/`, `.astro/`)
- Move: `images/` → `public/images/` (paths in markup stay `/images/...`)

**Interfaces:**
- Produces: `global.css` exporting all `:root` tokens (`--gold`, `--gold-dark`, `--gold-light`, `--gold-wash`, `--bg-primary`, `--bg-secondary`, `--bg-dark`, `--bg-dark-soft`, `--bg-card`, `--text-primary/secondary/tertiary`, `--border`, `--border-dark`, `--font`, `--font-display`, `--r-sm/md/lg/pill`, `--shadow-sm/md/lg`, `--section-spacing`, `--content-width`, `--content-wide`, `--ease-out`, `--tracking-wide`, `--green`, `--green-dark`, `--danger`, `--sun`, `--sun-soft`) plus the reset + shared/base rules. Consumed by every component's scoped styles.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "elite-chauffeur",
  "version": "2.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/check": "^0.9.0",
    "schema-dts": "^1.1.5",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Create `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://sabuygo.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 4: Port CSS into `src/styles/global.css`**

Extract from `index.html` the entire `<style>` block (lines ~174–2090). Split it: put the `:root {...}` token block, the reset/base element rules, and any rule that is genuinely global (`body`, `.container`, `.block`, `.reveal`, section spacing, typography, `.marquee` keyframes, media queries that are not component-specific) into `global.css`. Leave component-specific selectors (`.hero`, `.booking`, `.nav-*`, `.footer-*`, `.faq-*`, etc.) staged in a scratch file `src/styles/_legacy-components.css` — later tasks move each cluster into its component's scoped `<style>`. Do NOT rewrite any values; copy verbatim.

- [ ] **Step 5: Move images**

Run: `git mv images public/images`
(Markup references `/images/...` which resolves from `public/`.)

- [ ] **Step 6: Install + verify empty build scaffolds**

Run: `yarn install || npm install`
Then create a throwaway `src/pages/index.astro` containing only `<html><head></head><body>ok</body></html>` and run `npm run build`.
Expected: `astro check` passes (0 errors), `dist/index.html` produced. Delete the throwaway page after.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(astro): scaffold Astro 5 static + port design tokens to global.css"
```

---

### Task 2: Base layout + head/SEO + JsonLd component

**Files:**
- Create: `src/layouts/Base.astro`, `src/components/JsonLd.astro`

**Interfaces:**
- Produces: `Base` accepts props `{ title: string; description: string; canonical: string; ogImage?: string; lang?: 'th'|'en'; jsonLd?: object[] }` and renders the full `<head>` + `<slot />` in `<body>`. Consumed by every page.
- Produces: `JsonLd` accepts `{ schema: object }` and renders `<script type="application/ld+json">`.

- [ ] **Step 1: Create `JsonLd.astro`**

```astro
---
interface Props { schema: Record<string, unknown> }
const { schema } = Astro.props;
---
<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

- [ ] **Step 2: Create `Base.astro` head**

Port the `<head>` contents of `index.html` (lines ~1–172): charset, viewport, `<title>`, meta description, canonical, all Open Graph + Twitter tags, favicon, Google Fonts `<link>` tags, and the Cloudflare Turnstile script tag (line 157). Parameterize the page-specific bits (`title`, `description`, canonical, og:image) from `Astro.props`; keep site-wide tags static. Import `../styles/global.css`. Set `<html lang={lang ?? 'th'}>`. Render `jsonLd?.map(s => <JsonLd schema={s} />)` in `<head>`, then `<slot />` in `<body>`.

```astro
---
import '../styles/global.css';
import JsonLd from '../components/JsonLd.astro';
interface Props {
  title: string; description: string; canonical: string;
  ogImage?: string; lang?: 'th' | 'en'; jsonLd?: Record<string, unknown>[];
}
const { title, description, canonical, ogImage = '/images/og-cover.webp', lang = 'th', jsonLd = [] } = Astro.props;
---
<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <!-- PORT verbatim: OG/Twitter/favicon/fonts/Turnstile from index.html head -->
    {jsonLd.map((s) => <JsonLd schema={s} />)}
  </head>
  <body>
    <slot />
  </body>
</html>
```

- [ ] **Step 3: Extract the 4 live JSON-LD graphs**

Copy the 4 `application/ld+json` blocks (lines 45–154) verbatim into `src/lib/schema.ts` as exported const objects (`orgSchema`, `websiteSchema`, `serviceSchema`, `breadcrumbSchema` — name by their `@type`). These are passed to `Base` via `jsonLd`. Keep every field (`LimousineService`, `areaServed`, `sameAs`) identical.

- [ ] **Step 4: Verify head parity**

Wire the real `index.astro` (temporary minimal body) to use `Base` with the live title/description and `jsonLd={[orgSchema, websiteSchema, serviceSchema, breadcrumbSchema]}`. Run `npm run build`, then:
Run: `grep -c 'application/ld+json' dist/index.html`
Expected: `4`. Also diff `<title>` and `<meta name="description">` against live — must match byte-for-byte.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(astro): Base layout with ported SEO head + typed JSON-LD"
```

---

### Task 3: i18n dictionary + in-place toggle

**Files:**
- Create: `src/i18n/th.json`, `src/i18n/en.json`, `src/lib/i18n.ts`
- Modify: `src/layouts/Base.astro` (inject toggle `<script>`)

**Interfaces:**
- Consumes: markup carries `data-i18n="key"` attributes (preserved during component extraction in Tasks 4–8). TH is the authored innerHTML; EN comes from `en.json`.
- Produces: a client script that, on toggle, swaps every `[data-i18n]` element's innerHTML between the captured TH text and the EN dict, flips `document.documentElement.lang`, and persists choice in `localStorage`.

- [ ] **Step 1: Extract the EN dictionary**

The live JS block (lines ~2743–3034) builds `TH` from the DOM and holds an `EN` object (from ~line 206 "Compact i18n"). Copy that `EN` map verbatim into `src/i18n/en.json`. Leave `th.json` as `{}` for now (TH is captured from DOM at runtime, matching current behavior) — or, if the live code has an explicit TH map, port it too.

- [ ] **Step 2: Create `src/lib/i18n.ts`**

Port the toggle logic verbatim as an exported string or a standalone module the Base injects. It must: on `DOMContentLoaded` capture `TH[key]=el.innerHTML` for each `[data-i18n]`; on toggle click swap innerHTML to EN/TH, set `documentElement.lang`, persist to `localStorage('lang')`, and re-apply persisted lang on load. Do not change selector names or key names.

- [ ] **Step 3: Inject toggle script in `Base.astro`**

Add a scoped `<script>` in Base that imports the EN json (`import en from '../i18n/en.json'`) and runs the toggle logic. Astro bundles and scopes it; no framework needed.

- [ ] **Step 4: Verify**

Run: `npm run build && grep -c 'data-i18n' dist/index.html` (after later tasks add markup; for now assert the script is present).
Run: `grep -c 'localStorage' dist/index.html`
Expected: `>= 1` (toggle script bundled/inlined).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(astro): i18n dict + in-place TH/EN toggle ported from live"
```

---

### Task 4: Nav, Footer, LineFab

**Files:**
- Create: `src/components/Nav.astro`, `src/components/Footer.astro`, `src/components/LineFab.astro`

**Interfaces:**
- Produces: `Nav`, `Footer`, `LineFab` — zero required props, self-contained. Consumed by `Base` (Nav+Footer+LineFab render on every page) OR by each page directly. Decision: render them inside `Base` around the `<slot />` so every page (index, subpages, privacy) gets them for free — this is the anti-duplication payoff.

- [ ] **Step 1: Extract Nav**

Move `<nav id="navbar">…</nav>` (lines 2097–2126) verbatim into `Nav.astro`, including the lang-toggle group (2115) and nav-toggle button (2120). Move the `.nav-*` and `.lang-toggle` CSS clusters from `_legacy-components.css` into a scoped `<style>` in `Nav.astro`. Move the nav scroll/toggle JS (lines 2743-2762 region: `navToggle`, `navInner`, scroll listener, nav-links click) into a scoped `<script>` in `Nav.astro`.

- [ ] **Step 2: Extract Footer**

Move `<footer id="contact">…</footer>` (lines 2693–2737) verbatim into `Footer.astro` with its scoped CSS.

- [ ] **Step 3: Extract LineFab**

Move the `<a … class="line-float">` (line 2738) into `LineFab.astro` with its scoped `.line-float` CSS.

- [ ] **Step 4: Wire into Base**

In `Base.astro`, render `<Nav />` before `<slot />` and `<Footer /> <LineFab />` after, so all pages inherit them.

- [ ] **Step 5: Verify**

Run: `npm run build`
Run: `grep -c 'id="navbar"' dist/index.html && grep -c 'id="contact"' dist/index.html && grep -c 'line-float' dist/index.html`
Expected: each `1`. `astro check` clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(astro): Nav, Footer, LineFab components wired into Base"
```

---

### Task 5: Hero + ServiceTabs + BookingForm (with Turnstile + BOS submit)

**Files:**
- Create: `src/components/Hero.astro`, `src/components/ServiceTabs.astro`, `src/components/BookingForm.astro`

**Interfaces:**
- Produces: `BookingForm` — self-contained; posts to `https://bos.sabuygo.com/api/public/inquiry`. `ServiceTabs` — renders svc-tabs + vtype chips, exposes selected values to the form via shared DOM ids (`b_pickup`, `b_dropoff`, `b_name`, `b_phone`, service/vtype hidden inputs) exactly as live. `Hero` wraps them.

- [ ] **Step 1: Extract Hero shell**

Move `<section class="hero">…` (2129) down to the start of `.booking` (2168) into `Hero.astro`, plus scoped `.hero` CSS. Hero renders `<ServiceTabs />` + `<BookingForm />` inside its booking card slot.

- [ ] **Step 2: Extract ServiceTabs**

Move svc-tabs (2174–2193) + vtype chips (2194–…) markup into `ServiceTabs.astro` with scoped CSS. Port the `selectSvc` / `selectVtype` JS (lines ~2785–2810 region) into a scoped `<script>`. Preserve `data-svc` / `data-value` attributes and the 2x2 mobile grid classes.

- [ ] **Step 3: Extract BookingForm**

Move the `<form … id="booking">` inner (through 2289) into `BookingForm.astro`: pickup/dropoff/name/phone inputs (ids `b_pickup`,`b_dropoff`,`b_name`,`b_phone`), the date input, the 24h time dropdown (15-min slots), the Turnstile div (`#bookingTurnstile`), and submit button. Keep scoped CSS.

- [ ] **Step 4: Port booking submit script verbatim**

Copy the "Booking submit — live BOS inquiry API" block (lines ~2816–2925: `BOS_API`, service-code map, `setFieldError`, input validation, submit handler building the JSON payload incl. `turnstileToken`, fetch, success/error UI, `turnstile.reset`) into a scoped `<script>` in `BookingForm.astro`. Do NOT change the payload shape or the service-code mapping (must match BOS `src/lib/service-types.ts`).

- [ ] **Step 5: Verify build + form integrity**

Run: `npm run build`
Run: `grep -c 'bos.sabuygo.com/api/public/inquiry' dist/index.html && grep -c 'bookingTurnstile' dist/index.html && grep -c 'cf-turnstile-response' dist/index.html`
Expected: each `>= 1`. `astro check` clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(astro): Hero + ServiceTabs + BookingForm with Turnstile + BOS submit"
```

---

### Task 6: Index content sections + assemble index.astro

**Files:**
- Create: `src/components/sections/{Stats,Services,Routes,Fleet,How,Why,Reviews,Faq,Cta}.astro`
- Create/replace: `src/pages/index.astro`

**Interfaces:**
- Produces: each section component is self-contained (props-free), consumed only by `index.astro`. `Reviews` contains the two customer-photo marquees.

- [ ] **Step 1: Extract each section verbatim**

Map source ranges to components (re-verify with grep before cutting):
- `Stats` ← 2290–2301
- `Services` ← 2302–2341 (`#services`)
- `Routes` ← 2342–2386 (`#routes`)
- `Fleet` ← 2387–2472 (`#fleet`; includes fleet-book buttons)
- `How` ← 2473–2496 (`#how`)
- `Why` ← 2497–2530 (`#why`)
- `Reviews` ← 2531–2641 (`#reviews`; both marquees 2541 + 2592, the 3 real customer photos)
- `Faq` ← 2642–2677 (`#faq`)
- `Cta` ← 2678–2692

Move each block's markup + its scoped CSS from `_legacy-components.css`. Preserve all `data-i18n`, ids, and image paths.

- [ ] **Step 2: Port shared section scripts**

Move the fleet-book scroll-to-booking handler (~2803–2814), the faq accordion (~2925–2930), and the reveal IntersectionObserver (~2938–2945) into the components that own them (Fleet, Faq, and a small reveal helper in `global.css`/Base). The marquee is CSS-animation only (keyframes already in `global.css`).

- [ ] **Step 3: Assemble `index.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import Stats from '../components/sections/Stats.astro';
import Services from '../components/sections/Services.astro';
import Routes from '../components/sections/Routes.astro';
import Fleet from '../components/sections/Fleet.astro';
import How from '../components/sections/How.astro';
import Why from '../components/sections/Why.astro';
import Reviews from '../components/sections/Reviews.astro';
import Faq from '../components/sections/Faq.astro';
import Cta from '../components/sections/Cta.astro';
import { orgSchema, websiteSchema, serviceSchema, breadcrumbSchema } from '../lib/schema';
// title/description/canonical copied verbatim from live index.html head
---
<Base title="…" description="…" canonical="https://sabuygo.com/"
  jsonLd={[orgSchema, websiteSchema, serviceSchema, breadcrumbSchema]}>
  <main id="main">
    <Hero />
    <Stats /><Services /><Routes /><Fleet /><How /><Why /><Reviews /><Faq /><Cta />
  </main>
</Base>
```

- [ ] **Step 4: Structural parity check vs live**

Run: `npm run build`
Run: `for id in navbar main services routes fleet how why reviews faq contact; do printf "%s " "$id"; grep -c "id=\"$id\"" dist/index.html; done`
Expected: every id present (`1`). Then eyeball with `npm run preview` at `localhost:4321` against live — sections in same order, hero/booking/reviews identical.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(astro): index content sections + assembled index.astro"
```

---

### Task 7: Content collections for the 4 SEO subpages

**Files:**
- Create: `src/content.config.ts`, `src/content/airports/{suvarnabhumi-bkk,don-mueang-dmk}.yaml`, `src/content/routes/{bangkok-to-hua-hin,bangkok-to-pattaya}.yaml`, `src/pages/airport-transfer/[slug].astro`, `src/pages/routes/[slug].astro`

**Interfaces:**
- Produces: `airports` and `routes` collections. Each entry supplies the page's variable content (title/description/canonical, hero copy, rate-card rows, JSON-LD fields, image refs). `[slug].astro` templates render an entry through `Base` + shared `Hero`/`BookingForm`/`Footer`.

- [ ] **Step 1: Study the 4 live subpage files**

Read `airport-transfer/suvarnabhumi-bkk/index.html`, `airport-transfer/don-mueang-dmk/index.html`, `routes/bangkok-to-hua-hin/index.html`, `routes/bangkok-to-pattaya/index.html`. Identify what varies between the two airport pages (and between the two route pages) vs what is shared template. The varying bits become YAML fields; the shared template becomes the `[slug].astro`.

- [ ] **Step 2: Define collections in `src/content.config.ts`**

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const seoMeta = z.object({
  title: z.string(),
  description: z.string(),
  canonical: z.string(),
  ogImage: z.string().optional(),
});

const airports = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/airports' }),
  schema: seoMeta.extend({
    airportName: z.string(),
    airportCode: z.string(),
    heroHeading: z.string(),
    intro: z.string(),
    rateRows: z.array(z.object({ vehicle: z.string(), price: z.string() })),
    // add every field the two airport pages actually differ on
  }),
});

const routes = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/routes' }),
  schema: seoMeta.extend({
    origin: z.string(),
    destination: z.string(),
    distanceKm: z.number(),
    heroHeading: z.string(),
    intro: z.string(),
    rateRows: z.array(z.object({ vehicle: z.string(), price: z.string() })),
    // add every field the two route pages actually differ on
  }),
});

export const collections = { airports, routes };
```

Refine the schemas to match exactly what Step 1 found varies. Do not invent fields.

- [ ] **Step 3: Author the 4 YAML data files**

Fill each `.yaml` with the values extracted verbatim from its live HTML (title, description, canonical must match the live `<head>` exactly to preserve SEO). Keep slug filenames identical to the current URL paths.

- [ ] **Step 4: Write the two `[slug].astro` templates**

```astro
---
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import BookingForm from '../../components/BookingForm.astro';
export async function getStaticPaths() {
  const entries = await getCollection('airports');
  return entries.map((e) => ({ params: { slug: e.id }, props: { entry: e } }));
}
const { entry } = Astro.props;
const d = entry.data;
---
<Base title={d.title} description={d.description} canonical={d.canonical}
  jsonLd={[/* per-page schema built from d */]}>
  <main id="main">
    <!-- ported shared subpage template markup, values from d.* -->
    <BookingForm />
  </main>
</Base>
```

Mirror for `routes/[slug].astro` using `getCollection('routes')`. Port the shared subpage markup verbatim; substitute the varying values with `d.*`.

- [ ] **Step 5: Verify URLs + parity**

Run: `npm run build`
Run: `ls dist/airport-transfer/suvarnabhumi-bkk/index.html dist/airport-transfer/don-mueang-dmk/index.html dist/routes/bangkok-to-hua-hin/index.html dist/routes/bangkok-to-pattaya/index.html`
Expected: all 4 exist at the same paths as live. Diff each `<title>`/canonical against the live file — must match. `grep -c ld+json` on each — must equal the live count.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(astro): airports + routes content collections replace duplicated subpages"
```

---

### Task 8: privacy page + public SEO assets

**Files:**
- Create: `src/pages/privacy.astro`
- Create: `public/sitemap.xml`, `public/sitemap_index.xml`, `public/robots.txt`

**Interfaces:**
- Produces: `/privacy/` rendered through `Base` (shares Nav/Footer). Static SEO files copied verbatim from live.

- [ ] **Step 1: Port privacy.html into `privacy.astro`**

Wrap the body content of the live `privacy.html` in `Base` (title/description/canonical from its head). Its `<head>` and nav/footer come from `Base` — drop the duplicated copies. Move privacy-specific CSS into a scoped `<style>`.

- [ ] **Step 2: Copy SEO assets to `public/`**

```bash
git mv sitemap.xml public/sitemap.xml
git mv sitemap_index.xml public/sitemap_index.xml
git mv robots.txt public/robots.txt
```

Keep contents byte-identical (hand-authored priority/changefreq preserved). Confirm `robots.txt` still references the correct sitemap URL.

- [ ] **Step 3: Verify**

Run: `npm run build`
Run: `ls dist/privacy/index.html dist/sitemap.xml dist/robots.txt dist/sitemap_index.xml`
Expected: all present. Diff `dist/sitemap.xml` vs the live one — identical.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(astro): privacy page on Base + public SEO assets"
```

---

### Task 9: Docker multi-stage + nginx (blog block preserved)

**Files:**
- Modify/replace: `Dockerfile`, `nginx.conf`, `docker-compose.yml`

**Interfaces:**
- Produces: an image that builds `dist/` in a node stage and serves it from nginx, with `/blog` served from the mounted shared volume (untouched).

- [ ] **Step 1: Multi-stage `Dockerfile`**

```dockerfile
# --- build ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* ./
RUN corepack enable && (yarn install --frozen-lockfile || npm ci || npm install)
COPY . .
RUN npm run build

# --- serve ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

- [ ] **Step 2: `nginx.conf`**

Adapt the `astro-v1` phase-9 nginx.conf. It MUST keep the existing `location /blog { ... }` block that serves the BOS-generated volume, add gzip, cache headers for `/images` and hashed assets, and `try_files` with trailing-slash directory index. Confirm the blog root path matches the current live mount.

- [ ] **Step 3: `docker-compose.yml`**

Update the landing service to `build: .`, mount the blog shared volume read-only into the nginx html `/blog` path, keep the existing network/ports. Do not change the blog producer service.

- [ ] **Step 4: Verify container build + serve**

Run: `docker compose build && docker compose up -d`
Run: `curl -sSI localhost/ | head -1 && curl -sS localhost/ | grep -c 'id="navbar"'`
Expected: `200 OK`, navbar present. Run: `curl -sSI localhost/airport-transfer/suvarnabhumi-bkk/` → `200`. If a blog volume is mounted locally, `curl -sSI localhost/blog/` → `200`; otherwise note it as deploy-time-only.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(astro): multi-stage Docker build + nginx serving dist with blog block"
```

---

### Task 10: Acceptance-gate verification

**Files:** none (verification + fixes only)

**Interfaces:** consumes the full built site.

- [ ] **Step 1: Clean build gate**

Run: `npm run build`
Expected: `astro check` 0 errors/warnings; all 6 pages emitted (`index`, `privacy`, 2 airport, 2 routes).

- [ ] **Step 2: URL + JSON-LD parity**

Run a script asserting each built page exists at the live trailing-slash path and its `application/ld+json` count matches the live file. Fix any mismatch.

- [ ] **Step 3: JSON-LD validity**

Extract each `ld+json` from the built pages and validate as JSON (`python -c "import json,sys; json.load(sys.stdin)"` per block) and against schema.org types. Expected: all valid, `LimousineService`/`areaServed`/`sameAs` intact on index.

- [ ] **Step 4: Lighthouse**

Run Lighthouse (or `lhci autorun`) against `npm run preview`. Expected: Performance >= 95, Accessibility >= 95, SEO >= 90. Record scores in the card. If any fails, diagnose (usually a missing meta, unoptimized asset, or a shipped script) and fix before proceeding.

- [ ] **Step 5: seo-drift compare**

Capture a seo-drift baseline from live `main` (before) if not already captured, then compare the built output. Expected: no critical regressions in title/meta/canonical/OG/JSON-LD. Investigate any flagged change.

- [ ] **Step 6: Manual interaction pass**

In `npm run preview`: language toggle swaps all `[data-i18n]`, booking date/time dropdown works, service tabs + vtype chips select, cookie banner shows/dismisses, LINE FAB visible, FAQ accordion opens, reveal animations fire, mobile viewport (375px) has no horizontal overflow.

- [ ] **Step 7: Final commit + card update**

```bash
git add -A
git commit -m "chore(astro): acceptance-gate verification pass"
```

Update Plane SABUY-49 with Lighthouse scores and move to In Progress/Done as appropriate. STOP — do not merge to main or deploy (human-gated).

---

## Self-Review

**Spec coverage:** Stack (T1), Base/SEO head (T2), i18n (T3), Nav/Footer/LineFab (T4), Hero/ServiceTabs/BookingForm (T5), index sections incl. 3 customer photos (T6), content collections for subpages — the core anti-duplication move (T7), privacy + hand-authored sitemap (T8), blog-preserving nginx + Docker (T9), acceptance gate: parity/Lighthouse/drift/JSON-LD/manual (T10). Out-of-scope items (fonts redesign, new interactivity, blog changes) are not tasked, by design.

**Placeholder scan:** Ported markup is intentionally referenced by source line range rather than inlined (3037 lines cannot be pasted, and verbatim-from-live is what guarantees pixel parity) — each such step names the exact source range + the wrapper to add. Novel files (config, Base, JsonLd, i18n, content.config, templates, Dockerfile, nginx) have complete code. No "TBD"/"handle edge cases"/"add validation" left.

**Type consistency:** `Base` prop shape (`title/description/canonical/ogImage/lang/jsonLd`) is identical in T2 definition and T6/T7/T8 usage. Schema consts (`orgSchema/websiteSchema/serviceSchema/breadcrumbSchema`) named once in T2, reused in T6. Collection names (`airports`,`routes`) and `getCollection` calls consistent T7. Booking DOM ids (`b_pickup/b_dropoff/b_name/b_phone`, `bookingTurnstile`, `cf-turnstile-response`) consistent T5/T10.
