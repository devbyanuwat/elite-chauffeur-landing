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
