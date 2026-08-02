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
 */

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

  const pause = (): void => { paused = true; };
  const resume = (): void => {
    // Resync from the live scrollLeft in case the user dragged/scrolled the
    // track manually while drift was paused — otherwise the next tick would
    // snap back to our stale accumulator and undo their scroll.
    position = track.scrollLeft;
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
 * Re-runs `mount` whenever the `.rev-track` inside `wrap` is replaced —
 * the hook the `server:defer` Reviews island needs (see ./index STATE note:
 * `ScrollTrigger.refresh()` on island load was already needed once for the
 * same reason). Astro's server-island client runtime does no custom event;
 * it just removes the fallback nodes and inserts the live HTML in place
 * (astro/dist/runtime/server/render/server-islands.js), so a MutationObserver
 * on the container is the only reliable signal.
 */
export function watchReviewTrack(
  wrap: HTMLElement,
  mount: (track: HTMLElement) => (() => void) | void
): () => void {
  let cleanup: (() => void) | void;

  function run(): void {
    const track = wrap.querySelector<HTMLElement>('.rev-track');
    if (!track) return;
    cleanup?.();
    cleanup = mount(track);
  }

  run();

  const observer = new MutationObserver(run);
  observer.observe(wrap, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    cleanup?.();
  };
}
