import { describe, expect, it, vi } from 'vitest';
import { collectEnOverrides, isHidden, section, t } from '../../src/lib/cms-merge';

const FB = { texts: {}, mark: 'fallback' };

describe('section()', () => {
  it('cms null -> fallback', () => {
    expect(section(null, 'hero', FB, () => true)).toBe(FB);
  });
  it('cms มี key + ผ่าน guard -> ใช้ cms', () => {
    const cms = { hero: { mark: 'cms' } };
    expect(section(cms, 'hero', FB, () => true)).toEqual({ mark: 'cms' });
  });
  it('cms fail guard -> fallback + log', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cms = { hero: { broken: true } };
    expect(section(cms, 'hero', FB, (v) => 'mark' in v)).toBe(FB);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('isHidden()', () => {
  it('visible false เท่านั้นที่นับว่าปิด', () => {
    expect(isHidden({ stats: { visible: false } }, 'stats')).toBe(true);
    expect(isHidden({ stats: { visible: true } }, 'stats')).toBe(false);
    expect(isHidden({ stats: {} }, 'stats')).toBe(false);
    expect(isHidden(null, 'stats')).toBe(false);
  });
});

describe('t()', () => {
  it('มีค่า th ใช้ th, ไม่มีใช้ fallback', () => {
    expect(t({ k: { th: 'ไทย', en: 'EN' } }, 'k', 'สำรอง')).toBe('ไทย');
    expect(t({ k: { th: '', en: 'EN' } }, 'k', 'สำรอง')).toBe('สำรอง');
    expect(t(undefined, 'k', 'สำรอง')).toBe('สำรอง');
  });
});

describe('collectEnOverrides()', () => {
  it('รวม en จากทุก section ข้าม en ว่าง', () => {
    const out = collectEnOverrides({
      a: { texts: { k1: { th: 'ก', en: 'A' }, k2: { th: 'ข', en: '' } } },
      b: { texts: { k3: { th: 'ค', en: 'C' } } },
      c: { noTexts: true },
    });
    expect(out).toEqual({ k1: 'A', k3: 'C' });
  });
  it('null -> ว่าง', () => {
    expect(collectEnOverrides(null)).toEqual({});
  });
});
