# Hero สามวินาที Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้จอแรกของ sabuygo.com เหลือไม่เกิน 5 ก้อน 14 คำ และทำให้ภาพที่ลูกค้าภูมิใจมองเห็นได้จริงบนมือถือ

**Architecture:** ย้ายการ์ดฟอร์มออกจาก `Hero.astro` ไปเป็น section ของตัวเองใต้ hero (คง `id="booking"` เดิมไว้ทุก anchor จึงไม่พัง) แล้วตัดก้อนที่มาแย่งความสนใจออกจาก hero เหลือ H1 + ปุ่ม + ลิงก์ LINE + ตัวเลข 4.9 + ลูกศรบอกว่ามีต่อ จากนั้นแก้ต้นเหตุที่มือถือมองไม่เห็นภาพ: `.hero-bg` ต้องมีความสูงของตัวเองแทนการกิน `inset: 0` ของ section ที่สูง 2014px

**Tech Stack:** Astro 5.18.2 · TypeScript strict · CSS scoped ต่อ component · วัดผลด้วย Chrome DevTools Protocol

## Global Constraints

คัดตรงจาก spec `docs/superpowers/specs/2026-07-28-hero-three-second-design.md` (commit `3087b8f`)

1. **ห้ามแต่งคำใหม่แม้คำเดียว** งานนี้ทำได้เฉพาะ *ลบ* ก้อนที่มาแย่งความสนใจ และ *ขยาย* ก้อนที่เหลือ ข้อความ H1 ใช้ของเดิมทั้ง 4 ท่อน ไม่แตะ
2. **ห้ามแตะไฟล์ภาพ** `public/images/hero-bg.travelv1-baseline.webp` คือภาพที่หัวหน้าลูกค้าภูมิใจ ห้ามแก้ ห้าม regenerate ห้าม crop ทำลาย
3. id และ selector ที่ห้ามเปลี่ยน เพราะมีคนอื่นเรียกอยู่: `#booking` (ปุ่ม hero, ปุ่ม nav, สคริปต์ใน `Fleet.astro`) · `#b_pickup` (`Fleet.astro` สั่ง focus) · `.vtype-chip` และ `#vehicleType` (`Fleet.astro` ตั้งค่าก่อน scroll)
4. จอแรกเหลือ **≤ 5 ก้อน ≤ 14 คำ** วัดที่ 1440×900 และ 390×844
5. มือถือ: `.hero-bg` สูง **≤ 60%** ของความสูง section และ **ไม่มี veil เลย** (alpha = 0)
6. **`opacity` ของ H1 ต้องเป็น 1 เมื่อปิด JavaScript** — ห้ามให้ LCP อยู่ในชั้นที่ JS ขยับ
7. contrast ของ H1 กับพื้นหลังใต้มัน **≥ 4.5:1** ทั้งสองขนาดจอ
8. veil เดสก์ท็อป **ห้ามทาทั้งเฟรม** ต้องบังเฉพาะหลังคอลัมน์ข้อความ (การทาทั้งเฟรมคือสาเหตุที่เจดีย์จางหาย)
9. ไม่แตะ `src/scripts/motion/*.ts` ทุกไฟล์ · ไม่เพิ่ม dependency · ไม่เพิ่มไฟล์ภาพ
10. วัดผลด้วย CDP `Emulation.setDeviceMetricsOverride` เท่านั้น — headless Chrome ธรรมดาปักความกว้างขั้นต่ำที่ 500px ตัวเลขที่ได้จากมันเป็นของปลอม

## File Structure

| ไฟล์ | หน้าที่ | สถานะ |
|---|---|---|
| `src/components/sections/Booking.astro` | section ฟอร์มขอราคา ถือ `id="booking"` และสไตล์การ์ดที่ย้ายมาจาก hero | สร้างใหม่ |
| `src/components/Hero.astro` | เหลือแค่ภาพ + 5 ก้อน ไม่มีฟอร์ม | แก้ |
| `src/pages/index.astro` | เพิ่ม `<Booking />` ต่อจาก `<Hero />` | แก้ |
| `.impeccable.md` | บรรทัด palette และ motion ที่ขัดกับงานจริง | แก้ |
| `CLAUDE.md` | หัวข้อ Aesthetic Direction | แก้ |
| `scripts/measure-viewport.mjs` | เครื่องมือวัดผ่าน CDP ใช้ซ้ำได้ ไม่ให้ใครวัดผิดซ้ำ | สร้างใหม่ |
| `docs/superpowers/plans/2026-07-28-hero-three-second-verify.md` | ผลวัดจริง | สร้างใหม่ |

---

