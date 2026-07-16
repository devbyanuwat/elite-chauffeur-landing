# Landing Dynamic Reviews from BOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing's static reviews marquee with real, PDPA-consented reviews fetched live from BOS, each card showing the driver's car photo with a reveal-on-interaction panel and a category-level "book" CTA that pre-fills the booking form's service + vehicle type.

**Architecture:** BOS gains a consent-gated public reviews API (masked name, no driver PII). The landing renders reviews as an Astro server island (`server:defer`) with the current static cards as the fallback; a delegated client script handles mobile tap-reveal + CTA auto-fill (simulated clicks on the existing ServiceTabs controls). Spans two repos.

**Tech Stack:** BOS = Next.js 14 + Drizzle + Postgres. Landing = Astro 5 (Node standalone adapter, `output: 'static'` + server islands).

## Global Constraints

- **No emoji anywhere** — code, UI labels, comments, commit messages. Text or Lucide icons only.
- **SABUYGO theme** — reuse existing tokens (navy `#0A1628` / olive-gold / off-white) and existing `.tm-card` classes; introduce no new design language.
- **Public payload = zero driver PII** — never expose `driverId`, driver name, phone, or plate. Mask the customer name server-side. Gate rows on `isPublished = true AND pdpaConsent = true`.
- **CTA binds category only** — service + vehicle type. No `preferredDriverId`, no specific-driver booking.
- **Reverse maps** (BOS code → landing ServiceTabs UI key), done server-side in `Reviews.astro`:
  - service: `one_way→airport`, `wait_return→b2b`, `hourly_charter→rental`, `daily_charter→fullday` (unknown → `airport`).
  - vehicle: `sedan→sedan`, `suv→suv`, `van→premium`, `mpv→premium` (unknown/null → `any`).
- **Branches:** BOS `feat/reviews-public-api` off `main` — MUST NOT touch `redesign/bos-spatial-glass`. Landing `feat/dynamic-reviews` off `dev` (already checked out; spec committed on it).
- **Prod deploy = HARD-STOP.** Verify on BOS dev + landing dev-web. No prod push without explicit user go.
- **Section is never empty** — BOS unreachable / zero rows → static fallback stays.
- **Imports:** landing uses RELATIVE paths (`../lib/...`), no `@` alias. BOS uses `@/` alias.
- **SEO preserved** — keep JSON-LD / OG / meta; Lighthouse ≥95 performance + accessibility.

---

## Part 1 — BOS (`feat/reviews-public-api` off `main`)

> Run all BOS tasks from `/Users/anuwatttttt/Documents/Dev/oom/sabaigo/elite-chauffeur-backoffice`.
> First: `git checkout main && git pull && git checkout -b feat/reviews-public-api`.
> Dev DB per the bos-dev-environment runbook (bos-dev-db :5432, override DATABASE_URL, PORT=3002).

### Task 1: Reviews schema — consent columns + migration

**Files:**
- Modify: `src/db/schema.ts:389-390` (reviews table)
- Create: `drizzle/<generated>.sql` (via drizzle-kit)

**Interfaces:**
- Produces: `reviews.pdpaConsent` (boolean, notNull, default false), `reviews.consentAt` (timestamptz, nullable) — consumed by Tasks 2-4.

- [ ] **Step 1: Add the two columns** in `src/db/schema.ts`, between `isPublished` and `adminReply`:

```ts
  isPublished: boolean('is_published').default(false),
  // PDPA publish-consent gate: a review is served to the public API only when
  // isPublished AND pdpaConsent are both true. consentAt is stamped when consent
  // is first granted (audit trail).
  pdpaConsent: boolean('pdpa_consent').notNull().default(false),
  consentAt: timestamp('consent_at', { withTimezone: true }),
  adminReply: text('admin_reply'),
```

- [ ] **Step 2: Generate the migration**

Run: `npx drizzle-kit generate`
Expected: a new file under `drizzle/` whose SQL contains
`ALTER TABLE "reviews" ADD COLUMN "pdpa_consent" boolean DEFAULT false NOT NULL;`
and `ALTER TABLE "reviews" ADD COLUMN "consent_at" timestamp with time zone;`
(If the repo applies migrations a different way, match the existing `drizzle/` file convention — inspect the newest existing migration first.)

- [ ] **Step 3: Apply to the dev DB**

