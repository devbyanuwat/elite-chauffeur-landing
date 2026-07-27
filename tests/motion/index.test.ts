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
