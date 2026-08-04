export type MotionTier = 'full' | 'lite' | 'static';

export interface TierInput {
  viewportWidth: number;
  prefersReducedMotion: boolean;
}

/** ต่ำกว่านี้ตัด parallax ทิ้ง เหลือ fade กับ mask */
export const FULL_TIER_MIN_WIDTH = 1024;

export function pickTier(input: TierInput): MotionTier {
  if (input.prefersReducedMotion) return 'static';
  return input.viewportWidth >= FULL_TIER_MIN_WIDTH ? 'full' : 'lite';
}

/**
 * เกตสามชั้นก่อนโหลด three.js (spec 2026-07-27-landing-layered-parallax-design.md #4):
 * กว้าง ≥ 1024px และ prefers-reduced-motion: no-preference และมี WebGL2
 * สองเงื่อนไขแรกคือนิยามของ 'full' tier อยู่แล้ว จึงไม่คำนวณซ้ำ เหลือแค่เช็ค WebGL2 เพิ่ม
 * ไม่ผ่านข้อใดข้อหนึ่ง = ไม่ import('three') แม้ไบต์เดียว, CSS fallback (รูปจริงแบบ object-position) แสดงแทน
 */
export function canRunHeroDepth(tier: MotionTier, hasWebgl2: boolean): boolean {
  return tier === 'full' && hasWebgl2;
}

/** สัดส่วนที่ย่อความยาวบทลงบนมือถือ — ระยะปัดนิ้วต่อครั้งสั้นกว่าล้อเมาส์มาก */
const LITE_LEN_SHARE = 0.55;
/** ต่ำกว่าหนึ่งจอ การค้างจอจะสั้นจนอ่านไม่ทัน */
const MIN_CHAPTER_LEN = 100;

export function chapterLenFor(tier: MotionTier, baseLen: number): number {
  if (tier === 'static') return 0;
  if (tier === 'full') return baseLen;
  return Math.max(MIN_CHAPTER_LEN, Math.round(baseLen * LITE_LEN_SHARE));
}
