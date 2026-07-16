# Landing Dynamic Reviews from BOS — Design

Date: 2026-07-16
Repos: `elite-chauffeur` (landing, Astro Node standalone) + `elite-chauffeur-backoffice` (BOS).
Branches (proposed): landing `feat/dynamic-reviews`; BOS `feat/reviews-public-api` (off BOS `main`, the deploy branch).

## Goal

Replace the landing's static, hardcoded reviews marquee with real, PDPA-consented,
published customer reviews fetched live from BOS. Each card is genuine social proof
(real car photo + real review text) and carries a low-friction CTA that pre-fills the
booking form's service type and vehicle type, then scrolls the customer to the route
field — so a convinced visitor finishes fast.

This is **Layer 1** of a larger vision. Layers 2-4 (specific-driver booking,
service-area filtering, multi-day date range, drive-back feasibility) are explicitly
out of scope here and get their own specs.

## Problem

`src/components/sections/Reviews.astro` is a static two-row marquee with hardcoded
Thai testimonials (`คุณแน****`, i18n keys `tm.q1..q8`). It is not connected to real
data. BOS already stores real reviews (`reviews` table: `driverId`, `vehicleId`,
`rating`, `comment`, `isPublished`) but:

- There is **no public reviews API** (only an admin `GET /api/reviews` that returns
  all rows, unfiltered).
- There is **no PDPA/consent field** — only `isPublished` (bool). Publishing a real
  customer's name and comment publicly needs a recorded, auditable consent signal.
- Reviews are not surfaced with the driver's car photo, and there is no path from a
  review to the booking form.

## Decisions (locked in brainstorming)

- **D1 — Layer 1 only.** Ship dynamic reviews + car photo + reveal-on-interaction +
  a category-level "book" CTA. Defer specific-driver booking, area filter, date range,
  and feasibility to later specs.
- **D2 — CTA binds to category, not to a person.** Part-time drivers churn constantly,
  so the card never promises "book this driver." The button pre-fills only
  `serviceType` + `vehicleType`. No `preferredDriverId`. The car photo + review are a
  historical trip snapshot (social proof), not an availability promise.
- **D3 — Explicit PDPA consent gate.** Add `pdpaConsent` + `consentAt` to `reviews`.
  The public API serves a row only when `isPublished = true AND pdpaConsent = true`.
  Admin captures consent per review. Customer names are masked in the API response so
  full names never leave BOS; no driver PII (name/phone/plate/id) is exposed.
- **D4 — Minimal-input CTA.** Clicking a card sets the service + vehicle tab, scrolls
  to `#bookingForm`, and focuses `#b_pickup`. Route + date/time + contact remain the
  customer's input (name/phone/Turnstile are mandatory for the BOS inquiry lead —
  a literal "date only" finish is not possible via the structured form).
- **D5 — Astro Server Islands for freshness.** Reviews render as a deferred server
  island (`server:defer`) with the current static cards as the fallback slot. The home
  page stays prerendered/static on the hot path; the island is server-rendered
  per-request (Node) with a TTL cache + stale-on-error. If BOS is unreachable or
  returns zero, the static fallback stays — the section is never empty.

## Architecture

### A. BOS — schema change (`reviews` table)

`src/db/schema.ts` (reviews ~379-398), add two columns after `isPublished`:

- `pdpaConsent boolean('pdpa_consent').notNull().default(false)` — publish-consent flag.
- `consentAt timestamp('consent_at', { withTimezone: true })` — nullable; stamped when
  consent is toggled on (audit trail).

Drizzle migration in `drizzle/` + `db:push`. No backfill: existing rows default to
`pdpaConsent = false`, so nothing publishes until an admin explicitly consents.

### B. BOS — public reviews API

New `src/app/api/public/reviews/route.ts`, mirroring `api/public/articles/route.ts`:

