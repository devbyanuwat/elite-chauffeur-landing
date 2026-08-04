import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { scrollTriggerCreate } = vi.hoisted(() => ({
  scrollTriggerCreate: vi.fn((config: unknown) => ({ ...(config as object), kill: vi.fn() })),
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { create: scrollTriggerCreate },
}));

import { initRail, railStops } from '../../src/scripts/motion/rail';

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

describe('initRail', () => {
  beforeEach(() => {
    scrollTriggerCreate.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('จับคู่ dot ด้วย id ไม่ใช่ index — สลับลำดับบทในหน้ากับลำดับ dot ใน rail แล้วต้องยังไปถูกจุด', () => {
    // ลำดับ chapter บนหน้า (document order, มาจาก collectChapters): stats ก่อน services
    // ลำดับ dot ใน rail component (markup order): services ก่อน stats
    // ถ้า initRail ผูกด้วย index แทน id เคสนี้จะติด dot ผิดทันที
    document.body.innerHTML = `
      <section id="stats" data-chapter="stats"></section>
      <section id="services" data-chapter="intro"></section>
      <nav id="chapter-rail">
        <span data-rail-label></span>
        <ul>
          <li><a href="#services" data-rail-dot data-rail-name="เรื่องของเรา"></a></li>
          <li><a href="#stats" data-rail-dot data-rail-name="ตัวเลข"></a></li>
        </ul>
      </nav>`;

    const cleanup = initRail(document);

    // stops จาก collectChapters จะเป็น [stats, services] (document order) —
    // หา trigger ของ #stats แล้วยิง onToggle ของมันโดยตรง (ไม่ใช่ตัวแรกเสมอไป)
    const statsCall = scrollTriggerCreate.mock.calls.find(
      (call) => (call[0] as { trigger: string }).trigger === '#stats'
    );
    expect(statsCall).toBeDefined();
    const config = statsCall![0] as { onToggle: (self: { isActive: boolean }) => void };

    config.onToggle({ isActive: true });

    const dots = Array.from(document.querySelectorAll<HTMLElement>('[data-rail-dot]'));
    const statsDot = dots.find((dot) => dot.getAttribute('href') === '#stats')!;
    const servicesDot = dots.find((dot) => dot.getAttribute('href') === '#services')!;
    const label = document.querySelector<HTMLElement>('[data-rail-label]')!;

    expect(statsDot.classList.contains('on')).toBe(true);
    expect(statsDot.getAttribute('aria-current')).toBe('true');
    expect(servicesDot.classList.contains('on')).toBe(false);
    expect(servicesDot.getAttribute('aria-current')).toBeNull();
    expect(label.textContent).toBe('ตัวเลข');

    cleanup();
  });
});
