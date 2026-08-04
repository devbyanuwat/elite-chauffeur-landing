import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { PIN_READY_CLASS } from './shared';

/**
 * chapter 0 · hero → services transform (ports mockup #intro's onUpdate 1:1)
 * phase A (0 → .28 ของ progress): ภาพเต็มจอบีบเข้ากรอบด้านขวา, veil จางลง,
 * headline แรกพบจางออก, รายการบริการไล่เข้ามาจากซ้าย
 * phase B (.30 → 1): 4 บริการไล่แสดงทีละอัน สลับภาพในกรอบตามบริการที่ active
 * ไม่มี Date.now/timer — ขับด้วย st.progress (scrub) ล้วน ๆ เหมือน fleetStage
 * ในมockup ที่ยิง tween จาก onUpdate ตอน stage เปลี่ยนเท่านั้น (ไม่ retrigger)
 */
export function buildIntroChapter(section: HTMLElement, len: number): () => void {
  const photo = section.querySelector<HTMLElement>('.intro-photo');
  const heroImg = section.querySelector<HTMLElement>('.intro-photo-img');
  const veil = section.querySelector<HTMLElement>('.intro-veil');
  const heroCopy = section.querySelector<HTMLElement>('.intro-hero-copy');
  const servicesEl = section.querySelector<HTMLElement>('.intro-services');
  const svcImgs = Array.from(section.querySelectorAll<HTMLElement>('.svc-img'));
  const svcRows = Array.from(section.querySelectorAll<HTMLElement>('.svc'));

  // ท่อนสำคัญขาดไปท่อนใด แปลว่า markup ยังไม่พร้อม (เช่น component เก่ากว่านี้) —
  // อย่าสร้าง ScrollTrigger เปล่า ๆ ที่ pin จอค้างไว้โดยไม่มีอะไรให้เล่า
  if (!photo || !heroImg || !veil || !heroCopy || !servicesEl) return () => {};

  // fix-review I2: this chapter's own gsap.context — tweens created from
  // inside onUpdate (fired async on scroll, long after this builder's own
  // call frame returns) are NOT captured by gsap.matchMedia's context, which
  // only auto-tracks animations created synchronously while its mm.add()
  // callback is executing. Wrapping the onUpdate body via ctx.add() makes
  // every later invocation register its gsap.set/gsap.to calls onto this
  // context, so ctx.revert() in the returned cleanup actually clears the
  // inline styles they left — otherwise a resize across the 1024px
  // breakpoint (mm.add's own revert path) leaves stale absolute-position
  // styles baked in from the last onUpdate frame, corrupting the mobile
  // stacked layout underneath.
  const ctx = gsap.context(() => {}, section);

  let svcCur = -1;

  function svcStage(index: number): void {
    if (index === svcCur) return;
    svcCur = index;

    svcRows.forEach((row, j) => row.classList.toggle('on', j === index));
    svcImgs.forEach((img, j) =>
      gsap.to(img, {
        opacity: j === index ? 1 : 0,
        scale: j === index ? 1 : 1.06,
        duration: 0.6,
        ease: 'power2.out',
      })
    );

    if (index >= 0) gsap.to(heroImg, { opacity: 0, duration: 0.5 });
    else gsap.to(heroImg, { opacity: 1, duration: 0.4 });
  }

  const onUpdate = ctx.add('onUpdate', (st: ScrollTrigger) => {
    const p = st.progress;
    const t = gsap.utils.clamp(0, 1, p / 0.28);
    const e = gsap.parseEase('power2.inOut')(t);

    gsap.set(photo, {
      top: e * 8 + '%',
      bottom: e * 8 + '%',
      left: e * 52 + '%',
      right: e * 5 + '%',
      borderRadius: e * 6 + 'px',
      position: 'absolute',
    });
    gsap.set(veil, { opacity: 1 - e });
    gsap.set(heroCopy, { opacity: 1 - Math.min(1, t * 1.6), y: -40 * e, xPercent: e * 20 });
    gsap.set(servicesEl, { opacity: gsap.utils.clamp(0, 1, (t - 0.45) / 0.4), x: (1 - e) * -40 });

    if (t < 1) {
      svcStage(-1);
    } else {
      svcStage(Math.min(3, Math.floor((p - 0.3) / (0.7 / 4))));
    }
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
