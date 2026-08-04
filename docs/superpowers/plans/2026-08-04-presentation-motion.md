# Presentation Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทุก section ของ landing มีจังหวะเข้า–ออกของตัวเอง อ่านเป็นบทต่อบทเหมือนสไลด์ ทั้งบนเดสก์ท็อปและมือถือ และปุ่มหลักทั้งเว็บเปลี่ยนเป็น "จองรถ"

**Architecture:** ต่อยอดเอนจิน chapter เดิม (`ScrollTrigger` + `pin` ที่ `src/scripts/motion/editions.ts`) โดยแยกบทเดิม 4 บทออกเป็นไฟล์ละบทใน `src/scripts/motion/chapters/` ก่อน แล้วเพิ่มบทใหม่ 2 บท (`stats`, `why`) เข้า registry เดิม ส่วนหางหน้าที่ไม่ pin ใช้สัญญา `[data-reveal]` ที่มีอยู่แล้วแทน `.reveal` legacy และเปิดบททั้งหมดให้ทำงานบนมือถือด้วยการเปลี่ยนความหมายของ tier `lite`

**Tech Stack:** Astro 5 (ไม่มี framework ฝั่ง client), GSAP 3.15 + ScrollTrigger, TypeScript strict, vitest + jsdom, chromium headless shell สำหรับวัดจริง

## Global Constraints

- ทำงานบน branch `redesign/editions-scroll-v1` เท่านั้น ห้าม commit หรือ push ไป `main`
- ปิด JavaScript แล้วข้อความและภาพต้องเห็นครบทั้งหน้า — กฎซ่อน element ทุกข้อ gate ด้วย `.js-motion`
- `prefers-reduced-motion: reduce` ต้องไม่มี pin เลยสักบท และทุกอย่างมองเห็นครบ
- `src/scripts/motion/legacy-reveal.ts` ห้าม `import` gsap เด็ดขาด (มันปลดล็อก element ที่เป็น LCP candidate)
- `canRunHeroDepth` และ three.js ยังปิดต่ำกว่า 1024px — ห้ามแตะ
- JS bundle ทั้งหน้าเพิ่มไม่เกิน 8KB gzip จากก่อนเริ่มงาน
- ห้ามใช้ `ScrollTrigger.normalizeScroll` (รบกวน focus ช่อง input บน iOS)
- ห้ามเขียนสื่อว่าจองแล้วรู้ราคาทันที — ราคายังยืนยันหลังกรอกฟอร์ม
- คำปุ่มไทย `จองรถ` อังกฤษ `Book now` (ตรงกับ `nav.cta` ที่มีอยู่แล้ว)
- ภาษาไทยอยู่ใน markup โดยตรง ภาษาอังกฤษอยู่ `src/i18n/en.json` (`src/i18n/th.json` เป็น `{}` ว่าง ห้ามย้ายไทยไปไว้ที่นั่นในงานนี้)
- คำสั่งตรวจก่อนปิดทุก task: `npm test` ผ่าน

---

### Task 1: เปลี่ยนคำเรียกร้องเป็น "จองรถ" ทั้งเว็บ

**Files:**
- Modify: `src/components/Hero.astro:36`
- Modify: `src/components/StickyCta.astro:4`
- Modify: `src/components/BookingForm.astro:66`
- Modify: `src/components/sections/Cta.astro:8-10`
- Modify: `src/components/sections/Booking.astro:12`
- Modify: `src/components/sections/How.astro:28`
- Modify: `src/i18n/en.json` (คีย์ `hero.cta1`, `book.submit`, `book.title`, `cta.sub`, `cta.b1`, `sticky.cta`, `how.2.t`)
- Modify: `src/content/services/van.yaml:56,60`
- Modify: `src/content/airports/suvarnabhumi-bkk.yaml:42`
- Test: `tests/copy/booking-wording.test.ts` (สร้างใหม่)

**Interfaces:**
- Consumes: ไม่มี
- Produces: ไม่มี export ใหม่ — เป็นงานเนื้อหาล้วน task อื่นไม่ขึ้นกับ task นี้

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

สร้าง `tests/copy/booking-wording.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CTA_FILES = [
  'src/components/Hero.astro',
  'src/components/StickyCta.astro',
  'src/components/BookingForm.astro',
  'src/components/sections/Cta.astro',
  'src/components/sections/Booking.astro',
  'src/components/sections/How.astro',
  'src/content/services/van.yaml',
  'src/content/airports/suvarnabhumi-bkk.yaml',
];

describe('booking wording', () => {
  it.each(CTA_FILES)('%s ไม่มีคำว่าใบเสนอราคาเหลืออยู่', (file) => {
    expect(readFileSync(file, 'utf8')).not.toContain('ใบเสนอราคา');
  });

  it('en.json ไม่มี "Get a quote" เหลืออยู่', () => {
    expect(readFileSync('src/i18n/en.json', 'utf8')).not.toContain('Get a quote');
  });

  it('ปุ่มหลักทุกจุดใช้คำเดียวกันทั้งสองภาษา', () => {
    const en = JSON.parse(readFileSync('src/i18n/en.json', 'utf8')) as Record<string, string>;
    expect(en['hero.cta1']).toBe('Book now');
    expect(en['cta.b1']).toBe('Book now');
    expect(en['sticky.cta']).toBe('Book now');
    expect(en['book.submit']).toBe('Book now');
    expect(en['nav.cta']).toBe('Book now');

    for (const file of ['src/components/Hero.astro', 'src/components/StickyCta.astro', 'src/components/sections/Cta.astro']) {
      expect(readFileSync(file, 'utf8')).toContain('>จองรถ<');
    }
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

รัน: `npx vitest run tests/copy/booking-wording.test.ts`
คาดหวัง: FAIL — ไฟล์ยังมีคำว่า "ใบเสนอราคา" และ `hero.cta1` ยังเป็น `Get a quote`

- [ ] **Step 3: แก้ข้อความไทยใน markup**

`src/components/Hero.astro:36`, `src/components/StickyCta.astro:4`, `src/components/BookingForm.astro:66`, `src/components/sections/Cta.astro:10` — เปลี่ยนข้อความในแท็กจาก `ขอใบเสนอราคา` เป็น `จองรถ` (คง `data-i18n` และ class เดิมทุกตัว ห้ามแตะ `href`)

`src/components/sections/Cta.astro:8`:

```html
<p data-i18n="cta.sub">จองรถได้ทันที หรือทักหาเราทาง LINE ทีมงานพร้อมดูแลคุณตลอด 24 ชั่วโมง</p>
```

`src/components/sections/Booking.astro:12`:

```html
<h2 data-i18n="book.title">จองรถ</h2>
```

`src/components/sections/How.astro:28`:

```ts
    tFallback: 'รับราคายืนยันใน 15 นาที',
```

- [ ] **Step 4: แก้ `src/i18n/en.json`**

```json
  "hero.cta1": "Book now",
  "book.title": "Book a car",
  "book.submit": "Book now",
  "how.2.t": "Confirmed price within 15 minutes",
  "cta.sub": "Book now, or message us on LINE. Our team is here for you 24 hours a day.",
  "cta.b1": "Book now",
  "sticky.cta": "Book now",
