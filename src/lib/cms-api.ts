/**
 * Landing CMS client — ดึงเนื้อหาทุก section จาก BOS ตอน build
 * โครงเดียวกับ blog-api/reviews-api/fleet-api (TTL cache, stale-on-error)
 * ล้มเหลวโดยไม่มี cache -> null : ผู้เรียกใช้ DEFAULT ของตัวเอง (เว็บเหมือนเดิม 100%)
 */

export type CmsSections = Record<string, Record<string, unknown>>;

const TTL_MS = Number(process.env.CMS_CACHE_TTL_MS ?? 120_000);

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
      console.error(`[cms-api] ${key} fetch failed, serving stale:`, (e as Error).message);
      return hit.value; // stale-on-error
    }
    console.error(`[cms-api] ${key} fetch failed, no cache:`, (e as Error).message);
    return fresh;
  }
}

export async function getLandingContent(): Promise<CmsSections | null> {
  return cached<CmsSections | null>(
    'landing-content',
    async () => {
      const res = await fetch(`${base()}/api/public/landing-content`);
      if (!res.ok) throw new Error(`landing-content ${res.status}`);
      const data = (await res.json()) as { sections?: CmsSections };
      return data.sections ?? null;
    },
    null,
  );
}
