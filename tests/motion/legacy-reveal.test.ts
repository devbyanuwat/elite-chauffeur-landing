import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyLegacyReveal } from '../../src/scripts/motion/legacy-reveal';

describe('applyLegacyReveal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // jsdom ไม่ implement window.matchMedia เลย ต้อง stub ค่า default (ไม่ reduced motion)
    // ให้ทุกเทสต์ที่ไม่ได้ตั้งใจทดสอบ reduced motion โดยเฉพาะ — เคสสุดท้ายจะ stub ทับเองอีกที
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  it('รองรับ .reveal เดิมโดยใส่ class in ให้', () => {
    document.body.innerHTML = '<div class="reveal"></div>';
    applyLegacyReveal(document);
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
    applyLegacyReveal(document);

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
    applyLegacyReveal(document);

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
