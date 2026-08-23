import type { FleetCar } from './fleet-types';

const TTL_MS = Number(process.env.FLEET_CACHE_TTL_MS ?? 120_000);

function base(): string {
  return (process.env.BOS_PUBLIC_API ?? '').replace(/\/+$/, '');
}

interface Entry<T> {
  at: number;
  value: T;
}
const cache = new Map<string, Entry<unknown>>();

async function cached<T>(key: string, fetcher: () => Promise<T>, fresh: T): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key) as Entry<T> | undefined;
  if (hit && now - hit.at < TTL_MS) return hit.value;
  try {
    const value = await fetcher();
    cache.set(key, { at: now, value });
    return value;
  } catch (e) {
    if (hit) {
      console.error(`[fleet-api] ${key} fetch failed, serving stale:`, (e as Error).message);
      return hit.value; // stale-on-error
    }
    console.error(`[fleet-api] ${key} fetch failed, no cache:`, (e as Error).message);
    return fresh;
  }
}

/**
 * ดึงการ์ดรถจาก BOS — เรียกตอน build (หน้า landing เป็น static)
 * ล้มเหลว = คืน array ว่าง ให้ผู้เรียกไป fallback เป็นข้อมูลที่ hardcode ไว้
 */
export async function getFleet(): Promise<FleetCar[]> {
  return cached<FleetCar[]>(
    'fleet',
    async () => {
      const res = await fetch(`${base()}/api/public/fleet`);
      if (!res.ok) throw new Error(`fleet ${res.status}`);
      const data = (await res.json()) as { fleet?: FleetCar[] };
      return data.fleet ?? [];
    },
    [],
  );
}
