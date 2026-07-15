# ======================================================
# Elite Chauffeur Landing — Dockerfile (Astro 5, @astrojs/node standalone)
# Multi-stage: build -> node runtime. Edge nginx-proxy-manager fronts TLS/gzip.
# ======================================================

# --- build ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# --- runtime ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
# Only the build output + production deps are needed to run the server.
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4321/ || exit 1

CMD ["node", "./dist/server/entry.mjs"]
