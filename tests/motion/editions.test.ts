import { beforeEach, describe, expect, it, vi } from 'vitest';

// fix-review I2/I3/I1: mocked the same way tests/motion/index.test.ts and
// mobile-lite.test.ts mock gsap/ScrollTrigger — real ScrollTrigger.create
// needs live layout measurement that jsdom can't provide, so build*Chapter
// was previously untested here entirely (only the pure helpers were). This
// mock lets us assert the fix-review contract directly: each builder creates
// its own gsap.context(scope: section) and calls ctx.revert() from its
// returned cleanup (I2), the fleet rail buttons' click listeners are removed
// on cleanup (I3), and the rail's target scroll position is computed from
// the ScrollTrigger instance's own start/end (I1) rather than current scroll.
const { context, contextRevert, scrollTriggerCreate, gsapTo, gsapSet, gsapTimeline } = vi.hoisted(() => {
  const contextAdd = vi.fn((_name: string, func: (...args: unknown[]) => unknown) => func);
  const contextRevert = vi.fn();
  const context = vi.fn(() => ({ add: contextAdd, revert: contextRevert }));
  const scrollTriggerCreate = vi.fn();
  const gsapTo = vi.fn();
  const gsapSet = vi.fn();
  const timelineChain: Record<string, ReturnType<typeof vi.fn>> = {};
  timelineChain.to = vi.fn(() => timelineChain);
  timelineChain.fromTo = vi.fn(() => timelineChain);
  timelineChain.add = vi.fn(() => timelineChain);
  const gsapTimeline = vi.fn(() => timelineChain);
  return { context, contextAdd, contextRevert, scrollTriggerCreate, gsapTo, gsapSet, gsapTimeline };
});

vi.mock('gsap', () => ({
  gsap: {
    context,
    to: gsapTo,
    set: gsapSet,
    timeline: gsapTimeline,
    utils: { clamp: (min: number, max: number, v: number) => Math.min(max, Math.max(min, v)) },
    parseEase: () => (t: number) => t,
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { create: scrollTriggerCreate },
}));

import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { applyEditionsPins, collectChapters } from '../../src/scripts/motion/editions';
import { buildFleetChapter, fleetStageForProgress } from '../../src/scripts/motion/chapters/fleet';
import { buildHowChapter, howStageForProgress } from '../../src/scripts/motion/chapters/how';
import { buildIntroChapter } from '../../src/scripts/motion/chapters/intro';
import { buildRoutesChapter } from '../../src/scripts/motion/chapters/routes';

function root(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

// every build*Chapter pins via ScrollTrigger.create({ ... }) — the mock
// returns a trigger stub carrying a spy-able kill() plus a fixed start/end
// range so the fleet rail-click math (I1) can be asserted independent of
// whatever window.scrollY happens to be at click time.
function stubTrigger(start = 1000, end = 2000) {
  const kill = vi.fn();
  scrollTriggerCreate.mockReturnValue({ kill, start, end, progress: 0 });
  return { kill, start, end };
}

describe('collectChapters', () => {
  it('อ่านชื่อและความยาวของ chapter จาก data-chapter / data-chapter-len', () => {
    const doc = root(
      '<section class="chapter intro-chapter" data-chapter="intro" data-chapter-len="420"></section>'
    );
    const chapters = collectChapters(doc);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].name).toBe('intro');
    expect(chapters[0].len).toBe(420);
    expect(chapters[0].el).toBe(doc.querySelector('section'));
  });

  it('ข้าม element ที่ไม่มี data-chapter', () => {
    const doc = root('<section></section>');
    expect(collectChapters(doc)).toHaveLength(0);
  });

  it('ใช้ความยาวเริ่มต้น 300 เมื่อไม่ได้ระบุ data-chapter-len', () => {
    const doc = root('<section data-chapter="intro"></section>');
    expect(collectChapters(doc)[0].len).toBe(300);
  });

  it('ใช้ความยาวเริ่มต้น 300 เมื่อ data-chapter-len ไม่ใช่ตัวเลข', () => {
    const doc = root('<section data-chapter="intro" data-chapter-len="ยาว"></section>');
    expect(collectChapters(doc)[0].len).toBe(300);
  });

  it('บีบความยาวให้อยู่ในกรอบ 100 ถึง 600', () => {
    const doc = root('<section data-chapter="intro" data-chapter-len="9999"></section>');
    expect(collectChapters(doc)[0].len).toBe(600);

    const doc2 = root('<section data-chapter="intro" data-chapter-len="10"></section>');
    expect(collectChapters(doc2)[0].len).toBe(100);
  });

  it('รวบรวมหลาย chapter ตามลำดับที่ปรากฏใน DOM', () => {
    const doc = root(`
      <section data-chapter="intro" data-chapter-len="420"></section>
      <section data-chapter="fleet" data-chapter-len="380"></section>
    `);
    const chapters = collectChapters(doc);
    expect(chapters.map((c) => c.name)).toEqual(['intro', 'fleet']);
  });
});

