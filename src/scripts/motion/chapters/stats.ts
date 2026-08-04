import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { PIN_READY_CLASS } from './shared';

export interface StatsCountTarget {
  value: number;
  decimals: number;
  suffix: string;
}

export function statsStageForProgress(progress: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.floor(progress * count));
}

/**
 * ตัวเลขที่นับขึ้นได้ต้องเป็น "ตัวเลขหนึ่งชุดแล้วจบ" เท่านั้น — `24/7` มีตัวเลข
 * สองชุดคั่นด้วย `/` ถ้านับจะเห็น `0/7` ระหว่างทางซึ่งอ่านเป็นข้อมูลผิด
 * กรณีแบบนั้นคืน null เพื่อให้ buildStatsChapter ใช้ mask เปิดแทนการนับ
 */
export function statsCountTarget(text: string): StatsCountTarget | null {
  const match = /^(\d+(?:\.\d+)?)(.*)$/.exec(text.trim());
  if (match === null) return null;

  const [, digits, rest] = match;
  if (/\d/.test(rest.replace(/\s*\/\s*\d+$/, '')) ) return null;
  if (/^\s*\/\s*\d+$/.test(rest) && !digits.includes('.')) return null;

  const decimals = digits.includes('.') ? digits.split('.')[1].length : 0;

  return { value: Number.parseFloat(digits), decimals, suffix: rest };
}

const STAT_SELECTOR = '.stat';

/**
 * T9 verification finding: `<b>` ของสถิติ "เที่ยวเดินทาง" ห่อ TripStat ที่เป็น
 * island `server:defer` — ก่อน island ถูกแทนที่ ข้างในมี `<script>` ของ Astro
 * นั่งอยู่ด้วย `b.textContent` จึงคืน source ของสคริปต์ต่อท้าย fallback `500+`
 * (วัดจริงได้ "async function replaceServerIsland(id, r) {…500+…") ซึ่ง
 * statsCountTarget อ่านไม่ออกเลยตกไปใช้ mask ตลอดกาล ตัวเลขจึงไม่มีวันวิ่ง
 * อ่านเฉพาะ text node ที่ไม่ได้อยู่ใต้ <script> จึงเป็นทางเดียวที่ได้ค่าจริง
 */
export function statDisplayText(el: Element): string {
  let text = '';
  el.childNodes.forEach((node) => {
    if (node.nodeType === 1) {
      if ((node as Element).tagName === 'SCRIPT') return;
      text += statDisplayText(node as Element);
      return;
    }
    if (node.nodeType === 3) text += node.textContent ?? '';
  });
  return text;
}

/**
 * บท stats — pin แล้วปล่อยสถิติเข้าทีละตัวตาม progress ตัวที่นับได้จะวิ่งเลข
 * ตัวที่นับไม่ได้ (เช่น 24/7) เปิดด้วย mask แทน เส้นทองใต้แถวยาวตาม progress ดิบ
 *
 * ค่าเป้าหมายอ่านจาก DOM ตอน ScrollTrigger ยิงครั้งแรก ไม่ใช่ตอนสร้าง timeline
 * เพราะ TripStat เป็น island server:defer — ตอนสร้าง timeline ตัวเลขในหน้ายัง
 * เป็น fallback `500+` อยู่ ถ้าอ่านตอนนั้นจะนับไปหาค่าที่ไม่ใช่ของจริงตลอดไป
 */
export function buildStatsChapter(section: HTMLElement, len: number): () => void {
  const stats = Array.from(section.querySelectorAll<HTMLElement>(STAT_SELECTOR));
  const line = section.querySelector<HTMLElement>('.stats-line');
  if (stats.length === 0) return () => {};

  const targets = new Map<HTMLElement, StatsCountTarget | null>();
  let resolved = false;
  let cur = -1;

  const ctx = gsap.context(() => {}, section);

  // island ที่ยังไม่ถูกแทนที่จะทิ้ง `<script data-island-id>` ไว้ในตัว <b>
  // ตราบใดที่ยังมีอยู่ ตัวเลขในหน้ายังเป็น fallback และ tween ที่เขียน
  // `b.textContent` จะล้าง <script> นั้นทิ้งจน island ไม่มีวันลงจอด — สถิตินั้น
  // จึงต้องเป็น null (เปิดด้วย mask) ไปก่อน แล้วค่อยอ่านใหม่รอบถัดไป
  const islandPendingIn = (b: HTMLElement): boolean =>
    b.querySelector('script[data-island-id]') !== null;

  const resolveTargets = ctx.add('resolveTargets', () => {
    if (resolved) return;
    let pending = false;
    stats.forEach((stat, index) => {
      // สถิติที่โชว์ไปแล้วมี tween เขียน textContent อยู่ อ่านซ้ำจะได้ค่ากลางทาง
      if (index <= cur) return;
      const b = stat.querySelector<HTMLElement>('b');
      if (b !== null && islandPendingIn(b)) {
        pending = true;
        targets.set(stat, null);
        return;
      }
      targets.set(stat, b ? statsCountTarget(statDisplayText(b)) : null);
    });
    if (!pending) resolved = true;
  }) as () => void;

  const showStat = ctx.add('showStat', (stat: HTMLElement) => {
    const b = stat.querySelector<HTMLElement>('b');
    const label = stat.querySelector<HTMLElement>('span');
    const target = targets.get(stat) ?? null;

    stat.classList.add('on');
    if (label) gsap.fromTo(label, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });

    if (!b) return;

    if (target === null) {
      gsap.fromTo(b, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'power3.out' });
      return;
    }

    const state = { value: 0 };
    gsap.to(state, {
      value: target.value,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => {
        b.textContent = state.value.toFixed(target.decimals) + target.suffix;
      },
    });
  }) as (stat: HTMLElement) => void;

  const onUpdate = ctx.add('onUpdate', (st: ScrollTrigger) => {
    resolveTargets();
    const stage = statsStageForProgress(st.progress, stats.length);
    if (stage > cur) {
      for (let i = cur + 1; i <= stage; i += 1) showStat(stats[i]);
      cur = stage;
    }
    if (line) gsap.set(line, { scaleX: st.progress });
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