- `export const dynamic = 'force-dynamic'`; `Access-Control-Allow-Origin: *`.
- `Cache-Control: public, max-age=300` (reviews change rarely; lets the browser/CDN
  cache the island's upstream fetch).
- Calls a new query `getPublicReviews(limit = 30)` in `src/db/queries/reviews.ts`:
  `where(and(eq(reviews.isPublished, true), eq(reviews.pdpaConsent, true)))`,
  left-join `drivers` (for `vehiclePhotoUrl`, `vehicleType`), left-join `bookings`
  (for `serviceType`), `orderBy(desc(reviews.createdAt))`, `limit`.
- Maps to a minimal public payload — no PII beyond a masked name:
  ```
  {
    id: string,
    rating: number,            // 1..5
    comment: string,           // Thai, verbatim
    customerNameMasked: string,// e.g. "คุณแน****" — masked server-side
    carPhotoUrl: string | null,// drivers.vehiclePhotoUrl (may be null)
    vehicleType: string | null,// drivers.vehicleType
    serviceType: string | null,// bookings.serviceType (canonical code)
    createdAt: string          // ISO
  }
  ```
  wrapped as `{ reviews: [...] }`.
- **Masking** happens in the API (a `maskName()` helper): keep an optional `คุณ`
  honorific if present, keep the first grapheme of the given name, append `****`.
  Raw `customerName` / `customerPhone` / `driverId` / plate never appear in the payload.

### C. BOS — admin consent capture

- `src/app/(bos-v2)/dashboard/reviews/page.tsx`: add a per-review "ยินยอมเผยแพร่ (PDPA)"
  toggle beside the existing publish control, showing `consentAt` when set.
- `updateReview(id, data)` (`src/db/queries/reviews.ts:101`) accepts `pdpaConsent`;
  when it transitions to `true`, set `consentAt = now()` (and leave it when toggled off,
  or clear it — chosen in the plan; default: set on enable, keep as historical record).
- The public gate is `isPublished AND pdpaConsent`, so an admin must both publish and
  consent for a review to go live.

### D. Landing — reviews data client

- `src/lib/reviews-api.ts` (mirror `src/lib/blog-api.ts`): reads `BOS_PUBLIC_API`
  (trailing slash stripped), `getReviews()` → `Review[]`, in-memory TTL cache
  (default 120s) keyed `reviews`, stale-on-error (return last good on fetch throw /
  non-2xx, else `[]`). This runs server-side inside the island.
- `src/lib/reviews-types.ts`: typed `Review` interface matching the API payload.

### E. Landing — Reviews section (server island)

- `src/components/sections/Reviews.astro`: rewrite. Frontmatter calls `getReviews()`
  and renders the two-row marquee from live data (same `.tm-card` / `.tm-photo` markup
  and tokens as today). Car photo on the left; text-only card variant when
  `carPhotoUrl` is null (matches current mixed photo/text cards). Reveal panel content:
  full comment + a vehicle/service label + the "จองบริการนี้" button.
- `src/components/sections/StaticReviews.astro` (new): the current hardcoded cards,
  extracted verbatim, used as the island's fallback (and SEO baseline). Its cards also
  carry the CTA data attributes so the button works even without live data.
- `src/pages/index.astro`: render
  `<Reviews server:defer><StaticReviews slot="fallback" /></Reviews>`.
  The home page itself stays prerendered/static.

### F. Landing — card interaction + CTA auto-fill

- **Reveal**: CSS-driven on desktop (`:hover` / `:focus-within` expands the panel);
  a small client `<script>` adds tap-to-toggle on touch (no hover on mobile) and
  `prefers-reduced-motion` handling.
- **Marquee vs reveal conflict**: pause the marquee animation on hover / when a card is
  tap-expanded (`animation-play-state: paused`). `prefers-reduced-motion` → no marquee
  (static wrapping grid).
- **CTA auto-fill**: each button carries `data-svc` (BOS `serviceType`) and
  `data-vehicle` (BOS `vehicleType`). Handler reverse-maps to the ServiceTabs UI keys,
  activates the matching service tab + vehicle option (via ServiceTabs' hidden inputs
  `#serviceType` / `#vehicleType` and its tab controls — see `ServiceTabs.astro`),
  then `document.getElementById('bookingForm').scrollIntoView(...)` and
  `#b_pickup.focus()`.
  Reverse maps (inverse of `BookingForm.astro` SVC_API / VT_API):
  - service: `one_way→airport`, `wait_return→b2b`, `hourly_charter→rental`,
    `daily_charter→fullday`.
  - vehicle: BOS `drivers.vehicleType` → `sedan | suv | premium | any` (verify the BOS
    enum values in `src/lib/constants.ts` during the plan; unknown → `any`).

### G. SEO

- The static fallback (real curated reviews) ships in the prerendered HTML, so crawlers
  always see review content and there is no layout shift.
- Keep / add an `AggregateRating` (and optionally `Review`) JSON-LD block rendered
  statically, preserving the current 93/100 SEO score. Live island content does not
  regress it.

## Data flow

```
Customer reviews trip (BOS)
  -> admin publishes + records PDPA consent  (isPublished=true, pdpaConsent=true, consentAt set)
  -> GET /api/public/reviews  (published+consented, joined car photo/vehicle/service, name masked, no PII)
  -> landing island getReviews() (TTL cache + stale-on-error, server-side)
  -> Reviews.astro renders marquee cards; StaticReviews is the fallback
  -> customer hovers/taps a card -> reveal review + "จองบริการนี้"
  -> click -> set service+vehicle tab, scroll to #bookingForm, focus #b_pickup
  -> customer fills route + date/time + contact -> existing POST /api/public/inquiry
```

## Out of scope / follow-ups

- **Specific-driver booking / `preferredDriverId`** (was Layer 2) — dropped per D2.
- **Service-area filter** (driver `serviceZones` / `baseProvince` vs a picked zone) —
  Layer 3, separate spec.
- **Multi-day date range** (`endDatetime` / duration on the public form) — Layer 3.
  BOS schema already supports it (`bookings.endDatetime`, SP-B); the public inquiry
  form and API do not yet.
- **Drive-back feasibility** (verdict ว่าง/ตึง/ชน) — Layer 4. The SP-D engine is
  unbuilt even in BOS admin (`AssignDriverPanel.tsx:475` defers it); it must land
  admin-side before any public exposure.
- **English translation of live reviews** — live Thai comments are shown verbatim in
  both locales; only the static fallback keeps its i18n keys.
- **RSS / review pagination / write-a-review flow** — not now.

## Risks

- **BOS availability is a runtime dependency of the island.** Mitigated by TTL cache +
  stale-on-error + the static fallback slot. Cold cache + BOS down = fallback shows
  (acceptable, never empty, never a 500 on the home page).
- **PDPA exposure.** Mitigated: explicit consent gate (`pdpaConsent`), server-side name
  masking, zero driver PII in the payload. A published-but-not-consented review is
  excluded.
- **`vehicleType` enum drift** between BOS `drivers.vehicleType` and the landing
  ServiceTabs keys → wrong / no vehicle pre-fill. Mitigated by verifying the map in the
  plan and defaulting unknown values to `any`.
- **`carPhotoUrl` null** (driver has no `vehiclePhotoUrl`) → render the text-only card
  variant; do not show a broken image.
- **Server islands maturity.** Astro 5 stable feature; the site already runs Node
  standalone. Fallback slot bounds the blast radius if the island errors.
- **Prod-affecting BOS change.** Schema migration + new public route deploy to
  `bos.sabuygo.com` from a branch off `main`. HARD-STOP on prod deploy; verify on dev
  first. Do not fold this onto `redesign/bos-spatial-glass`.

## Testing approach

- **BOS**: migration applies; `getPublicReviews` returns only `isPublished && pdpaConsent`
  rows with joined car photo / vehicleType / serviceType; API masks the name, omits all
  PII, sets CORS + Cache-Control; admin toggle sets `consentAt`; a consented+published
  seed row appears, a published-only row does not.
- **Landing (dev, island reachable + a stub/real BOS)**: island renders live cards;
  BOS down / empty → static fallback renders; hover (desktop) and tap (mobile) reveal
  the panel; marquee pauses on hover; `prefers-reduced-motion` → static grid; CTA sets
  the correct service + vehicle tab, scrolls to the form, focuses `#b_pickup`;
  `carPhotoUrl` null → text-only card.
- **Build**: `astro build` succeeds and emits the server island; home page stays
  prerendered. Lighthouse ≥95 performance/accessibility preserved; SEO JSON-LD intact.
- **Deploy (dev-web only)**: BOS API live first, then landing island consumes it on
  dev-web; prod untouched.

## Rollout

1. BOS: `feat/reviews-public-api` off `main` — schema migration, `getPublicReviews`,
   public route, admin consent toggle. Verify on BOS dev, then deploy BOS (prod
   `bos.sabuygo.com`) so the API is live.
2. Landing: `feat/dynamic-reviews` — reviews-api client, Reviews/StaticReviews
   components, index island wiring, interactions. Verify on dev-web against the live
   BOS API.
3. Prod (landing) — HARD-STOP; awaits explicit go after dev-web verification.
