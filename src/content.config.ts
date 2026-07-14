import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Content collections for the 4 SEO subpages (2 airport-transfer + 2 routes).
 * Task 7 — replaces 4 duplicated static HTML files with 2 typed [slug].astro
 * templates driven by these collections. Schemas model exactly what the live
 * pages differ on (verified by reading all 4 source files); anything that was
 * byte-identical across both variants of a type (nav, footer, fleet strip,
 * vehicle names/types, CTA footer copy, reveal/i18n plumbing) is NOT a field
 * here — it lives once in the [slug].astro template instead.
 */

const seoMeta = z.object({
  title: z.string(),
  description: z.string(),
  canonical: z.string(),
  ogImage: z.string().optional(),
  // Per-page OG/Twitter/keywords overrides — each live page emits its own
  // distinct values here (verified against the live static <head>s), not the
  // sitewide/homepage defaults baked into Base.astro's Props. ogTitle/
  // ogDescription default to title/description in Base.astro when omitted;
  // twitterTitle/twitterDescription default to ogTitle/ogDescription when
  // omitted, and — because the live route pages emit no Twitter Card meta at
  // all — pass `null` explicitly (not just omit) to suppress the whole
  // Twitter Card block for a page.
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  twitterTitle: z.string().nullable().optional(),
  twitterDescription: z.string().nullable().optional(),
  keywords: z.string().optional(),
});

const faqItem = z.object({
  question: z.string(),
  answer: z.string(),
  // Optional override for the visible accordion text only, when it differs
  // from the live FAQPage JSON-LD `answer` text by copy-drift (e.g. a
  // politeness particle). JSON-LD always renders `answer` verbatim.
  visibleAnswer: z.string().optional(),
});

const relatedLink = z.object({
  heading: z.string(),
  desc: z.string(),
  href: z.string(),
  cta: z.string(),
});

// ==================== AIRPORTS ====================

const airportIncludedItem = z.object({
  icon: z.enum(['clock', 'card', 'clockWait', 'shield', 'luggage', 'water']),
  title: z.string(),
  desc: z.string(),
});

const airports = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/airports' }),
  schema: seoMeta.extend({
    // Service (JSON-LD) fields
    serviceName: z.string(),
    serviceDescription: z.string(),
    areaServedPlaceName: z.string(), // e.g. "Suvarnabhumi Airport (BKK)"
    priceLow: z.string(),
    priceHigh: z.string(),
    // Breadcrumb (JSON-LD) — position-3 label for this airport
    breadcrumbName: z.string(), // e.g. "สุวรรณภูมิ (BKK)"
    // Hero
    breadcrumbLabel: z.string(), // e.g. "รถรับส่งสนามบินสุวรรณภูมิ"
    heroHeadingHtml: z.string(), // h1 innerHTML, contains <br>
    heroSub: z.string(),
    waitMinutes: z.number(),
    heroTrust: z.array(z.string()).length(4),
    // Price matrix
    priceDesc: z.string(),
    zoneLabels: z.array(z.string()).length(3),
    rateRows: z.array(z.tuple([z.number(), z.number(), z.number()])).length(4),
    priceFootnote: z.string(),
    // Included
    includedDesc: z.string(),
    included: z.array(airportIncludedItem),
    // FAQ (drives both the visible accordion and the FAQPage JSON-LD)
    faq: z.array(faqItem),
    // Optional cross-link strip (only Don Mueang has one, linking to Suvarnabhumi)
    related: relatedLink.optional(),
  }),
});

// ==================== ROUTES ====================

const routesIncludedItem = z.object({
  icon: z.enum(['shield', 'lines', 'globe', 'clock', 'chat', 'water', 'check']),
  title: z.string(),
  desc: z.string(),
});

const extraRatesRow = z.object({
  route: z.string(),
  note: z.string().optional(),
  sedan: z.number().nullable(),
  suv: z.number().nullable(),
  van: z.number().nullable(), // null renders as "สอบถาม" (inquire)
});

const routes = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/routes' }),
  schema: seoMeta.extend({
    // Service (JSON-LD) fields
    serviceName: z.string(),
    serviceDescription: z.string(),
    areaServed: z.array(z.string()), // City names, e.g. ["Bangkok", "Hua Hin", "Cha-am"]
    priceLow: z.string(),
    priceHigh: z.string(),
    // Breadcrumb (JSON-LD)
    breadcrumbName: z.string(), // e.g. "กรุงเทพ → หัวหิน"
    // Hero
    heroHeadingHtml: z.string(),
    heroSub: z.string(),
    distanceKm: z.number(),
    travelTime: z.string(), // display string, e.g. "3.0" or "1.45"
    startPrice: z.string(), // e.g. "฿2,500"
    // Price matrix (One-way / Round-trip / Day-trip)
    priceDesc: z.string(),
    dayTripHours: z.number(),
    rateRows: z.array(z.tuple([z.number(), z.number(), z.number()])).length(4),
    priceFootnote: z.string(),
    // Included
    includedDesc: z.string(),
    included: z.array(routesIncludedItem),
    // FAQ
    faq: z.array(faqItem),
    // Cross-link strip to the other route (both route pages have one)
    related: relatedLink,
    // Only bangkok-to-pattaya has this extra "other popular routes" rate card
    extraRatesTable: z
      .object({
        heading: z.string(),
        desc: z.string(),
        rows: z.array(extraRatesRow),
        footnote: z.string(),
      })
      .optional(),
  }),
});

export const collections = { airports, routes };
