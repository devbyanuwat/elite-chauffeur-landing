# Apple-style Pinned Sequences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้ 3 section ของหน้า index (Fleet, Routes, How) ค้างจอแล้วเล่าเรื่องทีละท่อนตาม scroll แบบ Apple โดยไม่เพิ่มไฟล์สื่อใหม่แม้ไบต์เดียว

**Architecture:** เพิ่ม parser บริสุทธิ์ลง `contract.ts` (ไม่รู้จัก GSAP) แล้วสร้างโมดูลใหม่ `pin.ts` ที่ประกอบ ScrollTrigger timeline หนึ่งอันต่อหนึ่ง section ที่มี `data-pin` โดย component สื่อสารผ่าน attribute เท่านั้นเหมือนของเดิมทุกตัว การจัดวางแบบซ้อนทับ (stacking) เป็นหน้าที่ของ CSS ที่ gate ด้วย class `pin-ready` ซึ่ง `pin.ts` เป็นคนใส่หลังต่อ timeline สำเร็จ ดังนั้นถ้า JS ไม่รัน หรือ GSAP โหลดไม่ได้ หรือ reduced-motion section ยังเป็น grid เดิมที่อ่านได้ครบ

**Tech Stack:** Astro 5.18.2 · TypeScript strict · GSAP 3 + ScrollTrigger (ไม่เพิ่ม plugin ใหม่) · Vitest 4 + jsdom

## Global Constraints

คัดตรงจาก spec `docs/superpowers/specs/2026-07-27-landing-layered-parallax-design.md` (commit `e112ebb`) ทุกข้อผูกทุก task

1. `data-pin` ทำงานเฉพาะ tier `full` เท่านั้น: `(min-width: 1024px) and not all and (prefers-reduced-motion: reduce)` — ต่ำกว่านั้น **ตัด pin ทิ้ง** ไม่ใช่ย่อ
2. **pin ต้องไม่กิน scroll เกินที่ประกาศ** `data-pin-length` เป็นเพดาน ห้ามคำนวณจากเนื้อหาแบบไม่มีขอบ
3. **ทุก stage ต้องอยู่ครบใน HTML ที่ server ส่ง** JS มีหน้าที่ซ่อน/แสดง ไม่ใช่สร้างเนื้อหา
4. **ปิด JS หรือ reduced-motion = section ต้องอ่านได้ครบทั้ง 4 คัน / 4 เส้นทาง / 3 ขั้น** เรียงต่อกันลงมาแบบเดิม วัดด้วยจำนวน element ที่ถูกซ่อน ต้องเป็น **0**
5. `pinSpacing: true` และ section ถัดไปต้องไม่ทับ footer ต้องไม่กระตุก
6. pin ต้องถูก `ScrollTrigger.refresh()` เมื่อสลับภาษา — `watchLanguageChange()` ที่มีอยู่ครอบให้แล้ว ต้องยืนยันว่าครอบ pin ด้วย
7. **ห้ามเพิ่ม gsap plugin ใหม่** ScrollTrigger ตัวเดียวพอ ห้าม ScrollSmoother ห้าม Observer
8. **ห้ามเพิ่มไฟล์สื่อใหม่** ใช้ `car1..4.webp`, `service1..3.webp`, `service-business.webp` ที่มีอยู่ ไม่มี frame sequence ไม่มีวิดีโอ
9. งบ JS: chunk motion เดิมวัดได้ **46.0 KB gzip** งานนี้เพิ่มได้ไม่เกิน **+6 KB gzip** (three.js อีก 188.4 KB แยก chunk และเกินเพดาน 220 KB ของ spec อยู่แล้ว 14 KB ห้ามทำให้แย่ลงกว่านี้)
10. **ห้ามแต่งข้อเท็จจริง** ทุกตัวเลข ทุกสเปก ทุกชื่อรถต้องคัดจาก `Fleet.astro` / `Routes.astro` / `How.astro` ที่มีอยู่ ห้ามเขียนคำโฆษณาใหม่
11. LCP element (hero) ห้ามแตะ ทั้ง 3 section อยู่ใต้ hero ทั้งหมด
12. `will-change` เปิดเฉพาะช่วงที่จำเป็น ห้ามทิ้งไว้ถาวรทุกความกว้างจอ

## File Structure

| ไฟล์ | หน้าที่ | สถานะ |
|---|---|---|
| `src/scripts/motion/contract.ts` | เพิ่ม `parsePin()` + `collectStages()` — parser บริสุทธิ์ ห้าม import gsap | แก้ |
| `src/scripts/motion/pin.ts` | ประกอบ ScrollTrigger timeline ต่อ section + วาดเส้น SVG + คืน cleanup | สร้างใหม่ |
| `src/scripts/motion/index.ts` | เรียก `applyPins()` ในบล็อก full tier แล้วส่งต่อ cleanup | แก้ |
| `src/styles/motion.css` | resting state ของ stage + ปิด transition ของ `.reveal` ในโซน pin | แก้ |
| `src/components/sections/Fleet.astro` | ใส่ `data-pin="fleet"` + `data-stage` 4 ค่า + CSS `.pin-ready` | แก้ |
| `src/components/sections/How.astro` | ใส่ `data-pin="how"` + `data-stage` 3 ค่า + CSS `.pin-ready` | แก้ |
| `src/components/sections/Routes.astro` | ใส่ `data-pin="route"` + `data-stage` 4 ค่า + SVG `data-draw` | แก้ |
| `tests/motion/contract.test.ts` | เทสต์ `parsePin` / `collectStages` | แก้ |
| `tests/motion/pin.test.ts` | เทสต์ `applyPins` ด้วย gsap ที่ mock ไว้ | สร้างใหม่ |

