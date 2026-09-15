import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONTACT, mergeContact, telHref } from '../../src/lib/contact';

const CMS = {
  sections: {
    'global-contact': {
      phone: '+66811111111',
      phoneDisplay: '081-111-1111',
      lineId: '@newid',
      lineUrl: 'https://line.me/R/ti/p/@newid',
    },
  },
};

describe('mergeContact', () => {
  it('ไม่มีข้อมูลจาก CMS -> ค่า default ครบทุกฟิลด์', () => {
    expect(mergeContact(undefined)).toEqual(DEFAULT_CONTACT);
    expect(mergeContact(null)).toEqual(DEFAULT_CONTACT);
    expect(mergeContact({})).toEqual(DEFAULT_CONTACT);
  });

  it('ฟิลด์ว่าง/ผิดชนิด ตกกลับ default เฉพาะฟิลด์นั้น', () => {
    const c = mergeContact({ lineId: '  ', phone: 123, lineUrl: 'https://line.me/R/ti/p/@newid' });
    expect(c.lineId).toBe(DEFAULT_CONTACT.lineId);
    expect(c.phone).toBe(DEFAULT_CONTACT.phone);
    expect(c.lineUrl).toBe('https://line.me/R/ti/p/@newid');
  });
});

describe('telHref', () => {
  it('เบอร์สากลแปลงกลับเป็น 0 ขึ้นต้น', () => {
    expect(telHref('+66623879159')).toBe('tel:0623879159');
    expect(telHref('0623879159')).toBe('tel:0623879159');
  });
});

describe('getContact', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.BOS_PUBLIC_API = 'https://bos.example.com';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('BOS ล่ม -> ค่า default ทั้งชุด ไม่ throw', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getContact } = await import('../../src/lib/contact');
    await expect(getContact()).resolves.toEqual(DEFAULT_CONTACT);
  });

  it('BOS ตอบ -> ใช้ค่าจาก CMS', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(CMS), { status: 200 })));
    const { getContact } = await import('../../src/lib/contact');
    await expect(getContact()).resolves.toEqual(CMS.sections['global-contact']);
  });
});
