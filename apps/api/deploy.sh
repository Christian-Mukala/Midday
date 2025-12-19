#!/bin/bash
set -e

# Midday API Deployment Script for Fly.io
# Usage: ./deploy.sh [--local-test]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
APP_NAME="midday-api-christian"

echo "🚀 Midday API Deployment"
echo "========================"
echo "Repository root: $REPO_ROOT"
echo "App name: $APP_NAME"
echo ""

# Check if running local test
if [ "$1" == "--local-test" ]; then
    echo "📦 Building Docker image locally..."
    cd "$REPO_ROOT"
    docker build -f apps/api/Dockerfile -t midday-api:local .

    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "To run locally, use:"
    echo "docker run -p 8080:8080 \\"
    echo "  -e DATABASE_URL=\"postgresql://...\" \\"
    echo "  -e UPSTASH_REDIS_REST_URL=\"...\" \\"
    echo "  -e UPSTASH_REDIS_REST_TOKEN=\"...\" \\"
    echo "  -e NEXT_PUBLIC_SUPABASE_URL=\"...\" \\"
    echo "  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=\"...\" \\"
    echo "  -e SUPABASE_SERVICE_KEY=\"...\" \\"
    echo "  midday-api:local"
    exit 0
fi

# Check if flyctl is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Error: flyctl is not installed"
    echo "Install it from: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Check if logged in to Fly.io
if ! fly auth whoami &> /dev/null; then
    echo "❌ Error: Not logged in to Fly.io"
    echo "Run: fly auth login"
    exit 1
fi

# Verify we're in the right directory
if [ ! -f "$REPO_ROOT/turbo.json" ]; then
    echo "❌ Error: Not in monorepo root (turbo.json not found)"
    exit 1
fi

if [ ! -f "$REPO_ROOT/apps/api/fly.toml" ]; then
    echo "❌ Error: fly.toml not found in apps/api/"
    exit 1
fi

echo "✅ Pre-flight checks passed"
echo ""

# Navigate to repo root (required for turbo prune)
cd "$REPO_ROOT"

# Show current app status
echo "📊 Current app status:"
fly status --app "$APP_NAME" || echo "App not yet deployed"
echo ""

# Confirm deployment
read -p "🔄 Deploy to Fly.io? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "🚀 Deploying to Fly.io..."
echo ""

# Deploy from root with config pointing to apps/api/fly.toml
fly deploy --config apps/api/fly.toml --app "$APP_NAME"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 App status:"
fly status --app "$APP_NAME"
echo ""
echo "🔍 Recent logs:"
fly logs --app "$APP_NAME" -n 50
echo ""
echo "🌐 API URL: https://${APP_NAME}.fly.dev"
echo "🏥 Health check: https://${APP_NAME}.fly.dev/health"
echo "📚 API docs: https://${APP_NAME}.fly.dev/"
echo ""
echo "To view live logs: fly logs --app $APP_NAME"
echo "To SSH into instance: fly ssh console --app $APP_NAME"
