import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startReviewDrift, watchReviewTrack, wireReviewArrows } from '../../src/scripts/motion/mobile-lite';

function makeTrack(cardCount: number): HTMLElement {
  const track = document.createElement('div');
  track.className = 'rev-track';
  for (let i = 0; i < cardCount; i++) {
    const card = document.createElement('figure');
    card.className = 'rev-card';
    card.textContent = `card-${i}`;
    track.appendChild(card);
  }
  document.body.appendChild(track);
  return track;
}

function stubScroll(track: HTMLElement, scrollWidth: number, clientWidth: number, initial = 0) {
  let scrollLeft = initial;
  Object.defineProperty(track, 'scrollWidth', { value: scrollWidth, configurable: true });
  Object.defineProperty(track, 'clientWidth', { value: clientWidth, configurable: true });
  Object.defineProperty(track, 'scrollLeft', {
    get: () => scrollLeft,
    set: (v: number) => { scrollLeft = v; },
    configurable: true,
  });
  return {
    get: () => scrollLeft,
  };
}

describe('startReviewDrift', () => {
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let rafId: number;
  let cancelled: number[];

  beforeEach(() => {
    rafCallbacks = new Map();
    rafId = 0;
    cancelled = [];
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
      const id = ++rafId;
      rafCallbacks.set(id, cb);
      return id;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
      cancelled.push(id);
      rafCallbacks.delete(id);
    }));
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function tick(): void {
    const due = Array.from(rafCallbacks.entries());
    rafCallbacks.clear();
    due.forEach(([, cb]) => cb(0));
  }

  it('โคลนการ์ดชุดแรกต่อท้ายครั้งเดียว เพื่อให้วนลูปได้ไร้รอยต่อ', () => {
    const track = makeTrack(3);
    startReviewDrift(track);

    expect(track.children).toHaveLength(6);
    expect(track.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
  });

  it('ตั้ง data-drift="on" ขณะทำงานอยู่ และลบออกเมื่อ stop', () => {
    const track = makeTrack(2);
    const handle = startReviewDrift(track);

    expect(track.getAttribute('data-drift')).toBe('on');

    handle.stop();
    expect(track.getAttribute('data-drift')).toBeNull();
  });

  it('เลื่อน scrollLeft ทีละ 0.45px ต่อเฟรมด้วย requestAnimationFrame', () => {
    const track = makeTrack(2);
    const scroll = stubScroll(track, 2000, 400, 0);

    startReviewDrift(track);
    tick();

    expect(scroll.get()).toBeCloseTo(0.45);

    tick();
    expect(scroll.get()).toBeCloseTo(0.9);
  });

  it('หยุดเลื่อนเมื่อ pointerenter และเลื่อนต่อเมื่อ pointerleave', () => {
    const track = makeTrack(2);
    const scroll = stubScroll(track, 2000, 400, 0);

    startReviewDrift(track);
    tick();
    const afterFirstTick = scroll.get();

    track.dispatchEvent(new Event('pointerenter'));
    tick();
    expect(scroll.get()).toBe(afterFirstTick); // paused: ไม่ขยับ

    track.dispatchEvent(new Event('pointerleave'));
    tick();
    expect(scroll.get()).toBeGreaterThan(afterFirstTick); // resumed
  });

  it('หยุดเมื่อ touchstart/focusin และเลื่อนต่อเมื่อ touchend/focusout', () => {
    const track = makeTrack(2);
    const scroll = stubScroll(track, 2000, 400, 0);

    startReviewDrift(track);

    track.dispatchEvent(new Event('touchstart'));
    tick();
    expect(scroll.get()).toBe(0);
    track.dispatchEvent(new Event('touchend'));
    tick();
    expect(scroll.get()).toBeGreaterThan(0);

    const afterTouch = scroll.get();
    track.dispatchEvent(new Event('focusin'));
    tick();
    expect(scroll.get()).toBe(afterTouch);
    track.dispatchEvent(new Event('focusout'));
    tick();
    expect(scroll.get()).toBeGreaterThan(afterTouch);
  });

  it('วน scrollLeft กลับด้วย scrollWidth/2 เมื่อเลื่อนเลยกึ่งกลาง (scrollWidth 1000, clientWidth 400, scrollLeft 501 → 1)', () => {
    const track = makeTrack(2);
    // ตั้งค่าให้ scrollLeft ก่อนติ๊กถัดไปอยู่ที่ 500.55 บวก 0.45px ต่อเฟรมแล้วเท่ากับ 501
    // ซึ่งเกินครึ่งของ scrollWidth (1000/2=500) พอดี → ต้องวนกลับเป็น 501-500=1
    const scroll = stubScroll(track, 1000, 400, 500.55);

    startReviewDrift(track);
    tick();

    expect(scroll.get()).toBeCloseTo(1);
  });

  it('คืนค่า scroll-snap-type เดิมตอน pause แล้วปิดใหม่ตอน resume (ไม่ใช่ปิดครั้งเดียวตอน start แล้วปล่อยตลอด)', () => {
    const track = makeTrack(2);
    stubScroll(track, 2000, 400, 0);
    track.style.scrollSnapType = 'x mandatory';

    const handle = startReviewDrift(track);
    expect(track.style.scrollSnapType).toBe('none'); // ปิดระหว่าง drift ทำงาน

    track.dispatchEvent(new Event('pointerenter'));
    expect(track.style.scrollSnapType).toBe('x mandatory'); // คืนค่าตอน pause ให้ swipe มือ snap ได้

    track.dispatchEvent(new Event('pointerleave'));
    expect(track.style.scrollSnapType).toBe('none'); // ปิดใหม่ตอน resume ก่อน rAF จะเขียน scrollLeft ต่อ

    handle.stop();
    expect(track.style.scrollSnapType).toBe('x mandatory'); // คืนค่าสุดท้ายตอน stop
  });

  it('ยกเลิก rAF และถอด listener ทั้งหมดเมื่อเรียก stop()', () => {
    const track = makeTrack(2);
    const scroll = stubScroll(track, 2000, 400, 0);

    const handle = startReviewDrift(track);
    tick();
    handle.stop();

    expect(cancelled.length).toBeGreaterThan(0);

    const before = scroll.get();
    track.dispatchEvent(new Event('pointerenter'));
    tick(); // ไม่มี raf ใหม่ให้ tick แล้ว (stop ไม่จอง frame ต่อ) — ไม่ควรมีการเปลี่ยนแปลง
    expect(scroll.get()).toBe(before);
  });
});