`pin.ts` แยกจาก `index.ts` เพราะ `index.ts` ทำหน้าที่ประกอบร่าง (composition root) อยู่แล้ว การยัด pin logic ลงไปจะทำให้ไฟล์เดียวถือทั้ง parallax + reveal + count + pin ซึ่งเกินขนาดที่ review ทีเดียวได้

---

### Task 1: parser ของ pin ใน contract.ts

**Files:**
- Modify: `src/scripts/motion/contract.ts` (เพิ่มท้ายไฟล์ ก่อน `splitLines`)
- Test: `tests/motion/contract.test.ts` (เพิ่ม describe block ท้ายไฟล์)

**Interfaces:**
- Consumes: ไม่มี — ไฟล์นี้ห้าม import อะไรจากโมดูลอื่นในโปรเจกต์
- Produces:
  - `export interface PinSpec { name: string; lengthVh: number }`
  - `export interface StageGroup { index: number; panels: HTMLElement[]; media: HTMLElement[] }`
  - `export function parsePin(el: Element): PinSpec | null`
  - `export function collectStages(root: Element): StageGroup[]`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

เพิ่มท้าย `tests/motion/contract.test.ts` และเพิ่ม `collectStages, parsePin` เข้าบรรทัด import ที่บรรทัด 2

```ts
describe('parsePin', () => {
  it('คืน null เมื่อไม่มี attribute', () => {
    expect(parsePin(el('<section></section>'))).toBeNull();
  });

  it('คืน null เมื่อชื่อเป็นค่าว่าง', () => {
    expect(parsePin(el('<section data-pin="   "></section>'))).toBeNull();
  });

  it('ใช้ความยาวเริ่มต้น 200 เมื่อไม่ได้ระบุ', () => {
    expect(parsePin(el('<section data-pin="fleet"></section>'))).toEqual({
      name: 'fleet',
      lengthVh: 200,
    });
  });

  it('บีบความยาวให้อยู่ในกรอบ 100 ถึง 400', () => {
    expect(parsePin(el('<section data-pin="a" data-pin-length="9999"></section>'))!.lengthVh).toBe(400);
    expect(parsePin(el('<section data-pin="a" data-pin-length="10"></section>'))!.lengthVh).toBe(100);
  });

  it('ใช้ค่าเริ่มต้นเมื่อความยาวไม่ใช่ตัวเลข', () => {
    expect(parsePin(el('<section data-pin="a" data-pin-length="ยาว"></section>'))!.lengthVh).toBe(200);
  });
});

describe('collectStages', () => {
  it('คืน array ว่างเมื่อไม่มี stage', () => {
    expect(collectStages(el('<section data-pin="a"></section>'))).toEqual([]);
  });

  it('เรียงตามลำดับตัวเลข ไม่ใช่ลำดับใน DOM', () => {
    const section = el(`
      <section data-pin="a">
        <div data-stage="2">สาม</div>
        <div data-stage="0">หนึ่ง</div>
        <div data-stage="1">สอง</div>
      </section>
    `);
    expect(collectStages(section).map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it('รวม panel กับ media ที่ลำดับเดียวกันเข้ากลุ่มเดียว', () => {
    const section = el(`
      <section data-pin="a">
        <p data-stage="0">ข้อความ</p>
        <img data-stage-media="0" src="/images/car1.webp">
      </section>
    `);
    const groups = collectStages(section);
    expect(groups).toHaveLength(1);
    expect(groups[0].panels).toHaveLength(1);
    expect(groups[0].media).toHaveLength(1);
  });

  it('ข้าม stage ที่อยู่ใน pin ซ้อนข้างใน', () => {
    const section = el(`
      <section data-pin="outer">
        <div data-stage="0">ของฉัน</div>
        <section data-pin="inner"><div data-stage="0">ของคนอื่น</div></section>
      </section>
    `);
    const groups = collectStages(section);
    expect(groups).toHaveLength(1);
    expect(groups[0].panels).toHaveLength(1);
    expect(groups[0].panels[0].textContent).toBe('ของฉัน');
  });

  it('ข้ามลำดับที่อ่านเป็นตัวเลขไม่ได้', () => {
    const section = el('<section data-pin="a"><div data-stage="แรก"></div></section>');
    expect(collectStages(section)).toEqual([]);
  });
});
```

- [ ] **Step 2: รันให้เห็นว่าไม่ผ่าน**

Run: `cd elite-chauffeur && npx vitest run tests/motion/contract.test.ts`
Expected: FAIL — `parsePin is not a function` (หรือ import error)

- [ ] **Step 3: เขียน implementation ที่น้อยที่สุด**

แทรกใน `src/scripts/motion/contract.ts` ต่อจาก `parseDepthField` (ก่อน comment ของ `splitLines`)