```

(แก้ค่าของคีย์เดิมในที่ ห้ามเรียงคีย์ใหม่และห้ามเพิ่มคีย์)

- [ ] **Step 5: แก้เนื้อหา yaml**

`src/content/services/van.yaml:56` เปลี่ยนต้นประโยคเป็น `ราคาที่เราแจ้งระบุชัดว่ารวมอะไรบ้าง` (ส่วนที่เหลือของคำตอบคงเดิม)

`src/content/services/van.yaml:60` เปลี่ยนเป็น:

```yaml
    answer: "ได้ สำหรับทริปหลายวัน ค่าที่พักคนขับจะระบุในราคาที่ยืนยันอย่างชัดเจนตั้งแต่ต้น"
```

`src/content/airports/suvarnabhumi-bkk.yaml:42` เปลี่ยนท้ายประโยคจาก `ราคา final ยืนยันหลังกรอกข้อมูลในฟอร์มสอบถาม · กรณีปลายทางต่างจังหวัด (พัทยา / หัวหิน / อยุธยา) ขอใบเสนอราคาแยก` เป็น `ราคา final ยืนยันหลังกรอกข้อมูลในฟอร์มจอง · กรณีปลายทางต่างจังหวัด (พัทยา / หัวหิน / อยุธยา) ขอราคาแยก` (ส่วนต้นของ footnote คงเดิม)

- [ ] **Step 6: ยืนยันว่า SEO ไม่ถูกกระทบ**

รัน: `grep -rn "ใบเสนอราคา\|Get a quote" src/ && echo "STILL THERE" || echo "clean"`
คาดหวัง: `clean`

รัน: `grep -rn "ใบเสนอราคา" src/lib/schema.ts src/pages/*.astro src/layouts/Base.astro`
คาดหวัง: ไม่พบ (ยืนยันว่าไม่มี title/meta/JSON-LD ตัวไหนพึ่งวลีนี้)

- [ ] **Step 7: รันเทสต์ให้ผ่าน**

รัน: `npx vitest run tests/copy/booking-wording.test.ts && npm test`
คาดหวัง: PASS ทั้งหมด

- [ ] **Step 8: commit**

```bash
git add tests/copy/booking-wording.test.ts src/components src/i18n/en.json src/content
git commit -m "feat(landing): say จองรถ instead of asking for a quote"
```

---

### Task 2: แยกบทเดิม 4 บทออกจาก editions.ts (ย้ายล้วน ไม่เปลี่ยนพฤติกรรม)

**Files:**
- Create: `src/scripts/motion/chapters/intro.ts`, `fleet.ts`, `how.ts`, `routes.ts`
- Modify: `src/scripts/motion/editions.ts` (เหลือ registry)
- Modify: `tests/motion/editions.test.ts` (แก้ path ที่ import เท่านั้น)

**Interfaces:**
- Consumes: ไม่มี
- Produces:
  - `chapters/intro.ts` → `export function buildIntroChapter(section: HTMLElement, len: number): () => void`
  - `chapters/fleet.ts` → `export function buildFleetChapter(section: HTMLElement, len: number): () => void` และ `export function fleetStageForProgress(progress: number): number`
  - `chapters/how.ts` → `export function buildHowChapter(section: HTMLElement, len: number): () => void` และ `export function howStageForProgress(progress: number): number`
  - `chapters/routes.ts` → `export function buildRoutesChapter(section: HTMLElement, len: number): () => void`
  - `chapters/shared.ts` → `export const PIN_READY_CLASS = 'pin-ready'`
  - `editions.ts` ยังคง export `collectChapters` และ `applyEditionsPins` ด้วยลายเซ็นเดิมทุกตัว

- [ ] **Step 1: รันเทสต์ชุดเดิมเก็บเป็นฐาน**

รัน: `npm test 2>&1 | tail -5`
คาดหวัง: PASS — จดจำนวนเทสต์ที่ผ่านไว้ ตัวเลขนี้ต้องเท่าเดิมหลังย้ายเสร็จ

- [ ] **Step 2: สร้าง `src/scripts/motion/chapters/shared.ts`**

```ts
/** class ที่เปิด layout แบบ pin ใน CSS — ใส่หลังต่อ timeline สำเร็จเท่านั้น */
export const PIN_READY_CLASS = 'pin-ready';
```

- [ ] **Step 3: ย้ายโค้ดของแต่ละบทแบบคัดลอกทั้งก้อน**

ตัดฟังก์ชันของแต่ละบทจาก `editions.ts` ไปวางในไฟล์ของตัวเอง พร้อม comment ทั้งหมดที่ติดมากับฟังก์ชันนั้น **ห้ามแก้เนื้อในแม้บรรทัดเดียว** แต่ละไฟล์ขึ้นต้นด้วย:

```ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { PIN_READY_CLASS } from './shared';
```

(ถ้าไฟล์ไหนไม่ได้ใช้ `gsap` หรือ `ScrollTrigger` ตรง ๆ ให้ตัด import ที่ไม่ได้ใช้ออก — `astro check` จะฟ้องถ้าเหลือค้าง)

- [ ] **Step 4: เขียน `editions.ts` ใหม่ให้เหลือแค่ registry**

```ts
import { buildFleetChapter } from './chapters/fleet';
import { buildHowChapter } from './chapters/how';
import { buildIntroChapter } from './chapters/intro';
import { buildRoutesChapter } from './chapters/routes';

export interface Chapter {
  name: string;
  el: Element;
  len: number;
}

const BUILDERS: Record<string, (section: HTMLElement, len: number) => () => void> = {
  intro: buildIntroChapter,
  fleet: buildFleetChapter,
  how: buildHowChapter,
  routes: buildRoutesChapter,
};