describe('applyEditionsPins · tier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('มือถือได้บทเดียวกันแต่ความยาวย่อลง', () => {
    document.body.innerHTML = '<section data-chapter="why" data-chapter-len="240"><div class="why-item"></div></section>';
    const spy = vi.spyOn(ScrollTrigger, 'create');

    applyEditionsPins(document, 'lite');

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ end: '+=132%' }));
  });
});

describe('fleetStageForProgress', () => {
  // chapter 1 · fleet มี 4 stage (CARS.length === 4) — สูตรตรงกับ mockup ที่
  // ScrollTrigger.onUpdate ยิง Math.min(3, Math.floor(st.progress * 4))
  it.each([
    [0, 0],
    [0.24, 0],
    [0.26, 1],
    [0.5, 2],
    [0.99, 3],
  ])('progress %f -> stage %i', (p, expected) => {
    expect(fleetStageForProgress(p)).toBe(expected);
  });
});

describe('howStageForProgress', () => {
  // chapter 2 · how มี 3 stage — สูตรตรงกับ mockup ที่ ScrollTrigger.onUpdate
  // ยิง Math.min(2, Math.floor(st.progress * 3))
  it.each([
    [0, 0],
    [0.32, 0],
    [0.34, 1],
    [0.66, 1],
    [0.99, 2],
  ])('progress %f -> stage %i', (p, expected) => {
    expect(howStageForProgress(p)).toBe(expected);
  });
});

describe('buildIntroChapter · fix-review I2 (context revert on cleanup)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('สร้าง gsap.context ผูกกับ section แล้วเรียก ctx.revert() ตอน cleanup (ไม่ใช่แค่ trigger.kill())', () => {
    document.body.innerHTML = `
      <section class="intro-chapter">
        <div class="intro-photo"><img class="intro-photo-img"></div>
        <div class="intro-veil"></div>
        <div class="intro-hero-copy"></div>
        <div class="intro-services">
          <a class="svc" data-i="0"></a>
        </div>
        <img class="svc-img" data-svc="0">
      </section>
    `;
    const section = document.querySelector<HTMLElement>('.intro-chapter')!;
    const { kill } = stubTrigger();

    const cleanup = buildIntroChapter(section, 300);

    expect(context).toHaveBeenCalledWith(expect.any(Function), section);
    expect(contextRevert).not.toHaveBeenCalled();

    cleanup();

    expect(kill).toHaveBeenCalledTimes(1);
    expect(contextRevert).toHaveBeenCalledTimes(1);
    expect(section.classList.contains('pin-ready')).toBe(false);
  });

  it('markup ไม่ครบ (ไม่มี .intro-services) — ไม่สร้าง context/trigger เลย', () => {
    document.body.innerHTML = `
      <section class="intro-chapter">
        <div class="intro-photo"><img class="intro-photo-img"></div>
        <div class="intro-veil"></div>
        <div class="intro-hero-copy"></div>
      </section>
    `;
    const section = document.querySelector<HTMLElement>('.intro-chapter')!;
    const cleanup = buildIntroChapter(section, 300);

    expect(context).not.toHaveBeenCalled();
    expect(scrollTriggerCreate).not.toHaveBeenCalled();
    expect(() => cleanup()).not.toThrow();
  });
});

