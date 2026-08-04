import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * residual fix (2026-08-04): Fleet.astro's `.rail button`s are visible and
 * focusable at >=1024px under `prefers-reduced-motion: reduce` (they carry
 * aria-pressed since the earlier accessibility fix), but nothing drove them
 * on that path — chapters/fleet.ts never attaches under reduced motion, and
 * this component's own no-GSAP fallback script only wired `.fleet-tabs`
 * (which is `display:none` above 1023px). The fix made the fallback adopt
 * `.rail button` too, same handler/bookkeeping as the tabs.
 *
 * This test exercises the REAL inline fallback script (not a reimplementation)
 * by extracting it straight out of Fleet.astro, stripping its TS type
 * annotations with esbuild (the same transform Astro's own compiler applies
 * to <script> blocks), and running it against a minimal DOM built to match
 * the component's real markup shape. There's no vitest/astro bridge in this
 * repo (vitest.config.ts only globs tests/**\/*.test.ts, no Astro plugin), so
 * extraction is the only way to cover this script without duplicating its
 * logic in a parallel hand-written copy that could drift from the source.
 * `ts.transpileModule` (pure JS, no native binding) strips the type
 * annotations — the same job esbuild's `loader: 'ts'` does, but esbuild's
 * native binary trips its own startup invariant check under jsdom's realm
 * ("new TextEncoder().encode('') instanceof Uint8Array" comes back false
 * there), so the pure-JS TS compiler is used instead.
 */
function loadFleetFallbackScript(): string {
  const source = readFileSync('src/components/sections/Fleet.astro', 'utf8');
  const match = source.match(/<script>\s*\n([\s\S]*?)\n<\/script>\s*$/);
  if (!match) throw new Error('Fleet.astro: ไม่พบ <script> ท้ายไฟล์ (fallback) ให้ extract');
  const raw = match[1];
  return ts.transpileModule(raw, { compilerOptions: { module: ts.ModuleKind.None } }).outputText;
}

function buildDom(): void {
  document.body.innerHTML = `
    <section id="fleet">
      <nav class="rail">
        <button type="button" class="on" aria-pressed="true"><span class="idx">01</span><span class="bar"><i></i></span><span class="lbl">ALPHARD</span></button>
        <button type="button" aria-pressed="false"><span class="idx">02</span><span class="bar"><i></i></span><span class="lbl">FORTUNER</span></button>
        <button type="button" aria-pressed="false"><span class="idx">03</span><span class="bar"><i></i></span><span class="lbl">XPANDER</span></button>
        <button type="button" aria-pressed="false"><span class="idx">04</span><span class="bar"><i></i></span><span class="lbl">ALTIS</span></button>
      </nav>
      <div class="fleet-stagewrap">
        <div class="ghost"><span>ALPHARD</span></div>
        <div class="car-layer"><img src="/images/car2.webp" alt="Toyota Alphard" /></div>
      </div>
      <div class="fleet-tabs">
        <button type="button" class="on" aria-pressed="true">1</button>
        <button type="button" aria-pressed="false">2</button>
        <button type="button" aria-pressed="false">3</button>
        <button type="button" aria-pressed="false">4</button>
      </div>
      <div class="fleet-meta" aria-live="polite">
        <div>
          <div class="name">Toyota Alphard</div>
          <div class="chips"><span class="chip">7 ที่นั่ง</span></div>
        </div>
        <div class="price">
          <b>฿1,000</b>
          <div><button type="button" class="pick" data-vtype="premium">เลือกคันนี้</button></div>
        </div>
      </div>
      <div id="fleet-chip-bank" hidden aria-hidden="true">
        <div data-car-index="0"><span class="chip">7 ที่นั่ง</span></div>
        <div data-car-index="1"><span class="chip">7 ที่นั่ง</span></div>
        <div data-car-index="2"><span class="chip">7 ที่นั่ง</span></div>
        <div data-car-index="3"><span class="chip">4 ที่นั่ง</span></div>
      </div>
      <div class="fleet-count">01 / 04</div>
      <script type="application/json" id="fleet-data">${JSON.stringify([
        { ghost: 'ALPHARD', name: 'Toyota Alphard', price: '฿1,000', img: '/images/car2.webp', alt: 'Toyota Alphard', vtype: 'premium' },
        { ghost: 'FORTUNER', name: 'Toyota Fortuner', price: '฿500', img: '/images/car3.webp', alt: 'Toyota Fortuner Legender', vtype: 'suv' },
        { ghost: 'XPANDER', name: 'Mitsubishi Xpander', price: '฿450', img: '/images/car1.webp', alt: 'Mitsubishi Xpander Cross', vtype: 'suv' },
        { ghost: 'ALTIS', name: 'Toyota Corolla Altis', price: '฿400', img: '/images/car4.webp', alt: 'Toyota Corolla Altis', vtype: 'sedan' },
      ])}</script>
    </section>
  `;
}

describe('Fleet.astro fallback script (no-GSAP path)', () => {
  let script: string;

  beforeEach(() => {
    script = loadFleetFallbackScript();
    buildDom();
  });

  it('.rail button ขับ stage swap ได้ — ก่อนหน้านี้กดแล้วไม่มีอะไรเกิดขึ้นเลยที่ >=1024px + reduced motion', () => {
    // eslint-disable-next-line no-eval
    eval(script);

    const railButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.rail button'));
    railButtons[2].click(); // XPANDER

    const ghostSpan = document.querySelector('.ghost span');
    const nameEl = document.querySelector('.fleet-meta .name');
    const priceEl = document.querySelector('.fleet-meta .price b');
    const carImg = document.querySelector<HTMLImageElement>('.car-layer img');

    expect(ghostSpan?.textContent).toBe('XPANDER');
    expect(nameEl?.textContent).toBe('Mitsubishi Xpander');
    expect(priceEl?.textContent).toBe('฿450');
    expect(carImg?.getAttribute('src')).toBe('/images/car1.webp');
  });

  it('.rail button ที่ถูกเลือกได้ .on + aria-pressed=true และปุ่มอื่นในกลุ่มเดียวกันถูกล้าง', () => {
    // eslint-disable-next-line no-eval
    eval(script);

    const railButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.rail button'));
    railButtons[3].click(); // ALTIS

    railButtons.forEach((btn, i) => {
      expect(btn.classList.contains('on')).toBe(i === 3);
      expect(btn.getAttribute('aria-pressed')).toBe(i === 3 ? 'true' : 'false');
    });
  });

  it('.rail button ขับ .fleet-tabs ให้ตามไปด้วย (สอง control group ผูก stage เดียวกัน)', () => {
    // eslint-disable-next-line no-eval
    eval(script);

    const railButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.rail button'));
    const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.fleet-tabs button'));

    railButtons[1].click(); // FORTUNER

    tabButtons.forEach((btn, i) => {
      expect(btn.classList.contains('on')).toBe(i === 1);
      expect(btn.getAttribute('aria-pressed')).toBe(i === 1 ? 'true' : 'false');
    });
  });

  it('เมื่อ section มี .pin-ready (buildFleetChapter เข้าคุมแล้ว) fallback ต้องไม่ทำอะไร — กัน double-update', () => {
    document.getElementById('fleet')!.classList.add('pin-ready');
    // eslint-disable-next-line no-eval
    eval(script);

    const railButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.rail button'));
    railButtons[2].click();

    const ghostSpan = document.querySelector('.ghost span');
    expect(ghostSpan?.textContent).toBe('ALPHARD'); // ไม่เปลี่ยนจากค่าตั้งต้น
  });

  it('.fleet-tabs button ยังขับ stage swap ได้เหมือนเดิม (ไม่ regress พฤติกรรมเดิม)', () => {
    // eslint-disable-next-line no-eval
    eval(script);

    const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.fleet-tabs button'));
    tabButtons[1].click(); // FORTUNER

    const nameEl = document.querySelector('.fleet-meta .name');
    expect(nameEl?.textContent).toBe('Toyota Fortuner');
  });
});
