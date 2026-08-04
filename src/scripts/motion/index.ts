import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { parseCount, parseParallaxDepth, parseReveal, parseRevealGroup, splitLines } from './contract';
import { applyEditionsPins } from './editions';
import { applyMobileLite, initStickyCta, startReviewDrift, watchReviewTrack, wireReviewArrows } from './mobile-lite';
import { applyPins } from './pin';
import { initRail } from './rail';
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
// T7: the mobile-only motion tier — `(max-width: …)` leading, `and` joining a
// parenthesized `(not (...))` feature test. Unlike NOT_REDUCED_MOTION_COMPOSABLE's
// sibling comment above, this is NOT the "leading not negates the whole query"
// trap: `not` here sits *inside* its own parens as one feature test among two,
// not as a whole-query prefix, so `and`-joining it with the width test parses
// and evaluates correctly (confirmed via window.matchMedia the same way).
const MOBILE_TIER_QUERY = '(max-width: 1023px) and (not (prefers-reduced-motion: reduce))';

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

/**
 * แปลง data-reveal-group บน element แม่เป็น data-reveal + data-reveal-stagger
 * บนลูกโดยตรง ต้องรันก่อน applyReveals เสมอ เพราะ applyReveals อ่านเฉพาะ
 * element ที่มี data-reveal อยู่แล้ว
 */
