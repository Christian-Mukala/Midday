# Midday API Deployment Guide

## Overview
This guide explains how to deploy the Midday API to Fly.io. The API is part of a Bun monorepo with multiple workspace dependencies.

## Prerequisites
- Fly.io CLI installed (`fly auth login`)
- Bun 1.2.22 or later
- Docker (for local testing)
- All required secrets set in Fly.io

## Architecture
The API depends on these workspace packages:
- `@midday/cache` - Redis caching layer
- `@midday/db` - PostgreSQL database client and queries
- `@midday/documents` - Document handling
- `@midday/encryption` - Encryption utilities
- `@midday/engine` - Cloudflare Worker engine
- `@midday/engine-client` - Client for engine communication
- `@midday/events` - Event tracking
- `@midday/import` - Data import functionality
- `@midday/inbox` - Inbox management
- `@midday/invoice` - Invoice generation
- `@midday/jobs` - Background job definitions
- `@midday/job-client` - Job queue client
- `@midday/location` - Location services
- `@midday/logger` - Logging utilities
- `@midday/notifications` - Notification system
- `@midday/supabase` - Supabase client
- `@midday/utils` - Shared utilities
- `@midday/app-store` - App store integrations

## Dockerfile Strategy
The Dockerfile uses Turborepo's `prune` command to create a minimal monorepo containing only the API and its dependencies. This approach:

1. **Builder stage**: Uses `turbo prune @midday/api --docker` to extract only necessary files
2. **Installer stage**: Installs dependencies and builds the engine package
3. **Runner stage**: Runs the API with Bun

### Why turbo prune?
- Reduces Docker context size (only copies needed packages)
- Maintains workspace dependencies correctly
- Faster builds and smaller images
- Proper handling of internal package references

## Required Secrets
Make sure these secrets are set in Fly.io:

```bash
# Database
fly secrets set DATABASE_URL="postgresql://..."

# Redis (Upstash)
fly secrets set UPSTASH_REDIS_REST_URL="https://..."
fly secrets set UPSTASH_REDIS_REST_TOKEN="..."

# Supabase
fly secrets set NEXT_PUBLIC_SUPABASE_URL="https://..."
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
fly secrets set SUPABASE_SERVICE_KEY="..."

# Additional secrets as needed
fly secrets set OPENAI_API_KEY="..."
fly secrets set RESEND_API_KEY="..."
fly secrets set ENGINE_API_KEY="..."
fly secrets set API_ROUTE_SECRET="..."
fly secrets set FILE_KEY_SECRET="..."
fly secrets set MIDDAY_ENCRYPTION_KEY="..."
fly secrets set ALLOWED_API_ORIGINS="https://app.midday.ai,https://midday.ai"

# Optional integrations
fly secrets set PLAID_CLIENT_ID="..."
fly secrets set PLAID_SECRET="..."
fly secrets set GOCARDLESS_SECRET_ID="..."
fly secrets set GOCARDLESS_SECRET_KEY="..."
fly secrets set TELLER_CERTIFICATE="..."
fly secrets set TELLER_CERTIFICATE_PRIVATE_KEY="..."
```

## Deployment from Monorepo Root

### Step 1: Navigate to monorepo root
```bash
cd /mnt/c/Users/Owner/Documents/midday
```

### Step 2: Deploy to Fly.io
The `fly.toml` is configured to use the correct Dockerfile path:

```bash
# Deploy from root (fly.toml points to apps/api/Dockerfile)
fly deploy --config apps/api/fly.toml --app midday-api-christian
```

### Step 3: Monitor deployment
```bash
# Check deployment status
fly status --app midday-api-christian

# View logs
fly logs --app midday-api-christian

# Check health
curl https://midday-api-christian.fly.dev/health
```

## Local Testing with Docker

Test the Dockerfile locally before deploying:

```bash
# Build from monorepo root
cd /mnt/c/Users/Owner/Documents/midday

# Build the image
docker build -f apps/api/Dockerfile -t midday-api:test .

# Run locally with environment variables
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://..." \
  -e UPSTASH_REDIS_REST_URL="..." \
  -e UPSTASH_REDIS_REST_TOKEN="..." \
  -e NEXT_PUBLIC_SUPABASE_URL="..." \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="..." \
  -e SUPABASE_SERVICE_KEY="..." \
  midday-api:test

# Test the health endpoint
curl http://localhost:8080/health
```

## Troubleshooting

### Build fails with "turbo prune" error
- Ensure you're building from the monorepo root
- Check that `turbo.json` exists
- Verify all package.json files are present

### Build fails with workspace dependency errors
- The `turbo prune` command should handle all workspace deps
- Check that all packages listed in apps/api/package.json exist in packages/

### Runtime errors about missing packages
- Verify all workspace packages are being copied by turbo prune
- Check that bun.lock is included in the build
- Ensure `bun install --frozen-lockfile` succeeds

### Out of memory during build
- Increase VM memory in fly.toml (currently 1GB)
- Use `fly scale memory 2048` for larger memory

### API not responding
- Check logs: `fly logs --app midday-api-christian`
- Verify health check: `fly checks list --app midday-api-christian`
- Ensure all required secrets are set
- Check database connectivity

## Scaling

```bash
# Scale to multiple instances
fly scale count 2 --app midday-api-christian

# Scale memory
fly scale memory 2048 --app midday-api-christian

# Scale VM type
fly scale vm shared-cpu-2x --app midday-api-christian
```

## Environment Variables

The following environment variables are set automatically:
- `PORT=8080` - The port the API listens on
- `NODE_ENV=production` - Production mode

Additional variables can be set via Fly.io secrets.

## Monitoring

```bash
# View metrics
fly dashboard --app midday-api-christian

# SSH into running instance
fly ssh console --app midday-api-christian

# Check running processes
fly ssh console -C "ps aux" --app midday-api-christian
```

## Rolling Back

```bash
# List releases
fly releases --app midday-api-christian

# Rollback to previous version
fly releases rollback --app midday-api-christian
```

## CI/CD Integration

For automated deployments, add this to your GitHub Actions:

```yaml
name: Deploy API to Fly.io

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only --config apps/api/fly.toml --app midday-api-christian
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## Notes

- The Dockerfile is optimized for Bun 1.2.22
- Uses multi-stage builds to minimize final image size
- Health checks ensure the app is running correctly
- Auto-stop/start helps reduce costs during low traffic
- The build context is the entire monorepo root (required for turbo prune)
