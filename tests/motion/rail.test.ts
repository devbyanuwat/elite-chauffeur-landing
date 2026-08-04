import { describe, expect, it } from 'vitest';

import { railStops } from '../../src/scripts/motion/rail';

describe('railStops', () => {
  it('เก็บเฉพาะบทที่มี id ให้กระโดดไปได้', () => {
    document.body.innerHTML = `
      <section id="services" data-chapter="intro"></section>
      <section data-chapter="fleet"></section>
      <section id="why" data-chapter="why"></section>`;

    expect(railStops(document)).toEqual([
      { name: 'intro', id: 'services' },
      { name: 'why', id: 'why' },
    ]);
  });

  it('หน้าไม่มีบทเลยได้รายการว่าง', () => {
    document.body.innerHTML = '<section></section>';
    expect(railStops(document)).toEqual([]);
  });
});