Run: `npx drizzle-kit push` (confirm the two ADD COLUMN statements when prompted).
Verify: `psql "$DATABASE_URL" -c '\d reviews'` shows `pdpa_consent` and `consent_at`.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(reviews): add pdpaConsent + consentAt columns for public consent gate"
```

### Task 2: Reviews queries — public read + consent-aware update

**Files:**
- Modify: `src/db/queries/reviews.ts:35-37` (UpdateReviewData), `:101-108` (updateReview)
- Modify: `src/db/queries/reviews.ts` (append `getPublicReviews`)

**Interfaces:**
- Consumes: `reviews.pdpaConsent`, `reviews.consentAt` (Task 1); `drivers.vehiclePhotoUrl`, `drivers.vehicleType`, `bookings.serviceType` (existing); `reviewsRelations` (`schema.ts:1164`).
- Produces: `getPublicReviews(limit?)` → rows with `{ ...review, driver: { vehiclePhotoUrl, vehicleType } | null, booking: { serviceType } | null }` — consumed by Task 3. `updateReview` now accepts `pdpaConsent` and stamps `consentAt`.

- [ ] **Step 1: Extend `UpdateReviewData`** (`src/db/queries/reviews.ts:35`):

```ts
export type UpdateReviewData = Partial<
  Pick<Review, 'isPublished' | 'adminReply' | 'comment' | 'rating' | 'pdpaConsent'>
>;
```

- [ ] **Step 2: Stamp `consentAt` in `updateReview`** (`src/db/queries/reviews.ts:101`):

```ts
/** อัปเดตรีวิว (toggle publish, PDPA consent, ตอบกลับ admin) */
export async function updateReview(id: string, data: UpdateReviewData) {
  const patch: Record<string, unknown> = { ...data, updatedAt: new Date() };
  // Stamp consent time when consent is granted; keep the existing timestamp as a
  // historical record if consent is later revoked.
  if (data.pdpaConsent === true) patch.consentAt = new Date();
  const [row] = await db
    .update(reviews)
    .set(patch)
    .where(eq(reviews.id, id))
    .returning();
  return row;
}
```

- [ ] **Step 3: Append `getPublicReviews`** to `src/db/queries/reviews.ts`:

```ts
/**
 * รีวิวสำหรับหน้า public (landing) — เผยแพร่แล้ว + ยินยอม PDPA เท่านั้น
 * join รูปรถ/ประเภทรถ (จาก driver inline) + serviceType (จาก booking).
 * ไม่คืน PII ของคนขับ — ตัวเลือก column ถูกจำกัดที่นี่.
 */
export async function getPublicReviews(limit = 30) {
  return db.query.reviews.findMany({
    where: (r, { and, eq: _eq }) => and(_eq(r.isPublished, true), _eq(r.pdpaConsent, true)),
    with: {
      driver: { columns: { vehiclePhotoUrl: true, vehicleType: true } },
      booking: { columns: { serviceType: true } },
    },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
    limit,
  });
}
```

- [ ] **Step 4: Type-check + commit**

Run: `npx tsc --noEmit` (expect no new errors in `reviews.ts`).
```bash
git add src/db/queries/reviews.ts
git commit -m "feat(reviews): getPublicReviews query + consentAt stamping in updateReview"
```

### Task 3: Public reviews API route

**Files:**
- Create: `src/app/api/public/reviews/route.ts`

**Interfaces:**
- Consumes: `getPublicReviews` (Task 2).
- Produces: `GET /api/public/reviews` → `{ reviews: PublicReview[] }`, `PublicReview = { id, rating, comment, customerNameMasked, carPhotoUrl, vehicleType, serviceType, createdAt }`. CORS `*`, `Cache-Control: public, max-age=300`. Consumed by the landing `reviews-api.ts` (Task 5).

- [ ] **Step 1: Write the route** (mirrors `src/app/api/public/articles/route.ts`):

```ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getPublicReviews } from '@/db/queries/reviews';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300',
};

/** Mask a customer name so full names never leave BOS. Keeps an optional
 *  "คุณ" honorific + the first character, e.g. "คุณสมชาย ใจดี" -> "คุณส****". */
function maskName(name: string | null): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'ลูกค้า SABUYGO';
  let rest = trimmed;
  let prefix = '';
  if (rest.startsWith('คุณ')) {
    prefix = 'คุณ';
    rest = rest.slice(3).trim();
  }
  const first = Array.from(rest)[0] ?? '';
  return `${prefix || 'คุณ'}${first}****`;
}