### Task 1: ย้ายฟอร์มออกจาก hero ไปเป็น section ของตัวเอง

**Files:**
- Create: `src/components/sections/Booking.astro`
- Modify: `src/components/Hero.astro` (ลบ import บรรทัด 2, ลบมาร์กอัป `.booking` บรรทัด 66-73, ลบสไตล์ `.booking*` บรรทัด 279-311 และบรรทัดที่เกี่ยวใน `@media (min-width: 561px)`)
- Modify: `src/pages/index.astro:42` (เพิ่ม `<Booking />`)

**Interfaces:**
- Consumes: `src/components/BookingForm.astro` (ไม่แก้ไฟล์นั้น)
- Produces: `<section class="block booking-section" id="booking">` ที่ Task 5 จะตรวจว่า anchor ทั้ง 3 ทางยังวิ่งมาถึง

- [ ] **Step 1: สร้าง `src/components/sections/Booking.astro`**

สไตล์ทั้งหมดคัดมาจาก `Hero.astro` ตรง ๆ ไม่ได้คิดค่าใหม่ — Astro ทำ scoped CSS ต่อ component ถ้าย้ายมาร์กอัปโดยไม่ย้ายสไตล์ การ์ดจะกลายเป็นกล่องเปล่า

```astro
---
import BookingForm from '../BookingForm.astro';
---

<!-- ย้ายมาจาก Hero.astro (2026-07-28): ฟอร์มกินจอแรกจนไม่มีใครอ่านอะไรทัน
     ภายใน 3 วินาที id="booking" ต้องคงเดิม เพราะปุ่มใน hero, ปุ่ม "จองรถ"
     บน nav และสคริปต์ใน Fleet.astro วิ่งมาที่ id นี้ -->
<section class="block booking-section" id="booking">
  <div class="wrap">
    <div class="booking">
      <div class="booking-head">
        <h2 data-i18n="book.title">จองรถ / ขอราคา</h2>
        <span data-i18n="book.sub">ตอบกลับไว</span>
      </div>
      <BookingForm />
    </div>
  </div>
</section>

<style>
  .booking-section {
    background: var(--bg-secondary);
  }

  .booking {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: clamp(1.5rem, 2.5vw, 2.1rem);
    box-shadow: var(--shadow-lg);
    min-width: 0;
  }

  .booking-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.3rem;
  }

  .booking-head h2 {
    font-size: 1.3rem;
    margin: 0;
  }

  .booking-head span {
    font-size: 0.78rem;
    color: var(--text-tertiary);
  }

  @media (max-width: 560px) {
    .booking {
      padding: 1rem;
    }
  }
</style>
```

- [ ] **Step 2: ถอดฟอร์มออกจาก `Hero.astro`**

ลบบรรทัด 2 (`import BookingForm from './BookingForm.astro';`) และลบทั้งบล็อกนี้ออกจากมาร์กอัป

```astro
      <!-- Booking card -->
      <div class="booking reveal" id="booking">
        <div class="booking-head">
          <h2 data-i18n="book.title">จองรถ / ขอราคา</h2>
          <span data-i18n="book.sub">ตอบกลับไว</span>
        </div>
        <BookingForm />
      </div>
```

แล้วลบกฎเหล่านี้ออกจาก `<style>` ของ `Hero.astro`: `.booking`, `.booking-head`, `.booking-head h2`, `.booking-head span`, บล็อก `@media (max-width: 560px)` ทั้งอัน และสองกฎ `.booking { padding: 1.1rem 1.45rem }` กับ `.booking-head { margin-bottom: 0.6rem }` ที่อยู่ใน `@media (min-width: 561px)`

- [ ] **Step 3: วาง section ใหม่ใน `src/pages/index.astro`**

เพิ่มบรรทัด import ต่อจาก `import Hero from '../components/Hero.astro';`

```astro
import Booking from '../components/sections/Booking.astro';
```

แล้วในมาร์กอัป เปลี่ยน

```astro
    <Hero />
    <Stats />
```

เป็น

```astro
    <Hero />
    <Booking />
    <Stats />
```

- [ ] **Step 4: build แล้วตรวจว่า anchor ไม่พัง**

```bash
cd elite-chauffeur && npm run build && node -e "
const fs = require('fs');
const html = fs.readFileSync('dist/client/index.html','utf8');
const count = (re) => (html.match(re) || []).length;
console.log('id=booking:', count(/id=\"booking\"/g), '(ต้องเป็น 1)');
console.log('href=#booking:', count(/href=\"#booking\"/g), '(ต้อง >= 1)');
console.log('id=b_pickup:', count(/id=\"b_pickup\"/g), '(ต้องเป็น 1)');
console.log('vtype-chip:', count(/vtype-chip/g), '(ต้อง > 0)');
console.log('id=vehicleType:', count(/id=\"vehicleType\"/g), '(ต้องเป็น 1)');
"
```

