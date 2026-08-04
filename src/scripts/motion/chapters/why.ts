import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { PIN_READY_CLASS } from './shared';

/** ส่วนของบทที่ยกให้หัวเรื่องอยู่ลำพังก่อนการ์ดใบแรกจะเข้า */
const HEAD_SHARE = 0.25;

export function whyStageForProgress(progress: number, cardCount: number): number {
  if (cardCount <= 0) return 0;
  if (progress < HEAD_SHARE) return 0;

  const after = (progress - HEAD_SHARE) / (1 - HEAD_SHARE);
  return Math.min(cardCount, Math.floor(after * cardCount) + 1);
}

/**
 * บท why — การ์ดเข้าทีละใบ ใบที่ผ่านไปแล้วหรี่ลงเหลือ 0.45 เพื่อให้ใบปัจจุบัน
 * เป็นจุดสนใจเดียว โดยยังอ่านใบก่อนหน้าได้ opacity เป็นของ CSS (`.entered` /
 * `.current` ใน Why.astro) ล้วน ๆ — gsap แตะแค่ `y` เพื่อไม่ให้ inline style
 * ทับ rule ของ CSS ปล่อยให้สอง system แย่งกันคุม opacity เดียวกัน (fix-review R1)
 */
export function buildWhyChapter(section: HTMLElement, len: number): () => void {
  const cards = Array.from(section.querySelectorAll<HTMLElement>('.why-item'));
  if (cards.length === 0) return () => {};

  let cur = -1;

  const ctx = gsap.context(() => {}, section);

  const showStage = ctx.add('showStage', (stage: number) => {
    if (stage === cur) return;
    cur = stage;

    cards.forEach((card, index) => {
      const entered = index < stage;
      card.classList.toggle('entered', entered);
      card.classList.toggle('current', index === stage - 1);
    });

    const justEntered = cards[stage - 1];
    if (justEntered) {
      gsap.fromTo(
        justEntered,
        { y: 28 },
        { y: 0, duration: 0.55, ease: 'power3.out', overwrite: 'auto' }
      );
    }
  }) as (stage: number) => void;

  const onUpdate = ctx.add('onUpdate', (st: ScrollTrigger) => {
    showStage(whyStageForProgress(st.progress, cards.length));
  }) as (st: ScrollTrigger) => void;

  const trigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: `+=${len}%`,
    pin: section,
    pinSpacing: true,
    anticipatePin: 1,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate,
  });

  section.classList.add(PIN_READY_CLASS);

  return () => {
    trigger.kill();
    ctx.revert();
    section.classList.remove(PIN_READY_CLASS);
  };
}
