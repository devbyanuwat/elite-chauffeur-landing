/**
 * Reviews slider — auto-drift + arrows, ported from mockups/pinned-editions.html
 * ("reviews slider: auto-drift" IIFE).
 *
 * Deliberately width-agnostic: the drift is a quiet, slow attract-loop, not a
 * pinned/scroll-jacked sequence, so it is gated only on prefers-reduced-motion
 * (see NOT_REDUCED_MOTION in ./index), never on viewport width.
 *
 * startReviewDrift stays pure and DOM-only (no gsap) so it is cheaply testable
 * with jsdom + a fake requestAnimationFrame — see tests/motion/mobile-lite.test.ts.
 *
 * applyMobileLite/initStickyCta below (T7) are NOT DOM-only — they build the
 * mockup's "mobile motion tier" and "sticky CTA" gsap/ScrollTrigger timelines,
 * so this file now also depends on gsap. That's fine: those two exports are
 * tested with a mocked gsap/ScrollTrigger (see tests/motion/mobile-lite.test.ts),
 * same pattern as pin.ts/index.ts's own tests.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const DRIFT_SPEED_PX = 0.45;
const ARROW_PAUSE_MS = 1600;
const ARROW_GAP_PX = 19; // matches mockup's rev-track gap (1.2rem @ 16px root ≈ 19px)

const PAUSE_EVENTS = ['pointerenter', 'touchstart', 'focusin'] as const;
const RESUME_EVENTS = ['pointerleave', 'touchend', 'focusout'] as const;

export interface ReviewDriftHandle {
  stop(): void;
  pause(): void;
  resume(): void;
}

/**
 * Starts the seamless auto-drift on a `.rev-track`. Clones the original card
 * set once (so `scrollWidth / 2` lands exactly back on the first real card),
 * then drifts `scrollLeft` forward every frame, pausing on hover/touch/focus
 * and resuming on the mirror events — identical semantics to the mockup.
 *
 * Sets `data-drift="on"` on the track for the lifetime of the loop; this is
 * also the browser-measurable hook that the reduced-motion gate in ./index
 * never registers this module at all (attribute absent) rather than merely
 * pausing it.
 */
export function startReviewDrift(track: HTMLElement): ReviewDriftHandle {
  Array.from(track.children).forEach((card) => {
    const clone = card.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });

  // Measured directly in the browser (Chromium 145, both headless and
  // headed), not guessed: with `scroll-snap-type: x mandatory` (the CSS the
  // mockup's `.rev-track` ships), a programmatic `scrollLeft` write to any
  // position that isn't itself a snap point is rejected outright — the
  // getter reads back 0 on the very next microtask, every frame, forever.
  // The mockup's own `tr.scrollLeft += 0.45` therefore never actually drifts
  // in a real browser. Auto-drift and mandatory snap are incompatible;
  // suspend snapping for the lifetime of the drift loop and restore
  // whatever value the stylesheet/inline style had on stop().
  const previousSnapType = track.style.scrollSnapType;
  track.style.scrollSnapType = 'none';

  let paused = false;
  let rafId = 0;
  // Also: `scrollLeft`'s getter rounds to the nearest integer pixel — reading
  // it back every frame (`track.scrollLeft += DRIFT_SPEED_PX`) would truncate
  // the 0.45px sub-pixel step to zero on every single tick even with snapping
  // off. Track the float position ourselves and only ever write to
  // scrollLeft, never read it back into the accumulator.
  let position = track.scrollLeft;

  function tick(): void {
    if (!paused) {
      position += DRIFT_SPEED_PX;
      const half = track.scrollWidth / 2;
      if (position >= half) {
        position -= half;
      }
      track.scrollLeft = position;
    }
    rafId = requestAnimationFrame(tick);
  }

  const pause = (): void => {
    paused = true;
    // Restore real snapping while paused so a manual swipe/drag during the
    // pause (hover, touch, focus) settles on a card edge like any other
    // snap-carousel — snap is only a problem for the continuous sub-pixel
    // writes the drift loop does, not for the user's own scroll gesture.
    track.style.scrollSnapType = previousSnapType;
  };
  const resume = (): void => {
    // Resync from the live scrollLeft in case the user dragged/scrolled the
    // track manually while drift was paused — otherwise the next tick would
    // snap back to our stale accumulator and undo their scroll.
    position = track.scrollLeft;
    // Suspend snapping again before the rAF loop resumes writing scrollLeft
    // (see the note above `previousSnapType` — mandatory snap rejects any
    // off-snap-point write outright).
    track.style.scrollSnapType = 'none';
    paused = false;
  };

  PAUSE_EVENTS.forEach((evt) => track.addEventListener(evt, pause, { passive: true }));
  RESUME_EVENTS.forEach((evt) => track.addEventListener(evt, resume, { passive: true }));

  track.setAttribute('data-drift', 'on');
  rafId = requestAnimationFrame(tick);

  return {
    pause,
    resume,
    stop(): void {
      cancelAnimationFrame(rafId);
      PAUSE_EVENTS.forEach((evt) => track.removeEventListener(evt, pause));
      RESUME_EVENTS.forEach((evt) => track.removeEventListener(evt, resume));
      track.removeAttribute('data-drift');
      track.style.scrollSnapType = previousSnapType;
    },
  };
}