Expected: `id=booking: 1` · `href=#booking:` อย่างน้อย 1 · `id=b_pickup: 1` · `vtype-chip` มากกว่า 0 · `id=vehicleType: 1`
ถ้า `id=booking` เป็น 0 หรือ 2 แปลว่า anchor พัง ต้องแก้ก่อนไปต่อ

- [ ] **Step 5: รันเทสต์เดิมให้ยังเขียว**

Run: `cd elite-chauffeur && npm test`
Expected: 72 ผ่าน (งานนี้ไม่ได้แตะโค้ดที่มีเทสต์ ตัวเลขต้องไม่ลด)

- [ ] **Step 6: commit**

```bash
git add src/components/sections/Booking.astro src/components/Hero.astro src/pages/index.astro
git commit -m "refactor(landing): move the quote form out of the hero into its own section"
```

---

### Task 2: ตัดจอแรกให้เหลือ 5 ก้อน

**Files:**
- Modify: `src/components/Hero.astro` (มาร์กอัปใน `.hero-content` และบล็อก `<style>`)

**Interfaces:**
- Consumes: `#booking` จาก Task 1
- Produces: มาร์กอัปที่ Task 3 จะเติมกฎ mobile ทับ และ Task 5 จะนับก้อน/คำ

- [ ] **Step 1: แทนที่มาร์กอัปใน `.hero-content` ทั้งก้อน**

ลบ `.hero-copy` ออก (คลาส `reveal` ของมันคือตัวที่ทำให้ H1 ซึ่งเป็น LCP ถูกซ่อนรอ JavaScript ผิด Global Constraint 6) แล้ววางลูกโดยตรงใน `.hero-content`

```astro
    <div class="hero-content">
      <h1>
        <span data-i18n="hero.t1">เดินทาง</span>
        <span class="underline" data-i18n="hero.t2">สบาย ๆ</span>
        <span data-i18n="hero.t3">กับคนขับ</span>
        <span class="accent" data-i18n="hero.t4">มืออาชีพ</span>
      </h1>
      <div class="hero-actions">
        <a href="#booking" class="btn btn-primary btn-lg" data-i18n="hero.cta1">ขอใบเสนอราคา</a>
        <a href="https://line.me/R/ti/p/@031cvnva" target="_blank" rel="noopener nofollow" class="hero-line" data-i18n="hero.cta2">ปรึกษาผ่าน LINE</a>
      </div>
      <div class="hero-trust">
        <div class="hero-trust-item">
          <b>4.9<span class="stars">&#9733;</span></b>
          <span data-i18n="hero.trust1">จากลูกค้าจริง</span>
        </div>
      </div>
    </div>
    <div class="hero-scroll" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
```

ที่หายไปจากจอแรก: `.hero-badge` ทั้งก้อน · `.hero-lead` (25 คำ) · รายการ trust ของ `500+` และ `100%` — สองตัวหลังไม่ได้หายจากเว็บ แถบ Stats ใต้ hero ถืออยู่แล้ว และการเก็บแค่ `4.9` ทำให้กลับมาตรงกับ spec ฉบับ 2026-07-27 ข้อ 7

- [ ] **Step 2: แทนกฎ layout และ type ใน `<style>`**

แทนกฎ `.hero`, `.hero-grid`, `.hero-content`, `.hero h1` เดิมด้วยชุดนี้ และลบกฎที่ไม่มีมาร์กอัปแล้วทิ้ง: `.hero-badge`, `.hero-badge .dot`, `@keyframes dot-pulse`, `.hero-lead` และบล็อก `@media (min-width: 561px)` ทั้งอัน (มันตั้งค่าให้ badge/lead/booking ที่ไม่มีอยู่แล้ว)

