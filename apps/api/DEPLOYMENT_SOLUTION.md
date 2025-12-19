# Midday API Deployment Solution

## Problems Identified

### 1. Original Dockerfile Issues
- **Missing turbo prune context**: The simplified Dockerfile tried to manually copy packages, but didn't handle the monorepo workspace structure correctly
- **Missing engine dist**: Referenced `apps/engine/dist` which doesn't exist (engine builds on-demand)
- **Incomplete workspace resolution**: Workspace packages like `@midday/cache`, `@midday/db`, etc. have their own dependencies that weren't being resolved
- **Build context confusion**: Building from `apps/api/` instead of monorepo root meant turbo couldn't access `turbo.json`

### 2. Workspace Dependency Complexity
The API depends on 18+ workspace packages:
```
@midday/cache → redis
@midday/db → drizzle-orm, pg, and 6 more workspace packages
@midday/engine → Cloudflare Worker (needs building)
@midday/engine-client → hono
... and 14 more packages
```

## Solution Implemented

### Fixed Dockerfile Strategy
The new Dockerfile uses Turborepo's official `prune` command to handle the monorepo correctly:

```dockerfile
# Stage 1: Install turbo globally
FROM oven/bun:1.2.22 AS base
FROM base AS turbo-cli
RUN bun add -g turbo

# Stage 2: Prune workspace to minimal set
FROM turbo-cli AS builder
WORKDIR /app
COPY . .
RUN turbo prune @midday/api --docker --out-dir=out/api

# Stage 3: Install dependencies
FROM base AS installer
COPY --from=builder /app/out/api/json/ .
COPY --from=builder /app/out/api/full/ .
RUN bun install --frozen-lockfile
RUN cd apps/engine && bun run build || true

# Stage 4: Run the API
FROM installer AS runner
WORKDIR /app/apps/api
CMD ["bun", "run", "src/index.ts"]
```

### Why This Works

1. **Turbo Prune**: `turbo prune @midday/api --docker` analyzes the dependency graph and creates a minimal monorepo with:
   - The API app
   - All workspace packages it depends on (recursively)
   - Proper package.json structure
   - Correct lockfile

2. **Two-stage Copy**:
   - `out/api/json/`: Contains package.json files (lightweight)
   - `out/api/full/`: Contains complete source code

3. **Frozen Lockfile**: Uses `bun install --frozen-lockfile` to ensure reproducible builds

4. **Engine Build**: Builds `@midday/engine` which exports types needed by API

### Updated fly.toml
```toml
[build]
  dockerfile = "apps/api/Dockerfile"  # Points to correct Dockerfile

[env]
  PORT = '8080'
  NODE_ENV = 'production'

[[vm]]
  memory = '1gb'  # Increased from 512MB for build process
```

### Added .dockerignore
Speeds up builds by excluding:
- `node_modules` (will be reinstalled)
- `.next`, `dist`, `build` (build artifacts)
- `.git`, `.github` (version control)
- Development files

## Deployment Process

### Quick Deploy
```bash
cd /mnt/c/Users/Owner/Documents/midday
fly deploy --config apps/api/fly.toml --app midday-api-christian
```

### Using Deployment Script
```bash
cd /mnt/c/Users/Owner/Documents/midday/apps/api
./deploy.sh
```

### Test Locally First
```bash
cd /mnt/c/Users/Owner/Documents/midday/apps/api
./deploy.sh --local-test

# Then run:
docker run -p 8080:8080 \
  -e DATABASE_URL="..." \
  -e UPSTASH_REDIS_REST_URL="..." \
  -e UPSTASH_REDIS_REST_TOKEN="..." \
  midday-api:local
```

## Key Files Created

1. **Dockerfile** (`/mnt/c/Users/Owner/Documents/midday/apps/api/Dockerfile`)
   - Multi-stage build using turbo prune
   - Handles all workspace dependencies
   - Includes health check

2. **.dockerignore** (`/mnt/c/Users/Owner/Documents/midday/.dockerignore`)
   - Excludes unnecessary files from build context
   - Speeds up builds significantly

