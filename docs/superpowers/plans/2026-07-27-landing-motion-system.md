# Landing motion system (SABUY-52) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างระบบ motion กลางของ landing ที่ component ทุกตัวสั่งงานผ่าน `data-*` attribute อย่างเดียว โดยไม่มีไฟล์ไหน import GSAP เอง

**Architecture:** แยกเป็นสามชั้น ชั้นล่างสุดเป็นฟังก์ชันบริสุทธิ์ที่อ่าน attribute และแปลง DOM (`contract.ts`) กับตัวเลือกระดับ motion (`tiers.ts`) ทั้งคู่เทสต์ได้โดยไม่ต้องมี GSAP ชั้นบนคือ `motion/index.ts` ที่เอาผลจากสองชั้นล่างไปต่อกับ GSAP + ScrollTrigger ผ่าน `gsap.matchMedia()` ส่วน CSS ทำหน้าที่ซ่อนของก่อน animate เฉพาะเมื่อ JavaScript ทำงานจริงเท่านั้น

**Tech Stack:** Astro 5 (static output), TypeScript strict, GSAP 3 + ScrollTrigger, Vitest + jsdom สำหรับ unit test

## Global Constraints

- ห้าม component ใด import `gsap` โดยตรง สื่อสารผ่าน attribute เท่านั้น: `data-parallax`, `data-reveal`, `data-reveal-stagger`, `data-depth-group`, `data-split`, `data-count`, `data-decimals`, `data-suffix`
- ปิด JavaScript แล้วข้อความและภาพต้องเห็นครบ ห้ามมี element ค้างที่ `opacity: 0` (spec ข้อ 10 เกณฑ์ที่ 4)
- `prefers-reduced-motion: reduce` ต้องไม่มี transform ใด ๆ ทุกอย่างแสดงครบทันที
- ห้าม JS สร้างข้อความใหม่ `data-split` ต้องห่อ node เดิมเท่านั้น crawler ต้องเห็นข้อความครบใน HTML ที่ server ส่ง
- ห้ามแตะ innerHTML ของ element ที่มี `data-i18n` เพราะ `src/lib/i18n.ts:22,31` snapshot และเขียนทับ `innerHTML` ของ element เหล่านั้นตอนสลับภาษา
- ห้ามพึ่งลำดับการรันของ bundled script (แก้ 2026-07-27): Astro เรียงแท็กตาม chunk index ไม่ใช่ตำแหน่งในไฟล์ — ใน build จริง motion ออกมาก่อน i18n ข้อกำหนดที่บังคับได้คือ "refresh ScrollTrigger หลังข้อความเปลี่ยน" ซึ่ง `watchLanguageChange()` ทำไว้แล้ว
- งบ JS: GSAP + ScrollTrigger รวมกัน ≤ 60 KB gzip วัดจริงแล้วบันทึกลงการ์ด SABUY-52
- `.reveal` เดิมที่ยังใช้ใน 3 component ต้องทำงานเหมือนเดิมทุกประการ
- branch: `redesign/parallax-v1` (มีอยู่แล้ว) commit ทีละ task
- ห้าม commit หรือ push ไป `main`

## File Structure

| ไฟล์ | หน้าที่ |
|---|---|
| `src/scripts/motion/contract.ts` | อ่าน `data-*` แปลงเป็น object และห่อบรรทัดสำหรับ `data-split` ไม่รู้จัก GSAP |
| `src/scripts/motion/tiers.ts` | ตัดสินระดับ motion จากความกว้างจอกับ reduced-motion |
| `src/scripts/motion/index.ts` | ต่อผลลัพธ์สองไฟล์บนเข้ากับ GSAP + ScrollTrigger และ port legacy `.reveal` |
| `src/styles/motion.css` | สถานะพักของ element ที่รอ animate ทั้งหมด gate ด้วย `.js-motion` |
| `src/layouts/Base.astro` | ใส่ flag `js-motion` ใน head, import CSS, เรียก `initMotion()`, ลบ observer เดิม |
| `tests/motion/*.test.ts` | unit test ของสามไฟล์แรก |
| `vitest.config.ts` | ตั้ง environment jsdom |

---

### Task 1: contract.ts — อ่าน attribute และห่อบรรทัด

**Files:**
- Create: `vitest.config.ts`
- Create: `src/scripts/motion/contract.ts`
- Test: `tests/motion/contract.test.ts`
- Modify: `package.json` (เพิ่ม dependency + script `test`)

**Interfaces:**
- Consumes: ไม่มี
- Produces:
  - `parseParallaxDepth(el: Element): number | null`
  - `parseReveal(el: Element): RevealSpec | null` โดย `RevealSpec = { mode: 'up' | 'mask'; delayMs: number }`
  - `parseCount(el: Element): CountSpec | null` โดย `CountSpec = { target: number; decimals: number; suffix: string }`
  - `splitLines(el: Element): HTMLElement[]` คืน element ชั้นในที่ GSAP จะขยับ