export function applyEditionsPins(root: ParentNode): () => void {
  const cleanups = collectChapters(root)
    .map((chapter) => BUILDERS[chapter.name]?.(chapter.el as HTMLElement, chapter.len))
    .filter((cleanup): cleanup is () => void => typeof cleanup === 'function');

  return () => cleanups.forEach((cleanup) => cleanup());
}
```

`collectChapters` ให้ย้ายมาไว้ในไฟล์นี้ตามเดิมทั้งก้อน (มันเป็นตัวอ่าน `data-chapter` / `data-chapter-len` ไม่ใช่ของบทใดบทหนึ่ง) และ `Chapter` interface ที่มีอยู่แล้วให้คงชื่อฟิลด์เดิมทุกตัว

- [ ] **Step 5: แก้ import ในเทสต์**

`tests/motion/editions.test.ts` — เปลี่ยนเฉพาะบรรทัด import ที่ดึง `fleetStageForProgress` / `howStageForProgress` / `build*Chapter` ให้ชี้ไปไฟล์ใหม่ **ห้ามแก้ assertion แม้ข้อเดียว**

- [ ] **Step 6: ยืนยันว่าไม่มีอะไรเปลี่ยนพฤติกรรม**

รัน: `npx astro check && npm test 2>&1 | tail -5`
คาดหวัง: จำนวนเทสต์ที่ผ่านเท่ากับ Step 1 เป๊ะ ๆ

รัน: `git diff --stat`
คาดหวัง: บรรทัดที่หายจาก `editions.ts` ≈ บรรทัดที่เพิ่มใน `chapters/*` (ยอมต่างได้เฉพาะ import header)

- [ ] **Step 7: commit**

```bash
git add src/scripts/motion tests/motion/editions.test.ts
git commit -m "refactor(motion): give each chapter its own file before adding two more"
```

---

### Task 3: สัญญาใหม่ — chapterLenFor + parseRevealGroup

**Files:**
- Modify: `src/scripts/motion/tiers.ts`
- Modify: `src/scripts/motion/contract.ts`
- Test: `tests/motion/tiers.test.ts`, `tests/motion/contract.test.ts`

**Interfaces:**
- Consumes: `pickTier`, `MotionTier` จาก `tiers.ts` (มีอยู่แล้ว)
- Produces:
  - `tiers.ts` → `export function chapterLenFor(tier: MotionTier, baseLen: number): number`
  - `contract.ts` → `export function parseRevealGroup(el: Element): number | null`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

เพิ่มใน `tests/motion/tiers.test.ts`:

```ts
import { chapterLenFor } from '../../src/scripts/motion/tiers';

describe('chapterLenFor', () => {
  it('เดสก์ท็อปใช้ความยาวตามที่ markup บอก', () => {
    expect(chapterLenFor('full', 300)).toBe(300);
  });

  it('มือถือย่อเหลือ 55% เพราะระยะปัดนิ้วสั้นกว่าล้อเมาส์', () => {
    expect(chapterLenFor('lite', 300)).toBe(165);
    expect(chapterLenFor('lite', 380)).toBe(209);
  });

  it('static ไม่มี pin จึงไม่มีความยาว', () => {
    expect(chapterLenFor('static', 300)).toBe(0);
  });

  it('ไม่ต่ำกว่าหนึ่งจอเมื่อยังมี pin อยู่', () => {
    expect(chapterLenFor('lite', 120)).toBe(100);
  });
});
```

เพิ่มใน `tests/motion/contract.test.ts`:

```ts
import { parseRevealGroup } from '../../src/scripts/motion/contract';

describe('parseRevealGroup', () => {
  it('อ่านระยะห่างเป็นมิลลิวินาที', () => {
    const el = document.createElement('div');
    el.setAttribute('data-reveal-group', '70');
    expect(parseRevealGroup(el)).toBe(70);
  });

  it('ไม่มี attribute แปลว่าไม่ใช่กลุ่ม', () => {
    expect(parseRevealGroup(document.createElement('div'))).toBeNull();
  });

  it('ค่าว่างหรือพังใช้ค่าเริ่มต้น 80', () => {
    const el = document.createElement('div');
    el.setAttribute('data-reveal-group', '');
    expect(parseRevealGroup(el)).toBe(80);
  });

  it('กันค่าบ้าไม่ให้ทำหน้าค้าง', () => {
    const el = document.createElement('div');
    el.setAttribute('data-reveal-group', '9000');
    expect(parseRevealGroup(el)).toBe(400);
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

รัน: `npx vitest run tests/motion/tiers.test.ts tests/motion/contract.test.ts`
คาดหวัง: FAIL — `chapterLenFor is not a function`, `parseRevealGroup is not a function`

- [ ] **Step 3: เขียน implementation**

ต่อท้าย `src/scripts/motion/tiers.ts`:

```ts
/** สัดส่วนที่ย่อความยาวบทลงบนมือถือ — ระยะปัดนิ้วต่อครั้งสั้นกว่าล้อเมาส์มาก */
const LITE_LEN_SHARE = 0.55;
/** ต่ำกว่าหนึ่งจอ การค้างจอจะสั้นจนอ่านไม่ทัน */
const MIN_CHAPTER_LEN = 100;

export function chapterLenFor(tier: MotionTier, baseLen: number): number {
  if (tier === 'static') return 0;
  if (tier === 'full') return baseLen;
  return Math.max(MIN_CHAPTER_LEN, Math.round(baseLen * LITE_LEN_SHARE));
}
```

ต่อท้าย `src/scripts/motion/contract.ts`:

```ts
/** ระยะห่างเริ่มต้นระหว่างลูกในกลุ่มเดียวกัน (ms) */
const DEFAULT_GROUP_STAGGER = 80;
/** เกินนี้ลูกใบท้าย ๆ จะเข้าช้าจนคนเลื่อนผ่านไปแล้ว */
const MAX_GROUP_STAGGER = 400;

/**
 * อ่าน data-reveal-group ที่ element แม่ — ตัวเลขคือระยะห่างระหว่างลูกแต่ละตัว
 * คืน null เมื่อไม่มี attribute (แปลว่าไม่ใช่กลุ่ม ไม่ใช่ "กลุ่มที่ระยะ 0")
 */
export function parseRevealGroup(el: Element): number | null {
  const raw = el.getAttribute('data-reveal-group');
  if (raw === null) return null;

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_GROUP_STAGGER;

  return Math.min(value, MAX_GROUP_STAGGER);
}
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

รัน: `npx vitest run tests/motion/tiers.test.ts tests/motion/contract.test.ts`
คาดหวัง: PASS

- [ ] **Step 5: commit**

```bash
git add src/scripts/motion/tiers.ts src/scripts/motion/contract.ts tests/motion
git commit -m "feat(motion): add chapter length scaling and reveal-group parsing"
```

---

### Task 4: บทใหม่ stats

**Files:**
- Create: `src/scripts/motion/chapters/stats.ts`
- Test: `tests/motion/chapters/stats.test.ts`
- Modify: `src/scripts/motion/editions.ts` (ลงทะเบียนบท)
- Modify: `src/components/sections/Stats.astro` (markup + CSS โหมด pin)

**Interfaces:**
- Consumes: `PIN_READY_CLASS` จาก `./shared`
- Produces:
  - `export function statsStageForProgress(progress: number, count: number): number`
  - `export function statsCountTarget(text: string): { value: number; decimals: number; suffix: string } | null`
  - `export function buildStatsChapter(section: HTMLElement, len: number): () => void`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

สร้าง `tests/motion/chapters/stats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { statsCountTarget, statsStageForProgress } from '../../../src/scripts/motion/chapters/stats';

describe('statsStageForProgress', () => {
  it('แบ่ง progress เป็นช่วงเท่า ๆ กันตามจำนวนสถิติ', () => {
    expect(statsStageForProgress(0, 4)).toBe(0);
    expect(statsStageForProgress(0.3, 4)).toBe(1);
    expect(statsStageForProgress(0.6, 4)).toBe(2);
    expect(statsStageForProgress(0.99, 4)).toBe(3);
  });

  it('progress เต็ม 1 ไม่ล้นออกนอกช่วง', () => {
    expect(statsStageForProgress(1, 4)).toBe(3);
  });
});

describe('statsCountTarget', () => {
  it('อ่านตัวเลขจำนวนเต็มพร้อมท้าย', () => {
    expect(statsCountTarget('500+')).toEqual({ value: 500, decimals: 0, suffix: '+' });
  });

  it('อ่านทศนิยมพร้อมส่วนท้ายที่มีช่องว่าง', () => {
    expect(statsCountTarget('4.9 / 5')).toEqual({ value: 4.9, decimals: 1, suffix: ' / 5' });
  });

  it('ข้อความที่นับไม่ได้คืน null เพื่อให้ใช้ mask แทน', () => {
    expect(statsCountTarget('24/7')).toBeNull();
  });

  it('เปอร์เซ็นต์นับได้', () => {
    expect(statsCountTarget('100%')).toEqual({ value: 100, decimals: 0, suffix: '%' });
  });
});
```

`24/7` ต้องคืน `null` เพราะตัวเลขตัวแรกตามด้วย `/` แล้วมีตัวเลขต่ออีก — นับแล้วจะกลายเป็น `24/7` ที่วิ่งจาก `0/7` ซึ่งไม่มีความหมาย

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

