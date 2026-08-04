import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { PIN_READY_CLASS } from './shared';

const HOW_STAGE_COUNT = 3;

/**
 * สูตร stage-index จาก progress สำหรับ chapter 2 (how) — ตรงกับ mockup 1:1
 * (`Math.min(2, Math.floor(st.progress * 3))`), แยกออกมาเป็นฟังก์ชันล้วน ๆ
 * ให้เทสต์ได้โดยไม่ต้องพึ่ง ScrollTrigger/DOM เหมือน fleetStageForProgress
 */
export function howStageForProgress(progress: number): number {
  return Math.min(HOW_STAGE_COUNT - 1, Math.floor(progress * HOW_STAGE_COUNT));
}

/**
 * chapter 2 · how (ports mockup #how's howStage()/onUpdate 1:1) — gold numeral
 * tweens out/in on stage change, collage image .on toggles, caption text
 * swaps, and the vertical progress line height tracks raw progress (not
 * stage) same as the mockup's `gsap.set(howLine,{height:(st.progress*100)+'%'})`
 */
export function buildHowChapter(section: HTMLElement, len: number): () => void {
  const numeral = section.querySelector<HTMLElement>('.hugely span');
  const howLine = section.querySelector<HTMLElement>('.line');
  const howImgs = Array.from(section.querySelectorAll<HTMLElement>('.how-media img'));
  const howCap = section.querySelector<HTMLElement>('.how-cap');
  const steps = Array.from(section.querySelectorAll<HTMLElement>('.how-step'));

  if (!numeral || !howLine || !howCap || howImgs.length === 0 || steps.length === 0) {
    return () => {};
  }

  // matches buildFleetChapter's convention: the Astro markup already renders
  // stage 0 as the resting/on state, so `cur` starts at 0 with no initial
  // howStage() call — avoids firing a pointless gsap timeline on page load
  let cur = 0;

  // fix-review I2: see buildIntroChapter's comment — howStage's timeline and
  // the onUpdate's own gsap.set(howLine, ...) both fire from onUpdate
  // (async), so both need to run inside this chapter's own context to be
  // revert-able on cleanup.
  const ctx = gsap.context(() => {}, section);

  const howStage = ctx.add('howStage', (i: number): void => {
    if (i === cur) return;
    cur = i;

    steps.forEach((s, j) => s.classList.toggle('on', j === i));
    howImgs.forEach((im, j) => im.classList.toggle('on', j === i));
    // fix-review finding 1: HOW_CAPS was a Thai-only literal array, so the
    // caption snapped back to Thai on the next scroll tick regardless of the
    // EN toggle. Read the already-i18n'd step heading instead — setLang
    // mutates [data-i18n] innerHTML in place, so h3 always holds the live
    // localized text, in whichever language is currently active.
    if (howCap) howCap.textContent = steps[i]?.querySelector('h3')?.textContent ?? '';

    gsap
      .timeline()
      .to(numeral, { yPercent: -24, opacity: 0, duration: 0.25, ease: 'power2.in' })
      .add(() => {
        if (numeral) numeral.textContent = String(i + 1);
      })
      .fromTo(numeral, { yPercent: 24, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
  }) as (i: number) => void;

  const onUpdate = ctx.add('onUpdate', (st: ScrollTrigger) => {
    howStage(howStageForProgress(st.progress));
    gsap.set(howLine, { height: st.progress * 100 + '%' });
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