export async function GET() {
  try {
    const reviews = (await getPublicReviews(30)).map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment ?? '',
      customerNameMasked: maskName(r.customerName),
      carPhotoUrl: r.driver?.vehiclePhotoUrl ?? null,
      vehicleType: r.driver?.vehicleType ?? null,
      serviceType: r.booking?.serviceType ?? null,
      createdAt: r.createdAt,
    }));
    return NextResponse.json({ reviews }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('[GET /api/public/reviews]', error);
    return NextResponse.json(
      { error: 'failed to load reviews' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
```

- [ ] **Step 2: Seed + verify** (BOS dev running on :3002)

Seed a published + consented review with a driver that has `vehiclePhotoUrl` (via the admin dashboard after Task 4, or a quick SQL insert). Then:
Run: `curl -s http://localhost:3002/api/public/reviews | jq`
Expected: `{ "reviews": [ { "customerNameMasked": "คุณ...****", "carPhotoUrl": "...", "vehicleType": "...", "serviceType": "...", ... } ] }` — and NO `driverId` / `customerName` / `customerPhone` keys present. A published-but-not-consented row must NOT appear.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/public/reviews/route.ts
git commit -m "feat(reviews): public reviews API (consent gate, masked name, no driver PII)"
```

### Task 4: Admin consent capture in the reviews dashboard

**Files:**
- Modify: `src/app/(bos-v2)/dashboard/reviews/page.tsx`

**Interfaces:**
- Consumes: `PATCH /api/reviews/[id]` (existing — passes body straight to `updateReview`, so `{ pdpaConsent }` works after Task 2); `GET /api/reviews` returns the full review row incl. `pdpaConsent`/`consentAt` after Task 1.

- [ ] **Step 1: Extend `ReviewItem`** (`page.tsx:13-23`) — add two fields:

```ts
interface ReviewItem {
  id: string;
  customerName: string;
  rating: number;
  comment: string | null;
  isPublished: boolean;
  pdpaConsent: boolean;
  consentAt: string | null;
  adminReply: string | null;
  createdAt: string | null;
  driver: { id: string; name: string } | null;
  booking: { id: string; pickupLocation: string; dropoffLocation: string } | null;
}
```

- [ ] **Step 2: Add `ShieldCheck` to the lucide import** (`page.tsx:4`):

```ts
import { Star, MessageSquare, Eye, EyeOff, Loader2, Save, Plus, ShieldCheck } from 'lucide-react';
```

- [ ] **Step 3: Add a `togglePdpa` handler** — paste directly after `togglePublish` (after `page.tsx:137`), mirroring it:

```ts
  const [consentingId, setConsentingId] = useState<string | null>(null);

  const togglePdpa = async (review: ReviewItem) => {
    const next = !review.pdpaConsent;
    setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, pdpaConsent: next } : r)));
    setConsentingId(review.id);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdpaConsent: next }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'อัปเดตความยินยอมไม่สำเร็จ');
      toast(next ? 'บันทึกความยินยอม PDPA แล้ว' : 'ยกเลิกความยินยอม PDPA แล้ว', 'success');
    } catch (consentError) {
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, pdpaConsent: !next } : r)));
      toast(consentError instanceof Error ? consentError.message : 'อัปเดตความยินยอมไม่สำเร็จ', 'error');
    } finally {
      setConsentingId(null);
    }
  };
```

Move the existing `const [consentingId ...]` line up with the other `useState` hooks (near `page.tsx:74`) — it is shown here for locality; do not declare a hook mid-file.

- [ ] **Step 4: Add a consent Pill + toggle button** in the review card. After the `isPublished` Pill (`page.tsx:249-251`), add a consent indicator:

```tsx
                    <Pill kind={review.pdpaConsent ? 'avail' : 'draft'}>
                      {review.pdpaConsent ? 'ยินยอม PDPA' : 'ยังไม่ยินยอม'}
                    </Pill>
```

And in the action button group (after the publish `Button`, before the reply `Button`, around `page.tsx:289`):

```tsx
                  <Button
                    variant={review.pdpaConsent ? 'default' : 'primary'}
                    size="sm"
                    disabled={consentingId === review.id}
                    onClick={() => void togglePdpa(review)}
                  >
                    {consentingId === review.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={12} />
                    )}
                    {review.pdpaConsent ? 'ยกเลิกยินยอม' : 'ยินยอมเผยแพร่'}
                  </Button>
```

- [ ] **Step 5: Add a helper note** under the page subtitle (`page.tsx:221`) so admins know both gates are required:

```tsx
          <p className="mt-1 text-xs text-ink-soft">คะแนนและความคิดเห็นจากลูกค้าหลัง trip เสร็จสิ้น — แสดงบนเว็บไซต์เมื่อ "เผยแพร่" และ "ยินยอม PDPA" ครบทั้งสอง</p>