- [ ] **Step 1: ติดตั้ง dependency และเปิด script test**

```bash
cd elite-chauffeur
npm install gsap
npm install -D vitest jsdom
npm pkg set scripts.test="vitest run"
```

- [ ] **Step 2: สร้าง vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: เขียนเทสต์ที่ยังไม่ผ่าน**

สร้าง `tests/motion/contract.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { parseCount, parseParallaxDepth, parseReveal, splitLines } from '../../src/scripts/motion/contract';

function el(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
}

describe('parseParallaxDepth', () => {
  it('คืน null เมื่อไม่มี attribute', () => {
    expect(parseParallaxDepth(el('<div></div>'))).toBeNull();
  });

  it('อ่านค่าทศนิยมได้', () => {
    expect(parseParallaxDepth(el('<div data-parallax="0.12"></div>'))).toBe(0.12);
  });

  it('บีบค่าที่แรงเกินให้อยู่ในกรอบ 0.02 ถึง 0.4', () => {
    expect(parseParallaxDepth(el('<div data-parallax="9"></div>'))).toBe(0.4);
    expect(parseParallaxDepth(el('<div data-parallax="0"></div>'))).toBe(0.02);
  });

  it('คืน null เมื่อค่าไม่ใช่ตัวเลข', () => {
    expect(parseParallaxDepth(el('<div data-parallax="เร็ว"></div>'))).toBeNull();
  });
});

describe('parseReveal', () => {
  it('ค่าเริ่มต้นเป็น up และไม่มีหน่วง', () => {
    expect(parseReveal(el('<p data-reveal="up"></p>'))).toEqual({ mode: 'up', delayMs: 0 });
  });

  it('อ่านโหมด mask และ stagger', () => {
    expect(parseReveal(el('<p data-reveal="mask" data-reveal-stagger="90"></p>')))
      .toEqual({ mode: 'mask', delayMs: 90 });
  });

  it('ค่าโหมดที่ไม่รู้จักตกมาเป็น up', () => {
    expect(parseReveal(el('<p data-reveal="ระเบิด"></p>'))).toEqual({ mode: 'up', delayMs: 0 });
  });

  it('คืน null เมื่อไม่มี attribute', () => {
    expect(parseReveal(el('<p></p>'))).toBeNull();
  });
});

describe('parseCount', () => {
  it('อ่านเป้าหมาย ทศนิยม และ suffix', () => {
    expect(parseCount(el('<b data-count="4.9" data-decimals="1"></b>')))
      .toEqual({ target: 4.9, decimals: 1, suffix: '' });
    expect(parseCount(el('<b data-count="500" data-suffix="+"></b>')))
      .toEqual({ target: 500, decimals: 0, suffix: '+' });
  });
});

describe('splitLines', () => {
  it('ห่อแต่ละบรรทัดที่คั่นด้วย br', () => {
    const h1 = el('<h1 data-split>บรรทัดหนึ่ง<br>บรรทัดสอง</h1>');
    const inners = splitLines(h1);

    expect(inners).toHaveLength(2);
    expect(h1.querySelectorAll('.split-line')).toHaveLength(2);
    expect(inners[0].textContent).toBe('บรรทัดหนึ่ง');
    expect(inners[1].textContent).toBe('บรรทัดสอง');
  });

  it('ข้อความทั้งหมดยังอยู่ครบหลังห่อ', () => {
    const h1 = el('<h1 data-split>เดินทางสบาย ๆ<br>กับคนขับ มืออาชีพ</h1>');
    splitLines(h1);
    expect(h1.textContent).toBe('เดินทางสบาย ๆกับคนขับ มืออาชีพ');
  });

  it('ย้าย element ที่มี data-i18n เข้าไปทั้งก้อน ไม่แตะข้างใน', () => {
    const h1 = el('<h1 data-split><span data-i18n="hero.t1">เดินทาง</span><br><span data-i18n="hero.t2">มืออาชีพ</span></h1>');
    splitLines(h1);

    const tagged = h1.querySelectorAll('[data-i18n]');
    expect(tagged).toHaveLength(2);
    expect(tagged[0].innerHTML).toBe('เดินทาง');
    expect(tagged[0].closest('.split-line')).not.toBeNull();
  });

  it('ไม่สร้างบรรทัดว่างจาก br ที่ติดกัน', () => {
    const h1 = el('<h1 data-split>หนึ่ง<br><br>สอง</h1>');
    expect(splitLines(h1)).toHaveLength(2);
  });
});
```

