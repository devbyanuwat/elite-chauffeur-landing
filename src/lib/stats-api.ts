const TTL_MS = Number(process.env.STATS_CACHE_TTL_MS ?? 300_000);

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
      console.error(`[stats-api] ${key} fetch failed, serving stale:`, (e as Error).message);
      return hit.value;
    }
    console.error(`[stats-api] ${key} fetch failed, no cache:`, (e as Error).message);
    return fresh;
  }
}

export async function getTripCount(): Promise<number | null> {
  return cached<number | null>(
    'tripCount',
    async () => {
      const res = await fetch(`${base()}/api/public/stats`);
      if (!res.ok) throw new Error(`stats ${res.status}`);
      const data = (await res.json()) as { tripCount?: number };
      return typeof data.tripCount === 'number' ? data.tripCount : null;
    },
    null,
  );
}