```

- [ ] **Step 6: Verify + commit**

Run: `npm run dev` (or the BOS dev command), open `/dashboard/reviews`, confirm the consent Pill + button render and that toggling persists (reload shows the state). Confirm `GET /api/public/reviews` returns a row only after BOTH publish + consent are on.
```bash
git add "src/app/(bos-v2)/dashboard/reviews/page.tsx"
git commit -m "feat(reviews): admin PDPA consent toggle in reviews dashboard"
```

> **GATE — BOS deploy:** before the landing dev-web verification (Task 9 Step 4), BOS `feat/reviews-public-api` must be merged + deployed to `bos.sabuygo.com` so `https://bos.sabuygo.com/api/public/reviews` is live. Local landing verification (Tasks 5-9) uses `BOS_PUBLIC_API=http://localhost:3002` against local BOS dev. Prod = HARD-STOP.

---

## Part 2 — Landing (`feat/dynamic-reviews` off `dev`)

> Run all landing tasks from `/Users/anuwatttttt/Documents/Dev/oom/sabaigo/elite-chauffeur`.
> Already on `feat/dynamic-reviews` (spec committed here). Set `BOS_PUBLIC_API=http://localhost:3002` for local dev against BOS.

### Task 5: Reviews data client (types + cached fetch)

**Files:**
- Create: `src/lib/reviews-types.ts`
- Create: `src/lib/reviews-api.ts`

**Interfaces:**
- Consumes: `GET {BOS_PUBLIC_API}/api/public/reviews` (Task 3).
- Produces: `getReviews(): Promise<Review[]>` and the `Review` type — consumed by `Reviews.astro` (Task 7).

- [ ] **Step 1: `src/lib/reviews-types.ts`**

```ts
export interface Review {
  id: string;
  rating: number;
  comment: string;
  customerNameMasked: string;
  carPhotoUrl: string | null;
  vehicleType: string | null;
  serviceType: string | null;
  createdAt: string;
}
```

- [ ] **Step 2: `src/lib/reviews-api.ts`** (mirrors `src/lib/blog-api.ts` cache + stale-on-error):

```ts
import type { Review } from './reviews-types';

const TTL_MS = Number(process.env.REVIEWS_CACHE_TTL_MS ?? 120_000);

function base(): string {
  return (process.env.BOS_PUBLIC_API ?? '').replace(/\/+$/, '');
}

interface Entry<T> {
  at: number;
  value: T;
}
const cache = new Map<string, Entry<unknown>>();

async function cached<T>(key: string, fetcher: () => Promise<T>, fresh: T): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key) as Entry<T> | undefined;
  if (hit && now - hit.at < TTL_MS) return hit.value;
  try {
    const value = await fetcher();
    cache.set(key, { at: now, value });
    return value;
  } catch (e) {
    if (hit) {
      console.error(`[reviews-api] ${key} fetch failed, serving stale:`, (e as Error).message);
      return hit.value; // stale-on-error
    }
    console.error(`[reviews-api] ${key} fetch failed, no cache:`, (e as Error).message);
    return fresh;
  }
}

export async function getReviews(): Promise<Review[]> {
  return cached<Review[]>(
    'reviews',
    async () => {
      const res = await fetch(`${base()}/api/public/reviews`);
      if (!res.ok) throw new Error(`reviews ${res.status}`);
      const data = (await res.json()) as { reviews?: Review[] };
      return data.reviews ?? [];
    },
    [],
  );
}
```

- [ ] **Step 3: Build check + commit**

Run: `npm run build` (must still succeed).
```bash
git add src/lib/reviews-types.ts src/lib/reviews-api.ts
git commit -m "feat(reviews): landing reviews-api client (TTL cache + stale-on-error)"
```

### Task 6: Static fallback card component

**Files:**
- Create: `src/components/sections/StaticReviews.astro`

**Interfaces:**
- Produces: a fallback marquee whose cards use the SAME markup contract as the live island (Task 7): `.tm-card` carrying a `.tm-cta` button with `data-svc` / `data-vehicle` set to landing UI keys — so the delegated interaction script (Task 9) works identically on fallback and live cards.

- [ ] **Step 1: Author the component.** Port the current `src/components/sections/Reviews.astro` cards into a data-driven fallback. Keep the two-row marquee wrapper and existing `.tm-*` classes. Each card gains a reveal panel with a CTA. Text-only cards omit the photo column.