รัน: `npx vitest run tests/motion/chapters/stats.test.ts`
คาดหวัง: FAIL — หาโมดูลไม่เจอ

- [ ] **Step 3: เขียน `src/scripts/motion/chapters/stats.ts`**

```ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { PIN_READY_CLASS } from './shared';

export interface StatsCountTarget {
  value: number;
  decimals: number;
  suffix: string;
}

export function statsStageForProgress(progress: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.floor(progress * count));
}

/**
 * ตัวเลขที่นับขึ้นได้ต้องเป็น "ตัวเลขหนึ่งชุดแล้วจบ" เท่านั้น — `24/7` มีตัวเลข
 * สองชุดคั่นด้วย `/` ถ้านับจะเห็น `0/7` ระหว่างทางซึ่งอ่านเป็นข้อมูลผิด
 * กรณีแบบนั้นคืน null เพื่อให้ buildStatsChapter ใช้ mask เปิดแทนการนับ
 */
export function statsCountTarget(text: string): StatsCountTarget | null {
  const match = /^(\d+(?:\.\d+)?)(.*)$/.exec(text.trim());
  if (match === null) return null;

  const [, digits, rest] = match;
  if (/\d/.test(rest.replace(/\s*\/\s*\d+$/, '')) ) return null;
  if (/^\s*\/\s*\d+$/.test(rest) && !digits.includes('.')) return null;

  const decimals = digits.includes('.') ? digits.split('.')[1].length : 0;

  return { value: Number.parseFloat(digits), decimals, suffix: rest };
}

const STAT_SELECTOR = '.stat';

/**
 * บท stats — pin แล้วปล่อยสถิติเข้าทีละตัวตาม progress ตัวที่นับได้จะวิ่งเลข
 * ตัวที่นับไม่ได้ (เช่น 24/7) เปิดด้วย mask แทน เส้นทองใต้แถวยาวตาม progress ดิบ
 *
 * ค่าเป้าหมายอ่านจาก DOM ตอน ScrollTrigger ยิงครั้งแรก ไม่ใช่ตอนสร้าง timeline
 * เพราะ TripStat เป็น island server:defer — ตอนสร้าง timeline ตัวเลขในหน้ายัง
 * เป็น fallback `500+` อยู่ ถ้าอ่านตอนนั้นจะนับไปหาค่าที่ไม่ใช่ของจริงตลอดไป
 */
export function buildStatsChapter(section: HTMLElement, len: number): () => void {
  const stats = Array.from(section.querySelectorAll<HTMLElement>(STAT_SELECTOR));
  const line = section.querySelector<HTMLElement>('.stats-line');
  if (stats.length === 0) return () => {};

  const targets = new Map<HTMLElement, StatsCountTarget | null>();
  let resolved = false;
  let cur = -1;

  const ctx = gsap.context(() => {}, section);

  const resolveTargets = ctx.add('resolveTargets', () => {
    if (resolved) return;
    resolved = true;
    stats.forEach((stat) => {
      const b = stat.querySelector<HTMLElement>('b');
      targets.set(stat, b ? statsCountTarget(b.textContent ?? '') : null);
    });
  }) as () => void;

  const showStat = ctx.add('showStat', (stat: HTMLElement) => {
    const b = stat.querySelector<HTMLElement>('b');
    const label = stat.querySelector<HTMLElement>('span');
    const target = targets.get(stat) ?? null;

    stat.classList.add('on');
    if (label) gsap.fromTo(label, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });

    if (!b) return;

    if (target === null) {
      gsap.fromTo(b, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'power3.out' });
      return;
    }

    const state = { value: 0 };
    gsap.to(state, {
      value: target.value,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => {
        b.textContent = state.value.toFixed(target.decimals) + target.suffix;
      },
    });
  }) as (stat: HTMLElement) => void;

  const onUpdate = ctx.add('onUpdate', (st: ScrollTrigger) => {
    resolveTargets();
    const stage = statsStageForProgress(st.progress, stats.length);
    if (stage > cur) {
      for (let i = cur + 1; i <= stage; i += 1) showStat(stats[i]);
      cur = stage;
    }
    if (line) gsap.set(line, { scaleX: st.progress });
  }) as (st: ScrollTrigger) => void;

  const trigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: `+=${len}%`,
    pin: section,
    pinSpacing: true,
    anticipatePin: 1,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate,
  });

  section.classList.add(PIN_READY_CLASS);

  return () => {
    trigger.kill();
    ctx.revert();
    section.classList.remove(PIN_READY_CLASS);
  };
}
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

รัน: `npx vitest run tests/motion/chapters/stats.test.ts`
คาดหวัง: PASS

- [ ] **Step 5: เติม markup และ CSS ใน `src/components/sections/Stats.astro`**

เปลี่ยนแท็ก section เป็น (ลบ class `reveal` ออกจาก `.stat` ทุกตัว เพราะบทเป็นคนคุมการเข้าแล้ว การมีทั้งสองระบบจะแย่งกันคุม opacity):

```html
<section class="stats chapter stats-chapter" id="stats" data-chapter="stats" data-chapter-len="160">
  <div class="wrap wrap-wide">
    <div class="stats-inner">
      <div class="stat"><b>24/7</b><span data-i18n="stat.1">บริการทุกวัน ไม่มีวันหยุด</span></div>
      <div class="stat"><b><TripStat server:defer><Fragment slot="fallback">500+</Fragment></TripStat></b><span data-i18n="stat.2">เที่ยวเดินทางปลอดภัย</span></div>
      <div class="stat"><b>4.9 / 5</b><span data-i18n="stat.3">คะแนนจากลูกค้า</span></div>
      <div class="stat"><b>100%</b><span data-i18n="stat.4">รถมีประกัน + พ.ร.บ.</span></div>
    </div>
    <span class="stats-line" aria-hidden="true"></span>
  </div>
</section>
```

เพิ่มท้าย `<style>` (พื้นฐานคือแบบเดิมทุกกรณีที่ pin ไม่ทำงาน — no-JS, reduced-motion):

```css
  .stats-line {
    display: block;
    height: 1px;
    background: var(--gold-dark);
    transform: scaleX(0);
    transform-origin: left center;
  }

  .stats-chapter.pin-ready {
    height: 100svh;
    display: grid;
    align-content: center;
  }

  .stats-chapter.pin-ready .stat {
    opacity: 0;
    transition: none;
  }

  .stats-chapter.pin-ready .stat.on {
    opacity: 1;
  }
```

- [ ] **Step 6: ลงทะเบียนบทใน `src/scripts/motion/editions.ts`**

```ts
import { buildStatsChapter } from './chapters/stats';
```

และเพิ่มบรรทัด `stats: buildStatsChapter,` เข้าไปใน `BUILDERS`

- [ ] **Step 7: ตรวจ**

รัน: `npx astro check && npm test`
คาดหวัง: PASS ทั้งหมด

- [ ] **Step 8: commit**

```bash
git add src/scripts/motion src/components/sections/Stats.astro tests/motion/chapters/stats.test.ts
git commit -m "feat(landing): let the stats row count itself in as a pinned chapter"
```

---

### Task 5: บทใหม่ why

**Files:**
- Create: `src/scripts/motion/chapters/why.ts`
- Test: `tests/motion/chapters/why.test.ts`
- Modify: `src/scripts/motion/editions.ts`
- Modify: `src/components/sections/Why.astro`

**Interfaces:**
- Consumes: `PIN_READY_CLASS` จาก `./shared`
- Produces:
  - `export function whyStageForProgress(progress: number, cardCount: number): number` — คืน `0` = เห็นเฉพาะหัวเรื่อง, `1..cardCount` = การ์ดใบที่เท่าไรกำลังเด่น
  - `export function buildWhyChapter(section: HTMLElement, len: number): () => void`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

สร้าง `tests/motion/chapters/why.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { whyStageForProgress } from '../../../src/scripts/motion/chapters/why';