```css
  .hero {
    position: relative;
    min-height: 100svh;
    display: grid;
    align-items: center;
    overflow: hidden;
  }

  .hero-grid {
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }

  .hero-content {
    width: min(100%, clamp(360px, 40vw, 520px));
  }

  .hero h1 {
    font-size: clamp(2.8rem, 5.2vw, 4.8rem);
    font-weight: 500;
    margin-bottom: 1.4rem;
  }

  /* ปุ่มหลักหนึ่งปุ่ม LINE เป็นลิงก์ข้อความ — สองปุ่มขนาดเท่ากันคือสองคำสั่ง
     ที่แข่งกันเอง ใน 3 วินาทีต้องมีคำสั่งเดียวที่ชัด */
  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.25rem;
    margin-bottom: 1.4rem;
  }

  .hero-line {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--gold-dark);
    text-decoration: underline;
    text-underline-offset: 4px;
    text-decoration-thickness: 1px;
  }

  .hero-line:hover {
    text-decoration-thickness: 2px;
  }

  .hero-scroll {
    position: absolute;
    left: 50%;
    bottom: 1.4rem;
    transform: translateX(-50%);
    color: var(--text-tertiary);
    animation: hero-bob 2.6s ease-in-out infinite;
  }

  .hero-scroll svg {
    width: 26px;
    height: 26px;
    display: block;
  }

  @keyframes hero-bob {

    0%,
    100% {
      transform: translate(-50%, 0);
    }

    50% {
      transform: translate(-50%, 6px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-scroll {
      animation: none;
    }
  }
```

- [ ] **Step 3: เปลี่ยน veil ให้บังเฉพาะคอลัมน์ข้อความ**

แทนกฎ `.hero-bg::after` เดิม (ตัวที่ไล่ 18% → 86% → 97% ทั้งเฟรม ซึ่งเป็นสาเหตุที่เจดีย์จางหาย)

```css
  /* บังเฉพาะที่ข้อความอยู่ ไม่ทาทั้งเฟรม (spec ข้อ 8) — ครึ่งซ้ายที่เธอยืน
     และเจดีย์กลางภาพต้องใสสนิท ตัวเลขนี้เป็นค่าตั้งต้น ปรับได้ตามผลวัด
     contrast ใน Task 5 แต่ห้ามกลับไปทาทั้งเฟรม */
  .hero-bg::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(102deg,
        transparent 0 42%,
        oklch(98% 0.008 75 / 0.55) 62%,
        oklch(98% 0.008 75 / 0.92) 100%);
  }
```

- [ ] **Step 4: build แล้วตรวจว่าก้อนที่สั่งลบหายจริง**

```bash
cd elite-chauffeur && npm run build && node -e "
const html = require('fs').readFileSync('dist/client/index.html','utf8');
const hero = (html.match(/<section class=\"hero\"[\s\S]*?<\/section>/) || [''])[0];
for (const [name, re] of [['hero-badge',/hero-badge/],['hero-lead',/hero-lead/],['hero.trust2',/hero\.trust2/],['hero.trust3',/hero\.trust3/],['reveal',/class=\"[^\"]*\breveal\b/]]) {
  console.log(name, 'ใน hero:', re.test(hero) ? 'ยังอยู่ (ผิด)' : 'หายแล้ว');
}
console.log('h1 อยู่ใน HTML ที่ server ส่ง:', /<h1/.test(hero));
"
```

Expected: ทั้ง 5 รายการรายงาน "หายแล้ว" และ `h1 อยู่ใน HTML ที่ server ส่ง: true`

- [ ] **Step 5: commit**

```bash
git add src/components/Hero.astro
git commit -m "feat(landing): cut the first screen to one headline and one action"
```

---

### Task 3: ทำให้ภาพมองเห็นจริงบนมือถือ

**Files:**
- Modify: `src/components/Hero.astro` (กฎของ `.hero-bg`, `.hero-bg-photo` และบล็อก media query ของมือถือ)

**Interfaces:**
- Consumes: มาร์กอัปจาก Task 2
- Produces: `.hero-bg` ที่มีความสูงของตัวเองบนมือถือ ซึ่ง Task 5 จะวัดว่า ≤ 60% ของ section

- [ ] **Step 1: เพิ่มบล็อกมือถือ**

ต้นเหตุที่ปัจจุบันมองไม่เห็นภาพคือ `.hero-bg` ใช้ `position: absolute; inset: 0` จึงสูงเท่า section ทั้งก้อน (วัดได้ 2014px บนจอสูง 844px) องค์ประกอบแนวตั้งของ `object-position` เลยไม่มีผลทางคณิตศาสตร์ และ veil ที่ไล่ถึง 99% ตอนท้าย gradient ก็ทาทับทุกพิกเซลที่มองเห็น

เพิ่มต่อท้าย `<style>` ของ `Hero.astro` และ **ลบบล็อก `@media (max-width: 1000px)` เดิมทิ้ง** (ตัวที่ตั้ง veil 94%→99%)

