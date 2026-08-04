import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { PIN_READY_CLASS } from './shared';

interface FleetCar {
  ghost: string;
  name: string;
  price: string;
  img: string;
  alt: string;
  vtype: string;
}

const FLEET_STAGE_COUNT = 4;

/**
 * สูตร stage-index จาก progress สำหรับ chapter 1 (fleet) — ตรงกับ mockup 1:1
 * (`Math.min(3, Math.floor(st.progress * 4))`), แยกออกมาเป็นฟังก์ชันล้วน ๆ
 * ให้เทสต์ได้โดยไม่ต้องพึ่ง ScrollTrigger/DOM
 */
export function fleetStageForProgress(progress: number): number {
  return Math.min(FLEET_STAGE_COUNT - 1, Math.floor(progress * FLEET_STAGE_COUNT));
}

function readFleetCars(section: HTMLElement): FleetCar[] {
  const raw = section.querySelector<HTMLScriptElement>('#fleet-data')?.textContent ?? '';
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FleetCar[]) : [];
  } catch {
    return [];
  }
}

/**
 * chapter 1 · fleet (ports mockup #fleet's fleetStage()/onUpdate 1:1)
 * ghost word + car image + meta (name/chips/price/CTA) สลับพร้อมกันเป็นชุด
 * ทุกครั้งที่ stage เปลี่ยน ทิศทาง exit/enter ขึ้นกับว่า stage ใหม่มากกว่าเก่า
 * หรือน้อยกว่า (เดินหน้า/ถอยหลัง) เหมือน mockup's `dir` — ไม่มี retrigger ซ้ำ
 * stage เดิม (เทียบ fleetCur ก่อนเสมอ) เหมือน svcStage/fleetStage ใน mockup
 */
