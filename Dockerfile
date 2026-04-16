# ======================================================
# Elite Chauffeur Landing Page — Dockerfile
# Base: nginx:alpine (lightweight)
# Build + push โดย GitHub Actions
# ======================================================

FROM nginx:1.27-alpine

# ลบ default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy static files เข้า nginx web root
COPY index.html /usr/share/nginx/html/index.html
COPY privacy.html /usr/share/nginx/html/privacy.html
COPY images/ /usr/share/nginx/html/images/
COPY robots.txt /usr/share/nginx/html/robots.txt
COPY sitemap.xml /usr/share/nginx/html/sitemap.xml

# SEO landing pages (subpath routing — nginx serves via try_files $uri/)
COPY airport-transfer/ /usr/share/nginx/html/airport-transfer/
COPY routes/ /usr/share/nginx/html/routes/

# Custom nginx config — กำหนด gzip, cache headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
