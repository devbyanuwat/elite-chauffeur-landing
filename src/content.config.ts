import { defineCollection } from 'astro:content';
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

import { airportsSchema, routesSchema, servicesSchema } from './lib/content-schemas';

const airports = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/airports' }),
  schema: airportsSchema,
});

const routes = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/routes' }),
  schema: routesSchema,
});

const services = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/services' }),
  schema: servicesSchema,
});

export const collections = { airports, routes, services };
