# kuhik-core Backend Dockerfile
# Multi-stage: build + production runtime

# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy Prisma client and generated schema
COPY prisma/ ./prisma/
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built output
COPY --from=builder /app/dist ./dist

# Prisma generate for the client in production
RUN npx prisma generate

EXPOSE 4000

# Wait for DB, run migrations, then start
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]