/* Verify blog-api cache TTL + stale-on-error. Run:
 *   npx tsx scripts/test-blog-api.ts
 * Stubs global.fetch — no network. */
import assert from 'node:assert';

process.env.BOS_PUBLIC_API = 'https://bos.example';
let calls = 0;
let mode: 'ok' | 'fail' = 'ok';
global.fetch = (async () => {
  calls += 1;
  if (mode === 'fail') throw new Error('network down');
  return {
    ok: true,
    status: 200,
    json: async () => ({ articles: [{ id: '1', slug: 'a', title: 'A', excerpt: null, coverImageUrl: null, publishedAt: null, tags: [], authorName: null }] }),
  } as Response;
}) as typeof fetch;

async function main() {
  const { getArticles, __resetBlogCache } = await import('../src/lib/blog-api');
  __resetBlogCache();

  const first = await getArticles();
  assert.equal(first.length, 1, 'first fetch returns data');
  assert.equal(calls, 1, 'one network call');

  const second = await getArticles();
  assert.equal(calls, 1, 'second call served from cache (no new fetch)');
  assert.equal(second.length, 1);

  // Expire cache, make the network fail -> stale-on-error returns last good.
  __resetBlogCache({ keepData: true, expire: true });
  mode = 'fail';
  const stale = await getArticles();
  assert.equal(stale.length, 1, 'stale-on-error returns last good value');

  console.log('PASS test-blog-api');
}
main().catch((e) => { console.error('FAIL', e); process.exit(1); });
