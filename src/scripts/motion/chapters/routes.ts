import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { PIN_READY_CLASS } from './shared';

/**
 * chapter 3 · routes (ports mockup #routes's onUpdate 1:1) — pure scrub, no
 * stage index at all: the track's x offset and each card's inner-image
 * xPercent parallax are both continuous functions of st.progress /
 * getBoundingClientRect(), same as fleetStage's math but with nothing to
 * memoize (no discrete "current stage" to compare against), so there is no
 * pure helper worth extracting for tests/motion/editions.test.ts here.
 */
export function buildRoutesChapter(section: HTMLElement, len: number): () => void {
  const trackClip = section.querySelector<HTMLElement>('.track-clip');
  const track = section.querySelector<HTMLElement>('.track');
  const cards = Array.from(section.querySelectorAll<HTMLElement>('.route-card'));
  const prog = section.querySelector<HTMLElement>('.rprog i');

  if (!trackClip || !track || cards.length === 0) return () => {};

  // fix-review I2: see buildIntroChapter's comment — this onUpdate's own
  // gsap.set calls (track x, progress bar scaleX, per-card parallax) need to
  // be revert-able on cleanup, same reasoning as every other chapter here.
  const ctx = gsap.context(() => {}, section);

  const onUpdate = ctx.add('onUpdate', (st: ScrollTrigger) => {
    const max = track.scrollWidth - trackClip.clientWidth + 64;
    gsap.set(track, { x: -st.progress * max });
    if (prog) gsap.set(prog, { scaleX: st.progress });

    // inner-image parallax: each photo drifts against the track, based on
    // how far its card's center sits from the viewport center (mockup 1:1)
    cards.forEach((card) => {
      const r = card.getBoundingClientRect();
      const vw = window.innerWidth;
      const p = (r.left + r.width / 2 - vw / 2) / vw;
      const img = card.querySelector<HTMLElement>('img');
      if (img) gsap.set(img, { xPercent: p * 10 });
    });
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
