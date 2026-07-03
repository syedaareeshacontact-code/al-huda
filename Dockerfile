# ---- deps ----
FROM oven/bun:1.1.29 AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# ---- build ----
FROM deps AS builder
WORKDIR /app
COPY . .
RUN bun run generate:surah-pdfs && bun run build

# ---- runner ----
FROM oven/bun:1.1.29 AS runner
WORKDIR /app
ENV NODE_ENV=production

# copy only what Next needs at runtime
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["bun", "run", "start"]