export function applyRevealGroups(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
    const step = parseRevealGroup(group);
    if (step === null) return;

    Array.from(group.children).forEach((child, index) => {
      if (child.hasAttribute('data-reveal')) return;
      child.setAttribute('data-reveal', 'up');
      if (index > 0) child.setAttribute('data-reveal-stagger', String(step * index));
    });
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

/**
 * ท่าออกของ hero — ข้อความลอยขึ้นและจางระหว่างจอแรกถูกเลื่อนพ้นไป ทำให้บทแรก
 * ที่ตามมารับช่วงต่อโดยไม่มีรอยสะดุด ไม่ pin จึงไม่กินความยาว scroll เพิ่ม
 */
function applyHeroExit(root: ParentNode): void {
  const hero = root.querySelector<HTMLElement>('.hero');
  const content = hero?.querySelector<HTMLElement>('.hero-content');
  if (!hero || !content) return;

  gsap.to(content, {
    yPercent: -18,
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 40%', scrub: true },
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
 * รีวิว slider: auto-drift + ลูกศร (mockups/pinned-editions.html "reviews
 * slider: auto-drift"). Drift ผูกกับ `.rev-slider-wrap` ที่พบใน `root` — เกท
 * ด้วย NOT_REDUCED_MOTION เท่านั้น (ไม่ใช่ pin จึงไม่ผูก breakpoint) ส่วนลูกศร
 * เดินอิสระจาก drift เพราะต้องใช้งานได้แม้ตอน prefers-reduced-motion: reduce
 * ที่ module นี้ไม่ถูกลงทะเบียนเลยก็ตาม (ดู mobile-lite.ts)
 *
 * fix round 1: ต้องหา "ancestor ที่นิ่ง" ให้ watchReviewTrack ก่อน — Astro
 * แทนที่ `.rev-slider-wrap` ทั้งก้อนตอน server:defer island สลับเนื้อหาจริง
 * เข้ามา (ไม่ใช่แค่แก้ children ข้างใน) MutationObserver ที่ผูกกับตัว
 * `.rev-slider-wrap` เองจึงไม่มีวันเห็นเหตุการณ์นั้น ต้องผูกกับ parentElement
 * (คือ `<section id="reviews">` ใน index.astro) ซึ่งไม่ถูกแทนที่เลย
 */
function reviewContainerOf(wrap: HTMLElement): ParentNode & Node {
  return wrap.parentElement ?? document.body;
}

/** Looks up `#sticky-cta` (StickyCta.astro, T1) under `root` and wires it, if present. */
function initStickyCtaOf(root: ParentNode): void {
  const cta = root.querySelector<HTMLElement>('#sticky-cta');
  if (cta) initStickyCta(cta);
}

function applyReviewDrift(root: ParentNode): (() => void)[] {
  return Array.from(root.querySelectorAll<HTMLElement>('.rev-slider-wrap')).map((wrap) =>
    watchReviewTrack(reviewContainerOf(wrap), (track) => {
      const drift = startReviewDrift(track);
      const stopArrows = wireReviewArrows(track, drift);
      return () => {
        drift.stop();
        stopArrows();
      };
    })
  );
}

function applyReviewArrowsOnly(root: ParentNode): (() => void)[] {
  return Array.from(root.querySelectorAll<HTMLElement>('.rev-slider-wrap')).map((wrap) =>
    watchReviewTrack(reviewContainerOf(wrap), (track) => wireReviewArrows(track))
  );
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

  // มือถือยืด/หด address bar ระหว่างเลื่อน ถ้าปล่อยให้ refresh ทุกครั้งความสูง
  // ของบทที่ pin จะกระโดดกลางทาง — ตัวนี้บอกให้ข้าม resize ที่มาจากแถบนั้น
  ScrollTrigger.config({ ignoreMobileResize: true });

  const splitTargets = Array.from(root.querySelectorAll<HTMLElement>('[data-split]'))
    .map((el) => ({ el, inners: splitLines(el) }));

  const mm = gsap.matchMedia();

  mm.add(`(min-width: ${FULL_TIER_MIN_WIDTH}px) and ${NOT_REDUCED_MOTION_COMPOSABLE}`, () => {
    applyParallax(root);
    const cleanupPins = applyPins(root);
    const cleanupEditions = applyEditionsPins(root, 'full');
    initStickyCtaOf(root);
    return () => {
      cleanupPins();
      cleanupEditions();
    };
  });

  // T7: mobile's own lively motion tier (drift + bouncy reveals for
  // non-chapter elements) — see mobile-lite.ts's applyMobileLite. Task 6
  // additionally mounts the same six chapters used at the full tier here, at
  // a thumb-sized length (chapterLenFor's 'lite' scaling) — chapters own the
  // `.hm-step`-style in/out sequencing now, so mobile-lite no longer touches
  // it. Sticky CTA also registers here (not just the full tier above) so it
  // works at every width motion is allowed, mobile included.
  mm.add(MOBILE_TIER_QUERY, () => {
    applyMobileLite(root);
    const cleanupEditions = applyEditionsPins(root, 'lite');
    initStickyCtaOf(root);
    return () => cleanupEditions();
  });

  mm.add(NOT_REDUCED_MOTION, () => {
    splitTargets.forEach(({ el, inners }) => applySplitReveal(inners, el));
    // ต้องมาก่อน applyReveals เสมอ — applyRevealGroups ใส่ data-reveal ให้ลูกที่
    // ยังไม่มี แล้ว applyReveals ถึงจะอ่านเจอ สลับลำดับแล้วลูกกลุ่มจะไม่ถูก
    // animate เลยเพราะ applyReveals อ่านเฉพาะ element ที่มี data-reveal อยู่แล้ว
    applyRevealGroups(root);
    applyReveals(root);
    applyHeroExit(root);
    applyCounts(root);
    const stopReviewDrift = applyReviewDrift(root);
    const cleanupRail = initRail(root);
    return () => {
      stopReviewDrift.forEach((stop) => stop());
      cleanupRail();
    };
  });

  // reduced-motion: mobile-lite (drift) ไม่ถูกลงทะเบียนเลย แต่ลูกศร + scroll
  // มือต้องยังใช้งานได้ — เช็คตรงแบบเดียวกับ hero-depth/tiers (ไม่ผูกกับ
  // gsap.matchMedia เพราะนี่ไม่ใช่ tween ที่ reduced-motion ต้องปิด)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    applyReviewArrowsOnly(root);
    // T9 verification finding: `initStickyCtaOf` only ran inside the two
    // motion tiers above, both of which are gated on NOT reduced-motion. A
    // reduced-motion visitor therefore never got the `.show` class, and
    // StickyCta.astro's resting state is `opacity: 0; pointer-events: none` —
    // the booking CTA was permanently invisible for them. This is a class
    // toggle, not a tween, so it belongs on the same un-gated footing as the
    // review arrows.
    initStickyCtaOf(root);
  }

  // legacy .reveal bridge lives in ./legacy-reveal (final-review Fix 1) and is
  // booted separately from Base.astro so it doesn't wait on this GSAP chunk
  watchLanguageChange();
}
