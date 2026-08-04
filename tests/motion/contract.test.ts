import { describe, expect, it } from 'vitest';
import { collectStages, parseCount, parseDepthField, parseParallaxDepth, parsePin, parseReveal, parseRevealGroup, splitLines } from '../../src/scripts/motion/contract';

function el(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
}

describe('parseParallaxDepth', () => {
  it('คืน null เมื่อไม่มี attribute', () => {
    expect(parseParallaxDepth(el('<div></div>'))).toBeNull();
  });

  it('อ่านค่าทศนิยมได้', () => {
    expect(parseParallaxDepth(el('<div data-parallax="0.12"></div>'))).toBe(0.12);
  });

  it('บีบค่าที่แรงเกินให้อยู่ในกรอบ 0.02 ถึง 0.4', () => {
    expect(parseParallaxDepth(el('<div data-parallax="9"></div>'))).toBe(0.4);
    expect(parseParallaxDepth(el('<div data-parallax="0"></div>'))).toBe(0.02);
  });

  it('คืน null เมื่อค่าไม่ใช่ตัวเลข', () => {
    expect(parseParallaxDepth(el('<div data-parallax="เร็ว"></div>'))).toBeNull();
  });
});

describe('parseReveal', () => {
  it('ค่าเริ่มต้นเป็น up และไม่มีหน่วง', () => {
    expect(parseReveal(el('<p data-reveal="up"></p>'))).toEqual({ mode: 'up', delayMs: 0 });
  });

  it('อ่านโหมด mask และ stagger', () => {
    expect(parseReveal(el('<p data-reveal="mask" data-reveal-stagger="90"></p>')))
      .toEqual({ mode: 'mask', delayMs: 90 });
  });

  it('ค่าโหมดที่ไม่รู้จักตกมาเป็น up', () => {
    expect(parseReveal(el('<p data-reveal="ระเบิด"></p>'))).toEqual({ mode: 'up', delayMs: 0 });
  });

  it('คืน null เมื่อไม่มี attribute', () => {
    expect(parseReveal(el('<p></p>'))).toBeNull();
  });
});

describe('parseCount', () => {
  it('อ่านเป้าหมาย ทศนิยม และ suffix', () => {
    expect(parseCount(el('<b data-count="4.9" data-decimals="1"></b>')))
      .toEqual({ target: 4.9, decimals: 1, suffix: '' });
    expect(parseCount(el('<b data-count="500" data-suffix="+"></b>')))
      .toEqual({ target: 500, decimals: 0, suffix: '+' });
  });

  it('คืน null เมื่อไม่มี data-count', () => {
    expect(parseCount(el('<b></b>'))).toBeNull();
  });
});

describe('parseDepthField', () => {
  it('คืน null เมื่อไม่มี data-depth-color หรือ data-depth-map', () => {
    expect(parseDepthField(el('<div></div>'))).toBeNull();
    expect(parseDepthField(el('<div data-depth-color="/a.webp"></div>'))).toBeNull();
    expect(parseDepthField(el('<div data-depth-map="/a.webp"></div>'))).toBeNull();
  });

  it('อ่าน url สีและความลึกเมื่อมีครบ', () => {
    expect(
      parseDepthField(
        el('<div data-depth-color="/color.webp" data-depth-map="/depth.webp" data-depth-strength="0.03"></div>')
      )
    ).toEqual({ colorUrl: '/color.webp', depthUrl: '/depth.webp', strength: 0.03 });
  });

  it('ค่าเริ่มต้น strength เป็น 0.03 เมื่อไม่ระบุหรือระบุไม่ใช่ตัวเลข', () => {
    expect(parseDepthField(el('<div data-depth-color="/c.webp" data-depth-map="/d.webp"></div>'))?.strength).toBe(
      0.03
    );
    expect(
      parseDepthField(el('<div data-depth-color="/c.webp" data-depth-map="/d.webp" data-depth-strength="แรง"></div>'))
        ?.strength
    ).toBe(0.03);
  });

  it('บีบ strength ที่แรงเกินให้ไม่เกิน 0.05 — 0.09 ทำให้ปีกหมวกเป็นเงาซ้อนแล้ว', () => {
    expect(
      parseDepthField(el('<div data-depth-color="/c.webp" data-depth-map="/d.webp" data-depth-strength="0.16"></div>'))
        ?.strength
    ).toBe(0.05);
    expect(
      parseDepthField(el('<div data-depth-color="/c.webp" data-depth-map="/d.webp" data-depth-strength="-1"></div>'))
        ?.strength
    ).toBe(0);
  });
});

