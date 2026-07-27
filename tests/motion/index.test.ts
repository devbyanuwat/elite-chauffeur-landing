import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromTo, to, registerPlugin, matchMediaAdd, refresh, timeline, set } = vi.hoisted(() => {
  const chainable = { to: vi.fn(), fromTo: vi.fn() };
  chainable.to.mockReturnValue(chainable);
  chainable.fromTo.mockReturnValue(chainable);

  return {
    fromTo: vi.fn(),
    to: vi.fn(),
    registerPlugin: vi.fn(),
    matchMediaAdd: vi.fn((_query: string, callback: () => void) => callback()),
    refresh: vi.fn(),
    timeline: vi.fn(() => chainable),
    set: vi.fn(),
  };
});

vi.mock('gsap', () => ({
  gsap: {
    registerPlugin,
    fromTo,
    to,
    timeline,
    set,
    matchMedia: () => ({ add: matchMediaAdd }),
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { refresh },
}));

import { initMotion } from '../../src/scripts/motion/index';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FULL_TIER_MIN_WIDTH } from '../../src/scripts/motion/tiers';

describe('initMotion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    document.documentElement.lang = 'th';
    // jsdom ไม่ implement window.matchMedia เลย ต้อง stub ค่า default (ไม่ reduced motion)
    // ให้ทุกเทสต์ที่ไม่ได้ตั้งใจทดสอบ reduced motion โดยเฉพาะ — เคสสุดท้ายจะ stub ทับเองอีกที
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  it('ลงทะเบียน ScrollTrigger', () => {
    initMotion();
    expect(registerPlugin).toHaveBeenCalledTimes(1);
    expect(registerPlugin).toHaveBeenCalledWith(ScrollTrigger);
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

  it('โหมด mask ของ data-reveal ใช้ clipPath ไม่ใช่ y', () => {
    document.body.innerHTML = '<p data-reveal="mask"></p>';
    initMotion();

    const call = fromTo.mock.calls.find((c) => (c[0] as Element).hasAttribute('data-reveal'));
    expect(call).toBeDefined();

    const fromVars = call![1] as Record<string, unknown>;
    const toVars = call![2] as Record<string, unknown>;

    expect(fromVars.clipPath).toBe('inset(0 0 100% 0)');
    expect(toVars.clipPath).toBe('inset(0 0 0% 0)');
    expect(fromVars.y).toBeUndefined();
    expect(toVars.y).toBeUndefined();
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

  it('ผูก parallax เข้ากับ breakpoint FULL_TIER_MIN_WIDTH และทั้งสอง context เช็ค prefers-reduced-motion: reduce', () => {
    document.body.innerHTML = '<div data-parallax="0.1"></div>';
    initMotion();

    const queries = matchMediaAdd.mock.calls.map((call) => call[0] as string);
    expect(queries).toHaveLength(2);
    expect(queries[0]).toContain(`min-width: ${FULL_TIER_MIN_WIDTH}px`);
    queries.forEach((query) => {
      // final-review Fix 4: no-preference/reduce ไม่ใช่คู่ตรงข้าม สลับมาใช้
      // "not all and (prefers-reduced-motion: reduce)" ทั้งสอง context แทน
      expect(query).toContain('prefers-reduced-motion: reduce');
    });
  });

  it('ไม่สั่ง gsap เลยถ้า query ไม่ตรง (จำลอง reduced motion จริงผ่าน matchMedia)', () => {
    const skipIfReducedMotionQuery = (query: string, callback: () => void) => {
      if (!query.includes('prefers-reduced-motion: reduce')) callback();
    };
    // initMotion เรียก mm.add ทั้งหมด 2 ครั้ง (parallax context, split/reveal/count context)
    // — ใช้ mockImplementationOnce สองครั้งแทน mockImplementation ถาวร เพื่อไม่ต้อง restore เอง
    matchMediaAdd
      .mockImplementationOnce(skipIfReducedMotionQuery)
      .mockImplementationOnce(skipIfReducedMotionQuery);

    document.body.innerHTML = `
      <div data-depth-group="hero"><div data-parallax="0.1"></div></div>
      <p data-reveal="up"></p>
      <b data-count="10"></b>
    `;
    initMotion();

    expect(fromTo).not.toHaveBeenCalled();
    expect(to).not.toHaveBeenCalled();
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

  it('pin ทำงานเฉพาะ query ของ full tier', () => {
    // matchMediaAdd (default mock) ยิงทุก callback เสมอไม่ว่า query จะเป็นอะไร — ถ้าเช็คแค่
    // "มี pin-ready ไหม" เทสต์นี้จะผ่านได้แม้ applyPins หลุดไปอยู่ context อื่น เพราะทุก
    // context ยิงเหมือนกันหมด ต้องบังคับให้ยิงเฉพาะ context เดียวต่อรอบ initMotion() เพื่อ
    // พิสูจน์ว่า pin-ready มาจาก context full tier (คำสั่ง mm.add ตัวแรก) จริง ๆ
    const onlyIfFullTier = (query: string, callback: () => void) => {
      if (query.includes(`min-width: ${FULL_TIER_MIN_WIDTH}px`)) callback();
    };
    const onlyIfNotFullTier = (query: string, callback: () => void) => {
      if (!query.includes(`min-width: ${FULL_TIER_MIN_WIDTH}px`)) callback();
    };

    document.body.innerHTML = `
      <section data-pin="fleet"><div data-stage="0"></div><div data-stage="1"></div></section>
    `;
    // initMotion เรียก mm.add สองครั้ง (full tier ก่อน แล้วค่อย NOT_REDUCED_MOTION เดี่ยว ๆ)
    // — ใช้ mockImplementationOnce สองครั้งแทน mockImplementation ถาวร เพื่อไม่ต้อง restore เอง
    matchMediaAdd
      .mockImplementationOnce(onlyIfFullTier)
      .mockImplementationOnce(onlyIfFullTier);
    initMotion();
    expect(document.querySelector('section')!.classList.contains('pin-ready')).toBe(true);

    // สลับด้าน: ยิงเฉพาะ context ที่ไม่ใช่ full tier — ถ้า applyPins หลุดไปอยู่ context นี้
    // (บั๊กที่เวอร์ชันก่อนจับไม่ได้) pin-ready จะโผล่มาทั้งที่ไม่ควร
    document.body.innerHTML = `
      <section data-pin="fleet"><div data-stage="0"></div><div data-stage="1"></div></section>
    `;
    matchMediaAdd
      .mockImplementationOnce(onlyIfNotFullTier)
      .mockImplementationOnce(onlyIfNotFullTier);
    initMotion();
    expect(document.querySelector('section')!.classList.contains('pin-ready')).toBe(false);
  });

  // legacy .reveal bridge tests moved to tests/motion/legacy-reveal.test.ts —
  // the bridge itself moved to src/scripts/motion/legacy-reveal.ts and is no
  // longer wired through initMotion (final-review Fix 1)
});