- [ ] **Step 4: รันเทสต์ให้เห็นว่าไม่ผ่าน**

Run: `npm test`
Expected: FAIL — resolve error เพราะยังไม่มีไฟล์ `src/scripts/motion/contract.ts`

- [ ] **Step 5: เขียน implementation ให้เทสต์ผ่าน**

สร้าง `src/scripts/motion/contract.ts`

```ts
/**
 * อ่านสัญญา data-* ที่ component ใช้สั่งงาน motion
 * ไฟล์นี้ห้ามรู้จัก GSAP เพื่อให้เทสต์ได้ด้วย jsdom ล้วน ๆ
 */

export type RevealMode = 'up' | 'mask';

export interface RevealSpec {
  mode: RevealMode;
  delayMs: number;
}

export interface CountSpec {
  target: number;
  decimals: number;
  suffix: string;
}

const MIN_DEPTH = 0.02;
const MAX_DEPTH = 0.4;

export function parseParallaxDepth(el: Element): number | null {
  const raw = el.getAttribute('data-parallax');
  if (raw === null) return null;

  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return null;

  return Math.min(Math.max(value, MIN_DEPTH), MAX_DEPTH);
}

export function parseReveal(el: Element): RevealSpec | null {
  const raw = el.getAttribute('data-reveal');
  if (raw === null) return null;

  const delay = Number.parseInt(el.getAttribute('data-reveal-stagger') ?? '', 10);

  return {
    mode: raw === 'mask' ? 'mask' : 'up',
    delayMs: Number.isFinite(delay) && delay > 0 ? delay : 0,
  };
}

export function parseCount(el: Element): CountSpec | null {
  const raw = el.getAttribute('data-count');
  if (raw === null) return null;

  const target = Number.parseFloat(raw);
  if (!Number.isFinite(target)) return null;

  const decimals = Number.parseInt(el.getAttribute('data-decimals') ?? '', 10);

  return {
    target,
    decimals: Number.isFinite(decimals) && decimals > 0 ? decimals : 0,
    suffix: el.getAttribute('data-suffix') ?? '',
  };
}

/**
 * ห่อแต่ละบรรทัด (คั่นด้วย <br>) ด้วย .split-line > .split-inner
 *
 * ย้าย node เดิมเข้าไปในตัวห่อ ไม่ได้ serialize innerHTML ใหม่ จึงไม่ทำลาย
 * element ที่มี data-i18n ซึ่ง src/lib/i18n.ts จะเขียนทับ innerHTML ของมัน
 * ตอนสลับภาษา ตัวห่ออยู่ชั้นนอกของ element เหล่านั้นเสมอ
 */
export function splitLines(el: Element): HTMLElement[] {
  const doc = el.ownerDocument;
  const groups: Node[][] = [[]];

  Array.from(el.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'BR') {
      groups.push([]);
      return;
    }
    groups[groups.length - 1].push(node);
  });

  const fragment = doc.createDocumentFragment();
  const inners: HTMLElement[] = [];

  groups.forEach((nodes) => {
    const hasText = nodes.some((node) => (node.textContent ?? '').trim() !== '');
    if (!hasText) return;

    const line = doc.createElement('span');
    line.className = 'split-line';

    const inner = doc.createElement('span');
    inner.className = 'split-inner';
    nodes.forEach((node) => inner.appendChild(node));

    line.appendChild(inner);
    fragment.appendChild(line);
    inners.push(inner);
  });

  el.textContent = '';
  el.appendChild(fragment);

  return inners;
}
```

- [ ] **Step 6: รันเทสต์ให้ผ่าน**

Run: `npm test`
Expected: PASS ทั้ง 13 เคส

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/scripts/motion/contract.ts tests/motion/contract.test.ts
git commit -m "feat(landing): add data-* motion contract parsers with jsdom tests"
```

---

### Task 2: tiers.ts — เลือกระดับ motion

**Files:**
- Create: `src/scripts/motion/tiers.ts`
- Test: `tests/motion/tiers.test.ts`

**Interfaces:**
- Consumes: ไม่มี
- Produces:
  - `type MotionTier = 'full' | 'lite' | 'static'`
  - `FULL_TIER_MIN_WIDTH: 1024`
  - `pickTier(input: { viewportWidth: number; prefersReducedMotion: boolean }): MotionTier`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

สร้าง `tests/motion/tiers.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { FULL_TIER_MIN_WIDTH, pickTier } from '../../src/scripts/motion/tiers';

