import type { Review } from './reviews-types';

const TTL_MS = Number(process.env.REVIEWS_CACHE_TTL_MS ?? 120_000);

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
      console.error(`[reviews-api] ${key} fetch failed, serving stale:`, (e as Error).message);
      return hit.value; // stale-on-error
    }
    console.error(`[reviews-api] ${key} fetch failed, no cache:`, (e as Error).message);
    return fresh;
  }
}

export async function getReviews(): Promise<Review[]> {
  return cached<Review[]>(
    'reviews',
    async () => {
      const res = await fetch(`${base()}/api/public/reviews`);
      if (!res.ok) throw new Error(`reviews ${res.status}`);
      const data = (await res.json()) as { reviews?: Review[] };
      return data.reviews ?? [];
    },
    [],
  );
}
