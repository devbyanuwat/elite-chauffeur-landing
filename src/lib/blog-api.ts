import type { ArticleSummary, ArticleFull } from './blog-types';

const TTL_MS = Number(process.env.BLOG_CACHE_TTL_MS ?? 120_000);

function base(): string {
  return (process.env.BOS_PUBLIC_API ?? '').replace(/\/+$/, '');
}

interface Entry<T> {
  at: number;
  value: T;
}
const cache = new Map<string, Entry<unknown>>();

/** Test helper — reset or age the cache. */
export function __resetBlogCache(opts?: { keepData?: boolean; expire?: boolean }): void {
  if (!opts?.keepData) {
    cache.clear();
    return;
  }
  if (opts.expire) {
    for (const e of cache.values()) e.at = 0; // force TTL miss, keep value for stale-on-error
  }
}

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
      console.error(`[blog-api] ${key} fetch failed, serving stale:`, (e as Error).message);
      return hit.value; // stale-on-error
    }
    console.error(`[blog-api] ${key} fetch failed, no cache:`, (e as Error).message);
    return fresh;
  }
}

export async function getArticles(): Promise<ArticleSummary[]> {
  return cached<ArticleSummary[]>(
    'list',
    async () => {
      const res = await fetch(`${base()}/api/public/articles`);
      if (!res.ok) throw new Error(`articles ${res.status}`);
      const data = (await res.json()) as { articles?: ArticleSummary[] };
      return data.articles ?? [];
    },
    [],
  );
}

export async function getArticle(slug: string): Promise<ArticleFull | null> {
  return cached<ArticleFull | null>(
    `slug:${slug}`,
    async () => {
      const res = await fetch(`${base()}/api/public/articles/${encodeURIComponent(slug)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`article ${res.status}`);
      return (await res.json()) as ArticleFull;
    },
    null,
  );
}
