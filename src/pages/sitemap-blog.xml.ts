export const prerender = false;
import type { APIRoute } from 'astro';
import { getArticles } from '../lib/blog-api';

export const GET: APIRoute = async () => {
  const articles = await getArticles();
  const urls = articles
    .map((a) => {
      const lastmod = a.publishedAt ? `<lastmod>${new Date(a.publishedAt).toISOString()}</lastmod>` : '';
      return `<url><loc>https://sabuygo.com/blog/${a.slug}/</loc>${lastmod}</url>`;
    })
    .join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://sabuygo.com/blog/</loc></url>${urls}</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
