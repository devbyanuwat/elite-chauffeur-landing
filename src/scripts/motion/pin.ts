import { gsap } from 'gsap';

import { collectStages, parsePin, type StageGroup } from './contract';

/**
 * class ที่เปิดการจัดวางแบบซ้อนทับใน CSS — ใส่ "หลัง" ต่อ timeline สำเร็จเท่านั้น
 * ถ้า gate ด้วย .js-motion เฉย ๆ แล้ว chunk ของ GSAP โหลดไม่ได้ stage จะซ้อนกัน
 * โดยไม่มีใครมาสลับให้ เหลือให้เห็นแค่ท่อนแรก = ผิด Global Constraint ข้อ 4
 */
const PIN_READY_CLASS = 'pin-ready';

/** ช่วงที่ท่อนเดิมจางออกและท่อนใหม่จางเข้า คิดเป็นสัดส่วนของหนึ่งรอยต่อ */
const FADE_SHARE = 0.6;
/** ท่อนใหม่เริ่มเข้าหลังท่อนเดิมเริ่มออกไปแล้วเท่านี้ กันภาพซ้อนกันจนอ่านไม่ออก */
const OVERLAP_SHARE = 0.4;

function targetsOf(stage: StageGroup): HTMLElement[] {
  return stage.panels;
}

/**
 * วาดเส้น SVG ตาม scroll ด้วย stroke-dashoffset ยาวคลุมทั้ง timeline
 * jsdom ไม่ implement getTotalLength จึงต้องเช็คก่อนเรียก ไม่ใช่ดักด้วย try
 */
function applyDraw(section: Element, tl: gsap.core.Timeline): void {
  section.querySelectorAll<SVGGeometryElement>('[data-draw]').forEach((path) => {
    if (typeof path.getTotalLength !== 'function') return;

    const length = path.getTotalLength();
    if (!Number.isFinite(length) || length <= 0) return;

    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
    tl.to(path, { strokeDashoffset: 0, duration: 1, ease: 'none' }, 0);
  });
}

export function applyPins(root: ParentNode): () => void {
  const readied: HTMLElement[] = [];

  root.querySelectorAll<HTMLElement>('[data-pin]').forEach((section) => {
    const spec = parsePin(section);
    if (spec === null) return;

    const stages = collectStages(section);
    // ท่อนเดียวไม่มีรอยต่อให้เล่า การ pin จะกลายเป็นแค่หน้าค้างเปล่า ๆ
    if (stages.length < 2) return;

    stages.forEach((stage, index) => {
      gsap.set(targetsOf(stage), index === 0
        ? { autoAlpha: 1, scale: 1 }
        : { autoAlpha: 0, scale: 1.03 });
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: `+=${spec.lengthVh}%`,
        pin: section,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    });

    const slice = 1 / (stages.length - 1);

    stages.forEach((stage, index) => {
      if (index === 0) return;

      const at = (index - 1) * slice;

      tl.to(
        targetsOf(stages[index - 1]),
        { autoAlpha: 0, scale: 0.97, duration: slice * FADE_SHARE, ease: 'none' },
        at
      ).fromTo(
        targetsOf(stage),
        { autoAlpha: 0, scale: 1.03 },
        { autoAlpha: 1, scale: 1, duration: slice * FADE_SHARE, ease: 'none' },
        at + slice * OVERLAP_SHARE
      );
    });

    applyDraw(section, tl);

    section.classList.add(PIN_READY_CLASS);
    readied.push(section);
  });

  return () => {
    readied.forEach((section) => section.classList.remove(PIN_READY_CLASS));
  };
}
