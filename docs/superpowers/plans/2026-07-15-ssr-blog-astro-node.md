# SSR Blog on Astro (Node standalone) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve `/blog` live from the BOS public API with Astro components (Node standalone), retire the shared-volume SSG pipeline.

**Architecture:** Add `@astrojs/node` (standalone) to the Astro landing; keep `output: 'static'` and opt only the blog routes into on-demand rendering (`prerender = false`). A cached BOS API client feeds a listing page and an article page. The landing image becomes a Node server (internal nginx removed; edge nginx-proxy-manager stays). Spec: `docs/superpowers/specs/2026-07-15-ssr-blog-astro-node-design.md`.

**Tech Stack:** Astro 5, `@astrojs/node` 9 (standalone, Astro 5 line), TypeScript, Docker, self-hosted via nginx-proxy-manager edge + Watchtower. No unit-test framework — verify with `tsx` scripts, `astro build`, running the Node entry + `curl`, Playwright, and a seeded local BOS.

## Global Constraints

- Branch `feat/ssr-blog` (off `migrate/astro-v2`). **No merge, no deploy, no prod.** Deploy shape change is prod-affecting — HARD-STOP; dev-web verification only, on the controller's authorization.
- **No emoji anywhere** — code, comments, JSX text, commit messages, UI labels. Lucide/text only.
- Thai-first UI, THB context, SABUYGO theme (navy/olive-gold/off-white), dark/light aware, existing tokens in `src/styles/global.css`. Match existing component conventions (`.reveal`, `Base.astro`, card styles). No new design language.
- Blog `body` is trusted admin-authored HTML → render with `set:html`. Do not add a markdown parser.
- BOS API base is a **runtime** env `BOS_PUBLIC_API` (read via `process.env`, no trailing slash) so it is configurable per environment without a rebuild.
- Public API shapes (already live, `Access-Control-Allow-Origin: *`):
  - `GET /api/public/articles` → `{ articles: Array<{ id, slug, title, excerpt, coverImageUrl, publishedAt, tags, authorName }> }` (published only).
  - `GET /api/public/articles/{slug}` → the full article row (adds `body`, `seoTitle`, `seoDescription`, `status`, `locale`, `createdAt`, `updatedAt`, ...) or `404 { error }`.
- `trailingSlash: 'always'` — link to `/blog/` and `/blog/{slug}/`.

---

### Task 1: Node adapter + Astro config

**Files:**
- Modify: `package.json` (dependency), `astro.config.mjs`

**Interfaces:**
- Produces: an Astro build that emits `dist/server/entry.mjs` (standalone Node server) while keeping all current pages prerendered.

- [ ] **Step 1: Add the adapter dependency**

Run: `npm install @astrojs/node@^9`
Expected: `@astrojs/node` in `package.json` dependencies; `package-lock.json` updated. (Astro 5 requires the v9 adapter line — v11 targets Astro 7 and will `ERESOLVE` against `astro@5`.)

- [ ] **Step 2: Configure the adapter**

Replace `astro.config.mjs` with:

```js
// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://sabuygo.com',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'always',
  build: { format: 'directory' },
});
```

- [ ] **Step 3: Build and verify the server entry is emitted**

Run: `npm run build`
Expected: build succeeds; `dist/server/entry.mjs` exists (`ls dist/server/entry.mjs`). All existing pages are still prerendered into `dist/client/` (e.g. `dist/client/index.html`).

- [ ] **Step 4: Verify the Node server serves the static site**

Run: `HOST=127.0.0.1 PORT=4321 node ./dist/server/entry.mjs &` then `sleep 2 && curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4321/` then `kill %1`.
Expected: `200`, homepage served by the Node server.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json astro.config.mjs
git commit -m "feat(blog): add @astrojs/node standalone adapter (hybrid SSR)"
```

---

### Task 2: BOS API client + types + cache

**Files:**
- Create: `src/lib/blog-types.ts`, `src/lib/blog-api.ts`, `scripts/test-blog-api.ts`

**Interfaces:**
- Produces: `getArticles(): Promise<ArticleSummary[]>`, `getArticle(slug: string): Promise<ArticleFull | null>`; types `ArticleSummary`, `ArticleFull`.

- [ ] **Step 1: Types**

Create `src/lib/blog-types.ts`:

```ts
export interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  tags: string[];
  authorName: string | null;
}

