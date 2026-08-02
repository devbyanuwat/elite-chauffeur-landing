import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * ระบบ "chapter" ใหม่สำหรับ Editions-style scroll story — แยกจาก pin.ts
 * (data-pin / data-stage) เพราะแต่ละ chapter มีเรื่องเล่าที่ต่างกันเกินกว่าจะ
 * ใช้ template fade-ระหว่าง-stage เดียวกันได้ (chapter 0 คือภาพเต็มจอบีบเข้า
 * กรอบ ไม่ใช่การสลับ stage ธรรมดา) ไฟล์นี้ห้ามรู้จัก GSAP ในส่วน parse/clamp
 * เพื่อให้เทสต์ collectChapters ได้ด้วย jsdom ล้วน ๆ เหมือน parsePin
 */
export interface Chapter {
  name: string;
  /** ความยาว scroll ที่ใช้เล่าเรื่อง คิดเป็น % ของความสูง viewport */
  len: number;
  el: Element;
}

/**
 * เพดานความยาว chapter — เหมือน parsePin (contract.ts) แต่เพดานกว้างกว่า
 * เล็กน้อยเพราะ chapter 0 ต้องเล่าสองเฟส (บีบภาพ + ไล่ 4 บริการ) ในรอบเดียว
 * ต่ำกว่า 100 (หนึ่งจอ) การค้างจอไม่ทันให้อ่าน เกิน 600 (หกจอ) คนที่ scroll
 * เร็วจะรู้สึกว่าติดกับดัก
 */
const MIN_CHAPTER_LEN = 100;
const MAX_CHAPTER_LEN = 600;
const DEFAULT_CHAPTER_LEN = 300;

export function collectChapters(root: ParentNode): Chapter[] {
  const chapters: Chapter[] = [];

  root.querySelectorAll<HTMLElement>('[data-chapter]').forEach((el) => {
    const name = (el.getAttribute('data-chapter') ?? '').trim();
    if (name === '') return;

    const rawLen = Number.parseInt(el.getAttribute('data-chapter-len') ?? '', 10);
    const len = Number.isFinite(rawLen)
      ? Math.min(Math.max(rawLen, MIN_CHAPTER_LEN), MAX_CHAPTER_LEN)
      : DEFAULT_CHAPTER_LEN;

    chapters.push({ name, len, el });
  });

  return chapters;
}

const PIN_READY_CLASS = 'pin-ready';

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
    },
  });

  section.classList.add(PIN_READY_CLASS);

  return () => {
    trigger.kill();
    section.classList.remove(PIN_READY_CLASS);
  };
}

interface FleetCar {
  ghost: string;
  name: string;
  price: string;
  chips: string[];
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
  const railButtons = Array.from(section.querySelectorAll<HTMLElement>('.rail button'));

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

  let cur = 0;

  function renderStage(i: number, dir: 1 | -1, animate: boolean): void {
    const car = cars[i];

    railButtons.forEach((b, j) => b.classList.toggle('on', j === i));
    if (countEl) countEl.textContent = `0${i + 1} / 0${cars.length}`;

    function applyContent(): void {
      ghostSpan.textContent = car.ghost;
      carImg.src = car.img;
      carImg.alt = car.alt;
      nameEl.textContent = car.name;
      priceEl.textContent = car.price;
      chipsEl.innerHTML = car.chips.map((chip) => `<span class="chip">${chip}</span>`).join('');
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
  }

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

  railButtons.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const y = sectionTop + ((i + 0.5) / FLEET_STAGE_COUNT) * (len / 100) * window.innerHeight;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  section.classList.add(PIN_READY_CLASS);

  return () => {
    trigger.kill();
    section.classList.remove(PIN_READY_CLASS);
  };
}

export function applyEditionsPins(root: ParentNode): () => void {
  const cleanups: Array<() => void> = [];

  collectChapters(root).forEach((chapter) => {
    if (chapter.name === 'intro') {
      cleanups.push(buildIntroChapter(chapter.el as HTMLElement, chapter.len));
    } else if (chapter.name === 'fleet') {
      cleanups.push(buildFleetChapter(chapter.el as HTMLElement, chapter.len));
    }
  });

  return () => cleanups.forEach((cleanup) => cleanup());
}
