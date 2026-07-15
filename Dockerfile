# ======================================================
# Elite Chauffeur Landing Page — Dockerfile (Astro 5)
# Multi-stage: Node build -> nginx serve
# Build + push by GitHub Actions
# ======================================================

# --- build ---
FROM node:20-alpine AS build
WORKDIR /app

# Copy manifests first for better Docker layer cache
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy the rest of the source and build the static site -> /app/dist
COPY . .
RUN npm run build

# --- serve ---
FROM nginx:1.27-alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Custom nginx config — gzip, cache headers, directory-style routing, /blog passthrough
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Astro static output (output: 'static', trailingSlash: 'always', build.format: 'directory')
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
