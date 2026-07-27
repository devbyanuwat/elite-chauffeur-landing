import { pickTier } from './tiers';

/**
 * .reveal คือระบบเดิมที่ยังใช้อยู่ใน 14 ไฟล์ (นับด้วย
 * `grep -rl 'class="[^"]*\breveal\b' src` — ดู Fix 3 ของ final review)
 *
 * แยกไฟล์นี้ออกจาก motion/index.ts (final-review Fix 1) เพราะ index.ts import
 * gsap + ScrollTrigger แบบ static ทำให้ observer ตัวนี้ต้องรอโหลด GSAP
 * (~46.5 KB gzip) ก่อนถึงจะรัน ทั้งที่ element ที่มันปลดล็อก — hero-copy กับ
 * booking ใน Hero.astro — เป็น LCP candidate ของหน้า ไฟล์นี้ต้องไม่ import gsap
 * เพื่อให้ chunk ที่ Base.astro โหลดยังคงเล็กเหมือนตอนเป็น inline script เดิม
 */
export function applyLegacyReveal(root: ParentNode): void {
  const nodes = root.querySelectorAll<HTMLElement>('.reveal');
  if (nodes.length === 0) return;

  const tier = pickTier({
    viewportWidth: window.innerWidth,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });

  // เงื่อนไขเดิมจาก Base.astro:180-199 — reduced motion หรือไม่มี observer
  // แปลว่าแสดงทุกอย่างทันที ไม่ใช่รอให้เลื่อนถึง
  if (tier === 'static' || !('IntersectionObserver' in window)) {
    nodes.forEach((el) => el.classList.add('in'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  nodes.forEach((el) => observer.observe(el));
}
