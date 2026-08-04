import { describe, expect, it } from 'vitest';

import { statDisplayText, statsCountTarget, statsStageForProgress } from '../../../src/scripts/motion/chapters/stats';

describe('statsStageForProgress', () => {
  it('แบ่ง progress เป็นช่วงเท่า ๆ กันตามจำนวนสถิติ', () => {
    expect(statsStageForProgress(0, 4)).toBe(0);
    expect(statsStageForProgress(0.3, 4)).toBe(1);
    expect(statsStageForProgress(0.6, 4)).toBe(2);
    expect(statsStageForProgress(0.99, 4)).toBe(3);
  });

  it('progress เต็ม 1 ไม่ล้นออกนอกช่วง', () => {
    expect(statsStageForProgress(1, 4)).toBe(3);
  });
});

describe('statsCountTarget', () => {
  it('อ่านตัวเลขจำนวนเต็มพร้อมท้าย', () => {
    expect(statsCountTarget('500+')).toEqual({ value: 500, decimals: 0, suffix: '+' });
  });

  it('อ่านทศนิยมพร้อมส่วนท้ายที่มีช่องว่าง', () => {
    expect(statsCountTarget('4.9 / 5')).toEqual({ value: 4.9, decimals: 1, suffix: ' / 5' });
  });

  it('ข้อความที่นับไม่ได้คืน null เพื่อให้ใช้ mask แทน', () => {
    expect(statsCountTarget('24/7')).toBeNull();
  });

  it('เปอร์เซ็นต์นับได้', () => {
    expect(statsCountTarget('100%')).toEqual({ value: 100, decimals: 0, suffix: '%' });
  });
});

describe('statDisplayText', () => {
  // T9 verification: TripStat เป็น island server:defer — ก่อนถูกแทนที่ <b> มี
  // ทั้ง fallback และ <script> ของ Astro อยู่ด้วยกัน textContent ดิบจึงพ่วง
  // source ของสคริปต์มาทำให้ statsCountTarget อ่านไม่ออกและตัวเลขไม่เคยวิ่ง
  it('ไม่นับข้อความใน <script> ที่ island ยังไม่ได้ถูกแทนที่ทิ้งไว้', () => {
    const b = document.createElement('b');
    b.innerHTML = '<script data-island-id="x">async function replaceServerIsland() {}<\/script>500+';

    expect(b.textContent).toContain('replaceServerIsland');
    expect(statDisplayText(b).trim()).toBe('500+');
  });

  it('อ่านค่าจริงหลัง island สลับเข้ามาแล้ว', () => {
    const b = document.createElement('b');
    b.textContent = '1,284';

    expect(statDisplayText(b)).toBe('1,284');
  });
});