/**
 * Wires `.rev-arrow[data-dir]` buttons (siblings of `track` under a shared
 * `.rev-slider-wrap`) to scroll by one card width. If a drift handle is
 * passed, the drift pauses for ARROW_PAUSE_MS around the scroll so the arrow
 * click reads as intentional, not fought by the ambient drift — mirrors the
 * mockup's `paused=true; …; setTimeout(()=>paused=false, 1600)`.
 *
 * Deliberately independent of startReviewDrift/the reduced-motion gate: manual
 * navigation must keep working even when the drift module was never
 * registered (prefers-reduced-motion: reduce).
 */
export function wireReviewArrows(
  track: HTMLElement,
  drift?: Pick<ReviewDriftHandle, 'pause' | 'resume'>
): () => void {
  const wrap = track.closest('.rev-slider-wrap') ?? track.parentElement ?? track;
  const arrows = Array.from(wrap.querySelectorAll<HTMLButtonElement>('.rev-arrow[data-dir]'));

  let resumeTimer: ReturnType<typeof setTimeout> | undefined;

  function onClick(this: HTMLButtonElement): void {
    const dir = Number(this.dataset.dir ?? '1');
    const card = track.querySelector<HTMLElement>('.rev-card');
    const step = ((card?.offsetWidth ?? track.clientWidth) + ARROW_GAP_PX) * dir;

    drift?.pause();
    track.scrollBy({ left: step, behavior: 'smooth' });

    if (drift) {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => drift.resume(), ARROW_PAUSE_MS);
    }
  }

  arrows.forEach((btn) => btn.addEventListener('click', onClick));

  return () => {
    clearTimeout(resumeTimer);
    arrows.forEach((btn) => btn.removeEventListener('click', onClick));
  };
}

/**
 * Re-runs `mount` whenever the `.rev-track` found under `container` is
 * replaced — the hook the `server:defer` Reviews island needs (see ./index
 * STATE note: `ScrollTrigger.refresh()` on island load was already needed
 * once for the same reason). Astro's server-island client runtime does no
 * custom event; it just removes the fallback nodes and inserts the live HTML
 * in place (astro/dist/runtime/server/render/server-islands.js) — and it
 * replaces the ENTIRE `.rev-slider-wrap` the fallback rendered, not just its
 * children. A MutationObserver only reports mutations to its *target's*
 * descendants, never the target node's own removal, so observing
 * `.rev-slider-wrap` itself never fires when Astro swaps it out wholesale
 * (confirmed by forcing a delayed island response and watching the observer
 * never re-run). `container` must therefore be a stable ancestor that
 * survives the swap — the `<section>` Reviews/StaticReviews render into, or
 * `document` — and every run re-queries `.rev-track` fresh from `container`
 * rather than closing over any specific node from a previous run.
 */
export function watchReviewTrack(
  container: ParentNode & Node,
  mount: (track: HTMLElement) => (() => void) | void
): () => void {
  let cleanup: (() => void) | void;
  let mountedTrack: HTMLElement | null = null;

  function run(): void {
    const track = container.querySelector<HTMLElement>('.rev-track');
    if (!track || track === mountedTrack) return;
    cleanup?.();
    mountedTrack = track;
    cleanup = mount(track);
  }

  run();

  const observer = new MutationObserver(run);
  observer.observe(container, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    cleanup?.();
  };
}

const REVEAL_SELECTOR = '.svc,.route-card,.rev-card,.blog-card,.fleet-meta,.ch-head,.faq-item';

