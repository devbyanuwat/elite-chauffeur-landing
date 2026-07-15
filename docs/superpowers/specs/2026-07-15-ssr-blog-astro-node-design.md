# SSR Blog on Astro (Node standalone) — Design

Date: 2026-07-15
Repo: `elite-chauffeur` (landing) — with a cleanup phase in `elite-chauffeur-backoffice` (BOS).
Branch (proposed): `feat/ssr-blog`

## Goal

Make `/blog` a first-class part of the Astro landing: rendered live from the
BOS public API with Astro components, always current without a landing rebuild,
SEO-complete. Retire the fragile "BOS generates static HTML into a shared
volume that nginx serves" pipeline that currently 404s.

## Problem

`/blog` 404s on prod + dev. Root cause: the `blog_content` shared volume the
landing nginx serves is empty — publishing an article in BOS does not
auto-generate static HTML, and the SSG output only lands in the volume when the
manual "Regenerate" runs (and is coupled to a fragile cross-container/host
volume). The blog is also rendered by BOS's own HTML templates, so its styling
drifts from the Astro landing. Now that the landing is Astro, the blog should be
Astro-owned and data-driven.

## Decisions (locked in brainstorming)

- **D1 — SSR/hybrid via Node standalone.** Add `@astrojs/node` (mode
  `standalone`). Keep `output: 'static'`; opt only the blog routes into
  on-demand rendering with `export const prerender = false`. Marketing pages
  stay prerendered/static.
- **D2 — Deploy: full Node standalone, drop the landing's internal nginx.**
  The landing container runs the Astro Node server and serves everything
  (prerendered static + SSR blog). The edge `nginx-proxy-manager` (already in
  the stack, handles SSL/routing) stays in front. gzip + TLS terminate at the
  edge NPM; the header/junk-path hardening currently in `nginx.conf` moves to an
  Astro middleware.
- **D3 — Data: fetch the BOS public API, cache with TTL + stale-on-error.**
  `GET {BOS_PUBLIC_API}/api/public/articles` (list) and
  `/api/public/articles/{slug}` (single). Both already exist, return published
  rows only, and send `Access-Control-Allow-Origin: *`, so the SSR server can
  fetch them over the internet regardless of host colocation. A small in-memory
  TTL cache (≈60–300 s) fronts both; on a fetch failure the last good value is
  served (stale-on-error) rather than a 500.
- **D4 — Retire the old pipeline.** Remove the `blog_content` volume mounts
  (landing + BOS compose), and BOS's `src/lib/blog/generate.ts`,
  `scripts/generate-blog.ts`, `src/lib/blog/template.ts`, the
  `POST /api/articles/regenerate` route, and its "Regenerate" button — all
  obsolete once the SSR path is live.

## Architecture

### 1. Astro adapter + config

- Add dependency `@astrojs/node`.
- `astro.config.mjs`: `adapter: node({ mode: 'standalone' })`, keep
  `output: 'static'`, `site`, `trailingSlash: 'always'`, `build.format:
  'directory'`.
- Blog routes export `const prerender = false`; every other page stays static
  (default). The Node server serves the prerendered pages and renders the blog
  routes on demand.

### 2. BOS API client + cache — `src/lib/blog-api.ts` (new)

- Reads `BOS_PUBLIC_API` (e.g. `https://<bos-host>`), no trailing slash.
- `getArticles()` → `Article[]` (list shape: id, slug, title, excerpt,
  coverImageUrl, publishedAt, tags, authorName).
- `getArticle(slug)` → `ArticleFull | null` (adds body, seoTitle,
  seoDescription, etc.; `null` on 404).
- In-memory TTL cache keyed by `list` / `slug:<slug>`; TTL config (default
  120 s). On fetch throw/non-2xx: return the cached value if present
  (stale-on-error), else `[]` / `null`. This bounds BOS load and keeps `/blog`
  up if BOS blips.
- Typed `Article` / `ArticleFull` interfaces in `src/lib/blog-types.ts`.

### 3. Routes

- `src/pages/blog/index.astro` (`prerender = false`) — `getArticles()` →
  renders the listing (cards) via Astro components in the landing design.
  Empty-state ("ยังไม่มีบทความ") when zero. Wrapped in `Base.astro` for
  nav/footer/SEO.
- `src/pages/blog/[slug].astro` (`prerender = false`) — `getArticle(slug)`;
  if `null`, return Astro 404 (`Astro.response.status = 404` + a not-found
  view). Otherwise render the article: title, cover, meta (author/date/tags),
  and body via `set:html={article.body}` (BOS stores body as trusted
  admin-authored HTML — same as BOS's own `${body}` injection; no markdown
  parser needed). Per-article SEO through `Base.astro` (seoTitle/seoDescription
  → title/description/OG) plus an `Article` JSON-LD block.

### 4. Blog UI components — `src/components/blog/`

- `BlogCard.astro` — cover, title, excerpt, date/tags; links to
  `/blog/{slug}/`.
- Article typography: port the `.article-body` type scale (h2/h3/p/ul/ol/
  blockquote/pre spacing) from BOS `template.ts` into a scoped style on the
  article page or `global.css`, so `set:html` body content is styled
  consistently with the landing (charcoal/off-white/gold, humanist type).
