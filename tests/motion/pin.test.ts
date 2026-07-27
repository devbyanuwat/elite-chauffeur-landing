import { beforeEach, describe, expect, it, vi } from 'vitest';

const { timeline, set, timelineTo, timelineFromTo } = vi.hoisted(() => {
  const timelineTo = vi.fn();
  const timelineFromTo = vi.fn();
  const chain = { to: timelineTo, fromTo: timelineFromTo };
  timelineTo.mockReturnValue(chain);
  timelineFromTo.mockReturnValue(chain);
  return {
    timeline: vi.fn(() => chain),
    set: vi.fn(),
    timelineTo,
    timelineFromTo,
  };
});

vi.mock('gsap', () => ({
  gsap: { timeline, set },
}));

import { applyPins } from '../../src/scripts/motion/pin';

describe('applyPins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('ไม่แตะ section ที่ไม่มี data-pin', () => {
    document.body.innerHTML = '<section><div data-stage="0"></div></section>';
    applyPins(document);
    expect(timeline).not.toHaveBeenCalled();
  });

  it('ไม่ pin เมื่อมี stage เดียว เพราะไม่มีอะไรให้เล่า', () => {
    document.body.innerHTML = '<section data-pin="a"><div data-stage="0"></div></section>';
    applyPins(document);
    expect(timeline).not.toHaveBeenCalled();
    expect(document.querySelector('section')!.classList.contains('pin-ready')).toBe(false);
  });

  it('ใส่ class pin-ready หลังต่อ timeline สำเร็จ', () => {
    document.body.innerHTML = `
      <section data-pin="a"><div data-stage="0"></div><div data-stage="1"></div></section>
    `;
    applyPins(document);
    expect(timeline).toHaveBeenCalledTimes(1);
    expect(document.querySelector('section')!.classList.contains('pin-ready')).toBe(true);
  });

  it('cleanup ถอด pin-ready ออก', () => {
    document.body.innerHTML = `
      <section data-pin="a"><div data-stage="0"></div><div data-stage="1"></div></section>
    `;
    const cleanup = applyPins(document);
    cleanup();
    expect(document.querySelector('section')!.classList.contains('pin-ready')).toBe(false);
  });

  it('แปลง data-pin-length เป็น end แบบ % ของ viewport', () => {
    document.body.innerHTML = `
      <section data-pin="a" data-pin-length="240">
        <div data-stage="0"></div><div data-stage="1"></div>
      </section>
    `;
    applyPins(document);
    const [config] = timeline.mock.calls[0] as unknown as [
      { scrollTrigger: Record<string, unknown> },
    ];
    expect(config.scrollTrigger.end).toBe('+=240%');
    expect(config.scrollTrigger.pin).toBe(document.querySelector('section'));
    expect(config.scrollTrigger.pinSpacing).toBe(true);
  });

  it('ตั้ง stage แรกให้เห็น stage อื่นให้ซ่อน', () => {
    document.body.innerHTML = `
      <section data-pin="a">
        <div data-stage="0" id="s0"></div>
        <div data-stage="1" id="s1"></div>
      </section>
    `;
    applyPins(document);

    const visible = set.mock.calls.find(
      (call) => (call[1] as { autoAlpha?: number }).autoAlpha === 1
    );
    const hidden = set.mock.calls.find(
      (call) => (call[1] as { autoAlpha?: number }).autoAlpha === 0
    );
    expect((visible![0] as HTMLElement[])[0].id).toBe('s0');
    expect((hidden![0] as HTMLElement[])[0].id).toBe('s1');
  });

  it('สร้างการสลับหนึ่งครั้งต่อรอยต่อ ไม่ใช่ต่อ stage', () => {
    document.body.innerHTML = `
      <section data-pin="a">
        <div data-stage="0"></div><div data-stage="1"></div><div data-stage="2"></div>
      </section>
    `;
    applyPins(document);
    expect(timelineTo).toHaveBeenCalledTimes(2);
    expect(timelineFromTo).toHaveBeenCalledTimes(2);
  });

  it('ข้าม data-draw ที่วัดความยาวเส้นไม่ได้ (jsdom ไม่มี getTotalLength)', () => {
    document.body.innerHTML = `
      <section data-pin="a">
        <svg><path data-draw d="M0 0 L10 10"></path></svg>
        <div data-stage="0"></div><div data-stage="1"></div>
      </section>
    `;
    expect(() => applyPins(document)).not.toThrow();
    const dashCall = set.mock.calls.find(
      (call) => (call[1] as { strokeDasharray?: number }).strokeDasharray !== undefined
    );
    expect(dashCall).toBeUndefined();
  });
});
