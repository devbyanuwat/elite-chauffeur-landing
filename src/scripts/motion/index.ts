import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { parseCount, parseParallaxDepth, parseReveal, splitLines } from './contract';
import { applyEditionsPins } from './editions';
import { applyPins } from './pin';
import { FULL_TIER_MIN_WIDTH } from './tiers';

const EASE = 'power3.out';
// final-review Fix 4: `(prefers-reduced-motion: no-preference)` and
// `(prefers-reduced-motion: reduce)` are not complements — a user agent that
// implements neither evaluates both as false, which would strand
// [data-reveal] at opacity: 0 (motion.css) with no GSAP context ever running
// to un-hide it. `not all and (prefers-reduced-motion: reduce)` is the
// level-4 negation idiom and matches exactly the states the CSS side (and
// pickTier's own reduced-motion check) already treat as "motion allowed".
// Used standalone (as its own, complete media query) below — this form is
// correct on its own and must stay exactly as-is.
const NOT_REDUCED_MOTION = 'not all and (prefers-reduced-motion: reduce)';
// verify-task fix (2026-07-27, measured in the browser, not guessed): `not all
// and (...)` is a *whole-query* negation (`not <media-type> and <feature>`) —
// it cannot be joined with a further `and` after a leading `(min-width: …)`
// feature test, because a leading `not` can only prefix an entire media query,
// not follow one. Chromium (and, per the CSS Media Queries error-handling
// spec, every standards-compliant browser) cannot parse
// `(min-width: 1024px) and not all and (prefers-reduced-motion: reduce)` as
// written; it collapses to the single recognized fragment `not all`, which is
// always false. That means the desktop-only block below — parallax AND
// pinning — never ran in any real browser, on any viewport, under any
// reduced-motion setting, from the moment this gate was introduced. Confirmed
// directly: `window.matchMedia(...)` on the compound string returns
// `{ matches: false, media: 'not all' }`; the same fragment as its own,
// composable, parenthesized condition parses and evaluates correctly. Use
// this form when composing with `and` after another feature test.
const NOT_REDUCED_MOTION_COMPOSABLE = '(not (prefers-reduced-motion: reduce))';

function applyParallax(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const depth = parseParallaxDepth(el);
    if (depth === null) return;

    const trigger = el.closest('[data-depth-group]') ?? el.parentElement ?? el;

    gsap.fromTo(
      el,
      { yPercent: -depth * 50 },
      {
        yPercent: depth * 50,
        ease: 'none',
        scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: true },
      }
    );
  });
}

function applySplitReveal(inners: HTMLElement[], trigger: Element): void {
  inners.forEach((inner, index) => {
    gsap.fromTo(
      inner,
      { yPercent: 110 },
      {
        yPercent: 0,
        duration: 1.1,
        ease: EASE,
        delay: index * 0.08,
        scrollTrigger: { trigger, start: 'top 85%' },
      }
    );
  });
}

function applyReveals(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    const spec = parseReveal(el);
    if (spec === null) return;

    const delay = spec.delayMs / 1000;
    const from = spec.mode === 'mask'
      ? { opacity: 1, clipPath: 'inset(0 0 100% 0)' }
      : { opacity: 0, y: 26 };
    const to = spec.mode === 'mask'
      ? { clipPath: 'inset(0 0 0% 0)', duration: 1, ease: EASE, delay }
      : { opacity: 1, y: 0, duration: 0.9, ease: EASE, delay };

    gsap.fromTo(el, from, { ...to, scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
}

function applyCounts(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const spec = parseCount(el);
    if (spec === null) return;

    const state = { value: 0 };

    gsap.to(state, {
      value: spec.target,
      duration: 1.4,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%' },
      onUpdate: () => {
        el.textContent = state.value.toFixed(spec.decimals) + spec.suffix;
      },
    });
  });
}

/**
 * สลับภาษาทำให้ความยาวข้อความเปลี่ยน ตำแหน่งที่ ScrollTrigger คำนวณไว้จึงเก่า
 * i18n ไม่ได้ยิง event ออกมา จึงเฝ้า attribute lang บน <html> แทน
 */
function watchLanguageChange(): void {
  const html = document.documentElement;
  let current = html.lang;

  new MutationObserver(() => {
    if (html.lang === current) return;
    current = html.lang;
    ScrollTrigger.refresh();
  }).observe(html, { attributes: true, attributeFilter: ['lang'] });
}

export function initMotion(root: ParentNode = document): void {
  gsap.registerPlugin(ScrollTrigger);

  const splitTargets = Array.from(root.querySelectorAll<HTMLElement>('[data-split]'))
    .map((el) => ({ el, inners: splitLines(el) }));

  const mm = gsap.matchMedia();

  mm.add(`(min-width: ${FULL_TIER_MIN_WIDTH}px) and ${NOT_REDUCED_MOTION_COMPOSABLE}`, () => {
    applyParallax(root);
    const cleanupPins = applyPins(root);
    const cleanupEditions = applyEditionsPins(root);
    return () => {
      cleanupPins();
      cleanupEditions();
    };
  });

  mm.add(NOT_REDUCED_MOTION, () => {
    splitTargets.forEach(({ el, inners }) => applySplitReveal(inners, el));
    applyReveals(root);
    applyCounts(root);
  });

  // legacy .reveal bridge lives in ./legacy-reveal (final-review Fix 1) and is
  // booted separately from Base.astro so it doesn't wait on this GSAP chunk
  watchLanguageChange();
}