```ts
export interface PinSpec {
  name: string;
  /** ความยาว scroll ที่ใช้เล่าเรื่อง คิดเป็น % ของความสูง viewport */
  lengthVh: number;
}

export interface StageGroup {
  index: number;
  /** element ที่ถือข้อความของท่อนนี้ (data-stage) */
  panels: HTMLElement[];
  /** ชั้นภาพของท่อนนี้ ถ้าแยกจากข้อความ (data-stage-media) */
  media: HTMLElement[];
}

/**
 * เพดานความยาว pin — spec ข้อ 3.1 กติกา 7: data-pin-length คือเพดาน ห้ามคำนวณ
 * จากเนื้อหาแบบไม่มีขอบ ต่ำกว่า 100 (หนึ่งจอ) แล้วการค้างจอไม่ทันให้อ่าน
 * เกิน 400 (สี่จอ) คนที่ scroll เร็วจะรู้สึกว่าติดกับดัก
 */
const MIN_PIN_LENGTH = 100;
const MAX_PIN_LENGTH = 400;
const DEFAULT_PIN_LENGTH = 200;

export function parsePin(el: Element): PinSpec | null {
  const raw = el.getAttribute('data-pin');
  if (raw === null) return null;

  const name = raw.trim();
  if (name === '') return null;

  const rawLength = Number.parseInt(el.getAttribute('data-pin-length') ?? '', 10);
  const lengthVh = Number.isFinite(rawLength)
    ? Math.min(Math.max(rawLength, MIN_PIN_LENGTH), MAX_PIN_LENGTH)
    : DEFAULT_PIN_LENGTH;

  return { name, lengthVh };
}

/**
 * รวบรวมท่อนเรื่องใน section ที่ pin หนึ่งอัน จัดกลุ่มตามเลขลำดับ
 * ข้าม element ที่อยู่ใน [data-pin] ซ้อนข้างใน เพราะเจ้าของคือ pin ตัวใน ไม่ใช่ตัวนอก
 */
export function collectStages(root: Element): StageGroup[] {
  const byIndex = new Map<number, StageGroup>();

  const take = (attr: string, key: 'panels' | 'media'): void => {
    root.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((el) => {
      if (el.closest('[data-pin]') !== root) return;

      const index = Number.parseInt(el.getAttribute(attr) ?? '', 10);
      if (!Number.isFinite(index) || index < 0) return;

      const group = byIndex.get(index) ?? { index, panels: [], media: [] };
      group[key].push(el);
      byIndex.set(index, group);
    });
  };

  take('data-stage', 'panels');
  take('data-stage-media', 'media');

  return Array.from(byIndex.values()).sort((a, b) => a.index - b.index);
}
```

- [ ] **Step 4: รันให้ผ่าน**

Run: `cd elite-chauffeur && npx vitest run tests/motion/contract.test.ts`
Expected: PASS ทุกเคส (เดิม + 10 เคสใหม่)

- [ ] **Step 5: commit**

```bash
git add src/scripts/motion/contract.ts tests/motion/contract.test.ts
git commit -m "feat(motion): parse the pin and stage contract"
```

---

### Task 2: โมดูล pin.ts + ต่อเข้า index.ts

**Files:**
- Create: `src/scripts/motion/pin.ts`
- Modify: `src/scripts/motion/index.ts:111-113` (บล็อก full tier)
- Test: `tests/motion/pin.test.ts`

**Interfaces:**
- Consumes: `parsePin`, `collectStages`, `PinSpec`, `StageGroup` จาก `./contract` (Task 1) และ `FULL_TIER_MIN_WIDTH` จาก `./tiers`
- Produces: `export function applyPins(root: ParentNode): () => void` — คืน cleanup function ที่ถอด class `pin-ready` ออกทุก section ที่แตะ (`gsap.matchMedia()` จะเรียก cleanup นี้เมื่อออกจาก breakpoint)

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

สร้าง `tests/motion/pin.test.ts`

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { timeline, set, timelineTo, timelineFromTo } = vi.hoisted(() => {
  const timelineTo = vi.fn();
  const timelineFromTo = vi.fn();
  const chain = { to: timelineTo, fromTo: timelineFromTo };
  timelineTo.mockReturnValue(chain);
  timelineFromTo.mockReturnValue(chain);
  return {
    timeline: vi.fn(() => chain),
    set: vi.fn(),
    timelineTo,
    timelineFromTo,
  };
});

vi.mock('gsap', () => ({
  gsap: { timeline, set },
}));

import { applyPins } from '../../src/scripts/motion/pin';

