import { describe, expect, it } from 'vitest';

import { whyStageForProgress } from '../../../src/scripts/motion/chapters/why';

describe('whyStageForProgress', () => {
  it('ต้นบทเห็นเฉพาะหัวเรื่อง', () => {
    expect(whyStageForProgress(0, 3)).toBe(0);
    expect(whyStageForProgress(0.2, 3)).toBe(0);
  });

  it('การ์ดเข้าทีละใบตามลำดับ', () => {
    expect(whyStageForProgress(0.3, 3)).toBe(1);
    expect(whyStageForProgress(0.55, 3)).toBe(2);
    expect(whyStageForProgress(0.8, 3)).toBe(3);
  });

  it('ท้ายบทค้างที่ใบสุดท้าย ไม่ล้น', () => {
    expect(whyStageForProgress(1, 3)).toBe(3);
  });
});
