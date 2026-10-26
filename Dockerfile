# ClipForge — all-in-one container (Next.js + FFmpeg + fonts for ASS subtitles)
FROM node:20-slim AS base
# fontconfig + DejaVu fonts are required for libass subtitle text burning
RUN apt-get update \
  && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time placeholder only — the real DATABASE_URL is injected at runtime.
# (Some server modules read env during `next build` page-data collection.)
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app ./
RUN mkdir -p storage
EXPOSE 3000
# Push DB schema (no-op when unchanged), then start the production server
CMD ["sh", "-c", "npx drizzle-kit push && npm run start"]
