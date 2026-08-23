import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const OK = {
  fleet: [
    {
      vehicleClass: 'premium',
      name: 'Toyota Alphard',
      price: 5000,
      photoUrl: null,
      seats: 7,
      vip: true,
      vtype: 'premium',
    },
  ],
};

describe('fleet-api', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.BOS_PUBLIC_API = 'https://bos.example.com';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('คืนรายการรถจาก BOS', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(OK), { status: 200 })),
    );
    const { getFleet } = await import('../../src/lib/fleet-api');
    const cars = await getFleet();
    expect(cars).toHaveLength(1);
    expect(cars[0].name).toBe('Toyota Alphard');
  });

  it('ยิงซ้ำในช่วง TTL ต้องไม่ fetch ใหม่', async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify(OK), { status: 200 }));
    vi.stubGlobal('fetch', spy);
    const { getFleet } = await import('../../src/lib/fleet-api');
    await getFleet();
    await getFleet();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('BOS ล่มโดยยังไม่เคยสำเร็จ ต้องคืน array ว่าง ไม่ throw', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getFleet } = await import('../../src/lib/fleet-api');
    await expect(getFleet()).resolves.toEqual([]);
  });

  it('BOS ล่มหลังเคยสำเร็จ ต้องคืนค่าเก่า', async () => {
    let fail = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        fail ? new Response('nope', { status: 500 }) : new Response(JSON.stringify(OK), { status: 200 }),
      ),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.FLEET_CACHE_TTL_MS = '0';
    const { getFleet } = await import('../../src/lib/fleet-api');
    const first = await getFleet();
    expect(first).toHaveLength(1);
    fail = true;
    await expect(getFleet()).resolves.toEqual(first);
    delete process.env.FLEET_CACHE_TTL_MS;
  });
});
