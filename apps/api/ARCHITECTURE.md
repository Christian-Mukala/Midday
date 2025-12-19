# Midday API Architecture & Build Process

## Monorepo Structure

```
midday/
├── apps/
│   ├── api/              # ← API we're deploying
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── trpc/
│   │   │   ├── rest/
│   │   │   └── ai/
│   │   ├── Dockerfile    # ← Multi-stage build
│   │   ├── fly.toml
│   │   └── package.json  # Depends on 18+ workspace packages
│   ├── engine/           # Cloudflare Worker
│   ├── dashboard/        # Next.js app
│   └── worker/           # Background jobs
├── packages/
│   ├── cache/           # Redis client
│   ├── db/              # PostgreSQL + Drizzle ORM
│   ├── engine-client/   # Engine communication
│   ├── supabase/        # Supabase client
│   ├── utils/           # Shared utilities
│   └── ... 17 more packages
├── turbo.json           # Turborepo config
├── package.json         # Root package.json
├── bun.lock            # Lockfile
└── .dockerignore       # Build optimization
```

## Dependency Graph

```
@midday/api
├── @midday/cache ────────────┐
├── @midday/db ───────────────┼─> redis
│   ├── @midday/cache ────────┤
│   ├── @midday/encryption   │
│   ├── @midday/logger       │
│   └── @midday/utils ───────┼─> drizzle-orm, pg
├── @midday/engine-client    │
├── @midday/supabase ─────────┼─> @supabase/supabase-js
├── @midday/documents        │
├── @midday/encryption       │
├── @midday/events ──────────┼─> tinybird
├── @midday/import           │
├── @midday/inbox ───────────┼─> mailparser
├── @midday/invoice ─────────┼─> pdfkit
├── @midday/jobs             │
├── @midday/logger ──────────┼─> pino
└── ... 6 more packages      │
                             │
Total: 18 workspace packages │
       50+ npm packages ─────┘
```

## Docker Build Process

### Stage 1: Turbo CLI Installation
```
┌─────────────────────────────┐
│  oven/bun:1.2.22            │
│  + bun add -g turbo         │
└──────────┬──────────────────┘
           │
           ▼
      turbo-cli
```

### Stage 2: Workspace Pruning
```
┌─────────────────────────────────────────────────┐
│  COPY . .  (entire monorepo)                    │
│  turbo prune @midday/api --docker               │
│                                                  │
│  Input: Full monorepo (500+ files)              │
│  Output: Minimal workspace (100 files)          │
│                                                  │
│  out/api/                                        │
│  ├── json/          # package.json files only   │
│  │   ├── package.json                           │
│  │   ├── bun.lock                               │
│  │   ├── apps/api/package.json                  │
│  │   └── packages/*/package.json  (18 pkgs)     │
│  └── full/          # complete source           │
│      ├── apps/api/                              │
│      └── packages/   (18 packages)              │
└─────────────────────────────────────────────────┘
```

### Stage 3: Dependency Installation
```
┌─────────────────────────────────────────────────┐
│  COPY --from=builder /app/out/api/json/ .      │
│  COPY --from=builder /app/out/api/full/ .      │
│                                                  │
│  bun install --frozen-lockfile                  │
│  → Installs exact versions from bun.lock        │
│  → Resolves workspace:* to local packages       │
│  → Total: ~200 packages in node_modules         │
│                                                  │
│  cd apps/engine && bun run build                │
│  → Generates dist/index.js & dist/index.d.ts    │
│  → Needed by @midday/engine imports             │
└─────────────────────────────────────────────────┘
```

### Stage 4: Runner
```
┌─────────────────────────────────────────────────┐
│  FROM installer (inherits all from stage 3)    │
│  WORKDIR /app/apps/api                          │
│                                                  │
│  ENV NODE_ENV=production                        │
│  ENV PORT=8080                                  │
│                                                  │
│  CMD ["bun", "run", "src/index.ts"]            │
│                                                  │
│  Final image size: ~800MB                       │
│  (Bun runtime + deps + source)                  │
└─────────────────────────────────────────────────┘
```

## Runtime Architecture on Fly.io

```
Internet
   │
   ▼
┌────────────────────────────────────────────────────┐
│ Fly.io Edge (SSL, DDoS protection)                 │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│ Load Balancer (Fly Proxy)                          │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│ Firecracker MicroVM (iad region)                   │
│ ┌────────────────────────────────────────────────┐ │
│ │ Bun Runtime (1 CPU, 1GB RAM)                   │ │
│ │                                                 │ │
│ │ ┌─────────────────────────────────────────┐   │ │
│ │ │ Hono HTTP Server (port 8080)            │   │ │
│ │ │                                          │   │ │
│ │ │ /health ──> Health Check                │   │ │
│ │ │ /trpc/* ──> tRPC Router                 │   │ │
│ │ │ /v1/*   ──> REST API                    │   │ │
│ │ │ /       ──> Scalar API Docs             │   │ │
│ │ └────────┬────────────────────────────────┘   │ │
│ │          │                                     │ │
│ │          ├─> PostgreSQL (external)             │ │
│ │          ├─> Redis (Upstash)                   │ │
│ │          ├─> Supabase Storage                  │ │
│ │          └─> OpenAI API                        │ │
│ └────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

## API Request Flow

```
1. Client Request
   │
   ▼
2. Fly.io Edge
   │ ├─> HTTPS termination
   │ └─> DDoS protection
   ▼
3. Hono Middleware Chain
   │ ├─> CORS (allowed origins)
   │ ├─> Security Headers
   │ ├─> HTTP Logger (pino)
   │ └─> Rate Limiting
   ▼