```astro
---
// Curated fallback reviews — shown while the live island loads and whenever BOS
// is unreachable or returns zero. Also the SEO baseline (real curated content).
// data-svc / data-vehicle are landing ServiceTabs UI keys (see Global Constraints).
interface FallbackReview {
  quote: string;
  name: string;
  role: string;
  photo?: string;
  svc: 'airport' | 'rental' | 'b2b' | 'fullday';
  vehicle: 'sedan' | 'suv' | 'premium' | 'any';
}

const FALLBACK: FallbackReview[] = [
  { quote: 'คนขับสุภาพมาก รับตรงเวลา ประทับใจค่ะ', name: 'คุณแน****', role: 'รับส่งสนามบิน', photo: '/images/review-airport-night.webp', svc: 'airport', vehicle: 'sedan' },
  { quote: 'พาครอบครัวไปหัวหิน สบายมาก ไม่ต้องเหนื่อยขับเอง', name: 'คุณเอ****', role: 'เช่ารถเที่ยว', svc: 'fullday', vehicle: 'suv' },
  { quote: 'รถสะอาด คนขับใจดี เด็ก ๆ นั่งสบาย', name: 'คุณพ****', role: 'ทริปครอบครัว', svc: 'fullday', vehicle: 'suv' },
  { quote: 'ราคาตามที่แจ้งจริง ไม่บวกเพิ่ม ถูกใจมาก', name: 'คุณว****', role: 'เดินทางธุรกิจ', photo: '/images/review-friends-day.webp', svc: 'b2b', vehicle: 'premium' },
  { quote: 'จองง่ายผ่าน LINE ตอบไว ใช้บริการอีกแน่นอน', name: 'คุณม****', role: 'รับส่งสนามบิน', svc: 'airport', vehicle: 'sedan' },
  { quote: 'ขับนุ่ม ปลอดภัย คุณแม่ชมว่าสบายมาก', name: 'คุณน****', role: 'ทริปครอบครัว', svc: 'fullday', vehicle: 'suv' },
  { quote: 'ตรงเวลาทุกครั้ง วางใจให้รับลูกค้า VIP ได้', name: 'คุณก****', role: 'เดินทางธุรกิจ', svc: 'b2b', vehicle: 'premium' },
  { quote: 'ไปพัทยากันทั้งบ้าน สนุกและสบายสุด ๆ', name: 'คุณฟ****', role: 'เช่ารถเที่ยว', photo: '/images/review-couple-morning.webp', svc: 'rental', vehicle: 'suv' },
];

// Split into two marquee rows for the seamless right-to-left / left-to-right loop.
const row1 = FALLBACK.slice(0, 4);
const row2 = FALLBACK.slice(4, 8);
---

<div class="tm-rows">
  <div class="marquee" role="group" aria-label="รีวิวลูกค้า">
    <div class="marquee-track">
      {[...row1, ...row1].map((r, i) => (
        <figure class="tm-card" aria-hidden={i >= row1.length ? 'true' : undefined}>
          {r.photo && <div class="tm-car"><img src={r.photo} alt={`ลูกค้า SABUYGO — ${r.role}`} loading="lazy" width="200" height="150" /></div>}
          <div class="tm-body">
            <div class="tm-stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <blockquote class="tm-quote">"{r.quote}"</blockquote>
            <figcaption class="tm-author"><b>{r.name}</b><small>{r.role}</small></figcaption>
            <button type="button" class="tm-cta" data-svc={r.svc} data-vehicle={r.vehicle}>จองบริการนี้</button>
          </div>
        </figure>
      ))}
    </div>
  </div>
  <div class="marquee" role="group" aria-label="รีวิวลูกค้า">
    <div class="marquee-track ltr">
      {[...row2, ...row2].map((r, i) => (
        <figure class="tm-card" aria-hidden={i >= row2.length ? 'true' : undefined}>
          {r.photo && <div class="tm-car"><img src={r.photo} alt={`ลูกค้า SABUYGO — ${r.role}`} loading="lazy" width="200" height="150" /></div>}
          <div class="tm-body">
            <div class="tm-stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <blockquote class="tm-quote">"{r.quote}"</blockquote>
            <figcaption class="tm-author"><b>{r.name}</b><small>{r.role}</small></figcaption>
            <button type="button" class="tm-cta" data-svc={r.svc} data-vehicle={r.vehicle}>จองบริการนี้</button>
          </div>
        </figure>
      ))}
    </div>
  </div>
</div>
```

- [ ] **Step 2: Build check + commit**

Run: `npm run build` (must succeed).
```bash
git add src/components/sections/StaticReviews.astro
git commit -m "feat(reviews): StaticReviews fallback component with CTA + reveal markup"
```

### Task 7: Live reviews server island

**Files:**
- Create: `src/components/sections/Reviews.astro` (replace the current static one)

