/**
 * อ่านสัญญา data-* ที่ component ใช้สั่งงาน motion
 * ไฟล์นี้ห้ามรู้จัก GSAP เพื่อให้เทสต์ได้ด้วย jsdom ล้วน ๆ
 */

export type RevealMode = 'up' | 'mask';

export interface RevealSpec {
  mode: RevealMode;
  delayMs: number;
}

export interface CountSpec {
  target: number;
  decimals: number;
  suffix: string;
}

export interface DepthFieldSpec {
  colorUrl: string;
  depthUrl: string;
  strength: number;
}

const MIN_DEPTH = 0.02;
const MAX_DEPTH = 0.4;

/**
 * เพดานของ uStrength ที่ hero-depth.ts ยอมรับ — วัดจริงกับภาพหัวหน้า
 * (public/images/hero-bg.travelv1-baseline.webp): 0.03 คือค่าที่ใช้งานจริง,
 * 0.09 ปีกหมวก/แนวผมเป็นเงาซ้อนแล้ว, 0.16 ขอบฉีก (ดู
 * docs/superpowers/plans/2026-07-27-landing-redesign-STATE.md ข้อ 8) กันไว้
 * ไม่ให้ data-depth-strength ที่พิมพ์ผิดในอนาคตทะลุเข้าโซนพัง
 */
const MIN_DEPTH_STRENGTH = 0;
const MAX_DEPTH_STRENGTH = 0.05;
const DEFAULT_DEPTH_STRENGTH = 0.03;

export function parseParallaxDepth(el: Element): number | null {
  const raw = el.getAttribute('data-parallax');
  if (raw === null) return null;

  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return null;

  return Math.min(Math.max(value, MIN_DEPTH), MAX_DEPTH);
}

export function parseReveal(el: Element): RevealSpec | null {
  const raw = el.getAttribute('data-reveal');
  if (raw === null) return null;

  const delay = Number.parseInt(el.getAttribute('data-reveal-stagger') ?? '', 10);

  return {
    mode: raw === 'mask' ? 'mask' : 'up',
    delayMs: Number.isFinite(delay) && delay > 0 ? delay : 0,
  };
}

export function parseCount(el: Element): CountSpec | null {
  const raw = el.getAttribute('data-count');
  if (raw === null) return null;

  const target = Number.parseFloat(raw);
  if (!Number.isFinite(target)) return null;

  const decimals = Number.parseInt(el.getAttribute('data-decimals') ?? '', 10);

  return {
    target,
    decimals: Number.isFinite(decimals) && decimals > 0 ? decimals : 0,
    suffix: el.getAttribute('data-suffix') ?? '',
  };
}

/**
 * อ่านสัญญาของ WebGL depth field หนึ่งจุด (data-depth-field บน .hero-bg)
 * คืน null ถ้าไม่มีทั้ง url สี/ความลึก — hero-depth.ts ใช้ผลนี้ตัดสินใจว่าจะ
 * mount canvas หรือปล่อยรูป <img> เดิมไว้เป็นภาพหลัก
 */
export function parseDepthField(el: Element): DepthFieldSpec | null {
  const colorUrl = el.getAttribute('data-depth-color');
  const depthUrl = el.getAttribute('data-depth-map');
  if (!colorUrl || !depthUrl) return null;

  const rawStrength = Number.parseFloat(el.getAttribute('data-depth-strength') ?? '');
  const strength = Number.isFinite(rawStrength)
    ? Math.min(Math.max(rawStrength, MIN_DEPTH_STRENGTH), MAX_DEPTH_STRENGTH)
    : DEFAULT_DEPTH_STRENGTH;

  return { colorUrl, depthUrl, strength };
}

/**
 * ห่อแต่ละบรรทัด (คั่นด้วย <br>) ด้วย .split-line > .split-inner
 *
 * ย้าย node เดิมเข้าไปในตัวห่อ ไม่ได้ serialize innerHTML ใหม่ จึงไม่ทำลาย
 * element ที่มี data-i18n ซึ่ง src/lib/i18n.ts จะเขียนทับ innerHTML ของมัน
 * ตอนสลับภาษา ตัวห่ออยู่ชั้นนอกของ element เหล่านั้นเสมอ
 */
export function splitLines(el: Element): HTMLElement[] {
  const doc = el.ownerDocument;
  const groups: Node[][] = [[]];

  Array.from(el.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'BR') {
      groups.push([]);
      return;
    }
    groups[groups.length - 1].push(node);
  });

  const fragment = doc.createDocumentFragment();
  const inners: HTMLElement[] = [];

  groups.forEach((nodes) => {
    // Skip truly empty groups (from consecutive br or trailing br)
    if (nodes.length === 0) return;

    const hasText = nodes.some((node) => (node.textContent ?? '').trim() !== '');

    const line = doc.createElement('span');
    line.className = 'split-line';

    const inner = doc.createElement('span');
    inner.className = 'split-inner';
    nodes.forEach((node) => inner.appendChild(node));

    line.appendChild(inner);
    fragment.appendChild(line);

    // Only add to inners if it has text (GSAP will animate these)
    if (hasText) {
      inners.push(inner);
    }
  });

  el.textContent = '';
  el.appendChild(fragment);

  return inners;
}
