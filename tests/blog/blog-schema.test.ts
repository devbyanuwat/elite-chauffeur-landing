import { describe, it, expect } from 'vitest';
import { buildArticleJsonLd } from '../../src/lib/blog-schema';
import type { ArticleFull } from '../../src/lib/blog-types';

function make(overrides: Partial<ArticleFull> = {}): ArticleFull {
  return {
    id: '1',
    slug: 'test-post',
    title: 'พาดหัวบทความ',
    excerpt: 'คำโปรย',
    coverImageUrl: 'https://sabuygo.com/images/cover.webp',
    publishedAt: '2026-09-01T00:00:00.000Z',
    tags: ['สนามบิน', 'กรุงเทพ'],
    authorName: 'ทีม SABUYGO',
    summary: 'สรุปตอบตรงของบทความ',
    body: '<p>เนื้อหา</p>',
    seoTitle: 'SEO title',
    seoDescription: 'SEO desc',
    locale: 'th',
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
    faq: [{ q: 'จองยังไง', a: 'ทัก LINE' }],
    relatedPages: [{ key: 'van', title: 'เช่ารถตู้', href: '/van/' }],
    ...overrides,
  };
}

const CANONICAL = 'https://sabuygo.com/blog/test-post/';

describe('buildArticleJsonLd', () => {
  it('emits Article + BreadcrumbList + FAQPage when faq present', () => {
    const nodes = buildArticleJsonLd(make(), CANONICAL);
    const types = nodes.map((n) => n['@type']);
    expect(types).toContain('Article');
    expect(types).toContain('BreadcrumbList');
    expect(types).toContain('FAQPage');
    for (const n of nodes) expect(n['@context']).toBe('https://schema.org');
  });

  it('omits FAQPage when faq empty', () => {
    const nodes = buildArticleJsonLd(make({ faq: [] }), CANONICAL);
    expect(nodes.map((n) => n['@type'])).not.toContain('FAQPage');
  });

  it('Article uses Person author + Organization publisher with logo', () => {
    const article = buildArticleJsonLd(make(), CANONICAL).find((n) => n['@type'] === 'Article')!;
    expect(article.author).toMatchObject({ '@type': 'Person', name: 'ทีม SABUYGO' });
    expect(article.publisher).toMatchObject({
      '@type': 'Organization',
      name: 'SABUYGO',
      logo: { '@type': 'ImageObject', url: 'https://sabuygo.com/images/logo.webp' },
    });
    expect(article.mainEntityOfPage).toBe(CANONICAL);
    expect(article.keywords).toBe('สนามบิน, กรุงเทพ');
  });

  it('falls back to Organization author when authorName missing', () => {
    const article = buildArticleJsonLd(make({ authorName: null }), CANONICAL).find((n) => n['@type'] === 'Article')!;
    expect(article.author).toMatchObject({ '@type': 'Organization', name: 'SABUYGO' });
  });

  it('dateModified falls back to datePublished; speakable only with summary', () => {
    const withSummary = buildArticleJsonLd(make({ updatedAt: null }), CANONICAL).find((n) => n['@type'] === 'Article')!;
    expect(withSummary.dateModified).toBe(withSummary.datePublished);
    expect(withSummary.speakable).toBeTruthy();
    const noSummary = buildArticleJsonLd(make({ summary: null }), CANONICAL).find((n) => n['@type'] === 'Article')!;
    expect(noSummary.speakable).toBeUndefined();
  });

  it('FAQPage mainEntity mirrors the faq items', () => {
    const faqNode = buildArticleJsonLd(make(), CANONICAL).find((n) => n['@type'] === 'FAQPage')!;
    const entities = faqNode.mainEntity as Array<Record<string, unknown>>;
    expect(entities).toHaveLength(1);
    expect(entities[0]).toMatchObject({ '@type': 'Question', name: 'จองยังไง' });
  });
});