```css
  /* มือถือและแท็บเล็ต: ภาพเป็นแถบของตัวเองใต้ nav ไม่มี veil เลย
     เบรกพอยต์ตรงกับ FULL_TIER_MIN_WIDTH (1024) ใน src/scripts/motion/tiers.ts
     เพื่อให้ "จอที่ไม่มี depth field" กับ "จอที่ภาพเป็นแถบ" เป็นชุดเดียวกัน */
  @media (max-width: 1023.98px) {
    .hero {
      min-height: 0;
      display: block;
      padding-top: 72px;
      padding-bottom: clamp(2rem, 8vw, 3rem);
    }

    .hero-bg {
      position: relative;
      inset: auto;
      width: 100%;
      height: 52vh;
      height: 52svh;
    }

    /* ไม่มี veil — ภาพต้องโชว์เต็ม ไม่มีอะไรทับ (spec ข้อ 5) */
    .hero-bg::after {
      display: none;
    }

    /* กล่องมีความสูงจริงแล้ว องค์ประกอบแนวตั้งของ object-position จึงกลับมาทำงาน
       ค่านี้เลือกให้หน้าเธออยู่ในเฟรมที่ 390px ต้องยืนยันด้วยภาพหน้าจอใน Task 5 */
    .hero-bg-photo {
      object-position: 32% 34%;
    }

    .hero-grid {
      justify-content: flex-start;
      padding-top: clamp(1.5rem, 6vw, 2.25rem);
    }

    .hero-content {
      width: 100%;
    }

    .hero h1 {
      font-size: clamp(2.1rem, 8vw, 2.8rem);
    }

    .hero-scroll {
      display: none;
    }
  }
```

- [ ] **Step 2: build**

Run: `cd elite-chauffeur && npm run build`
Expected: 0 error ไม่มี warning ใหม่

- [ ] **Step 3: commit**

```bash
git add src/components/Hero.astro
git commit -m "fix(landing): give the hero photo its own height so mobile can see it"
```

---

### Task 4: แก้ brief ให้ตรงกับงานที่ทำจริง

**Files:**
- Modify: `.impeccable.md` (บรรทัด 34, 46, 50)
- Modify: `CLAUDE.md` (บรรทัด 62 และหัวข้อ Aesthetic Direction บรรทัด 66)

**Interfaces:**
- Consumes: ไม่มี
- Produces: ไม่มี — เป็นงานเอกสารล้วน แต่จำเป็น เพราะถ้าไม่แก้ session ถัดไปจะย้อนงานทิ้งด้วยเหตุผลว่า "ผิด brief"

ทั้งสองไฟล์อยู่ใน git ของ repo นี้ (ยืนยันด้วย `git ls-files`) ไม่ใช่ไฟล์ระดับ workspace

- [ ] **Step 1: แก้ย่อหน้า palette ใน `.impeccable.md` บรรทัด 34**

เติมประโยคต่อท้ายย่อหน้าเดิม ไม่ลบของเดิม เพราะกฎ off-white/charcoal ยังใช้กับทั้งเว็บจริง ๆ

```markdown
**ข้อยกเว้นที่ตั้งใจ (2026-07-28):** hero ถือภาพถ่ายท่องเที่ยวสีสดหนึ่งภาพ (`public/images/hero-bg.travelv1-baseline.webp` — ภาพที่หัวหน้าลูกค้าภูมิใจ ห้ามแก้) ระบบสีคือ **UI สีนิ่งกรอบภาพสดหนึ่งภาพ** ไม่ใช่ทั้งหน้าต้อง muted ภาพนี้ไม่ต้อง regenerate และไม่ต้องลดความอิ่มสีให้เข้ากับข้อความข้างบน
```

- [ ] **Step 2: แก้บรรทัด motion ใน `.impeccable.md` บรรทัด 50**

บรรทัดเดิมเขียนว่า "no parallax, no scroll-linked effects" ซึ่งขัดกับงานที่อนุมัติไปแล้วสองรอบ (spec 2026-07-27 บอกว่าเอกสารนั้นทับข้อนี้ แต่ไม่เคยมีใครมาแก้ไฟล์นี้จริง) เติมต่อท้ายย่อหน้าเดิม

```markdown
**แก้เมื่อ 2026-07-28:** ข้อ "no parallax, no scroll-linked effects" ถูกทับโดยคำสั่งของคุณอนุวัชร (2026-07-27) landing ใช้ scroll storytelling จริง: pin 3 จุด (Fleet, Routes, How) และ depth field ที่ hero ทุกอย่างยังเคารพ `prefers-reduced-motion` เต็มที่และตัดทิ้งทั้งหมดต่ำกว่า 1024px ดู `docs/superpowers/specs/2026-07-27-landing-layered-parallax-design.md` ข้อ 3.1
```

- [ ] **Step 3: แก้หัวข้อ Aesthetic Direction ใน `CLAUDE.md`**

เติมต่อจากบรรทัด 66 (`- **Theme**: light (off-white + charcoal + muted gold).`)

