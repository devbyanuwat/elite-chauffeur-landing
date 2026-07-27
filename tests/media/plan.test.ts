import { describe, expect, it } from 'vitest';
import { planJobs, type Scene } from '../../scripts/media/plan';

const scene = (id: string, needsDepth = true): Scene => ({
  id, dir: `parallax/${id}`, width: 2560, height: 1097,
  prompt: 'x', needsDepth,
});

describe('planJobs', () => {
  it('ไม่มีไฟล์เลย = ต้อง generate ทั้ง color และ depth', () => {
    const { jobs } = planJobs([scene('hero')], new Set(), false);
    expect(jobs.map((j) => j.kind)).toEqual(['color', 'depth']);
  });

  it('ข้าม scene ที่มีไฟล์ครบแล้ว', () => {
    const existing = new Set(['parallax/hero/color.webp', 'parallax/hero/depth.webp']);
    expect(planJobs([scene('hero')], existing, false).jobs).toHaveLength(0);
  });

  it('generate เฉพาะส่วนที่ขาด', () => {
    const existing = new Set(['parallax/hero/color.webp']);
    const { jobs } = planJobs([scene('hero')], existing, false);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].kind).toBe('depth');
  });

  it('force ทำใหม่ทั้งหมดแม้ไฟล์ครบ', () => {
    const existing = new Set(['parallax/hero/color.webp', 'parallax/hero/depth.webp']);
    expect(planJobs([scene('hero')], existing, true).jobs).toHaveLength(2);
  });

  it('scene ที่ไม่ต้องใช้ depth ได้แค่ color', () => {
    const { jobs } = planJobs([scene('trust', false)], new Set(), false);
    expect(jobs.map((j) => j.kind)).toEqual(['color']);
  });

  it('คิดเงินตามชนิดงาน color 0.03 depth 0.01', () => {
    const { estimatedUsd } = planJobs([scene('hero'), scene('trust', false)], new Set(), false);
    expect(estimatedUsd).toBeCloseTo(0.07, 5);
  });
});
