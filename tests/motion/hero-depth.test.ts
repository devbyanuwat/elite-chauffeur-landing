import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initHeroDepth } from '../../src/scripts/motion/hero-depth';

/**
 * three.js เองไม่ทดสอบที่นี่ (ต้องมี WebGL2 จริง ตรวจด้วย Playwright ต่างหาก — ดู
 * S3 hero-slice report) เทสต์ชุดนี้ครอบคลุมแค่ "เกตปิดแล้วต้องไม่ import('three')
 * และไม่แตะ DOM เลย" ซึ่งพิสูจน์ได้จริงด้วย jsdom ล้วน ๆ: jsdom ไม่มี WebGL2
 * (canvas.getContext('webgl2') คืนค่า falsy เสมอ — ดู HTMLCanvasElement ของ jsdom)
 * เกตจึงปิดเองโดยธรรมชาติในสภาพแวดล้อมนี้ ไม่ต้อง mock อะไรเพิ่ม
 */
describe('initHeroDepth', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  it('ไม่ทำอะไรเลยเมื่อไม่มี [data-depth-field] ในหน้า', async () => {
    await expect(initHeroDepth(document)).resolves.toBeUndefined();
  });

  it('ไม่ผนวก canvas เข้าไปเมื่อเกต WebGL2 ไม่ผ่าน (jsdom ไม่มี WebGL2 จริง) — <img> เดิมยังเป็นภาพหลัก', async () => {
    document.body.innerHTML = `
      <div class="hero-bg" data-depth-field data-depth-color="/images/hero-bg.travelv1-baseline.webp"
           data-depth-map="/images/parallax/hero-travelv1/depth.webp" data-depth-strength="0.03">
        <img class="hero-bg-photo" src="/images/hero-bg.travelv1-baseline.webp" alt="">
      </div>
    `;

    await initHeroDepth(document);

    expect(document.querySelector('.hero-bg canvas')).toBeNull();
    expect(document.querySelector('.hero-bg-photo')).not.toBeNull();
  });

  it('ไม่ผ่านเกตแม้ความกว้างจอ >= 1024 ถ้า prefers-reduced-motion เป็น reduce', async () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    vi.stubGlobal('innerWidth', 1920);
    document.body.innerHTML = '<div class="hero-bg" data-depth-field data-depth-color="/c.webp" data-depth-map="/d.webp"></div>';

    await initHeroDepth(document);

    expect(document.querySelector('.hero-bg canvas')).toBeNull();
  });
});