describe('wireReviewArrows', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeWrapWithArrows(): { wrap: HTMLElement; track: HTMLElement } {
    const wrap = document.createElement('div');
    wrap.className = 'rev-slider-wrap';
    const track = makeTrack(2);
    wrap.appendChild(track);
    const nav = document.createElement('div');
    nav.className = 'rev-nav';
    nav.innerHTML = `
      <button class="rev-arrow" data-dir="-1"></button>
      <button class="rev-arrow" data-dir="1"></button>
    `;
    wrap.appendChild(nav);
    document.body.appendChild(wrap);
    return { wrap, track };
  }

  it('คลิกลูกศรแล้วเลื่อน track ไปทางที่ระบุด้วยความกว้างการ์ดหนึ่งใบ', () => {
    const { track } = makeWrapWithArrows();
    Object.defineProperty(track, 'clientWidth', { value: 400, configurable: true });
    const firstCard = track.querySelector('.rev-card') as HTMLElement;
    Object.defineProperty(firstCard, 'offsetWidth', { value: 300, configurable: true });
    const scrollBy = vi.fn();
    track.scrollBy = scrollBy;

    wireReviewArrows(track);

    const nextBtn = document.querySelector('.rev-arrow[data-dir="1"]') as HTMLButtonElement;
    nextBtn.click();

    expect(scrollBy).toHaveBeenCalledTimes(1);
    const arg = scrollBy.mock.calls[0][0] as { left: number };
    expect(arg.left).toBeGreaterThan(0);
  });

  it('หยุด drift ชั่วคราวเมื่อคลิกลูกศร แล้วเดินต่อหลัง 1600ms', () => {
    const { track } = makeWrapWithArrows();
    const firstCard = track.querySelector('.rev-card') as HTMLElement;
    Object.defineProperty(firstCard, 'offsetWidth', { value: 300, configurable: true });
    track.scrollBy = vi.fn();

    const pause = vi.fn();
    const resume = vi.fn();
    wireReviewArrows(track, { pause, resume });

    const prevBtn = document.querySelector('.rev-arrow[data-dir="-1"]') as HTMLButtonElement;
    prevBtn.click();

    expect(pause).toHaveBeenCalledTimes(1);
    expect(resume).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1600);
    expect(resume).toHaveBeenCalledTimes(1);
  });
});

