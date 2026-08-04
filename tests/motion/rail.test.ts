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

  it('ติด dot ของ section ที่ไม่ใช่ chapter ได้ (ไม่มี data-chapter เลย)', () => {
    // fix round 2: reviews/faq/booking ไม่มี data-chapter จึงไม่โผล่ใน
    // railStops()/collectChapters() เลย — initRail ต้องยังสร้าง trigger ให้
    // จาก href ของ dot เองได้ ไม่ใช่พึ่ง collectChapters
    document.body.innerHTML = `
      <section id="why" data-chapter="why"></section>
      <section id="reviews"></section>
      <nav id="chapter-rail">
        <span data-rail-label></span>
        <ul>
          <li><a href="#why" data-rail-dot data-rail-name="ทำไมต้องเรา"></a></li>
          <li><a href="#reviews" data-rail-dot data-rail-name="รีวิว"></a></li>
        </ul>
      </nav>`;

    const cleanup = initRail(document);

    const reviewsCall = scrollTriggerCreate.mock.calls.find(
      (call) => (call[0] as { trigger: string }).trigger === '#reviews'
    );
    expect(reviewsCall).toBeDefined();
    const config = reviewsCall![0] as { onToggle: (self: { isActive: boolean }) => void };

    config.onToggle({ isActive: true });

    const reviewsDot = document.querySelector<HTMLElement>('[href="#reviews"]')!;
    const whyDot = document.querySelector<HTMLElement>('[href="#why"]')!;
    const label = document.querySelector<HTMLElement>('[data-rail-label]')!;

    expect(reviewsDot.classList.contains('on')).toBe(true);
    expect(reviewsDot.getAttribute('aria-current')).toBe('true');
    expect(whyDot.classList.contains('on')).toBe(false);
    expect(label.textContent).toBe('รีวิว');

    cleanup();
  });

  it('ข้าม dot ที่ id ปลายทางไม่มีอยู่จริงในหน้า โดยไม่ throw', () => {
    // fix round 3 (coordinator finding): #booking having no data-chapter is
    // NOT what this test is meant to prove — the old, chapter-driven
    // initRail would also have skipped it, but for an unrelated reason (it
    // was never in railStops()'s list), which would let this test pass
    // even with the new querySelector(...) === null guard deleted. Assert
    // the exact trigger count (1, #why only) so the assertion is
    // unambiguous about *why* #booking was skipped: because initRail
    // resolved its href against the live DOM and found nothing there, not
    // because of the chapter list. Verified by hand: temporarily removing
    // the `root.querySelector(...) === null` half of the guard in rail.ts
    // makes this test fail (2 calls, #booking included) — restoring it
    // brings it back to green. See task-8-report.md "Fix round 3" for the
    // full before/after test output.
    document.body.innerHTML = `
      <section id="why" data-chapter="why"></section>
      <nav id="chapter-rail">
        <span data-rail-label></span>
        <ul>
          <li><a href="#why" data-rail-dot data-rail-name="ทำไมต้องเรา"></a></li>
          <li><a href="#booking" data-rail-dot data-rail-name="จองรถ"></a></li>
        </ul>
      </nav>`;

    expect(() => initRail(document)).not.toThrow();

    // exactly one ScrollTrigger — #why. If the null-target guard is
    // deleted, initRail iterates both dots and this becomes 2.
    expect(scrollTriggerCreate).toHaveBeenCalledTimes(1);

    const bookingCall = scrollTriggerCreate.mock.calls.find(
      (call) => (call[0] as { trigger: string }).trigger === '#booking'
    );
    expect(bookingCall).toBeUndefined();

    const whyCall = scrollTriggerCreate.mock.calls.find(
      (call) => (call[0] as { trigger: string }).trigger === '#why'
    );
    expect(whyCall).toBeDefined();

    // the booking dot itself is untouched — never marked active, never
    // targeted, just quietly absent from the trigger set.
    const bookingDot = document.querySelector<HTMLElement>('[href="#booking"]')!;
    expect(bookingDot.classList.contains('on')).toBe(false);
    expect(bookingDot.getAttribute('aria-current')).toBeNull();
  });
});
