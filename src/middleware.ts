import type { MiddlewareHandler } from 'astro';

/**
 * Security response headers previously set by nginx.conf. gzip/TLS and any
 * global (all-response) header policy remain the edge nginx-proxy-manager's
 * job; hashed /_astro asset caching is handled by the node adapter.
 */
export const onRequest: MiddlewareHandler = async (_context, next) => {
  const response = await next();
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
};