describe('pickTier', () => {
  it('reduced motion ชนะทุกอย่าง', () => {
    expect(pickTier({ viewportWidth: 1920, prefersReducedMotion: true })).toBe('static');
    expect(pickTier({ viewportWidth: 390, prefersReducedMotion: true })).toBe('static');
  });

  it('desktop ได้ full', () => {
    expect(pickTier({ viewportWidth: FULL_TIER_MIN_WIDTH, prefersReducedMotion: false })).toBe('full');
  });

  it('แคบกว่า 1024 ได้ lite เพราะ parallax หลายชั้นบนมือถือทำให้กระตุก', () => {
    expect(pickTier({ viewportWidth: FULL_TIER_MIN_WIDTH - 1, prefersReducedMotion: false })).toBe('lite');
    expect(pickTier({ viewportWidth: 390, prefersReducedMotion: false })).toBe('lite');
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

Run: `npm test -- tests/motion/tiers.test.ts`
Expected: FAIL — resolve error เพราะยังไม่มี `src/scripts/motion/tiers.ts`

- [ ] **Step 3: เขียน implementation**

สร้าง `src/scripts/motion/tiers.ts`

```ts
export type MotionTier = 'full' | 'lite' | 'static';

export interface TierInput {
  viewportWidth: number;
  prefersReducedMotion: boolean;
}

/** ต่ำกว่านี้ตัด parallax ทิ้ง เหลือ fade กับ mask */
export const FULL_TIER_MIN_WIDTH = 1024;

export function pickTier(input: TierInput): MotionTier {
  if (input.prefersReducedMotion) return 'static';
  return input.viewportWidth >= FULL_TIER_MIN_WIDTH ? 'full' : 'lite';
}
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `npm test`
Expected: PASS ทั้งหมด

- [ ] **Step 5: Commit**

```bash
git add src/scripts/motion/tiers.ts tests/motion/tiers.test.ts
git commit -m "feat(landing): add motion tier selection"
```

---

### Task 3: motion.css — สถานะพักที่ปลอดภัยเมื่อไม่มี JavaScript

**Files:**
- Create: `src/styles/motion.css`

**Interfaces:**
- Consumes: class `js-motion` บน `<html>` ที่ Task 5 จะใส่ให้ และ class `.split-line` / `.split-inner` จาก `splitLines()` ของ Task 1
- Produces: สถานะพักของ `[data-reveal]` และ `.split-inner` ที่ GSAP จะ animate ออกมา

- [ ] **Step 1: สร้างไฟล์**

สร้าง `src/styles/motion.css`

```css
/* สถานะพักของ element ที่รอ animate
   ทุกกฎ gate ด้วย .js-motion ที่ Base.astro ใส่ให้ตั้งแต่ใน <head>
   ถ้า JavaScript ไม่ทำงาน class นี้จะไม่มี และไม่มีอะไรถูกซ่อนเลย */

.js-motion [data-reveal] {
  opacity: 0;
}

.js-motion [data-reveal='mask'] {
  opacity: 1;
  clip-path: inset(0 0 100% 0);
}

.js-motion .split-line {
  display: block;
  overflow: hidden;
}

.js-motion .split-inner {
  display: inline-block;
}

/* ชั้น parallax ต้องสูงเกินกรอบที่ครอบมัน ไม่งั้นการเลื่อนจะลากขอบว่างเข้ามา
   กรอบเป็นหน้าที่ของ component ส่วนตัวชั้นเองรับ will-change ตอน active */
.js-motion [data-parallax] {
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .js-motion [data-reveal],
  .js-motion [data-reveal='mask'] {
    opacity: 1 !important;
    clip-path: none !important;
    transform: none !important;
  }

  .js-motion .split-inner,
  .js-motion [data-parallax] {
    transform: none !important;
    will-change: auto;
  }
}
```

- [ ] **Step 2: ตรวจว่า build ยังผ่าน**

Run: `npm run build`
Expected: สำเร็จ ไม่มี error จาก `astro check`

- [ ] **Step 3: Commit**

```bash
git add src/styles/motion.css
git commit -m "feat(landing): add motion resting states gated on js-motion"
```

---

### Task 4: motion/index.ts — ต่อ contract เข้ากับ GSAP

**Files:**
- Create: `src/scripts/motion/index.ts`
- Test: `tests/motion/index.test.ts`

**Interfaces:**
- Consumes: `parseParallaxDepth`, `parseReveal`, `parseCount`, `splitLines` จาก Task 1 และ `FULL_TIER_MIN_WIDTH` จาก Task 2
- Produces: `initMotion(root?: ParentNode): void` ที่ Task 5 เรียก

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

สร้าง `tests/motion/index.test.ts`

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromTo = vi.fn();
const to = vi.fn();
const registerPlugin = vi.fn();
const matchMediaAdd = vi.fn((_query: string, callback: () => void) => callback());
const refresh = vi.fn();

vi.mock('gsap', () => ({
  gsap: {
    registerPlugin,
    fromTo,
    to,
    matchMedia: () => ({ add: matchMediaAdd }),
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { refresh },
}));

import { initMotion } from '../../src/scripts/motion/index';

describe('initMotion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    document.documentElement.lang = 'th';
  });

  it('ลงทะเบียน ScrollTrigger', () => {
    initMotion();
    expect(registerPlugin).toHaveBeenCalledTimes(1);
  });

  it('ห่อบรรทัดของ data-split ก่อนสั่ง animate', () => {
    document.body.innerHTML = '<h1 data-split>หนึ่ง<br>สอง</h1>';
    initMotion();
    expect(document.querySelectorAll('.split-inner')).toHaveLength(2);
  });

  it('สร้าง tween ให้ทั้ง parallax และ reveal', () => {
    document.body.innerHTML = `
      <div data-depth-group="hero"><div data-parallax="0.1"></div></div>
      <p data-reveal="up"></p>
    `;
    initMotion();

    const targets = fromTo.mock.calls.map((call) => call[0] as Element);
    expect(targets.some((el) => el.hasAttribute('data-parallax'))).toBe(true);
    expect(targets.some((el) => el.hasAttribute('data-reveal'))).toBe(true);
  });

  it('ใช้ data-depth-group เป็น trigger ของชั้น parallax', () => {
    document.body.innerHTML = '<section data-depth-group="hero"><div data-parallax="0.1"></div></section>';
    initMotion();

    const parallaxCall = fromTo.mock.calls.find(
      (call) => (call[0] as Element).hasAttribute('data-parallax')
    );
    const vars = parallaxCall?.[2] as { scrollTrigger: { trigger: Element } };
    expect(vars.scrollTrigger.trigger.tagName).toBe('SECTION');
  });

  it('นับเลขขึ้นด้วย gsap.to และเขียนค่าพร้อม suffix ลง element', () => {
    document.body.innerHTML = '<b data-count="500" data-suffix="+">500+</b>';
    initMotion();

    const countCall = to.mock.calls.find((call) => (call[0] as { value: number }).value === 0);
    expect(countCall).toBeDefined();

    const state = countCall![0] as { value: number };
    const vars = countCall![1] as { onUpdate: () => void };
    state.value = 250;
    vars.onUpdate();

    expect(document.querySelector('b')?.textContent).toBe('250+');
  });

  it('สั่ง ScrollTrigger.refresh เมื่อภาษาบนแท็ก html เปลี่ยน', async () => {
    initMotion();
    document.documentElement.lang = 'en';
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(refresh).toHaveBeenCalled();
  });

  it('รองรับ .reveal เดิมโดยใส่ class in ให้', () => {
    document.body.innerHTML = '<div class="reveal"></div>';
    initMotion();
    expect(document.querySelector('.reveal')?.classList.contains('in')).toBe(true);
  });

  it('reduced motion ทำให้ .reveal ทุกตัวแสดงทันทีโดยไม่ต้องรอ observer', () => {
    const observe = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      observe = observe;
      unobserve = vi.fn();
      disconnect = vi.fn();
    });
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    document.body.innerHTML = '<div class="reveal"></div>';
    initMotion();

    expect(document.querySelector('.reveal')?.classList.contains('in')).toBe(true);
    expect(observe).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

Run: `npm test -- tests/motion/index.test.ts`
Expected: FAIL — resolve error เพราะยังไม่มี `src/scripts/motion/index.ts`

- [ ] **Step 3: เขียน implementation**

สร้าง `src/scripts/motion/index.ts`

```ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { parseCount, parseParallaxDepth, parseReveal, splitLines } from './contract';
import { FULL_TIER_MIN_WIDTH, pickTier } from './tiers';

const EASE = 'power3.out';
const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)';

function applyParallax(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const depth = parseParallaxDepth(el);
    if (depth === null) return;

    const trigger = el.closest('[data-depth-group]') ?? el.parentElement ?? el;

    gsap.fromTo(
      el,
      { yPercent: -depth * 50 },
      {
        yPercent: depth * 50,
        ease: 'none',
        scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: true },
      }
    );
  });
}