**Interfaces:**
- Consumes: `getReviews()` (Task 5).
- Produces: the same `.tm-card` / `.tm-cta` markup contract as Task 6, rendered from live data with the reverse-mapped UI keys on each CTA.

- [ ] **Step 1: Replace `src/components/sections/Reviews.astro`.** Frontmatter fetches live reviews and reverse-maps codes; the body renders the identical card structure as `StaticReviews`. If zero rows come back, render nothing (the island simply shows no cards — but in practice the fallback covers empty, and this island only replaces the fallback once it resolves; guard anyway).

```astro
---
import { getReviews } from '../../lib/reviews-api';

const SVC_UI: Record<string, string> = {
  one_way: 'airport', wait_return: 'b2b', hourly_charter: 'rental', daily_charter: 'fullday',
};
const VEH_UI: Record<string, string> = {
  sedan: 'sedan', suv: 'suv', van: 'premium', mpv: 'premium',
};
const SVC_LABEL: Record<string, string> = {
  airport: 'รับส่งสนามบิน', b2b: 'B2B / องค์กร', rental: 'เช่ารถ + คนขับ', fullday: 'เหมาทั้งวัน',
};

const reviews = (await getReviews()).map((r) => ({
  ...r,
  svcUi: SVC_UI[r.serviceType ?? ''] ?? 'airport',
  vehUi: VEH_UI[r.vehicleType ?? ''] ?? 'any',
}));
const half = Math.ceil(reviews.length / 2);
const row1 = reviews.slice(0, half);
const row2 = reviews.slice(half);
---

{reviews.length > 0 && (
  <div class="tm-rows">
    <div class="marquee" role="group" aria-label="รีวิวลูกค้า">
      <div class="marquee-track">
        {[...row1, ...row1].map((r, i) => (
          <figure class="tm-card" aria-hidden={i >= row1.length ? 'true' : undefined}>
            {r.carPhotoUrl && <div class="tm-car"><img src={r.carPhotoUrl} alt="รถของคนขับ SABUYGO" loading="lazy" width="200" height="150" /></div>}
            <div class="tm-body">
              <div class="tm-stars" aria-hidden="true">{'★'.repeat(Math.max(1, Math.min(5, r.rating)))}</div>
              <blockquote class="tm-quote">"{r.comment}"</blockquote>
              <figcaption class="tm-author"><b>{r.customerNameMasked}</b><small>{SVC_LABEL[r.svcUi]}</small></figcaption>
              <button type="button" class="tm-cta" data-svc={r.svcUi} data-vehicle={r.vehUi}>จองบริการนี้</button>
            </div>
          </figure>
        ))}
      </div>
    </div>
    {row2.length > 0 && (
      <div class="marquee" role="group" aria-label="รีวิวลูกค้า">
        <div class="marquee-track ltr">
          {[...row2, ...row2].map((r, i) => (
            <figure class="tm-card" aria-hidden={i >= row2.length ? 'true' : undefined}>
              {r.carPhotoUrl && <div class="tm-car"><img src={r.carPhotoUrl} alt="รถของคนขับ SABUYGO" loading="lazy" width="200" height="150" /></div>}
              <div class="tm-body">
                <div class="tm-stars" aria-hidden="true">{'★'.repeat(Math.max(1, Math.min(5, r.rating)))}</div>
                <blockquote class="tm-quote">"{r.comment}"</blockquote>
                <figcaption class="tm-author"><b>{r.customerNameMasked}</b><small>{SVC_LABEL[r.svcUi]}</small></figcaption>
                <button type="button" class="tm-cta" data-svc={r.svcUi} data-vehicle={r.vehUi}>จองบริการนี้</button>
              </div>
            </figure>
          ))}
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 2: Build check + commit**

Run: `npm run build` (must succeed — `prerender` default for the home page stays static; the island renders on demand).
```bash
git add src/components/sections/Reviews.astro
git commit -m "feat(reviews): live reviews server-island content (reverse-mapped CTA)"
```

### Task 8: Wire the island into the home page + section shell + SEO

**Files:**
- Modify: `src/pages/index.astro` (the `<Reviews />` usage + section wrapper + JSON-LD)

**Interfaces:**
- Consumes: `Reviews.astro` (Task 7), `StaticReviews.astro` (Task 6).

- [ ] **Step 1: Locate the reviews section** in `src/pages/index.astro` (it renders `<Reviews />` inside a `<section id="reviews">`; the current section head text lives there or in the component — read it first). Wrap the two components so the section head stays static and only the cards are deferred:

```astro
---
import Reviews from '../components/sections/Reviews.astro';
import StaticReviews from '../components/sections/StaticReviews.astro';
// ...existing imports
---