/**
 * Mobile's own lively motion tier — ports mockups/pinned-editions.html's
 * "mobile motion tier" IIFE (`!DESKTOP && !reduced-motion` block) verbatim,
 * adapted to this codebase's real mobile markup:
 *
 * - image drift: any `[data-drift-img]` element (T7 adds the attribute to
 *   IntroStory's intro photo — amt 10, How's `.hm-media img` — amt 12, and
 *   BlogTeaser's cover img — amt 8) gets `scale:1.15` plus a scrub'd
 *   `yPercent -amt → amt` against its nearest `section` (mirrors the
 *   mockup's `img.closest('section')||img.parentNode`). An invalid or
 *   missing attribute value is skipped — never a guess at a default amt.
 * - bouncy reveals: `.svc,.route-card,.rev-card,.blog-card,.fleet-meta,
 *   .ch-head,.faq-item` fade/scale/lift in once, `.svc .n` pops in with a
 *   punchier ease.
 * - `.hm-step` blocks: a paused timeline (media slide+rotate, numeral
 *   elastic pop, body stagger) that plays forward on enter (either
 *   direction) and reverses on leave (either direction) — so scrolling back
 *   up un-animates a step exactly like the mockup, instead of leaving it
 *   stuck mid-reveal.
 *
 * Gated entirely by ./index's mm.add `(max-width: 1023px) and
 * (not (prefers-reduced-motion: reduce))` block — this function itself does
 * no width/reduced-motion checks, same convention as applyParallax/applyReveals.
 */
export function applyMobileLite(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-drift-img]').forEach((img) => {
    const raw = img.getAttribute('data-drift-img');
    const amt = raw === null || raw === '' ? Number.NaN : Number.parseFloat(raw);
    if (!Number.isFinite(amt)) return;

    const trigger = img.closest('section') ?? img.parentElement ?? img;

    gsap.set(img, { scale: 1.15 });
    gsap.fromTo(
      img,
      { yPercent: -amt },
      {
        yPercent: amt,
        ease: 'none',
        scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: true },
      }
    );
  });

  root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => {
    gsap.from(el, {
      y: 30,
      opacity: 0,
      scale: 0.97,
      duration: 0.65,
      ease: 'back.out(1.8)',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });

  root.querySelectorAll<HTMLElement>('.svc .n').forEach((n) => {
    gsap.from(n, {
      scale: 0.2,
      opacity: 0,
      duration: 0.6,
      ease: 'back.out(3)',
      scrollTrigger: { trigger: n, start: 'top 92%', once: true },
    });
  });

  root.querySelectorAll<HTMLElement>('.hm-step').forEach((el) => {
    const img = el.querySelector<HTMLElement>('.hm-media');
    const n = el.querySelector<HTMLElement>('.hm-n');
    const bits = Array.from(el.querySelectorAll<HTMLElement>('.hm-body > *'));
    if (!img || !n || bits.length === 0) return;

    const tl = gsap
      .timeline({ paused: true })
      .fromTo(
        img,
        { x: 44, opacity: 0, rotate: 1.2 },
        { x: 0, opacity: 1, rotate: 0, duration: 0.6, ease: 'power3.out' }
      )
      .fromTo(
        n,
        { scale: 0.3, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.7, ease: 'elastic.out(1,0.45)' },
        '<0.15'
      )
      .fromTo(
        bits,
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, stagger: 0.09, ease: 'back.out(2.2)' },
        '<0.05'
      );

    ScrollTrigger.create({
      trigger: el,
      start: 'top 86%',
      end: 'bottom 10%',
      onEnter: () => tl.play(),
      onEnterBack: () => tl.play(),
      onLeave: () => tl.reverse(),
      onLeaveBack: () => tl.reverse(),
    });
  });
}

/**
 * Sticky CTA visibility — ports mockups/pinned-editions.html's "sticky CTA"
 * IIFE. `cta` is the `#sticky-cta` element from StickyCta.astro (T1); its
 * `.show` class is the only thing this touches (opacity/transform/
 * pointer-events all live in that component's CSS, gated on `.show`).
 *
 * Trigger is `#services` (IntroStory's chapter id) rather than `#intro` (the
 * mockup's id) — this codebase kept `#services` so Nav.astro's existing
 * `/#services` anchor still lands on the intro chapter (see IntroStory.astro).
 * endTrigger is `#booking` (Booking.astro's section id), matching the
 * mockup's `bookend`.
 *
 * Registered from BOTH ./index's full-tier and mobile-lite mm.add blocks —
 * the CTA should show/hide on every width motion is allowed, not just mobile.
 */
export function initStickyCta(cta: HTMLElement): void {
  ScrollTrigger.create({
    trigger: '#services',
    start: 'top -30%',
    endTrigger: '#booking',
    end: 'top 70%',
    onToggle(self) {
      cta.classList.toggle('show', self.isActive);
    },
  });
}