describe('applyPins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('ไม่แตะ section ที่ไม่มี data-pin', () => {
    document.body.innerHTML = '<section><div data-stage="0"></div></section>';
    applyPins(document);
    expect(timeline).not.toHaveBeenCalled();
  });

  it('ไม่ pin เมื่อมี stage เดียว เพราะไม่มีอะไรให้เล่า', () => {
    document.body.innerHTML = '<section data-pin="a"><div data-stage="0"></div></section>';
    applyPins(document);
    expect(timeline).not.toHaveBeenCalled();
    expect(document.querySelector('section')!.classList.contains('pin-ready')).toBe(false);
  });

  it('ใส่ class pin-ready หลังต่อ timeline สำเร็จ', () => {
    document.body.innerHTML = `
      <section data-pin="a"><div data-stage="0"></div><div data-stage="1"></div></section>
    `;
    applyPins(document);
    expect(timeline).toHaveBeenCalledTimes(1);
    expect(document.querySelector('section')!.classList.contains('pin-ready')).toBe(true);
  });

  it('cleanup ถอด pin-ready ออก', () => {
    document.body.innerHTML = `
      <section data-pin="a"><div data-stage="0"></div><div data-stage="1"></div></section>
    `;
    const cleanup = applyPins(document);
    cleanup();
    expect(document.querySelector('section')!.classList.contains('pin-ready')).toBe(false);
  });

  it('แปลง data-pin-length เป็น end แบบ % ของ viewport', () => {
    document.body.innerHTML = `
      <section data-pin="a" data-pin-length="240">
        <div data-stage="0"></div><div data-stage="1"></div>
      </section>
    `;
    applyPins(document);
    const config = timeline.mock.calls[0][0] as { scrollTrigger: Record<string, unknown> };
    expect(config.scrollTrigger.end).toBe('+=240%');
    expect(config.scrollTrigger.pin).toBe(document.querySelector('section'));
    expect(config.scrollTrigger.pinSpacing).toBe(true);
  });

  it('ตั้ง stage แรกให้เห็น stage อื่นให้ซ่อน', () => {
    document.body.innerHTML = `
      <section data-pin="a">
        <div data-stage="0" id="s0"></div>
        <div data-stage="1" id="s1"></div>
      </section>
    `;
    applyPins(document);

    const visible = set.mock.calls.find(
      (call) => (call[1] as { autoAlpha?: number }).autoAlpha === 1
    );
    const hidden = set.mock.calls.find(
      (call) => (call[1] as { autoAlpha?: number }).autoAlpha === 0
    );
    expect((visible![0] as HTMLElement[])[0].id).toBe('s0');
    expect((hidden![0] as HTMLElement[])[0].id).toBe('s1');
  });

  it('สร้างการสลับหนึ่งครั้งต่อรอยต่อ ไม่ใช่ต่อ stage', () => {
    document.body.innerHTML = `
      <section data-pin="a">
        <div data-stage="0"></div><div data-stage="1"></div><div data-stage="2"></div>
      </section>
    `;
    applyPins(document);
    expect(timelineTo).toHaveBeenCalledTimes(2);
    expect(timelineFromTo).toHaveBeenCalledTimes(2);
  });

  it('ข้าม data-draw ที่วัดความยาวเส้นไม่ได้ (jsdom ไม่มี getTotalLength)', () => {
    document.body.innerHTML = `
      <section data-pin="a">
        <svg><path data-draw d="M0 0 L10 10"></path></svg>
        <div data-stage="0"></div><div data-stage="1"></div>
      </section>
    `;
    expect(() => applyPins(document)).not.toThrow();
    const dashCall = set.mock.calls.find(
      (call) => (call[1] as { strokeDasharray?: number }).strokeDasharray !== undefined
    );
    expect(dashCall).toBeUndefined();
  });
});
```

- [ ] **Step 2: รันให้เห็นว่าไม่ผ่าน**

Run: `cd elite-chauffeur && npx vitest run tests/motion/pin.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/scripts/motion/pin"`

- [ ] **Step 3: เขียน pin.ts**

สร้าง `src/scripts/motion/pin.ts`

```ts
import { gsap } from 'gsap';

import { collectStages, parsePin, type StageGroup } from './contract';

/**
 * class ที่เปิดการจัดวางแบบซ้อนทับใน CSS — ใส่ "หลัง" ต่อ timeline สำเร็จเท่านั้น
 * ถ้า gate ด้วย .js-motion เฉย ๆ แล้ว chunk ของ GSAP โหลดไม่ได้ stage จะซ้อนกัน
 * โดยไม่มีใครมาสลับให้ เหลือให้เห็นแค่ท่อนแรก = ผิด Global Constraint ข้อ 4
 */
const PIN_READY_CLASS = 'pin-ready';

/** ช่วงที่ท่อนเดิมจางออกและท่อนใหม่จางเข้า คิดเป็นสัดส่วนของหนึ่งรอยต่อ */
const FADE_SHARE = 0.6;
/** ท่อนใหม่เริ่มเข้าหลังท่อนเดิมเริ่มออกไปแล้วเท่านี้ กันภาพซ้อนกันจนอ่านไม่ออก */
const OVERLAP_SHARE = 0.4;

function targetsOf(stage: StageGroup): HTMLElement[] {
  return [...stage.panels, ...stage.media];
}

/**
 * วาดเส้น SVG ตาม scroll ด้วย stroke-dashoffset ยาวคลุมทั้ง timeline
 * jsdom ไม่ implement getTotalLength จึงต้องเช็คก่อนเรียก ไม่ใช่ดักด้วย try
 */
function applyDraw(section: Element, tl: gsap.core.Timeline): void {
  section.querySelectorAll<SVGGeometryElement>('[data-draw]').forEach((path) => {
    if (typeof path.getTotalLength !== 'function') return;

    const length = path.getTotalLength();
    if (!Number.isFinite(length) || length <= 0) return;

    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
    tl.to(path, { strokeDashoffset: 0, duration: 1, ease: 'none' }, 0);
  });
}

export function applyPins(root: ParentNode): () => void {
  const readied: HTMLElement[] = [];

  root.querySelectorAll<HTMLElement>('[data-pin]').forEach((section) => {
    const spec = parsePin(section);
    if (spec === null) return;

    const stages = collectStages(section);
    // ท่อนเดียวไม่มีรอยต่อให้เล่า การ pin จะกลายเป็นแค่หน้าค้างเปล่า ๆ
    if (stages.length < 2) return;

    stages.forEach((stage, index) => {
      gsap.set(targetsOf(stage), index === 0
        ? { autoAlpha: 1, scale: 1 }
        : { autoAlpha: 0, scale: 1.03 });
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: `+=${spec.lengthVh}%`,
        pin: section,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    });

    const slice = 1 / (stages.length - 1);

    stages.forEach((stage, index) => {
      if (index === 0) return;

      const at = (index - 1) * slice;

      tl.to(
        targetsOf(stages[index - 1]),
        { autoAlpha: 0, scale: 0.97, duration: slice * FADE_SHARE, ease: 'none' },
        at
      ).fromTo(
        targetsOf(stage),
        { autoAlpha: 0, scale: 1.03 },
        { autoAlpha: 1, scale: 1, duration: slice * FADE_SHARE, ease: 'none' },
        at + slice * OVERLAP_SHARE
      );
    });

    applyDraw(section, tl);

    section.classList.add(PIN_READY_CLASS);
    readied.push(section);
  });

  return () => {
    readied.forEach((section) => section.classList.remove(PIN_READY_CLASS));
  };
}
```