describe('splitLines', () => {
  it('ห่อแต่ละบรรทัดที่คั่นด้วย br', () => {
    const h1 = el('<h1 data-split>บรรทัดหนึ่ง<br>บรรทัดสอง</h1>');
    const inners = splitLines(h1);

    expect(inners).toHaveLength(2);
    expect(h1.querySelectorAll('.split-line')).toHaveLength(2);
    expect(inners[0].textContent).toBe('บรรทัดหนึ่ง');
    expect(inners[1].textContent).toBe('บรรทัดสอง');
  });

  it('ข้อความทั้งหมดยังอยู่ครบหลังห่อ', () => {
    const h1 = el('<h1 data-split>เดินทางสบาย ๆ<br>กับคนขับ มืออาชีพ</h1>');
    splitLines(h1);
    expect(h1.textContent).toBe('เดินทางสบาย ๆกับคนขับ มืออาชีพ');
  });

  it('ย้าย element ที่มี data-i18n เข้าไปทั้งก้อน ไม่แตะข้างใน', () => {
    const h1 = el('<h1 data-split><span data-i18n="hero.t1">เดินทาง</span><br><span data-i18n="hero.t2">มืออาชีพ</span></h1>');
    splitLines(h1);

    const tagged = h1.querySelectorAll('[data-i18n]');
    expect(tagged).toHaveLength(2);
    expect(tagged[0].innerHTML).toBe('เดินทาง');
    expect(tagged[0].closest('.split-line')).not.toBeNull();
  });

  it('ไม่สร้างบรรทัดว่างจาก br ที่ติดกัน', () => {
    const h1 = el('<h1 data-split>หนึ่ง<br><br>สอง</h1>');
    expect(splitLines(h1)).toHaveLength(2);
  });

  it('ห่อ element ที่ไม่มีข้อความ (เช่น svg) เพื่อไม่ให้หายไป', () => {
    const h1 = el('<h1 data-split><svg class="icon"></svg><br>ข้อความ</h1>');
    const inners = splitLines(h1);

    // Only the text line is returned for GSAP animation
    expect(inners).toHaveLength(1);
    expect(inners[0].textContent).toBe('ข้อความ');

    // But the SVG should still exist in the DOM inside h1
    expect(h1.querySelector('svg.icon')).not.toBeNull();
    expect(h1.querySelector('svg.icon')?.closest('.split-line')).not.toBeNull();
  });
});

describe('parsePin', () => {
  it('คืน null เมื่อไม่มี attribute', () => {
    expect(parsePin(el('<section></section>'))).toBeNull();
  });

  it('คืน null เมื่อชื่อเป็นค่าว่าง', () => {
    expect(parsePin(el('<section data-pin="   "></section>'))).toBeNull();
  });

  it('ใช้ความยาวเริ่มต้น 200 เมื่อไม่ได้ระบุ', () => {
    expect(parsePin(el('<section data-pin="fleet"></section>'))).toEqual({
      name: 'fleet',
      lengthVh: 200,
    });
  });

  it('บีบความยาวให้อยู่ในกรอบ 100 ถึง 400', () => {
    expect(parsePin(el('<section data-pin="a" data-pin-length="9999"></section>'))!.lengthVh).toBe(400);
    expect(parsePin(el('<section data-pin="a" data-pin-length="10"></section>'))!.lengthVh).toBe(100);
  });

  it('ใช้ค่าเริ่มต้นเมื่อความยาวไม่ใช่ตัวเลข', () => {
    expect(parsePin(el('<section data-pin="a" data-pin-length="ยาว"></section>'))!.lengthVh).toBe(200);
  });
});

describe('collectStages', () => {
  it('คืน array ว่างเมื่อไม่มี stage', () => {
    expect(collectStages(el('<section data-pin="a"></section>'))).toEqual([]);
  });

  it('เรียงตามลำดับตัวเลข ไม่ใช่ลำดับใน DOM', () => {
    const section = el(`
      <section data-pin="a">
        <div data-stage="2">สาม</div>
        <div data-stage="0">หนึ่ง</div>
        <div data-stage="1">สอง</div>
      </section>
    `);
    expect(collectStages(section).map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it('รวม element ที่ลำดับเดียวกันเข้ากลุ่มเดียว', () => {
    const section = el(`
      <section data-pin="a">
        <p data-stage="0">ข้อความ</p>
        <img data-stage="0" src="/images/car1.webp">
      </section>
    `);
    const groups = collectStages(section);
    expect(groups).toHaveLength(1);
    expect(groups[0].panels).toHaveLength(2);
  });

  it('ข้าม stage ที่อยู่ใน pin ซ้อนข้างใน', () => {
    const section = el(`
      <section data-pin="outer">
        <div data-stage="0">ของฉัน</div>
        <section data-pin="inner"><div data-stage="0">ของคนอื่น</div></section>
      </section>
    `);
    const groups = collectStages(section);
    expect(groups).toHaveLength(1);
    expect(groups[0].panels).toHaveLength(1);
    expect(groups[0].panels[0].textContent).toBe('ของฉัน');
  });

  it('ข้ามลำดับที่อ่านเป็นตัวเลขไม่ได้', () => {
    const section = el('<section data-pin="a"><div data-stage="แรก"></div></section>');
    expect(collectStages(section)).toEqual([]);
  });
});

describe('parseRevealGroup', () => {
  it('อ่านระยะห่างเป็นมิลลิวินาที', () => {
    const container = document.createElement('div');
    container.setAttribute('data-reveal-group', '70');
    expect(parseRevealGroup(container)).toBe(70);
  });

  it('ไม่มี attribute แปลว่าไม่ใช่กลุ่ม', () => {
    expect(parseRevealGroup(document.createElement('div'))).toBeNull();
  });

  it('ค่าว่างหรือพังใช้ค่าเริ่มต้น 80', () => {
    const container = document.createElement('div');
    container.setAttribute('data-reveal-group', '');
    expect(parseRevealGroup(container)).toBe(80);
  });

  it('กันค่าบ้าไม่ให้ทำหน้าค้าง', () => {
    const container = document.createElement('div');
    container.setAttribute('data-reveal-group', '9000');
    expect(parseRevealGroup(container)).toBe(400);
  });
});