<section class="block tm-section" id="reviews">
  <div class="wrap">
    <div class="section-head center reveal">
      <span class="eyebrow">รีวิวจริงจากลูกค้า</span>
      <h2>ลูกค้าพูดถึงเราอย่างไร</h2>
      <p>เสียงส่วนหนึ่งจากผู้ที่เดินทางไปกับเรา</p>
    </div>
  </div>
  <Reviews server:defer>
    <StaticReviews slot="fallback" />
  </Reviews>
</section>
```

(Keep the existing `data-i18n` attributes on the head if the current markup has them. If `Reviews.astro` previously owned the `<section>`/head, move that shell here so the head is not inside the deferred island.)

- [ ] **Step 2: Add `AggregateRating` JSON-LD** (static) near the page's existing structured data. Use a conservative, honest aggregate:

```astro
<script type="application/ld+json" set:html={JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SABUYGO',
  url: 'https://sabuygo.com',
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: '128', bestRating: '5' },
})} />
```

(Confirm the `ratingValue` / `reviewCount` with the user before prod — placeholder-safe numbers here; do not fabricate on the live site. Flag in the task report.)

- [ ] **Step 3: Verify island + fallback**

Run: `npm run build && node ./dist/server/entry.mjs` with `BOS_PUBLIC_API=http://localhost:3002` (BOS dev seeded). Load `/`:
- With BOS up: reviews cards show live data (masked name, car photo).
- Stop BOS, hard-reload: the static fallback renders (never empty).
Expected: no console errors; the `#reviews` section head is present in the initial static HTML.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(reviews): defer live reviews island with static fallback on home page"
```

### Task 9: Card interaction — reveal, marquee pause, CTA auto-fill

**Files:**
- Modify: `src/styles/global.css` (append reviews card + reveal + marquee CSS)
- Modify: `src/pages/index.astro` (append one delegated `<script>`)

**Interfaces:**
- Consumes: the `.tm-card` / `.tm-cta` markup from Tasks 6-7; the ServiceTabs controls `.svc-tab[data-svc]`, `.vtype-chip[data-value]`, and `#bookingForm` / `#b_pickup` (existing).

- [ ] **Step 1: Append card + reveal + marquee CSS** to `src/styles/global.css` (unscoped so it applies to both fallback and island cards; reuse existing tokens):

```css
/* ---------- Reviews cards: photo-left, reveal-on-interaction ---------- */
.tm-rows { display: flex; flex-direction: column; gap: 1rem; overflow: hidden; }

.tm-card {
  flex: 0 0 auto;
  width: clamp(280px, 82vw, 360px);
  margin-right: 1.25rem;
  display: flex;
  gap: 0.9rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 1rem;
  box-shadow: var(--shadow-sm);
}

.tm-car { flex: 0 0 84px; align-self: stretch; border-radius: var(--r-md); overflow: hidden; background: var(--bg-secondary); }
.tm-car img { width: 84px; height: 100%; object-fit: cover; }

.tm-body { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; flex: 1; }
.tm-stars { color: var(--gold); letter-spacing: 2px; font-size: 0.82rem; line-height: 1; }
.tm-quote {
  font-family: var(--font-display); font-size: 1rem; font-weight: 400; line-height: 1.45; color: var(--text-primary);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.tm-author b { display: block; font-size: 0.86rem; font-weight: 600; color: var(--text-primary); }
.tm-author small { font-size: 0.75rem; color: var(--text-tertiary); }

/* CTA hidden until the card is revealed (hover/focus on desktop, .is-open tap on mobile) */
.tm-cta {
  align-self: flex-start; margin-top: 0.25rem;
  max-height: 0; opacity: 0; overflow: hidden; padding: 0 0.9rem;
  border: 1.5px solid var(--gold-dark); border-radius: var(--r-md);
  background: var(--gold-wash); color: var(--gold-dark);
  font-family: var(--font); font-size: 0.82rem; font-weight: 600; cursor: pointer;
  transition: max-height 0.25s ease, opacity 0.2s ease, padding 0.25s ease;
}
.tm-card:hover .tm-quote, .tm-card:focus-within .tm-quote, .tm-card.is-open .tm-quote { -webkit-line-clamp: 6; }
.tm-card:hover .tm-cta, .tm-card:focus-within .tm-cta, .tm-card.is-open .tm-cta {
  max-height: 44px; opacity: 1; padding: 0.5rem 0.9rem;
}

/* Marquee motion; pause on hover so a card can be revealed/clicked */
.marquee { overflow: hidden; }
.marquee-track { display: flex; width: max-content; animation: tm-scroll 42s linear infinite; }
.marquee-track.ltr { animation-direction: reverse; }
.marquee:hover .marquee-track { animation-play-state: paused; }
@keyframes tm-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

@media (prefers-reduced-motion: reduce) {
  .marquee-track { animation: none; flex-wrap: wrap; width: 100%; }
  .tm-card:hover .tm-cta, .tm-card.is-open .tm-cta { transition: none; }
}
```