describe('watchReviewTrack', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  function makeWrap(id: string): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'rev-slider-wrap';
    wrap.id = id;
    const track = makeTrack(2);
    wrap.appendChild(track);
    return wrap;
  }

  it('mount ครั้งแรกด้วย track ที่มีอยู่แล้วใน container ตอนเรียก', () => {
    const container = document.createElement('section');
    container.appendChild(makeWrap('a'));
    document.body.appendChild(container);

    const mount = vi.fn(() => undefined);
    watchReviewTrack(container, mount);

    expect(mount).toHaveBeenCalledTimes(1);
  });

  it('mount ใหม่เมื่อ .rev-slider-wrap ทั้งก้อนถูกแทนที่ (ไม่ใช่แค่ children ข้างในเปลี่ยน) — จำลอง Astro server:defer island swap ที่ลบ/แทรก node ทั้งก้อนแทนที่ fallback', async () => {
    // Astro's replaceServerIsland removes the fallback's `.rev-slider-wrap`
    // wholesale and inserts a brand-new one as a sibling — it never merely
    // edits its children. A MutationObserver bound to `.rev-slider-wrap`
    // itself would never see this (observers only report a target's
    // descendant mutations, never the target's own removal); `container`
    // must be a stable ancestor for the swap to be observable at all.
    const container = document.createElement('section');
    const oldWrap = makeWrap('old');
    container.appendChild(oldWrap);
    document.body.appendChild(container);

    const cleanupOld = vi.fn();
    const mount = vi.fn((track: HTMLElement) => {
      void track;
      return cleanupOld;
    });
    watchReviewTrack(container, mount);
    expect(mount).toHaveBeenCalledTimes(1);
    const firstTrack = mount.mock.calls[0][0];

    // simulate the island swap: whole wrap removed, a new one with a fresh
    // track (and fresh clone-free child count) inserted in its place
    oldWrap.remove();
    const newWrap = makeWrap('new');
    container.appendChild(newWrap);

    // MutationObserver callbacks are microtask-scheduled
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(cleanupOld).toHaveBeenCalledTimes(1);
    expect(mount).toHaveBeenCalledTimes(2);
    const secondTrack = mount.mock.calls[1][0];
    expect(secondTrack).not.toBe(firstTrack);
    expect(container.contains(secondTrack)).toBe(true);
  });

  it('stop() ที่คืนมาจะ disconnect observer และเรียก cleanup ล่าสุด', async () => {
    const container = document.createElement('section');
    container.appendChild(makeWrap('a'));
    document.body.appendChild(container);

    const cleanup = vi.fn();
    const stop = watchReviewTrack(container, () => cleanup);

    stop();

    const wrap = makeWrap('b');
    container.appendChild(wrap);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(cleanup).toHaveBeenCalledTimes(1); // จาก stop() เท่านั้น ไม่ใช่จาก mount รอบใหม่
  });
});