- Reuse existing section/`.reveal` conventions and tokens; no new design
  language.

### 5. SEO

- Article page emits `<title>`/description/canonical/OG/Twitter via `Base.astro`
  and an `Article` JSON-LD (headline, datePublished, image, author) mirroring
  BOS's `template.ts` schema.
- Blog sitemap: add `src/pages/sitemap-blog.xml.ts` (`prerender = false`) that
  lists published article URLs from `getArticles()`; reference it from the main
  `sitemap.xml`. `/blog/` and articles use `trailingSlash: 'always'`.

### 6. Deploy — Node standalone

- **Dockerfile**: multi-stage `node build → astro build → node runtime`. Final
  stage runs `node ./dist/server/entry.mjs` on `HOST=0.0.0.0` `PORT=4321`
  (env). Base image `node:20-alpine`. Healthcheck hits `/`.
- Remove the landing's **internal** nginx stage and `nginx.conf` from the image
  (the edge `nginx-proxy-manager` remains the TLS/gzip/routing front).
- **docker-compose**: landing service exposes the Node port to the NPM network;
  drop the `blog_content:...:ro` mount; add `BOS_PUBLIC_API` (+ `PORT`/`HOST`)
  env. Same GHCR + Watchtower flow, image unchanged in name.
- **CI** (`deploy.yml`): unchanged trigger/flow; the Docker build now produces
  a Node image. (paths filter already covers `src/**`, `Dockerfile`, config.)

### 7. Header / hardening middleware — `src/middleware.ts` (new)

The current `nginx.conf` did three things beyond serving: security response
headers, junk-path defense (404 the `wp-admin`/`.php`/dotfile probes), and
long-cache headers for hashed `/_astro` assets. With nginx gone from the image,
reimplement in an Astro middleware:

- Set baseline security headers (`X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`/frame-ancestors, a conservative `Permissions-Policy`).
- Return 404 fast for the known junk paths (`/wp-*`, `*.php`, `/.env`, etc.).
- Long `Cache-Control: public, max-age=31536000, immutable` for
  `/_astro/*` hashed assets; short/no-cache for HTML.
- gzip/compression: rely on the edge NPM (or add a compression middleware if
  NPM compression is off — verify at deploy).

### 8. Retire old pipeline (cleanup phase, spans BOS)

Once SSR `/blog` is verified on dev:

- **Landing**: delete `nginx.conf`; remove `blog_content` volume + mount from
  `docker-compose.yml`.
- **BOS**: remove `src/lib/blog/generate.ts`, `src/lib/blog/template.ts`,
  `scripts/generate-blog.ts` (+ its package.json script), the
  `POST /api/articles/regenerate` route, the "Regenerate" button in the
  articles dashboard, and the `blog_content` volume + `BLOG_OUTPUT_DIR` from
  `docker-compose.bos.yml`. Keep the public read API (`/api/public/articles*`) —
  it is now the blog's data source.

## Cost / benefit

- Blog is always current (no rebuild-on-publish, no manual Regenerate), rendered
  by Astro components (no style drift), SEO-complete.
- Removes the fragile shared-volume + cross-host coupling that caused the 404.
- Trade-off: the landing image becomes a Node server (not pure static nginx);
  the blog depends on the BOS public API at request time — mitigated by the TTL
  cache + stale-on-error so a BOS blip does not take `/blog` down.

## Out of scope / follow-ups

- Pagination / tag-filtered blog index (start with a single list; add if the
  article count grows).
- On-demand revalidation webhook (BOS publish → purge landing cache) — the TTL
  makes it optional; add later if 1–5 min staleness is too slow.
- Rich sanitization of `body` (content is first-party admin HTML; revisit only
  if non-admin authorship is ever added).
- RSS feed.

## Risks

- **Deploy shape change is prod-affecting.** Dropping the internal nginx +
  switching to a Node server changes the container contract (port, process,
  headers). Must be verified on dev-web before prod. HARD-STOP on prod.
- **BOS public API availability** becomes a runtime dependency of `/blog`.
  Mitigated by cache + stale-on-error; a cold cache + BOS down = empty list /
  article 404 (acceptable, not a crash).
- **Header parity**: security/junk-path behavior currently in nginx.conf must be
  reproduced in middleware or verified at the NPM edge, or bot-noise/headers
  regress.

## Testing approach

- `blog-api.ts` cache: unit test TTL hit/miss + stale-on-error (mock fetch:
  success caches; subsequent failure returns cached; cold failure returns
  `[]`/`null`).
- `/blog` (dev, `astro dev` + a reachable BOS API or a stub): list renders
  published articles; empty-state when zero; `/blog/<slug>/` renders body +
  correct `<title>`/OG/JSON-LD; unknown slug → 404.
- Build: `astro build` produces `dist/server/entry.mjs`; `node
  ./dist/server/entry.mjs` serves `/` (static) and `/blog` (SSR) locally.
- Middleware: security headers present; a `/wp-login.php` probe → 404;
  `/_astro/*` asset carries the immutable cache header.
- Deploy (dev-web only): image builds, container boots the Node server, NPM
  routes to it, `/` + `/blog` both 200, prod untouched.