```markdown
- **ข้อยกเว้น hero (2026-07-28)**: hero ถือภาพถ่ายท่องเที่ยวสีสดหนึ่งภาพ ระบบสีคือ UI สีนิ่งกรอบภาพสดหนึ่งภาพ ไม่ใช่ทั้งหน้าต้อง muted
- **Motion (2026-07-28)**: landing ใช้ scroll storytelling จริง (pin 3 จุด + depth field ที่ hero) ตัดทิ้งทั้งหมดต่ำกว่า 1024px และเมื่อ `prefers-reduced-motion: reduce`
```

- [ ] **Step 4: commit**

```bash
git add .impeccable.md CLAUDE.md
git commit -m "docs(brief): record the hero photograph exception and the motion decision"
```

---

### Task 5: วัดจริงในเบราว์เซอร์แล้วบันทึก

**Files:**
- Create: `scripts/measure-viewport.mjs`
- Create: `docs/superpowers/plans/2026-07-28-hero-three-second-verify.md`

**Interfaces:**
- Consumes: ผลของ Task 1-4
- Produces: บันทึกผลวัดที่ final review อ้างได้

งานนี้คือการวัด ไม่ใช่การแก้ ถ้าเกณฑ์ไหนไม่ผ่านให้บันทึกค่าจริงแล้วรายงาน **ห้ามขยับเกณฑ์ให้ผ่าน ห้ามแก้ซอร์สให้เช็คผ่าน**

- [ ] **Step 1: สร้างเครื่องมือวัด `scripts/measure-viewport.mjs`**

มีเครื่องมือกลางเพราะรอบก่อนมีคนวัดผิดสองครั้งจากการใช้ headless ธรรมดา

```js
// วัดหน้าเว็บที่ขนาดจอที่กำหนด ผ่าน Chrome DevTools Protocol
//
// ทำไมต้อง CDP: headless Chrome ปักความกว้างขั้นต่ำไว้ที่ 500px ถ้าสั่ง
// --window-size=390,844 เฉย ๆ จะได้หน้าเว็บที่ layout ที่ 500px แล้วถูกครอบ
// เหลือ 390 ตัวเลขที่ได้จึงเป็นของปลอม Emulation.setDeviceMetricsOverride
// เท่านั้นที่เปลี่ยน layout viewport จริง
//
// ใช้: node scripts/measure-viewport.mjs <width> <height> <mobile|desktop> <screenshot|none> '<js expression>'
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME = process.env.CHROME_BIN
  ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const URL_UNDER_TEST = process.env.MEASURE_URL ?? 'http://localhost:4321/';
const PORT = 9339;

const [width, height, mode, shot, expression] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, '--window-size=1400,1000',
  `--user-data-dir=${process.env.TMPDIR ?? '/tmp'}/measure-viewport`, 'about:blank',
], { stdio: 'ignore' });

await sleep(1500);
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve) => {
  const i = ++id;
  pending.set(i, resolve);
  ws.send(JSON.stringify({ id: i, method, params }));
});
await new Promise((r) => { ws.onopen = r; });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
};

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(width), height: Number(height), deviceScaleFactor: 1, mobile: mode === 'mobile',
});
await send('Page.navigate', { url: URL_UNDER_TEST });
await sleep(4000);

if (shot && shot !== 'none') {
  const img = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(shot, Buffer.from(img.data, 'base64'));
}

if (expression) {
  // awaitPromise: true จำเป็นเมื่อ expression เป็น async ไม่งั้นจะได้ {} เปล่า
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  console.log(JSON.stringify(r.result?.value ?? r.exceptionDetails, null, 2));
}

ws.close();
chrome.kill();
```

- [ ] **Step 2: วัดจอแรกทั้งสองขนาด**

dev server ต้องรันอยู่แล้วที่ `http://localhost:4321/` (ถ้ายังไม่รัน ใช้ `npm run dev`)

```bash
cd elite-chauffeur
for size in "1440 900 desktop" "390 844 mobile"; do
  set -- $size
  echo "=== $1x$2 ==="
  node scripts/measure-viewport.mjs $1 $2 $3 none '(() => {
    const vh = window.innerHeight;
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.top < vh && r.bottom > 0 && r.width > 0; };
    const blocks = [...document.querySelectorAll(".hero h1, .hero-actions a, .hero-trust-item, .hero-scroll, .hero-badge, .hero-lead, .booking")].filter(vis);
    const words = blocks.map((el) => (el.textContent || "").replace(/\s+/g, " ").trim()).join(" ").split(/\s+/).filter(Boolean).length;
    const hero = document.querySelector(".hero");
    const bg = document.querySelector(".hero-bg");
    const veil = getComputedStyle(bg, "::after");
    return {
      blocksAboveFold: blocks.length,
      words,
      heroHeight: Math.round(hero.getBoundingClientRect().height),
      bgHeight: Math.round(bg.getBoundingClientRect().height),
      bgShareOfHero: +(bg.getBoundingClientRect().height / hero.getBoundingClientRect().height).toFixed(3),
      veilDisplay: veil.display,
      veilBackground: veil.backgroundImage.slice(0, 90),
      h1Opacity: getComputedStyle(document.querySelector(".hero h1")).opacity
    };
  })()'
done
```

