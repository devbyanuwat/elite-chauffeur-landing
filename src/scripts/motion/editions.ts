/**
 * ระบบ "chapter" ใหม่สำหรับ Editions-style scroll story — แยกจาก pin.ts
 * (data-pin / data-stage) เพราะแต่ละ chapter มีเรื่องเล่าที่ต่างกันเกินกว่าจะ
 * ใช้ template fade-ระหว่าง-stage เดียวกันได้ (chapter 0 คือภาพเต็มจอบีบเข้า
 * กรอบ ไม่ใช่การสลับ stage ธรรมดา) ไฟล์นี้ห้ามรู้จัก GSAP ในส่วน parse/clamp
 * เพื่อให้เทสต์ collectChapters ได้ด้วย jsdom ล้วน ๆ เหมือน parsePin
 */

import { buildFleetChapter } from './chapters/fleet';
import { buildHowChapter } from './chapters/how';
import { buildIntroChapter } from './chapters/intro';
import { buildRoutesChapter } from './chapters/routes';
import { buildStatsChapter } from './chapters/stats';
import { buildWhyChapter } from './chapters/why';
import { chapterLenFor, type MotionTier } from './tiers';

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

const BUILDERS: Record<string, (section: HTMLElement, len: number) => () => void> = {
  intro: buildIntroChapter,
  fleet: buildFleetChapter,
  how: buildHowChapter,
  routes: buildRoutesChapter,
  stats: buildStatsChapter,
  why: buildWhyChapter,
};

export function applyEditionsPins(root: ParentNode, tier: MotionTier): () => void {
  const cleanups = collectChapters(root)
    .map((chapter) => BUILDERS[chapter.name]?.(chapter.el as HTMLElement, chapterLenFor(tier, chapter.len)))
    .filter((cleanup): cleanup is () => void => typeof cleanup === 'function');

  return () => cleanups.forEach((cleanup) => cleanup());
}
