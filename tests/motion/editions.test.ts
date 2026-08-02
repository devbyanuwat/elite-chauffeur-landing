import { describe, expect, it } from 'vitest';

import { collectChapters } from '../../src/scripts/motion/editions';

function root(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

describe('collectChapters', () => {
  it('อ่านชื่อและความยาวของ chapter จาก data-chapter / data-chapter-len', () => {
    const doc = root(
      '<section class="chapter intro-chapter" data-chapter="intro" data-chapter-len="420"></section>'
    );
    const chapters = collectChapters(doc);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].name).toBe('intro');
    expect(chapters[0].len).toBe(420);
    expect(chapters[0].el).toBe(doc.querySelector('section'));
  });

  it('ข้าม element ที่ไม่มี data-chapter', () => {
    const doc = root('<section></section>');
    expect(collectChapters(doc)).toHaveLength(0);
  });

  it('ใช้ความยาวเริ่มต้น 300 เมื่อไม่ได้ระบุ data-chapter-len', () => {
    const doc = root('<section data-chapter="intro"></section>');
    expect(collectChapters(doc)[0].len).toBe(300);
  });

  it('ใช้ความยาวเริ่มต้น 300 เมื่อ data-chapter-len ไม่ใช่ตัวเลข', () => {
    const doc = root('<section data-chapter="intro" data-chapter-len="ยาว"></section>');
    expect(collectChapters(doc)[0].len).toBe(300);
  });

  it('บีบความยาวให้อยู่ในกรอบ 100 ถึง 600', () => {
    const doc = root('<section data-chapter="intro" data-chapter-len="9999"></section>');
    expect(collectChapters(doc)[0].len).toBe(600);

    const doc2 = root('<section data-chapter="intro" data-chapter-len="10"></section>');
    expect(collectChapters(doc2)[0].len).toBe(100);
  });

  it('รวบรวมหลาย chapter ตามลำดับที่ปรากฏใน DOM', () => {
    const doc = root(`
      <section data-chapter="intro" data-chapter-len="420"></section>
      <section data-chapter="fleet" data-chapter-len="380"></section>
    `);
    const chapters = collectChapters(doc);
    expect(chapters.map((c) => c.name)).toEqual(['intro', 'fleet']);
  });
});
