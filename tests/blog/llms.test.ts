import { describe, it, expect } from 'vitest';
import { buildLlmsTxt } from '../../src/lib/llms';
import type { ArticleSummary } from '../../src/lib/blog-types';

function art(overrides: Partial<ArticleSummary> = {}): ArticleSummary {
  return {
    id: '1',
    slug: 'guide',
    title: 'คู่มือเดินทาง',
    excerpt: 'คำโปรย',
    coverImageUrl: null,
    publishedAt: '2026-09-01T00:00:00.000Z',
    tags: [],
    authorName: null,
    summary: 'สรุปบทความ',
    ...overrides,
  };
}

describe('buildLlmsTxt', () => {
  it('has header and the 8 fixed site links', () => {
    const out = buildLlmsTxt([]);
    expect(out.startsWith('# SABUYGO')).toBe(true);
    expect(out).toContain('https://sabuygo.com/');
    expect(out).toContain('https://sabuygo.com/van/');
    expect(out).toContain('https://sabuygo.com/charter/');
    expect(out).toContain('https://sabuygo.com/airport-transfer/suvarnabhumi-bkk/');
    expect(out).toContain('https://sabuygo.com/airport-transfer/don-mueang-dmk/');
    expect(out).toContain('https://sabuygo.com/routes/bangkok-to-pattaya/');
    expect(out).toContain('https://sabuygo.com/routes/bangkok-to-hua-hin/');
    expect(out).toContain('https://sabuygo.com/blog/');
  });

  it('lists articles using summary, falling back to excerpt', () => {
    const out = buildLlmsTxt([
      art({ slug: 'a', title: 'มีสรุป', summary: 'สรุปA', excerpt: 'โปรยA' }),
      art({ slug: 'b', title: 'ไม่มีสรุป', summary: null, excerpt: 'โปรยB' }),
    ]);
    expect(out).toContain('[มีสรุป](https://sabuygo.com/blog/a/): สรุปA');
    expect(out).toContain('[ไม่มีสรุป](https://sabuygo.com/blog/b/): โปรยB');
  });

  it('handles no articles (heading only, no crash)', () => {
    const out = buildLlmsTxt([]);
    expect(out).toContain('## บทความ');
  });

  it('contains no em dash or trailing whitespace', () => {
    const out = buildLlmsTxt([art()]);
    expect(out).not.toMatch(/[—–]/);
    expect(out).not.toMatch(/[ \t]+\n/);
  });
});