function applySplitReveal(inners: HTMLElement[], trigger: Element): void {
  inners.forEach((inner, index) => {
    gsap.fromTo(
      inner,
      { yPercent: 110 },
      {
        yPercent: 0,
        duration: 1.1,
        ease: EASE,
        delay: index * 0.08,
        scrollTrigger: { trigger, start: 'top 85%' },
      }
    );
  });
}

function applyReveals(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    const spec = parseReveal(el);
    if (spec === null) return;

    const delay = spec.delayMs / 1000;
    const from = spec.mode === 'mask'
      ? { opacity: 1, clipPath: 'inset(0 0 100% 0)' }
      : { opacity: 0, y: 26 };
    const to = spec.mode === 'mask'
      ? { clipPath: 'inset(0 0 0% 0)', duration: 1, ease: EASE, delay }
      : { opacity: 1, y: 0, duration: 0.9, ease: EASE, delay };

    gsap.fromTo(el, from, { ...to, scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
}

function applyCounts(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const spec = parseCount(el);
    if (spec === null) return;

    const state = { value: 0 };

    gsap.to(state, {
      value: spec.target,
      duration: 1.4,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%' },
      onUpdate: () => {
        el.textContent = state.value.toFixed(spec.decimals) + spec.suffix;
      },
    });
  });
}