export function buildFleetChapter(section: HTMLElement, len: number): () => void {
  const cars = readFleetCars(section);
  const ghostSpanEl = section.querySelector<HTMLElement>('.ghost span');
  const carImgEl = section.querySelector<HTMLImageElement>('.car-layer img');
  const nameElEl = section.querySelector<HTMLElement>('.fleet-meta .name');
  const chipsElEl = section.querySelector<HTMLElement>('.fleet-meta .chips');
  const priceElEl = section.querySelector<HTMLElement>('.fleet-meta .price b');
  const pickBtn = section.querySelector<HTMLElement>('.pick');
  const countEl = section.querySelector<HTMLElement>('.fleet-count');
  // fix round 1 (review): `.rail` is desktop-only chrome (hidden <1024px by
  // its own CSS) and `.fleet-tabs` is the <1024px numbered pills — both are
  // "pick a car" controls for the same four stages. Task 6 now pins this
  // chapter below 1024px too, so without adopting `.fleet-tabs` here a phone
  // user loses all keyboard/screen-reader access to cars 02–04 (the CSS
  // fix that used to hide `.fleet-tabs` under .pin-ready removed the only
  // surviving control instead of merging into this one).
  //
  // fix round 2 (review, CRITICAL): a single flat
  // `.rail button, .fleet-tabs button` query puts the 4 tab buttons at
  // *document* indices 4–7, not stage indices 0–3 — every `j === i` /
  // `i`-as-stage-index computation below then either never matches (the
  // `.on` toggle) or scrolls past `trigger.end` entirely (the click
  // handler). Two separate per-group arrays, both driven by the SAME stage
  // index `i`, keep each group's own position meaningful instead of its
  // position in a flattened document-order list.
  const railButtons = Array.from(section.querySelectorAll<HTMLElement>('.rail button'));
  const tabButtons = Array.from(section.querySelectorAll<HTMLElement>('.fleet-tabs button'));
  const controlGroups = [railButtons, tabButtons];

  if (cars.length === 0 || !ghostSpanEl || !carImgEl || !nameElEl || !chipsElEl || !priceElEl) {
    return () => {};
  }

  // จับหลัง guard ให้ TS มองเป็น non-null ได้แม้ถูกอ้างจาก closure ซ้อนใน (การ
  // narrow ของ TS ไม่ตกทอดเข้า nested function เดิม เพราะ struct นั้นถือว่า
  // ตัวแปรอาจถูก reassign ได้ก่อนเรียก)
  const ghostSpan: HTMLElement = ghostSpanEl;
  const carImg: HTMLImageElement = carImgEl;
  const nameEl: HTMLElement = nameElEl;
  const chipsEl: HTMLElement = chipsElEl;
  const priceEl: HTMLElement = priceElEl;

  // fix-review I2: see buildIntroChapter's comment — same reasoning applies
  // here, renderStage's timeline is created from onUpdate (async), so it
  // needs its own context to be revert-able on cleanup.
  const ctx = gsap.context(() => {}, section);

  let cur = 0;

  const renderStage = ctx.add('renderStage', (i: number, dir: 1 | -1, animate: boolean): void => {
    const car = cars[i];

    // final-review Fix 2: `.on` is a colour-only signal. aria-pressed is the
    // same fact in the accessibility tree — set on BOTH control groups (the
    // >=1024px `.rail` and the mobile `.fleet-tabs`), from the same stage
    // index, so whichever group the visitor is using reports the right car.
    controlGroups.forEach((buttons) =>
      buttons.forEach((b, j) => {
        b.classList.toggle('on', j === i);
        b.setAttribute('aria-pressed', j === i ? 'true' : 'false');
      })
    );
    if (countEl) countEl.textContent = `0${i + 1} / 0${cars.length}`;

    function applyContent(): void {
      ghostSpan.textContent = car.ghost;
      carImg.src = car.img;
      carImg.alt = car.alt;
      nameEl.textContent = car.name;
      priceEl.textContent = car.price;
      // fix-review finding 2: clone the current (possibly already-toggled)
      // localized markup from the hidden #fleet-chip-bank instead of writing
      // raw Thai chip text — writing car.chips directly meant a stage change
      // after the EN toggle snapped the chips back to Thai. Bank entries
      // carry their own data-i18n keys, so setLang keeps them (and any clone
      // of them) in sync regardless of when the toggle happens.
      const bankEntry = section.querySelector(`#fleet-chip-bank [data-car-index="${i}"]`);
      chipsEl.innerHTML = bankEntry ? bankEntry.innerHTML : '';
      if (pickBtn) pickBtn.dataset.vtype = car.vtype;
    }

    if (!animate) {
      applyContent();
      return;
    }

    // fix-review finding 2: meta (name + price block) is the mockup's third,
    // fastest-arriving layer — ghost slowest, car mid, meta last-in. Without
    // this the name/chips/price snapped in instantly while ghost/car tweened.
    const metaTargets = [nameEl.parentElement, priceEl.closest('.price')].filter(
      (el): el is HTMLElement => el !== null
    );

    gsap
      .timeline()
      .to(ghostSpan, { xPercent: -14 * dir, opacity: 0, duration: 0.28, ease: 'power2.in' }, 0)
      .to(carImg, { xPercent: -30 * dir, opacity: 0, scale: 0.94, duration: 0.3, ease: 'power2.in' }, 0)
      .add(applyContent)
      .fromTo(ghostSpan, { xPercent: 14 * dir, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
      .fromTo(
        carImg,
        { xPercent: 30 * dir, opacity: 0, scale: 0.96 },
        { xPercent: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'power3.out' },
        '<.05'
      )
      .fromTo(
        metaTargets,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' },
        '<.1'
      );
  }) as (i: number, dir: 1 | -1, animate: boolean) => void;

  function fleetStage(i: number, animate = true): void {
    if (i === cur && animate) return;
    const dir: 1 | -1 = i >= cur ? 1 : -1;
    cur = i;
    renderStage(i, dir, animate);
  }

  const trigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: `+=${len}%`,
    pin: section,
    pinSpacing: true,
    anticipatePin: 1,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate(st) {
      fleetStage(fleetStageForProgress(st.progress));
    },
  });

  // fix-review I1: this used to compute
  // `section.getBoundingClientRect().top + window.scrollY`, which — while the
  // section is pinned — always equals the CURRENT scroll position (rect.top
  // is pinned at ~0), so every click just scrolled some fixed amount
  // *forward* from wherever the user already was, making backward nav (e.g.
  // clicking rail 01 from stage 03) land past stage 01 instead of on it.
  // Read the target scroll position from the ScrollTrigger instance's own
  // (start, end) range instead — those are absolute document-scroll values
  // that don't shift while pinned, so this works the same regardless of
  // current scroll position or direction.
  //
  // fix round 2 (review): wired per-group (each button's `i` is its index
  // within its OWN group — .rail or .fleet-tabs — not a flattened
  // document-order index), same fix as the .on toggle above. Without this
  // every mobile tab's target `y` used i ∈ [4,7] against FLEET_STAGE_COUNT
  // (4), landing past `trigger.end` — outside the chapter entirely.
  const clickHandlers: { btn: HTMLElement; handler: () => void }[] = [];
  controlGroups.forEach((buttons) => {
    buttons.forEach((btn, i) => {
      const handler = () => {
        const y = trigger.start + ((i + 0.5) / FLEET_STAGE_COUNT) * (trigger.end - trigger.start);
        window.scrollTo({ top: y, behavior: 'smooth' });
      };
      btn.addEventListener('click', handler);
      clickHandlers.push({ btn, handler });
    });
  });

  section.classList.add(PIN_READY_CLASS);

  return () => {
    // final-review Fix 7: killing the trigger and reverting the context undoes
    // the *tweens*, but every class/text write above is a plain DOM write and
    // survived teardown — so crossing 1024px (or any matchMedia revert) rebuilt
    // this chapter with `cur = 0` while the page still showed car 04. The very
    // next `fleetStage(0)` then early-returned on `i === cur` and the chapter
    // stayed wrong until the visitor happened to scroll to a *different* stage.
    // Put the DOM back on stage 0 — the state the Astro markup ships and the
    // state a fresh build assumes. `animate: false` so this is a pure write with
    // no timeline (and therefore nothing left for ctx.revert() below to chase).
    fleetStage(0, false);
    trigger.kill();
    ctx.revert();
    // fix-review I3: remove the rail/tab click listeners on cleanup — without
    // this, tearing down/rebuilding this chapter (matchMedia revert on a
    // breakpoint cross, or the mobile<->desktop tier flip) piled up duplicate
    // listeners on the same buttons every time.
    clickHandlers.forEach(({ btn, handler }) => btn.removeEventListener('click', handler));
    section.classList.remove(PIN_READY_CLASS);
  };
}
