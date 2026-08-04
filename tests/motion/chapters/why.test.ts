import { beforeEach, describe, expect, it, vi } from 'vitest';

// fix-review round 1 (CRITICAL): gsap.fromTo used to write an inline
// `opacity` style that the CSS `.entered`/`.current` rules in Why.astro
// could never win against, so previously-current cards never dimmed back
// to 0.45. Mocked the same way tests/motion/editions.test.ts mocks
// gsap/ScrollTrigger — real ScrollTrigger.create needs live layout
// measurement jsdom can't provide — so buildWhyChapter can be exercised
// here and its DOM class state asserted directly, forward and backward.
const { context, contextRevert, scrollTriggerCreate, gsapFromTo } = vi.hoisted(() => {
  const contextAdd = vi.fn((_name: string, func: (...args: unknown[]) => unknown) => func);
  const contextRevert = vi.fn();
  const context = vi.fn(() => ({ add: contextAdd, revert: contextRevert }));
  const scrollTriggerCreate = vi.fn();
  const gsapFromTo = vi.fn();
  return { context, contextAdd, contextRevert, scrollTriggerCreate, gsapFromTo };
});

vi.mock('gsap', () => ({
  gsap: {
    context,
    fromTo: gsapFromTo,
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { create: scrollTriggerCreate },
}));

import { buildWhyChapter, whyStageForProgress } from '../../../src/scripts/motion/chapters/why';

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

describe('buildWhyChapter · fix-review R1 (opacity owned by CSS classes only)', () => {
  function root(): HTMLElement {
    const section = document.createElement('section');
    section.innerHTML = `
      <div class="section-head"></div>
      <div class="why-grid">
        <div class="why-item"></div>
        <div class="why-item"></div>
        <div class="why-item"></div>
      </div>
    `;
    document.body.appendChild(section);
    return section;
  }

  function stubTrigger() {
    scrollTriggerCreate.mockReturnValue({ kill: vi.fn(), progress: 0 });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('gsap.fromTo ไม่แตะ opacity เลย — ป้องกัน inline style ทับ rule ของ CSS', () => {
    const section = root();
    stubTrigger();
    buildWhyChapter(section, 240);

    const onUpdate = scrollTriggerCreate.mock.calls[0][0].onUpdate as (st: { progress: number }) => void;
    onUpdate({ progress: 0.3 });

    expect(gsapFromTo).toHaveBeenCalledTimes(1);
    const [, fromVars, toVars] = gsapFromTo.mock.calls[0];
    expect(fromVars).not.toHaveProperty('opacity');
    expect(toVars).not.toHaveProperty('opacity');
  });

  it('เดินหน้า: การ์ดที่ผ่านไปแล้วได้ class entered (ไม่มี current) การ์ดปัจจุบันได้ current', () => {
    const section = root();
    stubTrigger();
    buildWhyChapter(section, 240);
    const cards = Array.from(section.querySelectorAll('.why-item'));
    const onUpdate = scrollTriggerCreate.mock.calls[0][0].onUpdate as (st: { progress: number }) => void;

    onUpdate({ progress: 0.3 }); // stage 1
    expect(cards[0].classList.contains('current')).toBe(true);
    expect(cards[0].classList.contains('entered')).toBe(true);
    expect(cards[1].classList.contains('entered')).toBe(false);
    expect(cards[1].classList.contains('current')).toBe(false);

    onUpdate({ progress: 0.55 }); // stage 2
    expect(cards[0].classList.contains('entered')).toBe(true);
    expect(cards[0].classList.contains('current')).toBe(false);
    expect(cards[1].classList.contains('entered')).toBe(true);
    expect(cards[1].classList.contains('current')).toBe(true);
    expect(cards[2].classList.contains('entered')).toBe(false);
  });

  it('ถอยหลัง: เมื่อ progress ลดลง class ของการ์ดที่เกินสถานะใหม่ต้องถูกล้าง ไม่ใช่ค้างที่ current/opacity เดิม', () => {
    const section = root();
    stubTrigger();
    buildWhyChapter(section, 240);
    const cards = Array.from(section.querySelectorAll('.why-item'));
    const onUpdate = scrollTriggerCreate.mock.calls[0][0].onUpdate as (st: { progress: number }) => void;

    onUpdate({ progress: 0.8 }); // stage 3 — all entered, card[2] current
    expect(cards[2].classList.contains('current')).toBe(true);

    onUpdate({ progress: 0.3 }); // scroll back up to stage 1
    expect(cards[0].classList.contains('current')).toBe(true);
    expect(cards[0].classList.contains('entered')).toBe(true);
    // stage 2/3 cards must drop both classes going backward. Scope note
    // (final-review Fix 9): this asserts the CLASS bookkeeping only. gsap is
    // mocked in this file, so it cannot and does not catch the original
    // inline-opacity bug (gsap writing `opacity` straight onto the card and
    // out-specificity-ing the CSS) — that one is guarded by buildWhyChapter
    // simply never tweening opacity, and is verified in the browser, not here.
    expect(cards[1].classList.contains('entered')).toBe(false);
    expect(cards[1].classList.contains('current')).toBe(false);
    expect(cards[2].classList.contains('entered')).toBe(false);
    expect(cards[2].classList.contains('current')).toBe(false);
  });

  it('final-review Fix 7: cleanup คืนการ์ดกลับ stage 0 — ไม่มีใบไหนค้าง entered/current', () => {
    // class เหล่านี้เป็น DOM write ล้วน ๆ ctx.revert() ไม่แตะ ถ้าไม่รีเซ็ตตอน
    // cleanup การ build ใหม่หลังข้าม breakpoint จะเริ่มที่ cur = -1 ขณะที่หน้า
    // ยังโชว์ใบที่ 3 เป็น current อยู่
    const section = root();
    stubTrigger();
    const cleanup = buildWhyChapter(section, 240);
    const cards = Array.from(section.querySelectorAll('.why-item'));
    const onUpdate = scrollTriggerCreate.mock.calls[0][0].onUpdate as (st: { progress: number }) => void;

    onUpdate({ progress: 0.9 });
    expect(cards[2].classList.contains('current')).toBe(true);

    cleanup();

    cards.forEach((card) => {
      expect(card.classList.contains('entered')).toBe(false);
      expect(card.classList.contains('current')).toBe(false);
    });
  });

  it('cleanup: kill trigger, revert context, ลบ pin-ready', () => {
    const section = root();
    const kill = vi.fn();
    scrollTriggerCreate.mockReturnValue({ kill, progress: 0 });

    const cleanup = buildWhyChapter(section, 240);
    expect(section.classList.contains('pin-ready')).toBe(true);

    cleanup();
    expect(kill).toHaveBeenCalledTimes(1);
    expect(contextRevert).toHaveBeenCalledTimes(1);
    expect(section.classList.contains('pin-ready')).toBe(false);
  });
});