- [ ] **Step 4: รันให้ผ่าน**

Run: `cd elite-chauffeur && npx vitest run tests/motion/pin.test.ts`
Expected: PASS ทั้ง 9 เคส

- [ ] **Step 5: ต่อเข้า index.ts**

แก้ `src/scripts/motion/index.ts` — เพิ่ม import และเปลี่ยนบล็อก full tier ให้ **คืน** cleanup ของ pin (ไม่คืน = `gsap.matchMedia()` จะไม่ถอด class `pin-ready` เมื่อย่อจอข้าม 1024px แล้ว stage จะซ้อนกันค้างบนมือถือ)

```ts
import { applyPins } from './pin';
```

```ts
  mm.add(`(min-width: ${FULL_TIER_MIN_WIDTH}px) and ${NOT_REDUCED_MOTION}`, () => {
    applyParallax(root);
    return applyPins(root);
  });
```

- [ ] **Step 6: เพิ่มเทสต์ว่า index เรียก pin ในบล็อกที่ถูก**

เพิ่มใน `tests/motion/index.test.ts` — ต้องเพิ่ม `timeline: vi.fn(() => chainable)` และ `set: vi.fn()` เข้า gsap mock ที่มีอยู่ (บรรทัด 11-18) โดย `chainable` คือ object ที่ `to`/`fromTo` คืนตัวเองเพื่อให้ต่อ chain ได้

```ts
  it('pin ทำงานเฉพาะ query ของ full tier', () => {
    document.body.innerHTML = `
      <section data-pin="fleet"><div data-stage="0"></div><div data-stage="1"></div></section>
    `;
    initMotion();

    const pinQueries = matchMediaAdd.mock.calls
      .filter((call) => (call[0] as string).includes(`min-width: ${FULL_TIER_MIN_WIDTH}px`));
    expect(pinQueries).toHaveLength(1);
    expect(document.querySelector('section')!.classList.contains('pin-ready')).toBe(true);
  });
```

- [ ] **Step 7: รันเทสต์ทั้งชุด**

Run: `cd elite-chauffeur && npm test`
Expected: PASS ทั้งหมด (49 เดิม + ของใหม่)

- [ ] **Step 8: commit**

```bash
git add src/scripts/motion/pin.ts src/scripts/motion/index.ts tests/motion/pin.test.ts tests/motion/index.test.ts
git commit -m "feat(motion): drive pinned stage sequences from ScrollTrigger"
```

---

### Task 3: resting state ของ stage ใน motion.css

**Files:**
- Modify: `src/styles/motion.css` (เพิ่มก่อนบล็อก `@media (prefers-reduced-motion: reduce)` ที่บรรทัด 54)

**Interfaces:**
- Consumes: class `pin-ready` ที่ `applyPins()` (Task 2) ใส่ให้ section
- Produces: กฎ CSS ที่ component แต่ละตัวต่อยอด — component เป็นเจ้าของ "จัดวางแบบไหน" ส่วนไฟล์นี้เป็นเจ้าของ "อะไรขยับได้"

- [ ] **Step 1: เพิ่มกฎ**

```css
/* ---- Pinned sequence (spec ข้อ 3.1) ----
   class pin-ready มาจาก src/scripts/motion/pin.ts หลังต่อ timeline สำเร็จแล้ว
   เท่านั้น จึงไม่มีทางที่ stage จะซ้อนกันโดยไม่มีใครสลับให้ ปิด JS หรือ
   reduced-motion หรือจอแคบกว่า 1024px = ไม่มี class นี้ = layout เดิมทั้งดุ้น */
.js-motion .pin-ready [data-stage],
.js-motion .pin-ready [data-stage-media] {
  will-change: opacity, transform;
}

/* .reveal เดิมมี transition 0.7s ถ้าปล่อยไว้ในโซนที่ scrub ควบคุม opacity
   ทุกเฟรมจะกลายเป็นการ interpolate ซ้อน interpolate ภาพจะตามมือช้าและกระตุก */
.js-motion .pin-ready .reveal {
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .js-motion .pin-ready [data-stage],
  .js-motion .pin-ready [data-stage-media] {
    will-change: auto;
  }
}
```

- [ ] **Step 2: ยืนยันว่า build ผ่าน**

Run: `cd elite-chauffeur && npm run build`
Expected: build สำเร็จ 5 route ไม่มี warning ใหม่

- [ ] **Step 3: commit**

```bash
git add src/styles/motion.css
git commit -m "feat(motion): resting state for pinned stages"
```

---

### Task 4: Fleet pin — รถ 4 ประเภทไล่ทีละคัน

**Files:**
- Modify: `src/components/sections/Fleet.astro:4` (แท็ก section), `:12,31,49,67` (แท็ก article), และบล็อก `<style>`

**Interfaces:**
- Consumes: `data-pin` / `data-pin-length` / `data-stage` ตามสัญญาใน Task 1, class `pin-ready` จาก Task 2
- Produces: ไม่มี export — เป็นปลายทางของสัญญา

**สิ่งที่ห้ามแตะ:** ข้อความ ราคา ชื่อรถ จำนวนที่นั่ง `data-i18n` และ `data-vtype` ทุกตัว (Global Constraint 10) — งานนี้เพิ่ม attribute กับ CSS เท่านั้น ห้ามแก้เนื้อหา

- [ ] **Step 1: ใส่ attribute**

บรรทัด 4 เปลี่ยนเป็น