describe('whyStageForProgress', () => {
  it('ต้นบทเห็นเฉพาะหัวเรื่อง', () => {
    expect(whyStageForProgress(0, 3)).toBe(0);
    expect(whyStageForProgress(0.2, 3)).toBe(0);
  });

  it('การ์ดเข้าทีละใบตามลำดับ', () => {
    expect(whyStageForProgress(0.3, 3)).toBe(1);
    expect(whyStageForProgress(0.55, 3)).toBe(2);
    expect(whyStageForProgress(0.8, 3)).toBe(3);
  });

  it('ท้ายบทค้างที่ใบสุดท้าย ไม่ล้น', () => {
    expect(whyStageForProgress(1, 3)).toBe(3);
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

รัน: `npx vitest run tests/motion/chapters/why.test.ts`
คาดหวัง: FAIL — หาโมดูลไม่เจอ

- [ ] **Step 3: เขียน `src/scripts/motion/chapters/why.ts`**

```ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { PIN_READY_CLASS } from './shared';

/** ส่วนของบทที่ยกให้หัวเรื่องอยู่ลำพังก่อนการ์ดใบแรกจะเข้า */
const HEAD_SHARE = 0.25;

export function whyStageForProgress(progress: number, cardCount: number): number {
  if (cardCount <= 0) return 0;
  if (progress < HEAD_SHARE) return 0;

  const after = (progress - HEAD_SHARE) / (1 - HEAD_SHARE);
  return Math.min(cardCount, Math.floor(after * cardCount) + 1);
}

/**
 * บท why — หัวเรื่อง mask ขึ้นก่อน แล้วการ์ดเข้าทีละใบ ใบที่ผ่านไปแล้วหรี่ลง
 * เหลือ 0.45 เพื่อให้ใบปัจจุบันเป็นจุดสนใจเดียว โดยยังอ่านใบก่อนหน้าได้
 */
export function buildWhyChapter(section: HTMLElement, len: number): () => void {
  const head = section.querySelector<HTMLElement>('.section-head');
  const cards = Array.from(section.querySelectorAll<HTMLElement>('.why-item'));
  if (cards.length === 0) return () => {};

  let cur = -1;

  const ctx = gsap.context(() => {}, section);

  const showStage = ctx.add('showStage', (stage: number) => {
    if (stage === cur) return;
    cur = stage;

    if (head) head.classList.toggle('on', stage >= 0);

    cards.forEach((card, index) => {
      const entered = index < stage;
      card.classList.toggle('entered', entered);
      card.classList.toggle('current', index === stage - 1);
    });

    const justEntered = cards[stage - 1];
    if (justEntered) {
      gsap.fromTo(
        justEntered,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', overwrite: 'auto' }
      );
    }
  }) as (stage: number) => void;

  const onUpdate = ctx.add('onUpdate', (st: ScrollTrigger) => {
    showStage(whyStageForProgress(st.progress, cards.length));
  }) as (st: ScrollTrigger) => void;

  const trigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: `+=${len}%`,
    pin: section,
    pinSpacing: true,
    anticipatePin: 1,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate,
  });

  section.classList.add(PIN_READY_CLASS);

  return () => {
    trigger.kill();
    ctx.revert();
    section.classList.remove(PIN_READY_CLASS);
  };
}
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

รัน: `npx vitest run tests/motion/chapters/why.test.ts`
คาดหวัง: PASS

- [ ] **Step 5: เติม markup และ CSS ใน `src/components/sections/Why.astro`**

แท็ก section เปลี่ยนเป็น:

```html
<section class="block why chapter why-chapter" id="why" data-chapter="why" data-chapter-len="240">
```

ลบ class `reveal` ออกจาก `.section-head` และ `.why-item` ทั้งสามใบ (บทเป็นคนคุมแทน)

เพิ่มท้าย `<style>`:

```css
  .why-chapter.pin-ready {
    height: 100svh;
    display: grid;
    align-content: center;
  }

  .why-chapter.pin-ready .why-item {
    opacity: 0;
    transition: opacity 0.4s;
  }

  .why-chapter.pin-ready .why-item.entered {
    opacity: 0.45;
  }

  .why-chapter.pin-ready .why-item.current {
    opacity: 1;
  }
```

- [ ] **Step 6: ลงทะเบียนบทใน `src/scripts/motion/editions.ts`**

เพิ่ม `import { buildWhyChapter } from './chapters/why';` และบรรทัด `why: buildWhyChapter,` ใน `BUILDERS`

- [ ] **Step 7: ตรวจ**

รัน: `npx astro check && npm test`
คาดหวัง: PASS

- [ ] **Step 8: commit**

```bash
git add src/scripts/motion src/components/sections/Why.astro tests/motion/chapters/why.test.ts
git commit -m "feat(landing): pin the why chapter and bring its cards in one at a time"
```

---

### Task 6: เปิดบททั้งหมดบนมือถือ

**Files:**
- Modify: `src/scripts/motion/index.ts`
- Modify: `src/scripts/motion/editions.ts` (รับ tier)
- Modify: `src/scripts/motion/mobile-lite.ts` (ถอดส่วนที่ทับกับบท)
- Modify: `src/components/sections/How.astro`, `Routes.astro`, `IntroStory.astro`, `Fleet.astro` (media query + `svh`)
- Test: `tests/motion/index.test.ts`, `tests/motion/mobile-lite.test.ts`

**Interfaces:**
- Consumes: `chapterLenFor` (Task 3), `applyEditionsPins` (Task 2)
- Produces: `applyEditionsPins(root: ParentNode, tier: MotionTier): () => void` — เพิ่มพารามิเตอร์ที่สอง ผู้เรียกทุกจุดต้องส่ง tier

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

เพิ่มใน `tests/motion/editions.test.ts`:

```ts
it('มือถือได้บทเดียวกันแต่ความยาวย่อลง', () => {
  document.body.innerHTML = '<section data-chapter="why" data-chapter-len="240"><div class="why-item"></div></section>';
  const spy = vi.spyOn(ScrollTrigger, 'create');

  applyEditionsPins(document, 'lite');

  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ end: '+=132%' }));
});
```

(ไฟล์นี้ mock `gsap` และ `ScrollTrigger` อยู่แล้ว — ใช้ mock ตัวเดิม ไม่ต้องตั้งใหม่)

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

รัน: `npx vitest run tests/motion/editions.test.ts`
คาดหวัง: FAIL — `applyEditionsPins` ยังรับพารามิเตอร์เดียวและใช้ len ดิบ

- [ ] **Step 3: ให้ registry รู้จัก tier**

ใน `src/scripts/motion/editions.ts`:

```ts
import { chapterLenFor, type MotionTier } from './tiers';

export function applyEditionsPins(root: ParentNode, tier: MotionTier): () => void {
  const cleanups = collectChapters(root)
    .map((chapter) => BUILDERS[chapter.name]?.(chapter.el as HTMLElement, chapterLenFor(tier, chapter.len)))
    .filter((cleanup): cleanup is () => void => typeof cleanup === 'function');

  return () => cleanups.forEach((cleanup) => cleanup());
}
```

`ignoreMobileResize` เป็น **config ระดับ ScrollTrigger ทั้งระบบ** (`ScrollTrigger.ConfigVars`) ไม่ใช่ option ราย trigger — ใส่ราย trigger จะไม่มีผลและ `astro check` จะฟ้อง เรียกครั้งเดียวใน `initMotion` ของ `src/scripts/motion/index.ts` ถัดจาก `gsap.registerPlugin(ScrollTrigger)`:

```ts
  // มือถือยืด/หด address bar ระหว่างเลื่อน ถ้าปล่อยให้ refresh ทุกครั้งความสูง
  // ของบทที่ pin จะกระโดดกลางทาง — ตัวนี้บอกให้ข้าม resize ที่มาจากแถบนั้น
  ScrollTrigger.config({ ignoreMobileResize: true });
```

- [ ] **Step 4: ต่อสายใน `src/scripts/motion/index.ts`**

ใน block ของ full tier เปลี่ยนเป็น `applyEditionsPins(root, 'full')`

ใน block `MOBILE_TIER_QUERY` เพิ่มบทเข้าไป:

```ts
  mm.add(MOBILE_TIER_QUERY, () => {
    applyMobileLite(root);
    const cleanupEditions = applyEditionsPins(root, 'lite');
    initStickyCtaOf(root);
    return () => cleanupEditions();
  });
```

- [ ] **Step 5: ถอดส่วนที่ทับกันออกจาก `mobile-lite.ts`**

`applyMobileLite` ต้องเหลือเฉพาะสิ่งที่ไม่ใช่บท ลบ timeline ที่ขยับ `.hm-step` และ element ใด ๆ ที่อยู่ใน section ที่มี `[data-chapter]` ออก เพราะตอนนี้บทเป็นเจ้าของ element เหล่านั้นแล้ว

ตรวจว่าไม่มีอะไรเหลือค้าง:

รัน: `grep -n "hm-step\|data-chapter" src/scripts/motion/mobile-lite.ts`
คาดหวัง: ไม่พบ

เทสต์ใน `tests/motion/mobile-lite.test.ts` ที่ยืนยันพฤติกรรม `.hm-step` ให้ลบทิ้งพร้อมกัน (พฤติกรรมนั้นย้ายไปเป็นของบท `how` แล้ว ไม่ใช่หายไปเฉย ๆ)

- [ ] **Step 6: markup — บล็อกสำรองมือถือต้องไม่โผล่พร้อมบท**

`src/components/sections/How.astro` — ย้ายกฎ `.how-chapter.pin-ready` ทั้งชุดออกจาก `@media (min-width: 1024px)` มาไว้นอก media query (ตอนนี้ pin ทำงานทุกความกว้าง) แล้วเปลี่ยน `height: 100vh` เป็น `height: 100svh` และเพิ่ม:

```css
  .how-chapter.pin-ready .how-mobile {
    display: none;
  }
```

ทำแบบเดียวกันกับ `Routes.astro` และ `IntroStory.astro` และ `Fleet.astro`: ย้ายบล็อก `.pin-ready` ออกจาก `@media (min-width: 1024px)` และเปลี่ยน `height: 100vh` เป็น `height: 100svh`

กฎที่ **ไม่ใช่** `.pin-ready` ต้องอยู่ใน media query เดิมทุกข้อ ห้ามย้าย — มันคือ layout พื้นสำหรับ no-JS และ reduced-motion

- [ ] **Step 7: ตรวจ**

รัน: `grep -rn "pin-ready" src/components/sections/*.astro | grep -c .`
คาดหวัง: ทุกบรรทัดอยู่นอก `@media (min-width: 1024px)` — เปิดไฟล์ยืนยันด้วยตา

รัน: `npx astro check && npm test`
คาดหวัง: PASS

- [ ] **Step 8: commit**

```bash
git add src/scripts/motion src/components/sections tests/motion
git commit -m "feat(landing): give mobile the same chapters at a thumb-sized length"
```

---

### Task 7: ท่าออกของ hero และจังหวะของหางหน้า

**Files:**
- Modify: `src/scripts/motion/index.ts` (applyRevealGroups + hero exit)
- Modify: `src/components/Hero.astro`
- Modify: `src/components/sections/Faq.astro`, `Cta.astro`, `BlogTeaser.astro`, `Booking.astro`, `src/components/BookingForm.astro`, `src/components/Footer.astro`
- Test: `tests/motion/index.test.ts`

**Interfaces:**
- Consumes: `parseRevealGroup` (Task 3)
- Produces: `applyRevealGroups(root: ParentNode): void` — export จาก `src/scripts/motion/index.ts` เพื่อให้เทสต์เรียกตรงได้

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

เพิ่มใน `tests/motion/index.test.ts`:

```ts
import { applyRevealGroups } from '../../src/scripts/motion';

describe('applyRevealGroups', () => {
  it('แจก data-reveal และ delay ให้ลูกตามลำดับ', () => {
    document.body.innerHTML = `
      <div data-reveal-group="70">
        <p></p><p></p><p></p>
      </div>`;

    applyRevealGroups(document);

    const kids = Array.from(document.querySelectorAll('p'));
    expect(kids.map((k) => k.getAttribute('data-reveal'))).toEqual(['up', 'up', 'up']);
    expect(kids.map((k) => k.getAttribute('data-reveal-stagger'))).toEqual([null, '70', '140']);
  });

  it('ไม่ทับค่าที่ markup ตั้งเองไว้แล้ว', () => {
    document.body.innerHTML = `
      <div data-reveal-group="70">
        <p data-reveal="mask"></p>
      </div>`;

    applyRevealGroups(document);

    expect(document.querySelector('p')?.getAttribute('data-reveal')).toBe('mask');
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

รัน: `npx vitest run tests/motion/index.test.ts`
คาดหวัง: FAIL — `applyRevealGroups is not exported`

- [ ] **Step 3: เขียน implementation ใน `src/scripts/motion/index.ts`**

```ts
/**
 * แปลง data-reveal-group บน element แม่เป็น data-reveal + data-reveal-stagger
 * บนลูกโดยตรง ต้องรันก่อน applyReveals เสมอ เพราะ applyReveals อ่านเฉพาะ
 * element ที่มี data-reveal อยู่แล้ว
 */
export function applyRevealGroups(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
    const step = parseRevealGroup(group);
    if (step === null) return;

    Array.from(group.children).forEach((child, index) => {
      if (child.hasAttribute('data-reveal')) return;
      child.setAttribute('data-reveal', 'up');
      if (index > 0) child.setAttribute('data-reveal-stagger', String(step * index));
    });
  });
}
```

เรียกใน `initMotion` ภายใน block `NOT_REDUCED_MOTION` **ก่อน** `applyReveals(root)` และเพิ่ม `parseRevealGroup` เข้าไปในบรรทัด import จาก `./contract`

- [ ] **Step 4: เพิ่มท่าออกของ hero**

ใน `src/scripts/motion/index.ts` เพิ่มฟังก์ชัน:

```ts
/**
 * ท่าออกของ hero — ข้อความลอยขึ้นและจางระหว่างจอแรกถูกเลื่อนพ้นไป ทำให้บทแรก
 * ที่ตามมารับช่วงต่อโดยไม่มีรอยสะดุด ไม่ pin จึงไม่กินความยาว scroll เพิ่ม
 */
