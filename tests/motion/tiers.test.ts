import { describe, expect, it } from 'vitest';
import { canRunHeroDepth, FULL_TIER_MIN_WIDTH, pickTier } from '../../src/scripts/motion/tiers';

describe('pickTier', () => {
  it('reduced motion ชนะทุกอย่าง', () => {
    expect(pickTier({ viewportWidth: 1920, prefersReducedMotion: true })).toBe('static');
    expect(pickTier({ viewportWidth: 390, prefersReducedMotion: true })).toBe('static');
  });

  it('desktop ได้ full', () => {
    expect(pickTier({ viewportWidth: FULL_TIER_MIN_WIDTH, prefersReducedMotion: false })).toBe('full');
  });

  it('แคบกว่า 1024 ได้ lite เพราะ parallax หลายชั้นบนมือถือทำให้กระตุก', () => {
    expect(pickTier({ viewportWidth: FULL_TIER_MIN_WIDTH - 1, prefersReducedMotion: false })).toBe('lite');
    expect(pickTier({ viewportWidth: 390, prefersReducedMotion: false })).toBe('lite');
  });
});

describe('canRunHeroDepth', () => {
  it('ผ่านเฉพาะเมื่อเป็น full tier และมี WebGL2 พร้อมกัน', () => {
    expect(canRunHeroDepth('full', true)).toBe(true);
  });

  it('ไม่ผ่านถ้าไม่มี WebGL2 แม้เป็น full tier', () => {
    expect(canRunHeroDepth('full', false)).toBe(false);
  });

  it('ไม่ผ่านถ้า tier ไม่ใช่ full แม้มี WebGL2 (lite ตัด parallax ทิ้งอยู่แล้ว)', () => {
    expect(canRunHeroDepth('lite', true)).toBe(false);
    expect(canRunHeroDepth('static', true)).toBe(false);
  });
});
