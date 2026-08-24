import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const OK = { sections: { hero: { texts: { 'hero.t1': { th: 'สวัสดี', en: 'Hello' } } } } };

describe('cms-api', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.BOS_PUBLIC_API = 'https://bos.example.com';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CMS_CACHE_TTL_MS;
  });

  it('คืน sections จาก BOS', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(OK), { status: 200 })));
    const { getLandingContent } = await import('../../src/lib/cms-api');
    const s = await getLandingContent();
    expect(s?.hero).toBeTruthy();
  });

  it('ยิงซ้ำใน TTL ไม่ fetch ใหม่', async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify(OK), { status: 200 }));
    vi.stubGlobal('fetch', spy);
    const { getLandingContent } = await import('../../src/lib/cms-api');
    await getLandingContent();
    await getLandingContent();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('ล่มโดยไม่เคยสำเร็จ -> null ไม่ throw', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getLandingContent } = await import('../../src/lib/cms-api');
    await expect(getLandingContent()).resolves.toBeNull();
  });

  it('ล่มหลังเคยสำเร็จ -> ค่าเก่า (stale)', async () => {
    let fail = false;
    vi.stubGlobal('fetch', vi.fn(async () =>
      fail ? new Response('x', { status: 500 }) : new Response(JSON.stringify(OK), { status: 200 }),
    ));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.CMS_CACHE_TTL_MS = '0';
    const { getLandingContent } = await import('../../src/lib/cms-api');
    const first = await getLandingContent();
    fail = true;
    await expect(getLandingContent()).resolves.toEqual(first);
  });
});