```astro
<section class="block fleet-section" id="fleet" data-pin="fleet" data-pin-length="240">
```

แล้วใส่ `data-stage` ให้ 4 article ตามลำดับที่มีอยู่ในไฟล์ (ห้ามสลับลำดับ)

```astro
<article class="fleet-card featured reveal" data-stage="0">   <!-- Toyota Alphard ฿1,000 -->
<article class="fleet-card reveal" data-stage="1">            <!-- Toyota Fortuner ฿500 -->
<article class="fleet-card reveal" data-stage="2">            <!-- Mitsubishi Xpander ฿450 -->
<article class="fleet-card reveal" data-stage="3">            <!-- Toyota Corolla Altis ฿400 -->
```

- [ ] **Step 2: เพิ่ม CSS ของโหมด pin**

เพิ่มท้ายบล็อก `<style>` ของ `Fleet.astro` **ก่อน** `@media (max-width: 880px)` เพื่อไม่ให้ media query เดิมถูกกฎใหม่ทับ

```css
  /* ---- โหมด pin (desktop, motion allowed) ----
     pin-ready มาจาก pin.ts เท่านั้น ดังนั้น grid 4 คอลัมน์ด้านบนยังเป็น
     พฤติกรรมพื้นสำหรับทุกกรณีที่ pin ไม่ได้ทำงาน */
  .fleet-section.pin-ready .fleet-grid {
    display: block;
    position: relative;
    min-height: 68vh;
  }

  .fleet-section.pin-ready .fleet-card {
    position: absolute;
    inset: 0;
    margin: auto;
    width: min(100%, 560px);
    height: fit-content;
  }

  /* hover lift เดิมชน transform ที่ scrub คุมอยู่ ตัดทิ้งเฉพาะโหมดนี้ */
  .fleet-section.pin-ready .fleet-card:hover {
    transform: none;
  }
```

- [ ] **Step 3: ดูด้วยตาในเบราว์เซอร์**

Run: `cd elite-chauffeur && npm run dev`
เปิด `http://localhost:4321/` กว้าง ≥ 1280px scroll ลงถึง `#fleet`
Expected: section ค้างจอ รถเปลี่ยนจาก Alphard ไป Fortuner ไป Xpander ไป Altis ทีละคัน แล้วปล่อย scroll ต่อไปยัง section ถัดไป ราคากับชื่อรถเปลี่ยนตามคัน

- [ ] **Step 4: ยืนยันว่าย่อจอแล้วกลับเป็น grid**

ย่อหน้าต่างให้แคบกว่า 1024px แล้ว reload
Expected: การ์ดทั้ง 4 เรียงเป็น grid เหมือนก่อนงานนี้ ไม่มีการค้างจอ ไม่มีการ์ดซ้อนกัน

- [ ] **Step 5: commit**

```bash
git add src/components/sections/Fleet.astro
git commit -m "feat(landing): pin the fleet section and reveal one vehicle at a time"
```

---

### Task 5: How pin — 3 ขั้นตอนไล่ทีละขั้น

**Files:**
- Modify: `src/components/sections/How.astro:4` (แท็ก section), `:11,15,19` (div.step), และบล็อก `<style>`

**Interfaces:**
- Consumes: `data-pin` / `data-pin-length` / `data-stage`, class `pin-ready`
- Produces: ไม่มี export

**สิ่งที่ห้ามแตะ:** ข้อความทั้ง 3 ขั้นและ `data-i18n` ทุกตัว

- [ ] **Step 1: ใส่ attribute**

บรรทัด 4

```astro
<section class="block" id="how" data-pin="how" data-pin-length="180">
```

แล้ว

```astro
<div class="step reveal" data-stage="0">   <!-- บอกความต้องการ -->
<div class="step reveal" data-stage="1">   <!-- รับราคาชัดเจน -->
<div class="step reveal" data-stage="2">   <!-- ออกเดินทางสบายใจ -->
```

- [ ] **Step 2: เพิ่ม CSS ของโหมด pin**

เพิ่มท้ายบล็อก `<style>` **ก่อน** `@media (max-width: 880px)`

```css
  /* ---- โหมด pin (desktop, motion allowed) ---- */
  .pin-ready .steps {
    display: block;
    position: relative;
    min-height: 46vh;
  }

  .pin-ready .step {
    position: absolute;
    inset: 0;
    margin: auto;
    width: min(100%, 620px);
    height: fit-content;
    padding: 2.6rem 2.4rem 2.4rem;
  }

  /* ตัวเลขขั้นตอนคือพระเอกของท่อนนี้ ขยายให้อ่านได้จากระยะไกล */
  .pin-ready .step::before {
    font-size: 4.2rem;
    opacity: 0.8;
  }

  .pin-ready .step h3 {
    font-size: 1.55rem;
  }

  .pin-ready .step p {
    font-size: 1rem;
  }
```

**หมายเหตุเรื่อง CSS counter:** `.step::before` ใช้ `counter-increment` ซึ่งนับตามลำดับใน DOM ไม่ใช่ตามการจัดวาง การเปลี่ยนไปเป็น `position: absolute` จึงไม่ทำให้เลขเพี้ยน — ยังได้ 01 / 02 / 03 ตามเดิม ต้องยืนยันด้วยตาใน Step 3

- [ ] **Step 3: ดูด้วยตา**

Run: dev server ที่รันอยู่แล้ว scroll ถึง `#how` ที่ความกว้าง ≥ 1280px
Expected: ค้างจอ แล้วขั้นตอนเปลี่ยน 01 → 02 → 03 ทีละขั้น เลขต้องเป็น 01/02/03 ไม่ใช่ 01/01/01

