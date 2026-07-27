import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromTo, to, registerPlugin, matchMediaAdd, refresh } = vi.hoisted(() => ({
  fromTo: vi.fn(),
  to: vi.fn(),
  registerPlugin: vi.fn(),
  matchMediaAdd: vi.fn((_query: string, callback: () => void) => callback()),
  refresh: vi.fn(),
}));

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

  it('ผูก parallax เข้ากับ breakpoint FULL_TIER_MIN_WIDTH และทั้งสอง context เช็ค prefers-reduced-motion: no-preference', () => {
    document.body.innerHTML = '<div data-parallax="0.1"></div>';
    initMotion();

    const queries = matchMediaAdd.mock.calls.map((call) => call[0] as string);
    expect(queries).toHaveLength(2);
    expect(queries[0]).toContain(`min-width: ${FULL_TIER_MIN_WIDTH}px`);
    queries.forEach((query) => {
      expect(query).toContain('prefers-reduced-motion: no-preference');
    });
  });

  it('ไม่สั่ง gsap เลยถ้า query ไม่ตรง (จำลอง reduced motion จริงผ่าน matchMedia)', () => {
    const skipIfNoPreferenceQuery = (query: string, callback: () => void) => {
      if (!query.includes('prefers-reduced-motion: no-preference')) callback();
    };
    // initMotion เรียก mm.add ทั้งหมด 2 ครั้ง (parallax context, split/reveal/count context)
    // — ใช้ mockImplementationOnce สองครั้งแทน mockImplementation ถาวร เพื่อไม่ต้อง restore เอง
    matchMediaAdd
      .mockImplementationOnce(skipIfNoPreferenceQuery)
      .mockImplementationOnce(skipIfNoPreferenceQuery);

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

  it('รอ observer จริงก่อนใส่ .in และ unobserve หลังเห็น element', () => {
    const observedTargets: Element[] = [];
    const unobserve = vi.fn();
    let intersectionCallback: (entries: { target: Element; isIntersecting: boolean }[]) => void = () => {};

    vi.stubGlobal(
      'IntersectionObserver',
      class {
        unobserve = unobserve;
        disconnect = vi.fn();

        constructor(callback: (entries: { target: Element; isIntersecting: boolean }[]) => void) {
          intersectionCallback = callback;
        }

        observe(target: Element) {
          observedTargets.push(target);
        }
      }
    );

    document.body.innerHTML = '<div class="reveal"></div>';
    initMotion();

    const target = document.querySelector('.reveal') as HTMLElement;

    expect(observedTargets).toContain(target);
    // ยังไม่เห็น element เลย ต้องไม่ใส่ .in ทันที (พิสูจน์ว่ารอ observer จริง ไม่ใช่ fallback แสดงทันที)
    expect(target.classList.contains('in')).toBe(false);

    intersectionCallback([{ target, isIntersecting: true }]);

    expect(target.classList.contains('in')).toBe(true);
    expect(unobserve).toHaveBeenCalledWith(target);

    vi.unstubAllGlobals();
  });
});