export interface ArticleFull extends ArticleSummary {
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  locale: string;
  createdAt: string | null;
  updatedAt: string | null;
}
```

- [ ] **Step 2: Write the failing cache test**

Create `scripts/test-blog-api.ts`:

```ts
/* Verify blog-api cache TTL + stale-on-error. Run:
 *   npx tsx scripts/test-blog-api.ts
 * Stubs global.fetch — no network. */
import assert from 'node:assert';

process.env.BOS_PUBLIC_API = 'https://bos.example';
let calls = 0;
let mode: 'ok' | 'fail' = 'ok';
global.fetch = (async () => {
  calls += 1;
  if (mode === 'fail') throw new Error('network down');
  return {
    ok: true,
    status: 200,
    json: async () => ({ articles: [{ id: '1', slug: 'a', title: 'A', excerpt: null, coverImageUrl: null, publishedAt: null, tags: [], authorName: null }] }),
  } as Response;
}) as typeof fetch;

async function main() {
  const { getArticles, __resetBlogCache } = await import('../src/lib/blog-api');
  __resetBlogCache();

  const first = await getArticles();
  assert.equal(first.length, 1, 'first fetch returns data');
  assert.equal(calls, 1, 'one network call');

  const second = await getArticles();
  assert.equal(calls, 1, 'second call served from cache (no new fetch)');
  assert.equal(second.length, 1);

  // Expire cache, make the network fail -> stale-on-error returns last good.
  __resetBlogCache({ keepData: true, expire: true });
  mode = 'fail';
  const stale = await getArticles();
  assert.equal(stale.length, 1, 'stale-on-error returns last good value');

  console.log('PASS test-blog-api');
}
main().catch((e) => { console.error('FAIL', e); process.exit(1); });
```

Run: `npx tsx scripts/test-blog-api.ts`
Expected: FAIL (module not found / `getArticles` missing).

- [ ] **Step 3: Implement the client + cache**

Create `src/lib/blog-api.ts`:

```ts
import type { ArticleSummary, ArticleFull } from './blog-types';

const TTL_MS = Number(process.env.BLOG_CACHE_TTL_MS ?? 120_000);

function base(): string {
  return (process.env.BOS_PUBLIC_API ?? '').replace(/\/+$/, '');
}

interface Entry<T> {
  at: number;
  value: T;
}
const cache = new Map<string, Entry<unknown>>();

/** Test helper — reset or age the cache. */
export function __resetBlogCache(opts?: { keepData?: boolean; expire?: boolean }): void {
  if (!opts?.keepData) {
    cache.clear();
    return;
  }
  if (opts.expire) {
    for (const e of cache.values()) e.at = 0; // force TTL miss, keep value for stale-on-error
  }
}

async function cached<T>(key: string, fetcher: () => Promise<T>, fresh: number): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key) as Entry<T> | undefined;
  if (hit && now - hit.at < TTL_MS) return hit.value;
  try {
    const value = await fetcher();
    cache.set(key, { at: now, value });
    return value;
  } catch (e) {
    if (hit) {
      console.error(`[blog-api] ${key} fetch failed, serving stale:`, (e as Error).message);
      return hit.value; // stale-on-error
    }
    console.error(`[blog-api] ${key} fetch failed, no cache:`, (e as Error).message);
    return fresh;
  }
}

export async function getArticles(): Promise<ArticleSummary[]> {
  return cached<ArticleSummary[]>(
    'list',
    async () => {
      const res = await fetch(`${base()}/api/public/articles`);
      if (!res.ok) throw new Error(`articles ${res.status}`);
      const data = (await res.json()) as { articles?: ArticleSummary[] };
      return data.articles ?? [];
    },
    [],
  );
}

