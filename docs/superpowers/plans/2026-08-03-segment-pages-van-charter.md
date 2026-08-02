# Segment Landing Pages `/van/` + `/charter/` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two SEO landing pages for the top-demand segment (day charter + van hire) per `docs/superpowers/specs/2026-08-02-target-segments-positioning-design.md`.

**Architecture:** Follow the proven collection + template pattern already in the repo: a new `services` content collection (YAML per page) rendered by one shared `src/pages/[service].astro` template — same shape as `src/pages/routes/[slug].astro`, which is the reference implementation to copy idioms from (Base props, JSON-LD blocks, price table with nullable prices, FAQ accordion, bodyI18n).

**Tech Stack:** Astro 5 static output, content collections (zod), Base.astro layout, vitest (existing suite must stay green), `scripts/measure-viewport.mjs` for browser verification.

## Global Constraints

- Thai-first copy; EN via `bodyI18n` page dict (same mechanism as routes pages; see `src/content.config.ts` doc comments).
- Search vocabulary from the spec is mandatory in title/h1/description: `/van/` uses "เหมารถตู้พร้อมคนขับ" + "รถตู้เหมา" + "เช่ารถตู้พร้อมคนขับ"; `/charter/` uses "เหมารถ" + "รถเช่าพร้อมคนขับ". Never use "เหมารถพร้อมคนขับ" as the lead phrase (measured near-zero demand).
- Messaging pillar per page (spec): both pages = pillar 2 "มืออาชีพตรวจสอบได้" lead, pillar 1 "ราคาล็อกตั้งแต่จอง" support. No promo/urgency language (brand voice: composed).
- **No invented business numbers.** Van prices are not set yet → every van price cell renders "สอบถาม" (the existing `price-unavailable` pattern). Charter destination prices are copied verbatim from `src/content/routes/bangkok-to-pattaya.yaml` `extraRatesTable.rows` — never typed from memory.
- Do NOT repeat the homepage Fleet "฿400–1,000/วัน" figures on these pages (unverified unit; out of scope).
- Vehicles are described by **category**, not model (locked decision 2026-07-27 #3). Van categories: "รถตู้ VIP 9–10 ที่นั่ง" and "รถตู้มาตรฐาน 13 ที่นั่ง" — categories only, no brand/model claims.
- SEO is load-bearing: every page ships title, meta description, canonical `https://sabuygo.com/<slug>/`, OG tags, JSON-LD (Service + BreadcrumbList + FAQPage). `trailingSlash: 'always'` — all internal links end with `/`.
- Do not touch `Nav.astro`, `Hero.astro`, homepage sections, or anything under `src/scripts/motion/` (final whole-branch review in flight on those files).
- Do not push; commits stay on `redesign/parallax-v1`.
- All 72 existing vitest tests must stay green after every task.

## File Structure

- `src/content.config.ts` — add `services` collection schema (Modify)
- `src/content/services/van.yaml` — van page content (Create)
- `src/content/services/charter.yaml` — charter page content (Create)
- `src/pages/[service].astro` — shared template, top-level slugs from the collection (Create)
- `public/sitemap.xml` — two new `<url>` entries (Modify)

---

### Task 1: `services` collection schema + both YAML entries

**Files:**
- Modify: `src/content.config.ts` (add collection near the existing `routes` definition; export in `collections`)
- Create: `src/content/services/van.yaml`
- Create: `src/content/services/charter.yaml`

**Interfaces:**
- Produces: collection `services` with entries `van`, `charter`; schema fields consumed by Task 2's template exactly as named below.

- [ ] **Step 1: Add the schema to `src/content.config.ts`**

Insert after the `routes` collection, reusing the already-defined `seoMeta`, `faqItem`, `relatedLink`, `bodyI18n` consts:

```ts
// ==================== SERVICES (segment landing pages: /van/, /charter/) ====================

const servicesIncludedItem = z.object({
  icon: z.enum(['shield', 'lines', 'globe', 'clock', 'chat', 'water', 'check']),
  title: z.string(),
  desc: z.string(),
  i18nKey: z.string(),
});

const servicesRateRow = z.object({
  label: z.string(),          // row label, e.g. vehicle category or destination
  sub: z.string().optional(), // small line under the label
  cols: z.array(z.number().nullable()).length(3), // null renders as "สอบถาม"
});

const services = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/services' }),
  schema: seoMeta.extend({
    serviceName: z.string(),
    serviceDescription: z.string(),
    serviceType: z.string(),           // JSON-LD Service.serviceType
    areaServed: z.array(z.string()),
    priceLow: z.string().nullable(),   // null → omit offers block entirely
    priceHigh: z.string().nullable(),
    breadcrumbName: z.string(),
    heroHeadingHtml: z.string(),
    heroSub: z.string(),
    heroPoints: z.array(z.string()).length(3), // pillar bullets under the sub
    priceHeading: z.string(),
    priceDesc: z.string(),
    priceCols: z.array(z.string()).length(3),      // column headings
    priceColKeys: z.array(z.string()).length(3),   // data-i18n keys, same order
    rateRows: z.array(servicesRateRow),
    priceFootnote: z.string(),
    includedDesc: z.string(),
    included: z.array(servicesIncludedItem),
    faq: z.array(faqItem),
    related: relatedLink,
    bodyI18n,
  }),
});
```

and change the export to:

```ts
export const collections = { airports, routes, services };
```

- [ ] **Step 2: Write `src/content/services/van.yaml`**

```yaml
title: "เหมารถตู้พร้อมคนขับ กรุงเทพ–ต่างจังหวัด คนขับมืออาชีพ | SABUYGO"
description: "เช่ารถตู้พร้อมคนขับมืออาชีพ เหมาวันหรือรายเที่ยว กรุงเทพและต่างจังหวัด รถมีประกันภัย ราคาแจ้งชัดก่อนจอง ไม่มีบวกหน้างาน ตอบกลับใน 15 นาที"
canonical: "https://sabuygo.com/van/"
keywords: "รถตู้เหมา, เช่ารถตู้พร้อมคนขับ, เหมารถตู้, รถตู้เหมาพร้อมคนขับ, เหมารถตู้ไปต่างจังหวัด"
ogTitle: "เหมารถตู้พร้อมคนขับ — มืออาชีพ ราคาชัดตั้งแต่จอง"
ogDescription: "รถตู้เหมาวันหรือรายเที่ยว คนขับผ่านการคัดกรอง รถมีประกัน แจ้งราคาก่อนจองทุกครั้ง"
serviceName: "เหมารถตู้พร้อมคนขับ (Van with Driver)"
serviceDescription: "บริการเหมารถตู้พร้อมคนขับมืออาชีพ รายวันและรายเที่ยว กรุงเทพฯ และทุกจังหวัด"
serviceType: "Van Charter with Driver"
areaServed: ["Bangkok", "Pattaya", "Hua Hin", "Khao Yai", "Kanchanaburi"]
priceLow: null
priceHigh: null
breadcrumbName: "เหมารถตู้พร้อมคนขับ"
heroHeadingHtml: "เหมารถตู้พร้อมคนขับ<br>มืออาชีพ ราคาชัดตั้งแต่จอง"
heroSub: "เดินทางเป็นหมู่คณะแบบหมดกังวล — คนขับผ่านการคัดกรอง รถตู้มีประกันภัยครบ แจ้งราคาก่อนยืนยันจองทุกครั้ง ไม่มีเรียกเพิ่มหน้างาน"
heroPoints:
  - "คนขับคัดกรองประวัติ ชำนาญเส้นทางต่างจังหวัด"
  - "รถมีประกันภัยชั้นหนึ่ง ตรวจสภาพก่อนออกงาน"
  - "ราคาแจ้งชัดก่อนจอง มีระบบจองและใบเสร็จ"
priceHeading: "รูปแบบการเหมา"
priceDesc: "เลือกตามลักษณะทริป — ทีมงานยืนยันราคาตามเส้นทางจริงก่อนจองทุกครั้ง"
priceCols: ["รายเที่ยว (one-way)", "ไป-กลับในวัน", "เหมาวัน 10 ชม."]
priceColKeys: ["price.col.oneway", "price.col.round", "price.col.day"]
rateRows:
  - label: "รถตู้ VIP 9–10 ที่นั่ง"
    sub: "เบาะปรับเอน · เหมาะรับแขก VIP และครอบครัว"
    cols: [null, null, null]
  - label: "รถตู้มาตรฐาน 13 ที่นั่ง"
    sub: "เหมาะหมู่คณะ สัมมนา และทริปกลุ่มใหญ่"
    cols: [null, null, null]
priceFootnote: "ราคาขึ้นกับเส้นทางและจำนวนวัน แจ้งราคารวมทุกอย่างก่อนยืนยันจอง — สอบถามผ่านฟอร์มหรือ LINE ตอบกลับใน 15 นาที"
includedDesc: "ทุกการเหมารถตู้รวมสิ่งเหล่านี้ ไม่มีบวกเพิ่มภายหลัง"
included:
  - icon: shield
    title: "ประกันภัยครอบคลุมผู้โดยสาร"
    desc: "รถทุกคันมีประกันภัยชั้นหนึ่งและ พ.ร.บ. ครบถ้วน"
    i18nKey: "inc.insure"
  - icon: check
    title: "คนขับผ่านการคัดกรอง"
    desc: "ตรวจประวัติ ใบขับขี่สาธารณะ และประเมินการขับจริง"
    i18nKey: "inc.driver"
  - icon: clock
    title: "ตรงเวลา ยืดหยุ่นตามแผนทริป"
    desc: "ปรับจุดแวะได้ตามตกลง ไม่นับเป็นค่าใช้จ่ายแอบแฝง"
    i18nKey: "inc.time"
  - icon: chat
    title: "ประสานงานตลอดทริป"
    desc: "ทีมงานติดต่อได้ทาง LINE ตลอดการเดินทาง"
    i18nKey: "inc.support"
faq:
  - question: "เหมารถตู้พร้อมคนขับ ราคาเท่าไหร่?"
    answer: "ราคาขึ้นกับเส้นทาง ระยะทาง และจำนวนวัน ทีมงานแจ้งราคารวมทุกอย่าง (รถ คนขับ น้ำมัน) ให้ก่อนยืนยันจอง ไม่มีเรียกเพิ่มหน้างาน สอบถามผ่านฟอร์มหรือ LINE ได้เลย ตอบกลับภายใน 15 นาที"
  - question: "รวมค่าน้ำมันและทางด่วนไหม?"
    answer: "ใบเสนอราคาระบุชัดว่ารวมอะไรบ้าง โดยทั่วไปราคาเหมารวมค่ารถ คนขับ และน้ำมัน ส่วนค่าทางด่วนและที่จอดตามจริง — ทุกอย่างแจ้งเป็นลายลักษณ์อักษรก่อนจอง"
  - question: "จองล่วงหน้ากี่วัน?"
    answer: "แนะนำล่วงหน้าอย่างน้อย 2–3 วันสำหรับทริปต่างจังหวัด ช่วงเทศกาลควรจองเร็วขึ้น หากเร่งด่วนทัก LINE เพื่อเช็กคิวรถได้ทันที"
  - question: "คนขับรอค้างคืนที่ปลายทางได้ไหม?"
    answer: "ได้ สำหรับทริปหลายวัน ค่าที่พักคนขับจะระบุในใบเสนอราคาอย่างชัดเจนตั้งแต่ต้น"
related:
  heading: "เหมารถเก๋ง / SUV"
  desc: "เดินทางกลุ่มเล็ก ดูบริการเหมารถพร้อมคนขับรายวัน"
  href: "/charter/"
  cta: "ดูบริการเหมารถ"
bodyI18n:
  crumb.home: "Home"
  crumb.current: "Van with Driver"
  hero.h1: "Van hire with a professional driver<br>clear price before you book"
  hero.sub: "Group travel without the worry — vetted drivers, fully insured vans, and an all-in price confirmed before every booking. No surprises on the day."
  hero.p1: "Vetted drivers who know upcountry routes"
  hero.p2: "First-class insurance, pre-trip inspection"
  hero.p3: "Clear quote, booking system, and receipt"
  price.h2: "Charter options"
  price.desc: "Pick your trip style — our team confirms the exact price for your route before you book"
  price.col.oneway: "One-way"
  price.col.round: "Same-day return"
  price.col.day: "Full day 10h"
  price.ask: "Ask us"
  price.footnote: "Prices depend on route and days. We always quote an all-in price before you confirm — message us via the form or LINE, reply within 15 minutes."
  inc.h2: "Every van charter includes"
  inc.desc: "All of this is included — nothing added later"
  inc.insure.t: "Passenger insurance"
  inc.insure.d: "Every van carries first-class insurance and compulsory cover"
  inc.driver.t: "Vetted drivers"
  inc.driver.d: "Background check, public licence, and a real driving assessment"
  inc.time.t: "On time, flexible"
  inc.time.d: "Adjust stops as agreed — never a hidden charge"
  inc.support.t: "Support throughout"
  inc.support.d: "Reach our team on LINE for the whole trip"
  faq.h2: "Frequently asked questions"
  faq.q1: "How much does a van with driver cost?"
  faq.a1: "It depends on the route, distance, and number of days. We quote an all-in price (van, driver, fuel) before you confirm — no on-the-day extras. Ask via the form or LINE; we reply within 15 minutes."
  faq.q2: "Are fuel and tolls included?"
  faq.a2: "Your quote states exactly what is included. Typically the price covers van, driver, and fuel; tolls and parking are at cost — everything in writing before you book."
  faq.q3: "How far in advance should I book?"
  faq.a3: "At least 2–3 days for upcountry trips; earlier during holidays. For urgent trips, message us on LINE to check availability."
  faq.q4: "Can the driver stay overnight?"
  faq.a4: "Yes. For multi-day trips the driver's accommodation cost is stated clearly in the quote from the start."
  rel.label: "Sedan / SUV charter"
  rel.desc: "Travelling as a small group? See our daily car-with-driver service"
  rel.cta: "View car charter"
  cta.desc: "Fill in the form above or message us on LINE — reply within 15 minutes"
  cta.book: "Book via form"
```

- [ ] **Step 3: Write `src/content/services/charter.yaml`**

Same structure. Copy notes that differ:

```yaml
title: "เหมารถพร้อมคนขับ รายวัน เที่ยวต่างจังหวัด ราคาชัดเจน | SABUYGO"
description: "เหมารถเก๋ง SUV พร้อมคนขับมืออาชีพ เที่ยวต่างจังหวัดหรือเหมาวันในเมือง รถมีประกัน ราคาแจ้งชัดก่อนจอง ไม่มี surge ไม่มีบวกหน้างาน"
canonical: "https://sabuygo.com/charter/"
keywords: "เหมารถ, รถเช่าพร้อมคนขับ, เหมารถเที่ยว, เหมารถรายวัน, เหมารถไปต่างจังหวัด"
ogTitle: "เหมารถพร้อมคนขับ — เที่ยวสบาย ราคาชัดตั้งแต่จอง"
ogDescription: "เหมารถรายวันกับคนขับมืออาชีพ รถมีประกัน แจ้งราคาก่อนจองทุกครั้ง"
serviceName: "เหมารถพร้อมคนขับรายวัน (Daily Car Charter)"
serviceDescription: "บริการเหมารถเก๋งและ SUV พร้อมคนขับมืออาชีพ รายวันและรายเที่ยว กรุงเทพฯ และต่างจังหวัด"
serviceType: "Daily Car Charter with Driver"
areaServed: ["Bangkok", "Pattaya", "Hua Hin", "Khao Yai", "Kanchanaburi", "Ayutthaya"]
breadcrumbName: "เหมารถพร้อมคนขับ"
heroHeadingHtml: "เหมารถพร้อมคนขับ<br>เที่ยวสบาย ราคาชัดตั้งแต่จอง"
heroSub: "อยากเที่ยวโดยไม่ต้องขับเอง — คนขับมืออาชีพชำนาญเส้นทาง รถมีประกันครบ ราคาเหมารวมแจ้งก่อนจอง แวะได้ตามแผนของคุณ"
priceHeading: "ราคาเหมาวันตามปลายทางยอดนิยม"
priceDesc: "ตัวอย่างราคา day-trip ปลายทางยอดนิยม — เส้นทางอื่นสอบถามได้ ทีมงานยืนยันราคาก่อนจองทุกครั้ง"
priceCols: ["Sedan · 3 ที่นั่ง", "SUV / MPV · 6 ที่นั่ง", "VAN · 6 ที่นั่ง"]
priceColKeys: ["price.col.sedan", "price.col.suv", "price.col.van"]
related:
  heading: "เดินทางหมู่คณะ?"
  desc: "กลุ่มใหญ่ 9 คนขึ้นไป ดูบริการเหมารถตู้พร้อมคนขับ"
  href: "/van/"
  cta: "ดูบริการรถตู้"
```

`priceLow`/`priceHigh`: set from the min/max of the copied rows (real numbers, as strings). `rateRows`: **copy every row verbatim** from `src/content/routes/bangkok-to-pattaya.yaml` → `extraRatesTable.rows`, mapping `{route→label, note→sub, [sedan,suv,van]→cols}` — open that file and transcribe; do not type numbers from memory. `heroPoints`, `included` (same 4 items as van but re-worded for cars: swap "รถตู้"→"รถ"), `priceFootnote` ("ราคา day-trip รวมรถ คนขับ และน้ำมัน ค่าทางด่วนตามจริง — เส้นทางอื่นหรือค้างคืนหลายวัน สอบถามได้ ตอบกลับใน 15 นาที"), `includedDesc` ("ทุกการเหมารถรวมสิ่งเหล่านี้ ไม่มีบวกเพิ่มภายหลัง"), and this exact `faq`:

```yaml
faq:
  - question: "เหมารถพร้อมคนขับ คิดราคายังไง?"
    answer: "คิดตามเส้นทางและระยะเวลา ตารางด้านบนคือราคา day-trip ปลายทางยอดนิยม เส้นทางอื่นทีมงานแจ้งราคารวมทุกอย่างให้ก่อนยืนยันจอง ไม่มีบวกเพิ่มหน้างาน"
  - question: "แวะระหว่างทางได้ไหม?"
    answer: "ได้ ทริปเหมาวันแวะจุดท่องเที่ยว ร้านอาหาร หรือจุดถ่ายรูปได้ตามแผนของคุณ ตกลงเส้นทางคร่าว ๆ กับทีมงานตอนจองเพื่อให้ราคาที่แจ้งครอบคลุมครบ"
  - question: "คนขับพูดภาษาอังกฤษได้ไหม?"
    answer: "ระบุตอนจองได้ว่าต้องการคนขับที่สื่อสารภาษาอังกฤษ ทีมงานจะจัดคนขับให้ตรงกับความต้องการ"
  - question: "จองล่วงหน้ากี่วัน?"
    answer: "แนะนำล่วงหน้าอย่างน้อย 2–3 วัน ช่วงเทศกาลควรจองเร็วขึ้น หากเร่งด่วนทัก LINE เพื่อเช็กคิวรถได้ทันที"
```

Finally a full `bodyI18n` dict mirroring every key used on the page — same key list as van.yaml but with `price.col.sedan` ("Sedan · 3 seats") / `price.col.suv` ("SUV / MPV · 6 seats") / `price.col.van` ("VAN · 6 seats") replacing the oneway/round/day keys, hero/faq/inc values re-translated from the charter Thai copy above in the same register as van.yaml's EN dict (e.g. `hero.h1`: "Private car with driver<br>travel easy, clear price before you book", `faq.q2`: "Can we stop along the way?", `faq.a2`: "Yes — day charters can stop at sights, restaurants, or photo spots on your plan. Agree the rough route when booking so the quoted price covers everything.").

- [ ] **Step 4: Build to validate schemas**

Run: `npm run build`
Expected: PASS. A schema error here means a YAML field mismatch — fix the YAML, not the schema.

- [ ] **Step 5: Commit**

```bash
git add src/content.config.ts src/content/services/
git commit -m "feat(landing): add the services collection with van and charter content"
```

### Task 2: Shared `[service].astro` template

**Files:**
- Create: `src/pages/[service].astro`
- Reference (read, do not modify): `src/pages/routes/[slug].astro`

**Interfaces:**
- Consumes: collection `services` (Task 1 schema, field names exactly as defined there); `Base.astro` props `title/description/canonical/ogTitle/ogDescription/keywords/jsonLd/navBrandHref/navCtaHref/pageI18n`; `BookingForm.astro`.
- Produces: static pages `/van/` and `/charter/`.

- [ ] **Step 1: Create the template**

Start from a copy of `src/pages/routes/[slug].astro` and adapt. Keep: hero grid with `<BookingForm />` card, `.price-table` + mobile stacked variant, `.included-grid`, FAQ `<details>` list, `.related-strip`, `.cta-footer`, the `<style>` block essentially as-is. Change:

```astro
---
import { getCollection, type CollectionEntry } from 'astro:content';
import Base from '../layouts/Base.astro';
import BookingForm from '../components/BookingForm.astro';

export async function getStaticPaths() {
  const entries = await getCollection('services');
  return entries.map((entry) => ({ params: { service: entry.id }, props: { entry } }));
}

interface Props { entry: CollectionEntry<'services'>; }
const { entry } = Astro.props;
const d = entry.data;

const serviceSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: d.serviceType,
  name: d.serviceName,
  description: d.serviceDescription,
  provider: {
    '@type': 'LocalBusiness',
    name: 'SABUYGO',
    url: 'https://sabuygo.com',
    telephone: '+66623879159',
  },
  areaServed: d.areaServed.map((name) => ({ '@type': 'City', name })),
  url: d.canonical,
  // offers only when real prices exist — a priceless AggregateOffer is invalid
  ...(d.priceLow && d.priceHigh
    ? {
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'THB',
          lowPrice: d.priceLow,
          highPrice: d.priceHigh,
        },
      }
    : {}),
};

const breadcrumbSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'หน้าแรก', item: 'https://sabuygo.com/' },
    { '@type': 'ListItem', position: 2, name: d.breadcrumbName, item: d.canonical },
  ],
};

const faqSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: d.faq.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
};

const ICONS: Record<string, string> = { /* copy the ICONS map verbatim from routes/[slug].astro */ };
---
```

Body differences from the routes template:
- Breadcrumb is 2 levels (home / current).
- Under `heroSub`, render `d.heroPoints` as a 3-item list `<ul class="hero-points">` with a check icon per item, each `<li data-i18n={'hero.p' + (i+1)}>` .
- Price table: columns from `d.priceCols` / `d.priceColKeys`; rows from `d.rateRows` — `label` in `.veh-name`, `sub` in `.veh-type`, each of `cols` rendered like the routes `extraRatesTable` cells: `null` → `<span class="price-unavailable" data-i18n="price.ask">สอบถาม</span>`, number → `฿` + `toLocaleString()`.
- No `route-stats`, no `extraRatesTable` section, no day-trip-hours column header logic.
- Keep `set:html={d.heroHeadingHtml}` on the h1 and `data-i18n` attributes matching every key present in `bodyI18n` (the routes template shows the idiom, including the nested-span warning for table headers).

Add this style for the new list (rest of styles inherited from the copied block):

```css
.hero-points { list-style: none; padding: 0; margin: 0 0 2rem; display: grid; gap: 0.55rem; }
.hero-points li { display: flex; gap: 0.6rem; align-items: baseline; font-size: 0.92rem; color: var(--text-secondary); }
.hero-points li::before { content: '✓'; color: var(--gold-dark); font-weight: 600; }
```

- [ ] **Step 2: Build and inspect the output**

Run: `npm run build && ls dist/van dist/charter`
Expected: both directories exist with `index.html`.

Run: `node -e "const fs=require('fs');for(const p of ['dist/van/index.html','dist/charter/index.html']){const h=fs.readFileSync(p,'utf8');const ld=[...h.matchAll(/<script type=\"application\/ld\+json\">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));console.log(p, ld.map(x=>x['@type']).join(','), /rel=\"canonical\"/.test(h));}"`
Expected: each page lists `Service,BreadcrumbList,FAQPage` and `true`; JSON.parse throwing = malformed JSON-LD = fix before continuing. Additionally check `dist/van/index.html` contains `สอบถาม` and NO `฿null`.

- [ ] **Step 3: Run the existing suite**

Run: `npm test`
Expected: 72 passed, 0 failed.

- [ ] **Step 4: Browser spot-check**

With `npm run preview` serving :4321 (check if already running first):

Run: `MEASURE_URL=http://localhost:4321/van/ node scripts/measure-viewport.mjs 390 844 mobile none 'JSON.stringify({h1:!!document.querySelector("h1"),overflow:document.documentElement.scrollWidth-window.innerWidth,ask:document.querySelectorAll(".price-unavailable").length})'`
Expected: `h1:true`, `overflow:0`, `ask:6` (2 rows × 3 cols). Repeat at `1440 900 desktop` and for `/charter/` (charter expects `ask` ≥ 0 per however many null cells the copied rows contain).

- [ ] **Step 5: Commit**

```bash
git add src/pages/[service].astro
git commit -m "feat(landing): render van and charter segment pages from the services collection"
```

### Task 3: Sitemap entries + final verification

**Files:**
- Modify: `public/sitemap.xml`

**Interfaces:**
- Consumes: pages from Task 2.
- Produces: crawlable URLs for the two new pages.

- [ ] **Step 1: Add both URLs to `public/sitemap.xml`**

Insert after the homepage entry, matching the existing format:

```xml
  <url>
    <loc>https://sabuygo.com/van/</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://sabuygo.com/charter/</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
```

- [ ] **Step 2: Validate the XML**

Run: `python3 -c "import xml.etree.ElementTree as ET; ET.parse('public/sitemap.xml'); print('valid')"`
Expected: `valid`

- [ ] **Step 3: Full verification pass**

Run: `npm test && npm run build`
Expected: 72 passed; build clean. Then re-run the Task 2 Step 2 JSON-LD check one final time against the fresh build.

- [ ] **Step 4: Commit**

```bash
git add public/sitemap.xml
git commit -m "feat(landing): list the van and charter pages in the sitemap"
```