describe('buildFleetChapter · fix-review I1/I2/I3', () => {
  const FLEET_HTML = `
    <section class="fleet-chapter">
      <script type="application/json" id="fleet-data">
        [
          { "ghost": "A", "name": "Car A", "price": "1000", "img": "/a.webp", "alt": "a", "vtype": "sedan" },
          { "ghost": "B", "name": "Car B", "price": "2000", "img": "/b.webp", "alt": "b", "vtype": "suv" },
          { "ghost": "C", "name": "Car C", "price": "3000", "img": "/c.webp", "alt": "c", "vtype": "van" },
          { "ghost": "D", "name": "Car D", "price": "4000", "img": "/d.webp", "alt": "d", "vtype": "van" }
        ]
      </script>
      <div class="ghost"><span></span></div>
      <div class="car-layer"><img></div>
      <div class="fleet-meta">
        <div class="name"></div>
        <div class="chips"></div>
        <div class="price"><b></b></div>
      </div>
      <button class="pick"></button>
      <div class="fleet-count"></div>
      <div class="rail">
        <button data-rail="0"></button>
        <button data-rail="1"></button>
        <button data-rail="2"></button>
        <button data-rail="3"></button>
      </div>
      <div class="fleet-tabs">
        <button>1</button>
        <button>2</button>
        <button>3</button>
        <button>4</button>
      </div>
    </section>
  `;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('cleanup เรียก ctx.revert() และถอด click listener ของทุกปุ่ม rail (I2 + I3)', () => {
    document.body.innerHTML = FLEET_HTML;
    const section = document.querySelector<HTMLElement>('.fleet-chapter')!;
    const buttons = Array.from(section.querySelectorAll<HTMLElement>('.rail button'));
    const removeSpies = buttons.map((b) => vi.spyOn(b, 'removeEventListener'));
    const { kill } = stubTrigger();

    const cleanup = buildFleetChapter(section, 300);

    expect(context).toHaveBeenCalledWith(expect.any(Function), section);

    cleanup();

    expect(kill).toHaveBeenCalledTimes(1);
    expect(contextRevert).toHaveBeenCalledTimes(1);
    removeSpies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
  });

  it('rail click คำนวณตำแหน่ง scroll จาก trigger.start/end เสมอ ไม่สนใจ scrollY ปัจจุบัน (I1)', () => {
    document.body.innerHTML = FLEET_HTML;
    const section = document.querySelector<HTMLElement>('.fleet-chapter')!;
    const buttons = Array.from(section.querySelectorAll<HTMLElement>('.rail button'));
    stubTrigger(1000, 5000); // start=1000, end=5000 -> len=4000 across 4 stages -> 1000 per stage

    buildFleetChapter(section, 300);

    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    // simulate the user already being scrolled somewhere else entirely — the
    // old rect.top+scrollY math would have used this value as its baseline
    Object.defineProperty(window, 'scrollY', { value: 9999, configurable: true });

    buttons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // stage 0 target: start + (0.5/4)*(end-start) = 1000 + 0.125*4000 = 1500
    expect(scrollTo).toHaveBeenCalledWith({ top: 1500, behavior: 'smooth' });

    buttons[3].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // stage 3 target: 1000 + (3.5/4)*4000 = 4500
    expect(scrollTo).toHaveBeenCalledWith({ top: 4500, behavior: 'smooth' });
  });

  it('fix round 2 (CRITICAL regression): .fleet-tabs (มือถือ) index ตามตำแหน่งของตัวเอง ไม่ใช่ตำแหน่งรวมกับ .rail ใน document', () => {
    // ก่อน fix round 2, `.rail button, .fleet-tabs button` ถูก query เป็น array
    // เดียว — .fleet-tabs อยู่ index 4-7 ของ array นั้น (ต่อจาก .rail 4 ปุ่ม)
    // แต่ FLEET_STAGE_COUNT = 4 และสูตร stage เป็น i/4 ดังนั้นปุ่ม tab ที่ควรเป็น
    // stage 0-3 กลับกลายเป็น i=4-7 → ทั้ง .on toggle (j===i ไม่มีทาง match)
    // และปลายทาง scroll (เกิน trigger.end ไปหมด) พังทั้งคู่ เทสต์นี้ยืนยันว่า
    // ทั้งสองอย่างกลับมาถูกต้องเมื่อ index ตามตำแหน่งในกลุ่มของตัวเอง
    document.body.innerHTML = FLEET_HTML;
    const section = document.querySelector<HTMLElement>('.fleet-chapter')!;
    const railButtons = Array.from(section.querySelectorAll<HTMLElement>('.rail button'));
    const tabButtons = Array.from(section.querySelectorAll<HTMLElement>('.fleet-tabs button'));
    stubTrigger(1000, 5000); // start=1000, end=5000 -> 1000 per stage (4 stages)

    buildFleetChapter(section, 300);

    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);

    // คลิก tab ตัวที่ 3 (index 2, stage "car C") ต้องได้ตำแหน่ง scroll ที่อยู่
    // ใน [trigger.start, trigger.end] เสมอ — ไม่ใช่แค่ "ไม่ throw" แต่ต้องตรงกับ
    // สูตรเดียวกับที่ .rail ใช้ (start + (i+0.5)/4 * (end-start))
    tabButtons[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    const target = scrollTo.mock.calls[0][0] as { top: number };
    expect(target.top).toBeGreaterThanOrEqual(1000);
    expect(target.top).toBeLessThanOrEqual(5000);
    // stage 2 target: 1000 + (2.5/4)*4000 = 3500 — ถ้า index ยังเป็นแบบ flat
    // (i=6 จากตำแหน่งรวมกับ .rail) นี่จะเป็น 1000 + (6.5/4)*4000 = 7500 ซึ่งเกิน
    // trigger.end (5000) — เทสต์ข้างบนจะจับความเกินนั้นได้อยู่แล้วเช่นกัน
    expect(target.top).toBe(3500);

    // stage change (onUpdate จำลอง progress 0.6 -> stage 2) ต้องเปิด .on ให้ทั้ง
    // .rail และ .fleet-tabs ที่ index 2 พร้อมกัน ไม่ใช่แค่กลุ่มใดกลุ่มหนึ่ง
    const onUpdate = scrollTriggerCreate.mock.calls[0][0].onUpdate as (st: { progress: number }) => void;
    onUpdate({ progress: 0.6 });

    expect(railButtons[2].classList.contains('on')).toBe(true);
    expect(tabButtons[2].classList.contains('on')).toBe(true);
    railButtons.forEach((b, j) => {
      if (j !== 2) expect(b.classList.contains('on')).toBe(false);
    });
    tabButtons.forEach((b, j) => {
      if (j !== 2) expect(b.classList.contains('on')).toBe(false);
    });
  });

  it('ไม่มีข้อมูลรถ (fleet-data ว่าง/parse ไม่ได้) — ไม่สร้าง context/trigger เลย', () => {
    document.body.innerHTML = `
      <section class="fleet-chapter">
        <div class="ghost"><span></span></div>
        <div class="car-layer"><img></div>
        <div class="fleet-meta"><div class="name"></div><div class="chips"></div><div class="price"><b></b></div></div>
      </section>
    `;
    const section = document.querySelector<HTMLElement>('.fleet-chapter')!;
    const cleanup = buildFleetChapter(section, 300);

    expect(context).not.toHaveBeenCalled();
    expect(scrollTriggerCreate).not.toHaveBeenCalled();
    expect(() => cleanup()).not.toThrow();
  });
});

