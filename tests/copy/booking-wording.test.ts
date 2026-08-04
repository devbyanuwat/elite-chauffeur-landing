import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CTA_FILES = [
  'src/components/Hero.astro',
  'src/components/StickyCta.astro',
  'src/components/BookingForm.astro',
  'src/components/sections/Cta.astro',
  'src/components/sections/Booking.astro',
  'src/components/sections/How.astro',
  'src/content/services/van.yaml',
  'src/content/airports/suvarnabhumi-bkk.yaml',
];

describe('booking wording', () => {
  it.each(CTA_FILES)('%s ไม่มีคำว่าใบเสนอราคาเหลืออยู่', (file) => {
    expect(readFileSync(file, 'utf8')).not.toContain('ใบเสนอราคา');
  });

  it('en.json ไม่มี "Get a quote" เหลืออยู่', () => {
    expect(readFileSync('src/i18n/en.json', 'utf8')).not.toContain('Get a quote');
  });

  it('ปุ่มหลักทุกจุดใช้คำเดียวกันทั้งสองภาษา', () => {
    const en = JSON.parse(readFileSync('src/i18n/en.json', 'utf8')) as Record<string, string>;
    expect(en['hero.cta1']).toBe('Book now');
    expect(en['cta.b1']).toBe('Book now');
    expect(en['sticky.cta']).toBe('Book now');
    expect(en['book.submit']).toBe('Book now');
    expect(en['nav.cta']).toBe('Book now');

    for (const file of ['src/components/Hero.astro', 'src/components/StickyCta.astro', 'src/components/sections/Cta.astro']) {
      expect(readFileSync(file, 'utf8')).toContain('>จองรถ<');
    }
  });
});