Expected: ทั้งสองขนาด `blocksAboveFold ≤ 5` และ `words ≤ 14` · ที่ 390×844 ต้องได้ `veilDisplay: "none"` และ `bgShareOfHero ≤ 0.6` · `h1Opacity: "1"` ทั้งคู่

- [ ] **Step 3: วัด contrast ของ H1**

```bash
cd elite-chauffeur
node scripts/measure-viewport.mjs 1440 900 desktop none '(() => {
  const parse = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const h1 = document.querySelector(".hero h1");
  const r = h1.getBoundingClientRect();
  const behind = document.elementsFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2))
    .filter((el) => !el.closest("h1") && !el.tagName.toLowerCase().startsWith("astro-dev"));
  let bg = "rgb(255, 255, 255)";
  for (const el of behind) {
    const c = getComputedStyle(el).backgroundColor;
    if (c !== "rgba(0, 0, 0, 0)" && c !== "transparent") { bg = c; break; }
  }
  const L1 = lum(parse(getComputedStyle(h1).color)), L2 = lum(parse(bg));
  const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  return { color: getComputedStyle(h1).color, backdrop: bg, ratio: +ratio.toFixed(2) };
})()'
```

Expected: `ratio ≥ 4.5` — ถ้าต่ำกว่า ให้ปรับ stop ของ veil ใน Task 2 Step 3 ให้ทึบขึ้น **เฉพาะฝั่งขวา** แล้ววัดใหม่ ห้ามแก้ด้วยการทาทั้งเฟรม

หมายเหตุ: ค่านี้เป็นการวัดสีพื้นหลัง CSS ที่อยู่หลัง H1 ไม่ใช่สีของพิกเซลภาพถ่ายที่อยู่ใต้ veil อีกที ถ้าจุดกลาง H1 ตกอยู่บนบริเวณที่ veil ยังไม่ทึบ ให้บันทึกไว้ว่าเป็นเคสที่ตัวเลขนี้บอกได้ไม่หมด แล้วยืนยันด้วยตาจากภาพหน้าจอใน Step 4

- [ ] **Step 4: เก็บภาพหน้าจอทั้งสองขนาด แล้วดูด้วยตา**

```bash
cd elite-chauffeur
node scripts/measure-viewport.mjs 1440 900 desktop mockups/hero3s-desktop.png none
node scripts/measure-viewport.mjs 390 844 mobile mockups/hero3s-mobile.png none
```

เปิดดูทั้งสองไฟล์ แล้วบันทึกเป็นข้อความว่าเห็นอะไร ต้องยืนยันสามข้อ: หน้าของเธออยู่ในเฟรมบนมือถือและไม่มีอะไรทับ · เจดีย์บนเดสก์ท็อปยังเห็นเป็นเจดีย์ ไม่จางเป็นเงา · ไม่มีข้อความไหนล้นหรือถูกตัด

- [ ] **Step 5: ตรวจว่า H1 ไม่ถูกซ่อนเมื่อปิด JavaScript**

```bash
cd elite-chauffeur && npm run build && node -e "
const html = require('fs').readFileSync('dist/client/index.html','utf8');
const hero = (html.match(/<section class=\"hero\"[\s\S]*?<\/section>/) || [''])[0];
console.log('h1 อยู่ใน HTML:', /<h1/.test(hero));
console.log('มี class reveal ใน hero:', /class=\"[^\"]*\breveal\b/.test(hero), '(ต้องเป็น false)');
"
```

Expected: `h1 อยู่ใน HTML: true` และ `มี class reveal ใน hero: false` — เพราะ `src/styles/motion.css` ตั้ง `.js-motion .reveal { opacity: 0 }` ถ้ายังมีคลาสนี้อยู่ H1 จะถูกซ่อนรอ JavaScript

- [ ] **Step 6: ตรวจว่า anchor ทั้งสามทางยังพาไปถึงฟอร์ม**

