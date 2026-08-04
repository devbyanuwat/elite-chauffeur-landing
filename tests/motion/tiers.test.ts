import { describe, expect, it } from 'vitest';
import { canRunHeroDepth, FULL_TIER_MIN_WIDTH, pickTier, chapterLenFor } from '../../src/scripts/motion/tiers';

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

describe('chapterLenFor', () => {
  it('เดสก์ท็อปใช้ความยาวตามที่ markup บอก', () => {
    expect(chapterLenFor('full', 300)).toBe(300);
  });

  it('มือถือย่อเหลือ 55% เพราะระยะปัดนิ้วสั้นกว่าล้อเมาส์', () => {
    expect(chapterLenFor('lite', 300)).toBe(165);
    expect(chapterLenFor('lite', 380)).toBe(209);
  });

  it('static ไม่มี pin จึงไม่มีความยาว', () => {
    expect(chapterLenFor('static', 300)).toBe(0);
  });

  it('ไม่ต่ำกว่าหนึ่งจอเมื่อยังมี pin อยู่', () => {
    expect(chapterLenFor('lite', 120)).toBe(100);
  });
});