- [ ] **Step 4: commit**

```bash
git add src/components/sections/How.astro
git commit -m "feat(landing): pin the three booking steps"
```

---

### Task 6: Routes pin — เส้นทางวาดตาม scroll

**Files:**
- Modify: `src/components/sections/Routes.astro:4` (แท็ก section), `:12,20,28,36` (a.route-card), เพิ่ม SVG ใน `.routes-grid` และบล็อก `<style>`

**Interfaces:**
- Consumes: `data-pin` / `data-pin-length` / `data-stage` / `data-draw`, class `pin-ready`
- Produces: ไม่มี export

**สิ่งที่ห้ามแตะ:** `href` ของทั้ง 4 การ์ด ข้อความ ระยะทาง เวลา และ `data-i18n` ทุกตัว — `~147 กม.` / `~2 ชม.` / `~200 กม.` / `~2.5 ชม.` คือของจริงที่มีอยู่ ห้ามคิดเลขใหม่

- [ ] **Step 1: ใส่ attribute**

บรรทัด 4

```astro
<section class="block" id="routes" style="padding-top:0" data-pin="route" data-pin-length="240">
```

แล้วใส่ตามลำดับที่มีอยู่

```astro
<a class="route-card reveal" data-stage="0" href="airport-transfer/suvarnabhumi-bkk/">
<a class="route-card reveal" data-stage="1" href="routes/bangkok-to-pattaya/">
<a class="route-card reveal" data-stage="2" href="routes/bangkok-to-hua-hin/">
<a class="route-card reveal" data-stage="3" href="airport-transfer/don-mueang-dmk/">
```

- [ ] **Step 2: เพิ่มเส้นที่วาดตาม scroll**

แทรก **ก่อน** การ์ดใบแรก (ภายใน `<div class="routes-grid">`)

```astro
      <svg class="route-line" viewBox="0 0 1200 240" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path data-draw d="M40 200 C 300 200, 340 40, 600 40 S 900 200, 1160 60" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      </svg>
```

- [ ] **Step 3: เพิ่ม CSS ของโหมด pin**

เพิ่มท้ายบล็อก `<style>` **ก่อน** `@media (max-width: 880px)`

```css
  /* เส้นทางมีความหมายเฉพาะตอนที่มีอะไรมาวาดมัน จึงซ่อนเป็นค่าเริ่มต้น */
  .route-line {
    display: none;
  }

  /* ---- โหมด pin (desktop, motion allowed) ---- */
  .pin-ready .routes-grid {
    display: block;
    position: relative;
    min-height: 72vh;
  }

  .pin-ready .route-line {
    display: block;
    position: absolute;
    inset: auto 0 8%;
    width: 100%;
    height: 30%;
    color: color-mix(in oklab, var(--gold), transparent 45%);
    pointer-events: none;
  }

  .pin-ready .route-card {
    position: absolute;
    inset: 0;
    margin: auto;
    width: min(100%, 520px);
    aspect-ratio: 4 / 3;
  }

  /* hover lift เดิมชน transform ที่ scrub คุมอยู่ */
  .pin-ready .route-card:hover {
    transform: none;
  }
```

- [ ] **Step 4: ดูด้วยตา**

scroll ถึง `#routes` ที่ความกว้าง ≥ 1280px
Expected: ค้างจอ การ์ดเปลี่ยน สุวรรณภูมิ → พัทยา → หัวหิน → ดอนเมือง และเส้นสีทองค่อย ๆ ถูกวาดจากซ้ายไปขวาตลอดช่วงที่ค้าง กดการ์ดยังไปหน้าปลายทางได้ตามเดิม

- [ ] **Step 5: commit**

```bash
git add src/components/sections/Routes.astro
git commit -m "feat(landing): pin the popular routes and draw the line on scroll"
```

---

### Task 7: ตรวจในเบราว์เซอร์จริงและวัดของที่วัดได้

**Files:**
- Create: `docs/superpowers/plans/2026-07-27-landing-pinned-sequences-verify.md`

**Interfaces:**
- Consumes: ผลของ Task 1-6 ทั้งหมด
- Produces: บันทึกผลวัดที่ task ต่อ ๆ ไปและ final review อ้างได้

งานนี้คือการวัด ไม่ใช่การแก้ ถ้าเจอของไม่ผ่านให้บันทึกตัวเลขจริงลงไฟล์แล้วรายงาน **ห้ามแก้เกณฑ์ให้ผ่าน** และห้ามแก้โค้ดเงียบ ๆ

- [ ] **Step 1: build แล้ววัดขนาด chunk**

```bash
cd elite-chauffeur && npm run build
find dist -name '*.js' -exec sh -c 'printf "%s " "$1"; gzip -c "$1" | wc -c' _ {} \; | sort -k2 -n -r | head -8
```

บันทึก: ขนาด gzip ของ chunk ที่มี GSAP (เดิม 46,0xx B) และ chunk three.js (เดิม 188.4 KB) — Global Constraint 9 ให้เพิ่มได้ไม่เกิน +6 KB gzip

- [ ] **Step 2: นับ element ที่ถูกซ่อนตอนปิด JS**

```bash
cd elite-chauffeur && node -e "
const html = require('fs').readFileSync('dist/client/index.html','utf8');
for (const id of ['fleet','routes','how']) {
  const m = html.match(new RegExp('id=\"'+id+'\"[\\\\s\\\\S]*?</section>'));
  const body = m ? m[0] : '';
  console.log(id, 'data-stage:', (body.match(/data-stage=/g)||[]).length, '| pin-ready ใน HTML:', body.includes('pin-ready'));
}
"
```