export async function getArticle(slug: string): Promise<ArticleFull | null> {
  return cached<ArticleFull | null>(
    `slug:${slug}`,
    async () => {
      const res = await fetch(`${base()}/api/public/articles/${encodeURIComponent(slug)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`article ${res.status}`);
      return (await res.json()) as ArticleFull;
    },
    null,
  );
}
```

- [ ] **Step 4: Run the test to green**

Run: `npx tsx scripts/test-blog-api.ts`
Expected: `PASS test-blog-api`.

- [ ] **Step 5: Typecheck + commit**

Run: `npx astro check` (or `npx tsc --noEmit`) — Expected: no new errors in these files.
```bash
git add src/lib/blog-types.ts src/lib/blog-api.ts scripts/test-blog-api.ts
git commit -m "feat(blog): cached BOS public-API client (TTL + stale-on-error)"
```

---

### Task 3: Blog listing page + card

**Files:**
- Create: `src/components/blog/BlogCard.astro`, `src/pages/blog/index.astro`

**Interfaces:**
- Consumes: `getArticles` from `@/lib/blog-api` (use the relative import `../../lib/blog-api` — this project does not alias `@`).

- [ ] **Step 1: BlogCard**

Create `src/components/blog/BlogCard.astro`. Props: an `ArticleSummary`. Render a card (cover image with `loading="lazy"` + width/height or aspect-ratio to avoid CLS; title; excerpt; formatted Thai date from `publishedAt`; tags). Wrap the whole card in `<a href={`/blog/${article.slug}/`}>`. Use existing card tokens/classes from `global.css`; match the fleet/service card visual language. No emoji; Lucide icons if any.

- [ ] **Step 2: Listing page**

Create `src/pages/blog/index.astro`:

```astro
---
export const prerender = false;
import Base from '../../layouts/Base.astro';
import BlogCard from '../../components/blog/BlogCard.astro';
import { getArticles } from '../../lib/blog-api';

const articles = await getArticles();
const canonical = 'https://sabuygo.com/blog/';
---
<Base
  title="บทความ | SABUYGO"
  description="บทความและคู่มือการเดินทางจาก SABUYGO — บริการรถเช่าพร้อมคนขับระดับพรีเมียม"
  canonical={canonical}
>
  <main id="main">
    <section class="section block">
      <div class="wrap">
        <div class="section-head reveal">
          <span class="eyebrow">บทความ</span>
          <h1>บทความและคู่มือการเดินทาง</h1>
        </div>
        {articles.length === 0 ? (
          <p class="blog-empty">ยังไม่มีบทความในขณะนี้</p>
        ) : (
          <div class="blog-grid">
            {articles.map((a) => <BlogCard article={a} />)}
          </div>
        )}
      </div>
    </section>
  </main>
</Base>

<style>
  .blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: clamp(1.25rem, 3vw, 2rem); }
  .blog-empty { color: var(--text-secondary); text-align: center; padding: 3rem 0; }
</style>
```

- [ ] **Step 3: Verify against a seeded local BOS (controller-run)**

The controller seeds a sample article and points the landing at the local BOS:
1. In `elite-chauffeur-backoffice`: `DATABASE_URL='postgresql://bos:password@localhost:5432/elite_chauffeur' npx tsx scripts/seed-sample-article.ts` (creates a published sample), then start BOS: `DATABASE_URL=... PORT=3002 npm run dev`.
2. In `elite-chauffeur`: `BOS_PUBLIC_API=http://localhost:3002 npm run dev`.
3. `curl -s http://localhost:4321/blog/ | grep -c "blog-grid\|blog-empty"` → the page renders (grid when the sample exists).

Expected: `/blog/` returns 200 and shows the seeded article card (or the empty-state when none).

- [ ] **Step 4: Commit**

```bash
git add src/components/blog/BlogCard.astro src/pages/blog/index.astro
git commit -m "feat(blog): SSR listing page + BlogCard from BOS API"
```

---

### Task 4: Article page

**Files:**
- Create: `src/pages/blog/[slug].astro`

- [ ] **Step 1: Article page**

Create `src/pages/blog/[slug].astro`:

```astro
---
export const prerender = false;
import Base from '../../layouts/Base.astro';
import { getArticle } from '../../lib/blog-api';

const { slug } = Astro.params;
const article = slug ? await getArticle(slug) : null;

if (!article) {
  Astro.response.status = 404;
}

const canonical = article ? `https://sabuygo.com/blog/${article.slug}/` : 'https://sabuygo.com/blog/';
const published = article?.publishedAt ?? article?.createdAt ?? null;
const jsonLd = article
  ? [{
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.seoDescription ?? article.excerpt ?? article.title,
      image: article.coverImageUrl ?? undefined,
      datePublished: published ?? undefined,
      author: article.authorName ? { '@type': 'Person', name: article.authorName } : undefined,
      mainEntityOfPage: canonical,
    }]
  : [];
---
{article ? (
  <Base
    title={`${article.seoTitle ?? article.title} | SABUYGO`}
    description={article.seoDescription ?? article.excerpt ?? article.title}
    canonical={canonical}
    ogImage={article.coverImageUrl ?? undefined}
    jsonLd={jsonLd}
  >
    <main id="main">
      <article class="section block">
        <div class="wrap article-wrap">
          <div class="breadcrumb"><a href="/">หน้าแรก</a><span> / </span><a href="/blog/">บทความ</a></div>
          <h1>{article.title}</h1>
          {published && <p class="article-meta">{new Date(published).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}{article.authorName ? ` · ${article.authorName}` : ''}</p>}
          {article.coverImageUrl && <img class="article-cover" src={article.coverImageUrl} alt={article.title} loading="eager" />}
          <div class="article-body" set:html={article.body} />
        </div>
      </article>
    </main>
  </Base>
) : (
  <Base title="ไม่พบบทความ | SABUYGO" description="ไม่พบบทความที่ต้องการ" canonical={canonical}>
    <main id="main">
      <section class="section block">
        <div class="wrap" style="text-align:center; padding: 4rem 0;">
          <h1>ไม่พบบทความ</h1>
          <p><a href="/blog/">กลับไปหน้าบทความ</a></p>
        </div>
      </section>
    </main>
  </Base>
)}

<style>
  .article-wrap { max-width: 760px; margin: 0 auto; }
  .article-meta { color: var(--text-tertiary); font-size: 0.9rem; margin: 0.5rem 0 1.5rem; }
  .article-cover { width: 100%; height: auto; border-radius: var(--r-lg); margin-bottom: 2rem; }
  .article-body { font-size: 1.06rem; line-height: 1.9; color: var(--text-primary); }
  .article-body :global(h2) { margin: 2.2em 0 .6em; font-size: 1.6rem; }
  .article-body :global(h3) { margin: 1.8em 0 .5em; font-size: 1.3rem; }
  .article-body :global(p), .article-body :global(ul), .article-body :global(ol), .article-body :global(blockquote), .article-body :global(pre) { margin: 0 0 1.3em; }
  .article-body :global(ul), .article-body :global(ol) { padding-left: 1.5em; }
  .article-body :global(img) { max-width: 100%; height: auto; border-radius: var(--r-md); }
  .article-body :global(a) { color: var(--gold-dark); text-decoration: underline; }
</style>
```

- [ ] **Step 2: Verify (controller-run, local BOS seeded)**

With the seeded local BOS + `BOS_PUBLIC_API=http://localhost:3002 npm run dev`:
- `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/blog/<seeded-slug>/` → `200`.
- `curl -s http://localhost:4321/blog/<seeded-slug>/ | grep -c "article-body\|application/ld+json"` → body + JSON-LD present.
- `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/blog/does-not-exist/` → `404`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/blog/[slug].astro
git commit -m "feat(blog): SSR article page (set:html body, Article JSON-LD, 404)"
```

---

### Task 5: Blog sitemap endpoint

**Files:**
- Create: `src/pages/sitemap-blog.xml.ts`
- Modify: `public/sitemap.xml` (or the sitemap index) to reference it

- [ ] **Step 1: Sitemap endpoint**

Create `src/pages/sitemap-blog.xml.ts`:

```ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { getArticles } from '../lib/blog-api';

export const GET: APIRoute = async () => {
  const articles = await getArticles();
  const urls = articles
    .map((a) => {
      const lastmod = a.publishedAt ? `<lastmod>${new Date(a.publishedAt).toISOString()}</lastmod>` : '';
      return `<url><loc>https://sabuygo.com/blog/${a.slug}/</loc>${lastmod}</url>`;
    })
    .join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://sabuygo.com/blog/</loc></url>${urls}</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
```

- [ ] **Step 2: Reference from the main sitemap**

Read `public/sitemap.xml`. If it is a `<urlset>`, add `<url><loc>https://sabuygo.com/blog/</loc></url>` and leave the article-level URLs to `sitemap-blog.xml`. If a sitemap index is preferred, add a `<sitemap><loc>https://sabuygo.com/sitemap-blog.xml</loc></sitemap>` entry. Choose the form that matches the existing file's structure; do not break existing entries.

- [ ] **Step 3: Verify + commit**

Run (dev, seeded BOS): `curl -s http://localhost:4321/sitemap-blog.xml | grep -c "<loc>"` → ≥ 1.
```bash
git add src/pages/sitemap-blog.xml.ts public/sitemap.xml
git commit -m "feat(blog): dynamic blog sitemap + main sitemap reference"
```

---

### Task 6: Security-header middleware

**Files:**
- Create: `src/middleware.ts`

**Interfaces:**
- Produces: response security headers on rendered responses, mirroring the removed `nginx.conf` `add_header` lines.

- [ ] **Step 1: Middleware**

Create `src/middleware.ts`:

```ts
import type { MiddlewareHandler } from 'astro';

/**
 * Security response headers previously set by nginx.conf. gzip/TLS and any
 * global (all-response) header policy remain the edge nginx-proxy-manager's
 * job; hashed /_astro asset caching is handled by the node adapter.
 */
export const onRequest: MiddlewareHandler = async (_context, next) => {
  const response = await next();
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
};
```

- [ ] **Step 2: Verify + commit**

Run (dev): `curl -sI http://localhost:4321/blog/ | grep -iE "x-frame-options|x-content-type-options|referrer-policy"` → all three present.
```bash
git add src/middleware.ts
git commit -m "feat(blog): security-header middleware (ports nginx add_header)"
```

---

### Task 7: Deploy — Node standalone Dockerfile + compose

**Files:**
- Modify: `Dockerfile`, `docker-compose.yml`
- Delete: `nginx.conf`

**Interfaces:**
- Produces: a Node-server image; compose exposes the Node port, drops the blog volume, injects `BOS_PUBLIC_API`.

- [ ] **Step 1: Rewrite the Dockerfile**

Replace `Dockerfile` with:

```dockerfile
# ======================================================
# Elite Chauffeur Landing — Dockerfile (Astro 5, @astrojs/node standalone)
# Multi-stage: build -> node runtime. Edge nginx-proxy-manager fronts TLS/gzip.
# ======================================================

# --- build ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# --- runtime ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
# Only the build output + production deps are needed to run the server.
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4321/ || exit 1

CMD ["node", "./dist/server/entry.mjs"]
```

- [ ] **Step 2: Delete the internal nginx config**

Run: `git rm nginx.conf`

- [ ] **Step 3: Update docker-compose**

In `docker-compose.yml`, for BOTH `landing` and `landing-dev` services:
- Change `expose: ["80"]` to `expose: ["4321"]`.
- Remove the `volumes:` block mounting `blog_content:/usr/share/nginx/html/blog:ro`.
- Add an `environment:` block: `BOS_PUBLIC_API: ${BOS_PUBLIC_API}` (and optionally `PORT: 4321`, `HOST: 0.0.0.0` — already defaulted in the image).

Leave the `internal` service and the top-level `blog_content` volume declaration for now (Task 8 removes the volume declaration after retirement).

- [ ] **Step 4: Verify the image builds + serves (controller-run)**

Run: `docker build -t landing-ssr-test .` then
`docker run --rm -e BOS_PUBLIC_API=http://host.docker.internal:3002 -p 4399:4321 --name landing-ssr-test -d landing-ssr-test` then
`sleep 3 && curl -s -o /dev/null -w "/ -> %{http_code}\n" http://localhost:4399/` then `docker stop landing-ssr-test`.
Expected: image builds; `/` → `200` from the Node server. (SSR `/blog` needs a reachable BOS; the seeded local BOS via `host.docker.internal:3002` renders it.)

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml
git rm nginx.conf
git commit -m "build(blog): Node standalone image + compose (drop internal nginx, BOS_PUBLIC_API)"
```

---

### Task 8: Retire the old SSG pipeline (landing + BOS)

**Files:**
- Modify: `docker-compose.yml` (landing) — remove the `blog_content` top-level volume declaration.
- Modify (BOS repo `elite-chauffeur-backoffice`): `docker-compose.bos.yml`, `package.json`; Delete: `src/lib/blog/generate.ts`, `src/lib/blog/template.ts`, `scripts/generate-blog.ts`, `src/app/api/articles/regenerate/route.ts`; Modify the articles dashboard page to remove the "Regenerate" button.

> This task spans the BOS repo and removes a dashboard control. Do it ONLY after SSR `/blog` is verified working on dev-web. The controller runs/reviews this task; it is grouped last on purpose.

- [ ] **Step 1: Landing — drop the volume declaration**

In `elite-chauffeur/docker-compose.yml`, remove the top-level `blog_content:` volume entry (and its `external: true`). Confirm no service still references it (Task 7 removed the mounts).

- [ ] **Step 2: BOS — remove the generator + regenerate route**

In `elite-chauffeur-backoffice`:
- `git rm src/lib/blog/generate.ts src/lib/blog/template.ts scripts/generate-blog.ts src/app/api/articles/regenerate/route.ts`
- Remove the `generate-blog` script line from `package.json`.
- In the articles dashboard page (find it: `grep -rl "regenerate\|Regenerate" src/app/\(bos-v2\)/dashboard/articles`), remove the "Regenerate" button + its handler. Do not touch the public API routes (`src/app/api/public/articles*`) — they are the new data source.

- [ ] **Step 3: BOS — drop the blog volume from compose**

In `docker-compose.bos.yml`, remove `BLOG_OUTPUT_DIR`, the `blog_content:/app/blog-output` mount, and the top-level `blog_content` volume declaration.

- [ ] **Step 4: Verify both repos still build/typecheck**

- Landing: `npm run build` → succeeds.
- BOS: `npx tsc --noEmit` → clean (no dangling imports of the deleted modules — grep first: `grep -rn "blog/generate\|blog/template\|/regenerate" src` should return nothing after edits).

- [ ] **Step 5: Commit (per repo)**

Landing:
```bash
git add docker-compose.yml
git commit -m "chore(blog): drop obsolete blog_content volume (SSR replaces SSG)"
```
BOS (in elite-chauffeur-backoffice, on its own branch):
```bash
git add -A
git commit -m "chore(blog): retire SSG generator + regenerate (landing SSR replaces it)"
```

---

## Self-Review

- **Spec coverage:** adapter+config → T1; API client+cache → T2; listing → T3; article+SEO → T4; sitemap → T5; header middleware → T6; Node-standalone deploy + drop internal nginx → T7; retire SSG pipeline (landing+BOS) → T8. All spec sections mapped.
- **Type consistency:** `ArticleSummary`/`ArticleFull` defined in T2 and consumed by T3/T4/T5; `getArticles`/`getArticle`/`__resetBlogCache` signatures identical across `blog-api.ts` and callers; `BOS_PUBLIC_API` read via `process.env` everywhere (runtime).
- **Placeholder scan:** none — each code step carries full code; described steps (BlogCard styling, sitemap merge, Regenerate-button removal) are bounded and point at the file to match.
- **Gates:** T7 changes the deploy contract (Node vs nginx) — prod HARD-STOP, dev-web only on controller authorization. T8 spans the BOS repo + removes a dashboard control — controller-run, last, after SSR verified.
- **Verification reality:** no unit-test framework — `tsx` (T2), `astro build` + Node entry + `curl` (T1/T7), a seeded local BOS via `scripts/seed-sample-article.ts` for route rendering (T3/T4/T5), header curl (T6).