(If `global.css` already defines `.marquee` / `.marquee-track` / `@keyframes` for the old Reviews section, REPLACE those rules rather than duplicating — read the file first and reconcile.)

- [ ] **Step 2: Append the delegated interaction script** to `src/pages/index.astro` (one listener at document level — survives the island's fallback→live swap, binds nothing per-card):

```astro
<script>
  (function () {
    'use strict';
    // Mobile tap toggles reveal (desktop uses :hover / :focus-within CSS).
    // CTA click pre-fills the booking form's service + vehicle via the existing
    // ServiceTabs controls, then scrolls to the form and focuses the pickup field.
    document.addEventListener('click', function (e) {
      var target = e.target as HTMLElement;
      var cta = target.closest('.tm-cta') as HTMLElement | null;
      if (cta) {
        var svc = cta.dataset.svc;
        var veh = cta.dataset.vehicle;
        if (svc) { var t = document.querySelector('.svc-tab[data-svc="' + svc + '"]') as HTMLButtonElement | null; if (t) t.click(); }
        if (veh) { var c = document.querySelector('.vtype-chip[data-value="' + veh + '"]') as HTMLButtonElement | null; if (c) c.click(); }
        var form = document.getElementById('bookingForm');
        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var pickup = document.getElementById('b_pickup') as HTMLInputElement | null;
        if (pickup) window.setTimeout(function () { pickup.focus(); }, 400);
        return;
      }
      // Tap-to-reveal on touch: toggle .is-open on the tapped card (ignore desktop hover devices).
      if (window.matchMedia('(hover: none)').matches) {
        var card = target.closest('.tm-card') as HTMLElement | null;
        if (card) {
          document.querySelectorAll('.tm-card.is-open').forEach(function (o) { if (o !== card) o.classList.remove('is-open'); });
          card.classList.toggle('is-open');
        }
      }
    });
  })();
</script>
```

- [ ] **Step 3: Full interaction verification** (`node ./dist/server/entry.mjs`, BOS up)

- Desktop: hover a card → quote expands + "จองบริการนี้" appears; marquee pauses on hover.
- Click a CTA → the matching service tab + vehicle chip become active, page scrolls to the booking form, pickup field focuses.
- Mobile emulation (touch): tap a card → reveal toggles; tap the CTA → same auto-fill.
- `prefers-reduced-motion`: marquee is static (wraps), no scrolling.

- [ ] **Step 4: dev-web verification** (after the BOS deploy gate)

With BOS `feat/reviews-public-api` live on `bos.sabuygo.com` and the landing deployed to dev-web with `BOS_PUBLIC_API=https://bos.sabuygo.com`:
Run: `curl -s https://dev-web.sabuygo.com/ | grep -c 'tm-card'` (>0), and load the page — live reviews render with real car photos; CTA auto-fill works end to end.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/pages/index.astro
git commit -m "feat(reviews): card reveal + marquee pause + CTA auto-fill interaction"
```

---

## Self-review notes

- **Spec coverage:** consent gate (T1-4), public API + masking + no PII (T3), server island + fallback (T6-8), photo-left card + reveal + mobile tap (T6/T7/T9), CTA reverse-map auto-fill (T7/T9), marquee pause + reduced-motion (T9), SEO JSON-LD (T8). Out-of-scope items (driver binding, area filter, date range, feasibility) are absent by construction.
- **Type consistency:** `Review` (landing) matches the T3 payload keys exactly; `svcUi`/`vehUi` reverse maps match the Global Constraints table and `BookingForm.astro` SVC_API/VT_API inverse; CTA `data-svc`/`data-vehicle` are UI keys consumed unchanged by the delegated script's `.svc-tab[data-svc]` / `.vtype-chip[data-value]` selectors.
- **Open confirmations flagged in-task:** JSON-LD `ratingValue`/`reviewCount` need real numbers before prod (T8 Step 2); the admin PATCH route already passes body through unchanged (no route edit needed, mass-assignment is pre-existing on an auth-gated admin route — not addressed here).
- **Deploy discipline:** BOS deploy gate before dev-web; prod = HARD-STOP.