Expected: `fleet data-stage: 4`, `routes data-stage: 4`, `how data-stage: 3` และ `pin-ready ใน HTML: false` ทั้งสาม (class ต้องมาจาก JS เท่านั้น — Global Constraint 4)

- [ ] **Step 3: ตรวจในเบราว์เซอร์ 1440×900**

เปิด `http://localhost:4321/` แล้วเก็บภาพหน้าจอ stage แรกและ stage สุดท้ายของทั้ง 3 จุด (6 ภาพ) ไปไว้ที่ `mockups/pin-<section>-stage<N>.png`

ต้องยืนยันด้วยตาว่า
- แต่ละจุดค้างจอแล้วปล่อย ไม่มี section ถัดไปทับ ไม่มี footer กระตุก (Global Constraint 5)
- scroll ย้อนขึ้นแล้วเรื่องเล่นย้อนกลับได้ ไม่ค้างที่ stage สุดท้าย
- scroll เร็วผ่านทีเดียวแล้วผ่านได้จริง ไม่ติดกับดัก (Global Constraint 2)

- [ ] **Step 4: ตรวจ reduced-motion**

DevTools → Rendering → `prefers-reduced-motion: reduce` แล้ว reload
Expected: ทั้ง 3 section เป็น grid เดิม ไม่มีการค้างจอ ไม่มี `pin-ready` ใน DOM และเนื้อหาครบทั้ง 4/4/3

รันใน console เพื่อได้ตัวเลข

```js
[...document.querySelectorAll('#fleet [data-stage], #routes [data-stage], #how [data-stage]')]
  .filter((el) => getComputedStyle(el).opacity === '0' || getComputedStyle(el).visibility === 'hidden').length
```

Expected: `0`

- [ ] **Step 5: ตรวจการสลับภาษาระหว่างที่ค้างจอ**

scroll ให้ค้างอยู่กลาง `#fleet` แล้วกดสลับภาษา
Expected: การ์ดยังอยู่ท่อนเดิม ไม่กระโดด ไม่มีท่อนไหนหายไป (Global Constraint 6 — `watchLanguageChange()` ยิง `ScrollTrigger.refresh()`)

- [ ] **Step 6: เขียนบันทึกผล**

สร้าง `docs/superpowers/plans/2026-07-27-landing-pinned-sequences-verify.md` ใส่: ขนาด chunk ก่อน/หลังเป็นไบต์, จำนวน `data-stage` ต่อ section, จำนวน element ที่ซ่อนตอน reduced-motion, ผลการตรวจด้วยตาทั้ง 6 ข้อ, ชื่อไฟล์ภาพหน้าจอ, และรายการของที่ยังไม่ผ่านพร้อมตัวเลขจริง

- [ ] **Step 7: commit**

```bash
git add docs/superpowers/plans/2026-07-27-landing-pinned-sequences-verify.md mockups/pin-*.png 2>/dev/null || git add docs/superpowers/plans/2026-07-27-landing-pinned-sequences-verify.md
git commit -m "docs(landing): record the measured result of the pinned sequences"
```

หมายเหตุ: `mockups/` อยู่ใน `.gitignore` ภาพหน้าจอจะไม่เข้า git — ไฟล์บันทึกผลต้องเขียนตัวเลขและสิ่งที่เห็นเป็นข้อความให้ครบ ไม่ใช่ชี้ไปที่ภาพเฉย ๆ

---

## Self-Review

**1. Spec coverage** — spec ข้อ 3.1 มี 3 จุด (fleet Task 4, route Task 6, how Task 5) · contract 5 attribute (`data-pin`, `data-pin-length`, `data-stage` ใน Task 1 · `data-stage-media` ใน Task 1 และใช้ใน `collectStages`/`targetsOf` · `data-draw` ใน Task 2 และใช้ใน Task 6) · กติกา 7-12 ผูกอยู่ใน Global Constraints และวัดใน Task 7 ครบทุกข้อ · ความละเอียด "transform + text swap ไม่ใช้ frame sequence" = Global Constraint 8

**ช่องว่างที่ยอมรับไว้อย่างตั้งใจ:** `data-stage-media` ไม่มี component ไหนใช้ในแผนนี้ เพราะทั้ง 3 จุดใช้ตัวการ์ดเป็นทั้งข้อความและภาพในตัวเดียว การแยกชั้นภาพออกมาจะทำให้ต้องเขียนข้อความซ้ำสองที่ (ผิด DRY และสร้างเนื้อหาซ้ำในสายตา crawler) attribute นี้ยังอยู่ใน contract เพราะเป็นทางอัปเกรดไป frame sequence ในอนาคตโดยไม่ต้องแก้ contract และมีเทสต์คุมพฤติกรรมไว้แล้ว

**2. Placeholder scan** — ไม่มี TBD/TODO ทุก step ที่เป็นโค้ดมีโค้ดจริง ทุกคำสั่งรันได้ตามที่พิมพ์ ทุกค่าที่ใส่ใน markup คัดจากไฟล์ที่มีอยู่

**3. Type consistency** — `PinSpec.lengthVh` (Task 1) ใช้ที่ `` `+=${spec.lengthVh}%` `` (Task 2) · `StageGroup.panels`/`.media` (Task 1) ใช้ที่ `targetsOf()` (Task 2) · `applyPins(root): () => void` (Task 2) ถูก `return` ใน `mm.add` (Task 2 Step 5) · `PIN_READY_CLASS = 'pin-ready'` (Task 2) ตรงกับ selector `.pin-ready` ทุกที่ใน Task 3-6