function applyHeroExit(root: ParentNode): void {
  const hero = root.querySelector<HTMLElement>('.hero');
  const content = hero?.querySelector<HTMLElement>('.hero-content');
  if (!hero || !content) return;

  gsap.to(content, {
    yPercent: -18,
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 40%', scrub: true },
  });
}
```

เรียกใน block `NOT_REDUCED_MOTION` ต่อจาก `applyRevealGroups`

- [ ] **Step 5: เปลี่ยน markup ของหางหน้าจาก `.reveal` เป็นสัญญาใหม่**

`src/components/sections/Faq.astro` — `<div class="faq-list reveal">` เป็น `<div class="faq-list" data-reveal-group="70">` และ `<div class="section-head center reveal">` เป็น `<div class="section-head center" data-reveal="mask">`

`src/components/sections/Cta.astro` — `<div class="cta-band reveal">` เป็น `<div class="cta-band" data-reveal-group="90">`

`src/components/sections/BlogTeaser.astro` — `<div class="blog-head reveal">` เป็น `<div class="blog-head" data-reveal="mask">`, `<div class="blog-grid">` เป็น `<div class="blog-grid" data-reveal-group="90">` และลบ class `reveal` ออกจาก `.blog-card` (ตัวแม่แจกให้แล้ว)

`src/components/BookingForm.astro` — `<div class="field-row">` เป็น `<div class="field-row" data-reveal-group="60">`

`src/components/sections/Booking.astro` — `<div class="booking-head">` เป็น `<div class="booking-head" data-reveal="mask">`

`src/components/Footer.astro` — ห่อบล็อกคอลัมน์ในสุดด้วย `data-reveal-group="60"` ที่ element แม่ที่มีอยู่แล้ว (ห้ามเพิ่ม `<div>` ใหม่)

- [ ] **Step 6: ตรวจว่าปิด JavaScript แล้วยังเห็นครบ**

`motion.css` ซ่อน `[data-reveal]` ด้วย `.js-motion [data-reveal] { opacity: 0 }` ซึ่ง gate ด้วย `.js-motion` อยู่แล้ว แต่ `data-reveal` ที่ `applyRevealGroups` ใส่ให้ลูกเกิดขึ้นตอน runtime หลัง GSAP โหลด จึงไม่มีสถานะซ่อนก่อนหน้านั้น — ไม่ต้องแก้ CSS เพิ่ม

ยืนยันด้วยการรัน `npm run build` แล้วเปิดไฟล์ที่ build ออกมาโดยปิด JavaScript (ทำใน Task 8 พร้อมการวัดอื่น)

- [ ] **Step 7: รันเทสต์ให้ผ่าน**

รัน: `npx astro check && npm test`
คาดหวัง: PASS

- [ ] **Step 8: commit**

```bash
git add src/scripts/motion/index.ts src/components tests/motion/index.test.ts
git commit -m "feat(landing): carry the hero out and give the closing sections their own entrances"
```

---

### Task 8: rail บอกบท

**Files:**
- Create: `src/scripts/motion/rail.ts`, `src/components/ChapterRail.astro`
- Test: `tests/motion/rail.test.ts`
- Modify: `src/pages/index.astro`, `src/scripts/motion/index.ts`

**Interfaces:**
- Consumes: `collectChapters` จาก `./editions`
- Produces:
  - `export function railStops(root: ParentNode): Array<{ name: string; id: string }>`
  - `export function initRail(root: ParentNode): () => void`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

สร้าง `tests/motion/rail.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { railStops } from '../../src/scripts/motion/rail';

