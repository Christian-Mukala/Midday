# Fly.io Quick Reference for Midday API

## Deployment

```bash
# Deploy from monorepo root
cd /mnt/c/Users/Owner/Documents/midday
fly deploy --config apps/api/fly.toml --app midday-api-christian

# Or use the deployment script
cd /mnt/c/Users/Owner/Documents/midday/apps/api
./deploy.sh

# Test Docker build locally
./deploy.sh --local-test
```

## Monitoring

```bash
# View app status
fly status --app midday-api-christian

# Live logs (follow)
fly logs --app midday-api-christian

# Last 50 log lines
fly logs --app midday-api-christian -n 50

# Health checks status
fly checks list --app midday-api-christian

# View metrics dashboard
fly dashboard --app midday-api-christian
```

## Secrets Management

```bash
# List all secrets
fly secrets list --app midday-api-christian

# Set a secret
fly secrets set SECRET_NAME="value" --app midday-api-christian

# Set multiple secrets
fly secrets set \
  DATABASE_URL="postgresql://..." \
  REDIS_URL="redis://..." \
  --app midday-api-christian

# Unset a secret
fly secrets unset SECRET_NAME --app midday-api-christian

# Import secrets from .env file
fly secrets import --app midday-api-christian < .env.production
```

## Scaling

```bash
# Scale to multiple instances
fly scale count 2 --app midday-api-christian

# Scale back to one instance
fly scale count 1 --app midday-api-christian

# Increase memory
fly scale memory 2048 --app midday-api-christian

# Upgrade to larger VM
fly scale vm shared-cpu-2x --app midday-api-christian

# View current scaling
fly scale show --app midday-api-christian
```

## Debugging

```bash
# SSH into running instance
fly ssh console --app midday-api-christian

# Run a command in the instance
fly ssh console -C "bun --version" --app midday-api-christian
fly ssh console -C "ps aux" --app midday-api-christian
fly ssh console -C "ls -la /app/apps/api" --app midday-api-christian

# Test health endpoint
curl https://midday-api-christian.fly.dev/health

# Test API endpoint
curl https://midday-api-christian.fly.dev/
```

## Releases & Rollback

```bash
# List all releases
fly releases --app midday-api-christian

# View release details
fly releases --app midday-api-christian --verbose

# Rollback to previous version
fly releases rollback --app midday-api-christian

# Rollback to specific version
fly releases rollback v5 --app midday-api-christian
```

## Machine Management

```bash
# List machines
fly machines list --app midday-api-christian

# Stop all machines
fly machines stop --app midday-api-christian

# Start machines
fly machines start --app midday-api-christian

# Restart machines
fly machines restart --app midday-api-christian

# Destroy and recreate (careful!)
fly apps restart midday-api-christian
```

## App Configuration

```bash
# View current configuration
cat apps/api/fly.toml

# View app info
fly info --app midday-api-christian

# View regions
fly regions list --app midday-api-christian

# Add a region
fly regions add ord --app midday-api-christian

# Remove a region
fly regions remove ord --app midday-api-christian

# Set primary region
fly regions set iad --app midday-api-christian
```

## Volumes (if needed later)

```bash
# Create a volume
fly volumes create data --size 10 --region iad --app midday-api-christian

# List volumes
fly volumes list --app midday-api-christian

# Extend volume size
fly volumes extend <volume-id> --size 20 --app midday-api-christian
```

## Performance & Costs

```bash
# View resource usage
fly dashboard --app midday-api-christian

# Check current pricing
fly platform pricing

# View org usage
fly orgs show

# Suspend app (stops all machines)
fly apps suspend midday-api-christian

# Resume app
fly apps resume midday-api-christian
```

## Database Connections

```bash
# Test database connection from app
fly ssh console -C "bun -e \"console.log(process.env.DATABASE_URL)\"" --app midday-api-christian

# Connect to database proxy (if using Fly Postgres)
fly proxy 5432 -a <postgres-app-name>

# Run migrations (if applicable)
fly ssh console -C "cd /app && bun run migrate" --app midday-api-christian
```

## Cleanup

```bash
# Destroy the app (careful - this is permanent!)
fly apps destroy midday-api-christian

# Before destroying, backup any necessary data:
fly ssh console -C "pg_dump ..." --app midday-api-christian > backup.sql
```

## Common Issues

### App not responding
```bash
# Check health
fly checks list --app midday-api-christian

# Check logs for errors
fly logs --app midday-api-christian

# Restart the app
fly machines restart --app midday-api-christian
```

### Build failing
```bash
# Check build logs
fly logs --app midday-api-christian

# Test build locally
cd /mnt/c/Users/Owner/Documents/midday
docker build -f apps/api/Dockerfile -t test .

# Check turbo.json exists
ls turbo.json
```

### Out of memory
```bash
# Increase memory allocation
fly scale memory 2048 --app midday-api-christian

# Or upgrade VM
fly scale vm shared-cpu-2x --app midday-api-christian
```

### Connection issues
```bash
# Check secrets are set
fly secrets list --app midday-api-christian

# Verify database connectivity
fly ssh console -C "bun -e \"fetch('DATABASE_URL').then(console.log)\"" --app midday-api-christian

# Check allowed origins
fly secrets list --app midday-api-christian | grep ALLOWED_API_ORIGINS
```

## Useful URLs

- App Dashboard: https://fly.io/apps/midday-api-christian
- API Health: https://midday-api-christian.fly.dev/health
- API Docs: https://midday-api-christian.fly.dev/
- Fly.io Docs: https://fly.io/docs/
- Fly.io Status: https://status.flyio.net/
