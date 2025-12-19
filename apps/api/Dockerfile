# Base image with Bun
FROM oven/bun:1.2.22 AS base

# Install turbo CLI globally using Bun
FROM base AS turbo-cli
RUN bun add -g turbo

# Builder stage - prune API workspace
FROM turbo-cli AS builder
WORKDIR /app
# Copy all files needed for turbo prune
COPY . .
# Prune API workspace - this creates a minimal monorepo with only API dependencies
RUN turbo prune @midday/api --docker --out-dir=out/api

# Installer stage
FROM base AS installer
WORKDIR /app

# Install build dependencies for native modules (pg, canvas, etc.)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json files from API pruned workspace
COPY --from=builder /app/out/api/json/ .

# Copy full source from API pruned workspace (includes all workspace deps)
COPY --from=builder /app/out/api/full/ .

# Install dependencies (allow lockfile updates for malformed entries)
RUN bun install

# Build engine if needed (it exports types that API may need)
RUN cd apps/engine && bun run build || true

# Runner stage
FROM installer AS runner

# Set the API directory as working directory
WORKDIR /app/apps/api

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose API port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun -e "fetch('http://localhost:8080/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Run the API directly with Bun
CMD ["bun", "run", "src/index.ts"]
