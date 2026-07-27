import { describe, expect, it } from 'vitest';
import { FULL_TIER_MIN_WIDTH, pickTier } from '../../src/scripts/motion/tiers';

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
