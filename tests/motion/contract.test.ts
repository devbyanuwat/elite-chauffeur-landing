import { describe, expect, it } from 'vitest';
import { parseCount, parseParallaxDepth, parseReveal, splitLines } from '../../src/scripts/motion/contract';

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
});
