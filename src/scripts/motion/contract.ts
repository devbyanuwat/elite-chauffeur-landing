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

const MIN_DEPTH = 0.02;
const MAX_DEPTH = 0.4;

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
    const hasText = nodes.some((node) => (node.textContent ?? '').trim() !== '');
    if (!hasText) return;

    const line = doc.createElement('span');
    line.className = 'split-line';

    const inner = doc.createElement('span');
    inner.className = 'split-inner';
    nodes.forEach((node) => inner.appendChild(node));

    line.appendChild(inner);
    fragment.appendChild(line);
    inners.push(inner);
  });

  el.textContent = '';
  el.appendChild(fragment);

  return inners;
}