describe('railStops', () => {
  it('เก็บเฉพาะบทที่มี id ให้กระโดดไปได้', () => {
    document.body.innerHTML = `
      <section id="services" data-chapter="intro"></section>
      <section data-chapter="fleet"></section>
      <section id="why" data-chapter="why"></section>`;

    expect(railStops(document)).toEqual([
      { name: 'intro', id: 'services' },
      { name: 'why', id: 'why' },
    ]);
  });

  it('หน้าไม่มีบทเลยได้รายการว่าง', () => {
    document.body.innerHTML = '<section></section>';
    expect(railStops(document)).toEqual([]);
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

รัน: `npx vitest run tests/motion/rail.test.ts`
คาดหวัง: FAIL — หาโมดูลไม่เจอ

- [ ] **Step 3: เขียน `src/scripts/motion/rail.ts`**

```ts
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { collectChapters } from './editions';

export interface RailStop {
  name: string;
  id: string;
}

export function railStops(root: ParentNode): RailStop[] {
  return collectChapters(root)
    .filter((chapter) => chapter.el.id !== '')
    .map((chapter) => ({ name: chapter.name, id: chapter.el.id }));
}

/**
 * rail ต้องเป็นลูกของ <body> เท่านั้น — element position: fixed ที่อยู่ใน
 * subtree ของ section ที่ถูก pin จะโดน transform ของ pin ลากไปด้วย ซึ่งเป็น
 * บั๊กเดียวกับที่ commit fc0720d แก้ให้ nav และปุ่มลอย
 */
export function initRail(root: ParentNode): () => void {
  const rail = document.querySelector<HTMLElement>('#chapter-rail');
  if (rail === null) return () => {};

  if (rail.parentElement !== document.body) document.body.appendChild(rail);

  const stops = railStops(root);
  const dots = Array.from(rail.querySelectorAll<HTMLElement>('[data-rail-dot]'));
  const label = rail.querySelector<HTMLElement>('[data-rail-label]');

  const triggers = stops.map((stop, index) =>
    ScrollTrigger.create({
      trigger: `#${stop.id}`,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => {
        if (!self.isActive) return;
        dots.forEach((dot, i) => dot.classList.toggle('on', i === index));
        if (label) label.textContent = dots[index]?.dataset.railName ?? '';
      },
    })
  );

  rail.classList.add('rail-ready');

  return () => {
    triggers.forEach((trigger) => trigger.kill());
    rail.classList.remove('rail-ready');
  };
}
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

รัน: `npx vitest run tests/motion/rail.test.ts`
คาดหวัง: PASS

- [ ] **Step 5: สร้าง `src/components/ChapterRail.astro`**

```astro
---
const stops = [
  { id: 'services', th: 'เรื่องของเรา', en: 'Our story' },
  { id: 'fleet', th: 'รถของเรา', en: 'Our fleet' },
  { id: 'how', th: 'วิธีจอง', en: 'How to book' },
  { id: 'routes', th: 'เส้นทาง', en: 'Routes' },
  { id: 'stats', th: 'ตัวเลข', en: 'By the numbers' },
  { id: 'why', th: 'ทำไมต้องเรา', en: 'Why us' },
];
---

<nav id="chapter-rail" aria-label="บทของหน้านี้">
  <span data-rail-label aria-hidden="true"></span>
  <ul>
    {stops.map((stop) => (
      <li>
        <a href={`#${stop.id}`} data-rail-dot data-rail-name={stop.th}>
          <span class="sr-only">{stop.th}</span>
        </a>
      </li>
    ))}
  </ul>
</nav>

