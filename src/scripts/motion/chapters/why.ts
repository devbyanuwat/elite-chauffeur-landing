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
 * บท why — การ์ดเข้าทีละใบ ใบที่เข้ามาแล้วอยู่ที่ opacity 1 เต็ม ไม่หรี่
 * (final-review Fix 12: เดิมหรี่เหลือ .45 ซึ่งดันคอนทราสต์ของตัวอักษรลงเหลือ
 * ~2.2:1 ต่ำกว่า WCAG 1.4.3 ที่ต้องการ 4.5:1) ใบปัจจุบันเด่นด้วยกรอบทอง +
 * พื้นหลังยกขึ้น + ไอคอนทอง แทนการหรี่ใบอื่น สถานะทั้งหมดเป็นของ CSS
 * (`.entered` / `.current` ใน Why.astro) ล้วน ๆ — gsap แตะแค่ `y` เพื่อไม่ให้
 * inline style ทับ rule ของ CSS ปล่อยให้สอง system แย่งกันคุม property เดียวกัน
 * (fix-review R1) ด้วยเหตุผลเดียวกัน emphasis ฝั่ง CSS ห้ามใช้ transform
 */
export function buildWhyChapter(section: HTMLElement, len: number): () => void {
  const cards = Array.from(section.querySelectorAll<HTMLElement>('.why-item'));
  if (cards.length === 0) return () => {};

  let cur = -1;

  const ctx = gsap.context(() => {}, section);

  /**
   * ส่วนเขียน DOM ล้วน ๆ ของ showStage — แยกไว้ให้ cleanup คืนสถานะ stage 0 ได้
   * โดยไม่ต้องยิง tween (final-review Fix 7)
   */
  function applyStage(stage: number): void {
    cards.forEach((card, index) => {
      card.classList.toggle('entered', index < stage);
      card.classList.toggle('current', index === stage - 1);
    });
  }

  const showStage = ctx.add('showStage', (stage: number) => {
    if (stage === cur) return;
    cur = stage;

    applyStage(stage);

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
    // final-review Fix 7: `.entered` / `.current` are plain class writes and
    // survived teardown, so a rebuild after a breakpoint cross started at
    // `cur = -1` with the DOM still showing card 3 as current. Reset to
    // stage 0 — no card entered, none current — which is what the Astro
    // markup ships and what a fresh build assumes.
    applyStage(0);
    trigger.kill();
    ctx.revert();
    section.classList.remove(PIN_READY_CLASS);
  };
}
