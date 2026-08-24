/**
 * Product section — merge เนื้อหาจาก CMS ทับ default (ใช้ร่วมโดย Product.astro
 * และ index.astro ที่ต้องสร้าง JSON-LD จากเนื้อหาชุดเดียวกัน)
 */

import {
  PRODUCTS as DEFAULT_PRODUCTS,
  HEAD as DEFAULT_HEAD,
  CTA as DEFAULT_CTA,
  type ProductItem,
} from './product-data';
import { isLText, type LText } from './cms-merge';
import type { CmsSections } from './cms-api';

export type CmsProduct = {
  head?: { eyebrow?: LText; title?: LText; sub?: LText };
  cta?: { label?: LText; href?: string };
  items?: { id?: string; name?: string; q?: LText; a?: LText; proofLabel?: LText; proof?: LText[] }[];
};

function toItems(c: CmsProduct | undefined): ProductItem[] | null {
  const items = c?.items;
  if (!Array.isArray(items) || items.length !== 4) return null;
  const out: ProductItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!isLText(it.q) || !isLText(it.a) || !isLText(it.proofLabel)) return null;
    if (!Array.isArray(it.proof) || it.proof.length === 0 || !it.proof.every(isLText)) return null;
    out.push({
      id: it.id ?? String(i + 1),
      name: it.name ?? '',
      q: it.q.th,
      a: it.a.th,
      proofLabel: it.proofLabel.th,
      proof: it.proof.map((x) => x.th),
    });
  }
  return out;
}

export function mergedProduct(cms: CmsSections | null): {
  products: ProductItem[];
  head: typeof DEFAULT_HEAD;
  cta: typeof DEFAULT_CTA;
} {
  const c = cms?.['product'] as CmsProduct | undefined;
  const items = toItems(c);
  const head =
    c?.head && isLText(c.head.eyebrow) && isLText(c.head.title) && isLText(c.head.sub)
      ? { eyebrow: c.head.eyebrow.th, title: c.head.title.th, sub: c.head.sub.th }
      : DEFAULT_HEAD;
  const cta =
    c?.cta && isLText(c.cta.label)
      ? { label: c.cta.label.th, href: c.cta.href ?? DEFAULT_CTA.href }
      : DEFAULT_CTA;
  return { products: items ?? DEFAULT_PRODUCTS, head, cta };
}

/** JSON-LD OfferCatalog จากเนื้อหาที่ merge แล้ว (โครงเดียวกับ productCatalogSchema เดิม) */
export function buildProductCatalogSchema(cms: CmsSections | null): Record<string, unknown> {
  const { products, head } = mergedProduct(cms);
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: head.title,
    provider: { '@type': 'Organization', name: 'SABUYGO', url: 'https://sabuygo.com' },
    itemListElement: products.map((p, i) => ({
      '@type': 'Service',
      position: i + 1,
      name: p.name,
      description: p.a,
      provider: { '@type': 'Organization', name: 'SABUYGO' },
      ...(p.proof.length
        ? {
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: p.proofLabel,
              itemListElement: p.proof.map((line, j) => ({
                '@type': 'Offer',
                position: j + 1,
                itemOffered: { '@type': 'Service', name: line },
              })),
            },
          }
        : {}),
    })),
  };
}