4. Router
   │ ├─> /trpc/* → tRPC (using @hono/trpc-server)
   │ ├─> /v1/*   → REST API (OpenAPI)
   │ └─> /health → { status: "ok" }
   ▼
5. Business Logic
   │ ├─> AI Agents (OpenAI SDK)
   │ ├─> Database Queries (Drizzle)
   │ ├─> Cache Lookup (Redis)
   │ └─> External APIs
   ▼
6. Response
   └─> JSON / Stream
```

## Health Check Flow

```
Fly.io Health Checker (every 60s)
   │
   ▼
GET https://midday-api-christian.fly.dev/health
   │
   ▼
┌────────────────────────────────┐
│ if (response.status === 200)   │
│   ✅ Healthy                    │
│ else                            │
│   ❌ Unhealthy → restart        │
└────────────────────────────────┘
```

## Environment Variables

### Build Time (in Dockerfile)
- `NODE_ENV=production`
- `PORT=8080`

### Runtime (from Fly.io secrets)
Required:
- `DATABASE_URL` → PostgreSQL connection
- `UPSTASH_REDIS_REST_URL` → Redis endpoint
- `UPSTASH_REDIS_REST_TOKEN` → Redis auth
- `NEXT_PUBLIC_SUPABASE_URL` → Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Supabase public key
- `SUPABASE_SERVICE_KEY` → Supabase admin key

Optional (based on features):
- `OPENAI_API_KEY` → AI features
- `RESEND_API_KEY` → Email sending
- `ENGINE_API_KEY` → Engine communication
- `API_ROUTE_SECRET` → API auth
- `FILE_KEY_SECRET` → File encryption
- `MIDDAY_ENCRYPTION_KEY` → Data encryption
- `ALLOWED_API_ORIGINS` → CORS whitelist

## Auto-scaling Behavior

```
Traffic Pattern:
  Low    │ ███                    │
  Medium │ ██████                 │
  High   │ █████████████          │
         └─────────────────────────
         0s   10s   20s   30s

Machine State:
  ┌─────────────────────────────┐
  │ 0 requests for 5 minutes    │
  │ ↓                           │
  │ Auto-suspend (save costs)   │
  └─────────────────────────────┘

  ┌─────────────────────────────┐
  │ Request arrives              │
  │ ↓                           │
  │ Auto-start (~2s cold start) │
  └─────────────────────────────┘

  ┌─────────────────────────────┐
  │ Continuous requests         │
  │ ↓                           │
  │ Stay running                │
  └─────────────────────────────┘
```

## Cost Optimization

```
Current Configuration:
├─ 1 machine (iad region)
├─ 1 shared CPU
├─ 1GB RAM
└─ Auto-suspend enabled

Estimated Monthly Cost:
├─ Running 24/7: ~$7-10/month
├─ With auto-suspend (8h/day): ~$2-3/month
└─ Bandwidth: Usually included in free tier
```

## Monitoring Stack

```
┌─────────────────────────────────┐
│ Application                     │
│ ├─> Pino Logger                 │
│ └─> Sentry Error Tracking       │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Fly.io Platform                 │
│ ├─> Health Checks               │
│ ├─> Metrics Dashboard           │
│ ├─> Log Aggregation             │
│ └─> Crash Reporting             │
└─────────────────────────────────┘
```

## Security Layers

```
1. Network Level
   └─> Fly.io firewall
   └─> HTTPS only (force_https: true)

2. Application Level
   └─> CORS (allowed origins only)
   └─> Security headers (Hono middleware)
   └─> Rate limiting

3. Authentication
   └─> Bearer tokens
   └─> API keys (hashed in database)
   └─> Supabase JWT validation

4. Data Level
   └─> Encryption at rest (DATABASE_URL over SSL)
   └─> Secrets in Fly.io vault (not in env files)
   └─> File encryption (FILE_KEY_SECRET)
```

## Deployment Pipeline

```
Developer
   │
   ▼
Local Machine
   │ (git push)
   ▼
GitHub
   │ (optional: GitHub Actions)
   ▼
Fly.io Build
   │ 1. Clone repository
   │ 2. Build Docker image
   │ 3. Push to Fly.io registry
   │ 4. Deploy to machine
   │ 5. Health check
   │ 6. Route traffic
   ▼
Production (iad)
```

## Rollback Strategy

```
Version History:
v1 ──> v2 ──> v3 ──> v4 (current)
                 ▲
                 │
          fly releases rollback
                 │
         (< 1 minute downtime)
```

## Data Flow Example: AI Chat

```
User: "What's my account balance?"
   │
   ▼
POST /trpc/ai.chat
   │
   ├─> Auth Check (Supabase JWT)
   │   └─> Valid ✅
   │
   ├─> Rate Limit Check (Redis)
   │   └─> Within limits ✅
   │
   ├─> AI Agent (OpenAI SDK)
   │   ├─> Determine intent: "balance_query"
   │   └─> Select tool: get-account-balances
   │
   ├─> Database Query (Drizzle)
   │   └─> SELECT * FROM accounts WHERE user_id = ?
   │
   ├─> Cache Result (Redis)
   │   └─> SET balance:user123 = {...}
   │
   └─> Stream Response
       └─> "Your current balance is $1,234.56"
```

## Key Technical Decisions

1. **Bun over Node.js**
   - Faster startup time
   - Native TypeScript support
   - Better performance for API workloads

2. **Turbo Prune over Manual Copy**
   - Handles workspace deps automatically
   - Officially supported by Turborepo
   - Reproducible builds

3. **Multi-stage Build**
   - Smaller final image
   - Faster deploys
   - Better layer caching

4. **Hono over Express**
   - Edge-ready
   - Built-in OpenAPI support
   - Better TypeScript integration

5. **Fly.io over Vercel/Railway**
   - Full control over runtime
   - Better for Bun applications
   - More cost-effective for APIs
   - Global distribution ready
