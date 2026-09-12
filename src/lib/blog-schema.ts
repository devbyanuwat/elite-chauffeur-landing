import type { ArticleFull } from './blog-types';

const ORG = {
  '@type': 'Organization',
  name: 'SABUYGO',
  url: 'https://sabuygo.com',
} as const;

const PUBLISHER = {
  ...ORG,
  logo: { '@type': 'ImageObject', url: 'https://sabuygo.com/images/logo.webp' },
} as const;

/**
 * JSON-LD for a single blog article: Article + BreadcrumbList always, FAQPage
 * when the article has FAQ items. Pure; never throws — a missing field is
 * simply left out. Each node carries its own @context so Base.astro can render
 * them one per script tag.
 */
export function buildArticleJsonLd(
  article: ArticleFull,
  canonical: string,
): Record<string, unknown>[] {
  const published = article.publishedAt ?? article.createdAt ?? undefined;
  const modified = article.updatedAt ?? published;

  const articleNode: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.seoDescription ?? article.summary ?? article.excerpt ?? article.title,
    mainEntityOfPage: canonical,
    inLanguage: article.locale || 'th',
    author: article.authorName
      ? { '@type': 'Person', name: article.authorName }
      : { ...ORG },
    publisher: { ...PUBLISHER },
  };
  if (article.coverImageUrl) articleNode.image = article.coverImageUrl;
  if (published) articleNode.datePublished = published;
  if (modified) articleNode.dateModified = modified;
  if (article.tags.length > 0) articleNode.keywords = article.tags.join(', ');
  if (article.summary) {
    articleNode.speakable = {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.article-summary'],
    };
  }

  const breadcrumb: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'หน้าแรก', item: 'https://sabuygo.com/' },
      { '@type': 'ListItem', position: 2, name: 'บทความ', item: 'https://sabuygo.com/blog/' },
      { '@type': 'ListItem', position: 3, name: article.title, item: canonical },
    ],
  };

  const nodes = [articleNode, breadcrumb];

  if (article.faq.length > 0) {
    nodes.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: article.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  return nodes;
}