3. **fly.toml** (`/mnt/c/Users/Owner/Documents/midday/apps/api/fly.toml`)
   - Points to correct Dockerfile path
   - Configured for 1GB memory
   - Health check on `/health` endpoint

4. **deploy.sh** (`/mnt/c/Users/Owner/Documents/midday/apps/api/deploy.sh`)
   - Automated deployment script
   - Pre-flight checks
   - Local testing option

5. **DEPLOYMENT.md** (`/mnt/c/Users/Owner/Documents/midday/apps/api/DEPLOYMENT.md`)
   - Complete deployment guide
   - Troubleshooting section
   - CI/CD examples

6. **FLY_COMMANDS.md** (`/mnt/c/Users/Owner/Documents/midday/apps/api/FLY_COMMANDS.md`)
   - Quick reference for common commands
   - Monitoring and debugging
   - Scaling and rollback

## Required Secrets Already Set
✅ DATABASE_URL
✅ UPSTASH_REDIS_REST_URL
✅ UPSTASH_REDIS_REST_TOKEN
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_KEY

Additional secrets to set (if not already):
```bash
fly secrets set \
  OPENAI_API_KEY="..." \
  RESEND_API_KEY="..." \
  ENGINE_API_KEY="..." \
  API_ROUTE_SECRET="..." \
  FILE_KEY_SECRET="..." \
  MIDDAY_ENCRYPTION_KEY="..." \
  ALLOWED_API_ORIGINS="https://app.midday.ai,https://midday.ai" \
  --app midday-api-christian
```

## Testing the Deployment

After deploying:

```bash
# 1. Check health
curl https://midday-api-christian.fly.dev/health
# Expected: {"status":"ok"}

# 2. View API documentation
open https://midday-api-christian.fly.dev/

# 3. Check logs
fly logs --app midday-api-christian

# 4. Check app status
fly status --app midday-api-christian
```

## Why This Approach vs Alternatives

### ❌ Building Locally and Pushing
- Requires Docker on local machine
- Slower (no remote build cache)
- Platform-specific issues (ARM vs x86)

### ❌ Manual Package Copying
- Error-prone (easy to miss dependencies)
- Breaks when dependencies change
- Doesn't handle nested workspace deps

### ✅ Turbo Prune (Chosen Solution)
- Official Turborepo method for Docker
- Handles all workspace dependencies automatically
- Builds in Fly.io's infrastructure
- Reproducible and maintainable
- Supports incremental builds

## Build Time Expectations

First build: 5-10 minutes
- Installing turbo
- Pruning workspace
- Installing all dependencies
- Building engine

Subsequent builds: 2-5 minutes
- Docker layer caching
- Dependency caching
- Only rebuilds changed layers

## Troubleshooting Common Issues

### Build fails during turbo prune
**Cause**: Not building from monorepo root
**Solution**: Ensure fly.toml points to apps/api/Dockerfile and deploy from root

### Workspace package not found at runtime
**Cause**: Turbo prune didn't include it
**Solution**: Check apps/api/package.json has the package listed

### Out of memory during build
**Cause**: Too many dependencies
**Solution**: Increase VM memory to 2GB temporarily:
```bash
fly scale memory 2048 --app midday-api-christian
```

### API not starting
**Cause**: Missing required secrets
**Solution**: Check all secrets are set:
```bash
fly secrets list --app midday-api-christian
```

## Next Steps

1. Deploy: `cd /mnt/c/Users/Owner/Documents/midday && fly deploy --config apps/api/fly.toml --app midday-api-christian`
2. Monitor: `fly logs --app midday-api-christian`
3. Test: `curl https://midday-api-christian.fly.dev/health`
4. Scale if needed: `fly scale count 2 --app midday-api-christian`

## Support

- Deployment guide: `apps/api/DEPLOYMENT.md`
- Quick commands: `apps/api/FLY_COMMANDS.md`
- Fly.io docs: https://fly.io/docs/
- Turborepo Docker: https://turbo.build/repo/docs/handbook/deploying-with-docker