/**
 * .reveal คือระบบเดิมที่ยังใช้อยู่ในบาง component (ported มาจาก Base.astro)
 * ระบบใหม่ใช้ data-reveal แต่ของเดิมต้องไม่พังระหว่างที่ยังไม่ได้ย้ายครบ
 */
function applyLegacyReveal(root: ParentNode): void {
  const nodes = root.querySelectorAll<HTMLElement>('.reveal');
  if (nodes.length === 0) return;

  const tier = pickTier({
    viewportWidth: window.innerWidth,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });

  // เงื่อนไขเดิมจาก Base.astro:180-199 — reduced motion หรือไม่มี observer
  // แปลว่าแสดงทุกอย่างทันที ไม่ใช่รอให้เลื่อนถึง
  if (tier === 'static' || !('IntersectionObserver' in window)) {
    nodes.forEach((el) => el.classList.add('in'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  nodes.forEach((el) => observer.observe(el));
}

/**
 * สลับภาษาทำให้ความยาวข้อความเปลี่ยน ตำแหน่งที่ ScrollTrigger คำนวณไว้จึงเก่า
 * i18n ไม่ได้ยิง event ออกมา จึงเฝ้า attribute lang บน <html> แทน
 */
function watchLanguageChange(): void {
  const html = document.documentElement;
  let current = html.lang;

  new MutationObserver(() => {
    if (html.lang === current) return;
    current = html.lang;
    ScrollTrigger.refresh();
  }).observe(html, { attributes: true, attributeFilter: ['lang'] });
}

export function initMotion(root: ParentNode = document): void {
  gsap.registerPlugin(ScrollTrigger);

  const splitTargets = Array.from(root.querySelectorAll<HTMLElement>('[data-split]'))
    .map((el) => ({ el, inners: splitLines(el) }));

  const mm = gsap.matchMedia();

  mm.add(`(min-width: ${FULL_TIER_MIN_WIDTH}px) and ${NO_PREFERENCE}`, () => {
    applyParallax(root);
  });

  mm.add(NO_PREFERENCE, () => {
    splitTargets.forEach(({ el, inners }) => applySplitReveal(inners, el));
    applyReveals(root);
    applyCounts(root);
  });

  applyLegacyReveal(root);
  watchLanguageChange();
}
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `npm test`
Expected: PASS ทั้งหมด รวม 8 เคสของไฟล์นี้

- [ ] **Step 5: Commit**

```bash
git add src/scripts/motion/index.ts tests/motion/index.test.ts
git commit -m "feat(landing): wire data-* motion contract to gsap scrolltrigger"
```

---

### Task 5: Base.astro — ใส่ flag, โหลด CSS, เรียก initMotion, ลบ observer เดิม

**Files:**
- Modify: `src/layouts/Base.astro:2` (เพิ่ม import CSS)
- Modify: `src/layouts/Base.astro` (`<head>`: เพิ่ม inline flag script)
- Modify: `src/layouts/Base.astro:172-208` (แทน observer เดิมด้วยการเรียก `initMotion`)

**Interfaces:**
- Consumes: `initMotion` จาก Task 4, `src/styles/motion.css` จาก Task 3
- Produces: หน้าเว็บที่ทุก component สั่ง motion ผ่าน attribute ได้จริง

- [ ] **Step 1: เพิ่ม import CSS**

แก้บรรทัดที่ 2 ของ `src/layouts/Base.astro` จาก

```astro
import '../styles/global.css';
```

เป็น

```astro
import '../styles/global.css';
import '../styles/motion.css';
```

- [ ] **Step 2: ใส่ flag js-motion ใน head**

เพิ่มบรรทัดนี้เป็น element แรกใน `<head>` ก่อน `<link>` และ `<style>` ทุกตัว

```astro
<script is:inline>
  // ใส่ก่อนวาดจอ: กฎซ่อน element ใน motion.css มีผลเฉพาะเมื่อ JavaScript ทำงาน
  // ถ้าสคริปต์นี้ไม่รัน ทุกอย่างจะแสดงตามปกติแทนที่จะค้างอยู่ที่ opacity 0
  document.documentElement.classList.add('js-motion');
</script>
```

- [ ] **Step 3: แทนบล็อก reveal เดิมทั้งก้อน**

ลบตั้งแต่คอมเมนต์ `<!-- Reveal on scroll — ported from live index.html ... -->` จนจบ `</script>` (บรรทัด 172 ถึง 208) แล้วใส่แทนด้วย

```astro
<!-- Motion system กลาง: component สั่งงานผ่าน data-* เท่านั้น
     รายละเอียดสัญญาอยู่ใน docs/superpowers/specs/2026-07-27-landing-layered-parallax-design.md
     สคริปต์นี้อยู่หลังบล็อก i18n เพื่อให้ข้อความถูกตั้งค่าเสร็จก่อนวัดตำแหน่ง -->
<script>
  import { initMotion } from '../scripts/motion';

  function bootMotion() {
    initMotion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootMotion);
  } else {
    bootMotion();
  }
</script>
```

- [ ] **Step 4: ตรวจว่า build ผ่านและ type ถูก**

Run: `npm run build`
Expected: สำเร็จ ไม่มี error จาก `astro check`

- [ ] **Step 5: ตรวจว่าไม่มี observer เดิมหลงเหลือ**

Run: `grep -n "IntersectionObserver" src/layouts/Base.astro`
Expected: ไม่มีผลลัพธ์ (ตัวเดียวที่เหลือในโปรเจกต์อยู่ใน `src/scripts/motion/index.ts`)

- [ ] **Step 6: Commit**

```bash
git add src/layouts/Base.astro
git commit -m "feat(landing): load central motion system from Base layout"
```

---

### Task 6: ตรวจของจริงในเบราว์เซอร์และวัดขนาด bundle

**Files:**
- Create: `docs/superpowers/plans/2026-07-27-landing-motion-system-verify.md` (บันทึกผลวัด)

**Interfaces:**
- Consumes: ผลลัพธ์จาก Task 1 ถึง 5
- Produces: ตัวเลขที่เอาไปแปะการ์ด SABUY-52 และใช้เทียบในงาน S3

- [ ] **Step 1: build แล้ววัดขนาด gzip ของ chunk ที่มี GSAP**

```bash
npm run build
for f in dist/_astro/*.js; do printf '%s %s\n' "$(gzip -c "$f" | wc -c)" "$f"; done | sort -rn | head -5
```

Expected: chunk ที่ใหญ่ที่สุดคือ GSAP + ScrollTrigger และต้อง ≤ 61440 ไบต์ (60 KB) ถ้าเกิน ให้หยุดและรายงาน ไม่ต้องแก้เอง

- [ ] **Step 2: เปิด preview server**

```bash
npm run preview
```

Expected: เสิร์ฟที่ `http://localhost:4321`

- [ ] **Step 3: ตรวจสามระดับด้วย Playwright**

รันสคริปต์นี้ (ใช้ playwright ที่ติดตั้งในเครื่องอยู่แล้วที่ `/Library/Frameworks/Python.framework/Versions/3.12/bin/python3`)

```python
from playwright.sync_api import sync_playwright

URL = "http://localhost:4321/"

def hidden_count(page):
    return page.evaluate("""
        [...document.querySelectorAll('[data-reveal], .reveal')]
          .filter(el => getComputedStyle(el).opacity === '0').length
    """)

with sync_playwright() as pw:
    b = pw.chromium.launch()

    # 1) desktop ปกติ: มี js-motion และข้อความไม่ค้างซ่อนหลังเลื่อนถึง
    p = b.new_page(viewport={"width": 1440, "height": 900})
    p.goto(URL, wait_until="load"); p.wait_for_timeout(2000)
    assert p.evaluate("document.documentElement.classList.contains('js-motion')")
    p.evaluate("window.scrollTo(0, document.body.scrollHeight)"); p.wait_for_timeout(2500)
    print("desktop hidden after scroll:", hidden_count(p))

    # 2) reduced motion: ห้ามมีอะไรซ่อนเลยตั้งแต่โหลด
    p2 = b.new_page(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    p2.goto(URL, wait_until="load"); p2.wait_for_timeout(1500)
    print("reduced-motion hidden:", hidden_count(p2))

    # 3) ปิด JavaScript: เนื้อหาต้องครบ
    ctx = b.new_context(java_script_enabled=False)
    p3 = ctx.new_page()
    p3.goto(URL, wait_until="load"); p3.wait_for_timeout(800)
    print("no-js hidden:", hidden_count(p3))
    print("no-js text length:", len(p3.evaluate("document.body.innerText")))

    b.close()
```

Expected: `reduced-motion hidden` เป็น 0, `no-js hidden` เป็น 0, `no-js text length` มากกว่า 1000, `desktop hidden after scroll` เป็น 0

- [ ] **Step 4: ตรวจว่าสลับภาษาแล้วไม่มีข้อความหาย**

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    b = pw.chromium.launch()
    p = b.new_page(viewport={"width": 1440, "height": 900})
    p.goto("http://localhost:4321/", wait_until="load"); p.wait_for_timeout(2000)
    before = p.evaluate("document.querySelector('h1').innerText")
    p.click(".lang-toggle button[data-lang='en']"); p.wait_for_timeout(1200)
    after = p.evaluate("document.querySelector('h1').innerText")
    print("th:", before); print("en:", after)
    assert after.strip() != "" and after != before
    b.close()
```

Expected: หัวข้อเปลี่ยนเป็นภาษาอังกฤษและไม่ว่างเปล่า (ถ้าว่าง แปลว่าการห่อบรรทัดไปทับ element ที่มี `data-i18n`)

- [ ] **Step 5: บันทึกผลและปิดการ์ด**

สร้าง `docs/superpowers/plans/2026-07-27-landing-motion-system-verify.md` เขียนตัวเลขที่วัดได้จริงทั้ง 4 ขั้น แล้ว commit

```bash
git add docs/superpowers/plans/2026-07-27-landing-motion-system-verify.md
git commit -m "docs(landing): record motion system verification numbers"
```

จากนั้นแปะผลลงการ์ด SABUY-52 แล้วเลื่อนสถานะเป็น Done

---

## Self-Review

**Spec coverage** — spec ข้อ 3 (motion system) ครบทั้งหมด: `data-*` ครบ 8 ตัวใน Task 1 และ 4, สามระดับผ่าน `matchMedia` ใน Task 4, กติกาห้ามข้อ 2 (split ต้องห่อ node เดิม) บังคับด้วยเทสต์ใน Task 1, ข้อ 5 (งบ 60 KB) วัดใน Task 6 ข้อ 1, ข้อ 4 (`will-change`) อยู่ใน Task 3 ข้อ 4 (LCP ห้ามอยู่ในชั้นที่ขยับ) กับข้อ 3 (กรอบ overflow) เป็นหน้าที่ของ S3 ตอนวาง markup จริง ไม่ใช่ของ S1 — ระบุไว้ในคอมเมนต์ของ `motion.css` แล้ว

**สิ่งที่ spec ไม่ได้เขียนแต่เจอตอนอ่านโค้ด** — `src/lib/i18n.ts:22,31` เขียนทับ `innerHTML` ของ `[data-i18n]` ตอนสลับภาษา ถ้า `splitLines` ไป serialize innerHTML ใหม่ ข้อความจะหายตอนกดเปลี่ยนภาษา จึงบังคับด้วยเทสต์ในTask 1 และตรวจซ้ำในเบราว์เซอร์ที่ Task 6 ข้อ 4

**Placeholder scan** — ไม่มี TBD หรือ "handle edge cases" ทุก step มีโค้ดจริงและคำสั่งรันจริง

**Type consistency** — `RevealSpec.delayMs` (ms) แปลงเป็นวินาทีที่จุดเดียวใน `applyReveals` · `CountSpec.decimals` ใช้กับ `toFixed` · `FULL_TIER_MIN_WIDTH` ถูกใช้ทั้งใน `pickTier` และ query ของ `matchMedia` ไม่มีเลข 1024 ลอย ๆ ที่อื่น

**สิ่งที่แก้ระหว่าง self-review** — ร่างแรกทำสองอย่างพลาด (1) `pickTier` ไม่ถูกเรียกจากที่ไหนเลย เป็นโค้ดตายตั้งแต่วันแรก (2) การ port `.reveal` ทำเงื่อนไข reduced-motion เดิมที่ `Base.astro:180` หายไป เหลือแต่การเช็คว่ามี `IntersectionObserver` หรือไม่ ผลคือคนที่เปิด reduced-motion จะต้องเลื่อนจอก่อนถึงจะเห็นข้อความ ทั้งสองแก้พร้อมกันโดยให้ `applyLegacyReveal` ใช้ `pickTier` ตัดสิน และเพิ่มเทสต์ที่ stub `matchMedia` ครอบไว้

**หมายเหตุ** — `pickTier` กับ query string ของ `gsap.matchMedia` อ้าง `FULL_TIER_MIN_WIDTH` ตัวเดียวกัน ไม่มีเลข 1024 ลอยอยู่ที่อื่น และ S3 จะเรียก `pickTier` ซ้ำตอนตัดสินใจว่าจะโหลด three.js หรือไม่
