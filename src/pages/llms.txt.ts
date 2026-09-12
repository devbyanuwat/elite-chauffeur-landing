export const prerender = false;
import type { APIRoute } from 'astro';
import { getArticles } from '../lib/blog-api';
import { buildLlmsTxt } from '../lib/llms';

export const GET: APIRoute = async () => {
  const articles = await getArticles();
  return new Response(buildLlmsTxt(articles), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