```bash
cd elite-chauffeur
node scripts/measure-viewport.mjs 1440 900 desktop none '(() => {
  const target = document.querySelector("#booking");
  const before = window.scrollY;
  document.querySelector(".hero-actions a[href=\"#booking\"]").click();
  const moved = window.scrollY !== before || Math.abs(target.getBoundingClientRect().top) < window.innerHeight;
  return {
    bookingExists: !!target,
    pickupExists: !!document.querySelector("#b_pickup"),
    vehicleTypeExists: !!document.querySelector("#vehicleType"),
    vtypeChips: document.querySelectorAll(".vtype-chip").length,
    navCtaHref: document.querySelector("#navbar a.btn, #navbar .btn")?.getAttribute("href") ?? null,
    fleetButtons: document.querySelectorAll(".fleet-book").length,
    heroCtaReachesBooking: moved
  };
})()'
```

Expected: `bookingExists` และ `pickupExists` และ `vehicleTypeExists` เป็น true · `vtypeChips > 0` · `navCtaHref` เป็น `#booking` · `fleetButtons` เท่ากับ 4 · `heroCtaReachesBooking` เป็น true

- [ ] **Step 7: รันเทสต์และ build**

Run: `cd elite-chauffeur && npm test && npm run build`
Expected: ≥ 72 ผ่าน · build 0 error ไม่มี warning ใหม่

- [ ] **Step 8: เขียนบันทึกผล**

สร้าง `docs/superpowers/plans/2026-07-28-hero-three-second-verify.md` ใส่: ตารางเกณฑ์ทั้ง 11 ข้อจาก spec ข้อ 10 พร้อมค่าจริงที่วัดได้ทีละข้อ · สิ่งที่เห็นจากภาพหน้าจอเป็นข้อความ (ไฟล์ใน `mockups/` ถูก gitignore บันทึกต้องอ่านรู้เรื่องโดยไม่ต้องเปิดภาพ) · รายการที่ไม่ผ่านพร้อมค่าจริง · สิ่งที่ตรวจไม่ได้พร้อมเหตุผล

- [ ] **Step 9: commit**

```bash
git add scripts/measure-viewport.mjs docs/superpowers/plans/2026-07-28-hero-three-second-verify.md
git commit -m "test(landing): measure the three-second hero against the spec"
```

---

## Self-Review

**1. Spec coverage** — spec ข้อ 3 (5 ก้อน) = Task 2 · ข้อ 4 (เดสก์ท็อป veil + type) = Task 2 Step 2-3 · ข้อ 5 (มือถือ) = Task 3 · ข้อ 6 (ห้ามแต่งคำ) = Global Constraint 1 บังคับทุก task และตรวจใน Task 2 Step 4 · ข้อ 7 (ย้ายฟอร์ม + id ที่ห้ามเปลี่ยน) = Task 1 และตรวจซ้ำ Task 5 Step 6 · ข้อ 8 (motion, ถอด `reveal`) = Task 2 Step 1 และตรวจ Task 5 Step 5 · ข้อ 9 (ทับ spec เดิม + แก้ brief) = Task 4 · ข้อ 10 (เกณฑ์วัด 11 ข้อ) = Task 5

**2. Placeholder scan** — ไม่มี TBD/TODO ทุก step ที่เป็นโค้ดมีโค้ดจริงครบ ทุกคำสั่งรันได้ตามที่พิมพ์ ค่าที่ใส่ใน CSS เป็นตัวเลขจริงไม่ใช่ "ปรับตามเหมาะสม"

**3. Type consistency** — `.hero-content` (Task 2) ถูกอ้างใน Task 3 · `.hero-bg` / `.hero-bg-photo` / `.hero-bg::after` ชื่อเดียวกันทั้ง Task 2 และ 3 · `#booking` ที่ Task 1 สร้าง ถูกใช้ใน `href="#booking"` ของ Task 2 และตรวจใน Task 5 Step 6 · `scripts/measure-viewport.mjs` รับพารามิเตอร์ชุดเดียวกันทุกครั้งที่ถูกเรียกใน Task 5

**ของที่จงใจไม่ทำ** — ไม่แตะข้อความ H1 แม้จะเป็นตัวที่ "ไม่ต่อประโยคกับภาพ" ตามที่วิเคราะห์ไว้ใน spec ข้อ 1 เพราะการเปลี่ยนคำเป็นการตัดสินใจของคุณอนุวัชรกับหัวหน้าลูกค้า ไม่ใช่ของ implementer และการแต่งคำเองคือความผิดที่ร้ายที่สุดที่ทำได้ในงานนี้ · ไม่ลบ key ที่ค้างใน dictionary (`hero.badge`, `hero.lead`, `hero.trust2`, `hero.trust3`) เพราะการลบมีความเสี่ยงพังหน้าอื่นมากกว่าประโยชน์