<style>
  /* rail โผล่เฉพาะเมื่อ initRail ต่อสายสำเร็จ — ไม่มี JavaScript ก็ไม่มีจุดลอย
     ค้างที่กดแล้วไม่มีอะไรเกิดขึ้น */
  #chapter-rail {
    display: none;
  }

  #chapter-rail.rail-ready {
    position: fixed;
    right: clamp(10px, 1.4vw, 20px);
    top: 50%;
    transform: translateY(-50%);
    /* จบเหนือแนว sticky CTA และ LINE fab ที่มุมล่างขวา */
    max-height: min(60svh, 420px);
    display: flex;
    align-items: center;
    gap: 0.6rem;
    z-index: 40;
  }

  #chapter-rail ul {
    display: grid;
    gap: 0.55rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  #chapter-rail a {
    display: block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--text-secondary);
    opacity: 0.3;
    transition: opacity 0.3s, transform 0.3s;
  }

  #chapter-rail a.on {
    background: var(--gold-dark);
    opacity: 1;
    transform: scale(1.5);
  }

  #chapter-rail [data-rail-label] {
    font-size: 0.72rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  @media (max-width: 1023px) {
    #chapter-rail [data-rail-label] {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    #chapter-rail a {
      transition: none;
    }
  }
</style>
```

`.sr-only` มีอยู่แล้วใน `src/styles/global.css` — ยืนยันด้วย `grep -n "sr-only" src/styles/global.css` ก่อนใช้ ถ้าไม่มีให้เพิ่มกฎมาตรฐานลงใน global.css ในขั้นนี้

- [ ] **Step 6: ต่อสาย**

`src/pages/index.astro` — import `ChapterRail` และวางไว้ **หลัง** `</main>` ปิด (ต้องไม่อยู่ใน subtree ของ section ใด ๆ):

```astro
    <StickyCta />
  </main>
  <ChapterRail />
```

`src/scripts/motion/index.ts` — `import { initRail } from './rail';` แล้วเรียกใน block `NOT_REDUCED_MOTION`:

```ts
    const cleanupRail = initRail(root);
```

และคืนมันใน cleanup ของ block เดียวกัน

- [ ] **Step 7: ตรวจ**

รัน: `npx astro check && npm test`
คาดหวัง: PASS

- [ ] **Step 8: commit**

```bash
git add src/scripts/motion src/components/ChapterRail.astro src/pages/index.astro tests/motion/rail.test.ts
git commit -m "feat(landing): add a chapter rail so the page reads as a deck"
```

---

### Task 9: วัดของจริงแล้วปิดงาน

**Files:**
- Create: `docs/superpowers/plans/2026-08-04-presentation-motion-VERIFY.md`
- Modify: ไฟล์ใดก็ตามที่การวัดพบว่าพัง

**Interfaces:**
- Consumes: ทุก task ก่อนหน้า
- Produces: รายงานผลการวัดที่อ้างตัวเลขจริง

- [ ] **Step 1: จดขนาด bundle ก่อนเทียบ**

```bash
git stash list >/dev/null
npm run build
find dist -name "*.js" -exec sh -c 'gzip -c "$1" | wc -c | tr "\n" " "; echo "$1"' _ {} \; | sort -rn | head -10
```

จดผลรวมไว้ แล้วเทียบกับ `git stash`-free baseline ที่ได้จาก `git worktree add` ของ commit ก่อน Task 1 — ผลต่างต้องไม่เกิน 8192 bytes

- [ ] **Step 2: เปิดเซิร์ฟเวอร์ preview**

```bash
npm run build && npm run preview &
```

รอจน `[::1]:4321` ตอบ (ยิง `curl -sSf "http://[::1]:4321/" -o /dev/null` วนจนผ่าน)

- [ ] **Step 3: วัดเดสก์ท็อป 1440×900**

ใช้ chromium headless shell ตามที่ตั้งไว้แล้ว (`chromium_headless_shell-1208`, `MEASURE_URL=http://[::1]:4321`, ห่อ expression ด้วย async IIFE) เลื่อนทีละ 25% ของความสูงเอกสารแล้วแคปหน้าจอทุกจุด

ยืนยันทุกข้อ:
- ไม่มีจุดใดที่ `document.documentElement.scrollWidth > window.innerWidth`
- ทุก stage ของ stats และ why ปรากฏจริง (ตัวเลขวิ่ง การ์ดเข้าทีละใบ)
- `#chapter-rail` มี `rail-ready` และ `getBoundingClientRect().bottom` ต่ำกว่าขอบบนของ `#sticky-cta` และ LINE fab
- ไม่มี section ไหนกระโดดตอนเข้า/ออก pin (เทียบภาพก่อน–หลังจุดเปลี่ยน)

- [ ] **Step 4: วัดมือถือ 390×844**

ทำซ้ำ Step 3 ที่ขนาด 390×844 พร้อมยืนยันเพิ่ม:
- `.how-mobile` ไม่แสดงพร้อมกับบท `how`
- ความยาว scroll ทั้งหน้าไม่เกิน 1.6 เท่าของก่อนเริ่มงาน (ถ้าเกิน ให้ลด `data-chapter-len` ของบทที่ยาวที่สุดลง แล้ววัดใหม่)

- [ ] **Step 5: วัด reduced-motion และ no-JS**

reduced-motion: ตั้ง emulate `prefers-reduced-motion: reduce` แล้วยืนยันว่า `document.querySelectorAll('.pin-ready').length === 0` และไม่มี element ไหน `opacity: 0`

no-JS: โหลดหน้าโดยปิด JavaScript แล้วยืนยันว่าข้อความของทุก section อ่านได้ครบ (`document.body.innerText` มีหัวข้อของทุกบท)

- [ ] **Step 6: เขียนรายงาน**

สร้าง `docs/superpowers/plans/2026-08-04-presentation-motion-VERIFY.md` บันทึกตัวเลขที่วัดได้จริงทุกข้อจาก Step 1–5 พร้อมสิ่งที่ต้องแก้ระหว่างทาง ห้ามคัดลอกตัวเลขจากแผนนี้มาใส่ — ทุกตัวเลขต้องมาจากการรันจริงในรอบนี้

- [ ] **Step 7: ตรวจครั้งสุดท้ายแล้ว commit**

```bash
npx astro check && npm run build && npm test
git add docs/superpowers/plans/2026-08-04-presentation-motion-VERIFY.md
git commit -m "docs(landing): record what the presentation motion pass actually measures"
```

---

## Self-Review

**ครอบคลุม spec:** ทุกหัวข้อใน spec มี task รองรับ — สถาปัตยกรรม (Task 2), จังหวะรายบท (Task 4, 5, 7), rail (Task 8), ระดับมือถือ (Task 6), การชนกับ mobile-lite (Task 6 Step 5), เปลี่ยนคำ (Task 1), การพิสูจน์ (Task 9 และ TDD ในทุก task)

**ลำดับ:** Task 1 เป็นอิสระ ส่งขึ้นได้ก่อนโดยไม่รอใคร Task 2 ต้องเสร็จก่อน 4/5/6/8 ส่วน Task 3 ต้องเสร็จก่อน 6 (`chapterLenFor`) และ 7 (`parseRevealGroup`)

**ชื่อที่ใช้ข้าม task ตรงกันแล้ว:** `PIN_READY_CLASS` (`chapters/shared.ts`), `applyEditionsPins(root, tier)` (Task 2 นิยาม, Task 6 เพิ่มพารามิเตอร์, Task 8 ไม่เรียก), `chapterLenFor` (Task 3 นิยาม, Task 6 ใช้), `parseRevealGroup` (Task 3 นิยาม, Task 7 ใช้), `collectChapters` (Task 2 นิยาม, Task 8 ใช้)