describe('buildHowChapter · fix-review I2 (context revert on cleanup)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('สร้าง gsap.context ผูกกับ section แล้วเรียก ctx.revert() ตอน cleanup', () => {
    document.body.innerHTML = `
      <section class="how-chapter">
        <div class="hugely"><span></span></div>
        <div class="line"></div>
        <div class="how-cap"></div>
        <div class="how-media"><img></div>
        <div class="how-step on"><h3>ขั้นที่ 1</h3></div>
        <div class="how-step"><h3>ขั้นที่ 2</h3></div>
      </section>
    `;
    const section = document.querySelector<HTMLElement>('.how-chapter')!;
    const { kill } = stubTrigger();

    const cleanup = buildHowChapter(section, 300);

    expect(context).toHaveBeenCalledWith(expect.any(Function), section);

    cleanup();

    expect(kill).toHaveBeenCalledTimes(1);
    expect(contextRevert).toHaveBeenCalledTimes(1);
    expect(section.classList.contains('pin-ready')).toBe(false);
  });
});

describe('buildRoutesChapter · fix-review I2 (context revert on cleanup)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('สร้าง gsap.context ผูกกับ section แล้วเรียก ctx.revert() ตอน cleanup', () => {
    document.body.innerHTML = `
      <section class="routes-chapter">
        <div class="track-clip"><div class="track"><div class="route-card"><img></div></div></div>
        <div class="rprog"><i></i></div>
      </section>
    `;
    const section = document.querySelector<HTMLElement>('.routes-chapter')!;
    const { kill } = stubTrigger();

    const cleanup = buildRoutesChapter(section, 300);

    expect(context).toHaveBeenCalledWith(expect.any(Function), section);

    cleanup();

    expect(kill).toHaveBeenCalledTimes(1);
    expect(contextRevert).toHaveBeenCalledTimes(1);
    expect(section.classList.contains('pin-ready')).toBe(false);
  });
});
