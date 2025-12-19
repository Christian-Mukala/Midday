# Midday API - Quick Start Deployment

## 🚀 Deploy in 5 Minutes

### Prerequisites Check
```bash
# 1. Verify flyctl is installed
fly version

# 2. Verify you're logged in
fly auth whoami

# 3. Verify app exists
fly status --app midday-api-christian
```

### Deploy Now
```bash
# Navigate to monorepo root
cd /mnt/c/Users/Owner/Documents/midday

# Deploy!
fly deploy --config apps/api/fly.toml --app midday-api-christian
```

That's it! Your API will be available at:
- **API URL**: https://midday-api-christian.fly.dev
- **Health Check**: https://midday-api-christian.fly.dev/health
- **API Docs**: https://midday-api-christian.fly.dev/

---

## 🧪 Test Before Deploy (Optional)

### Test Docker Build Locally
```bash
cd /mnt/c/Users/Owner/Documents/midday/apps/api
./deploy.sh --local-test
```

### Run Locally
```bash
# Create a .env.local file
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://..."
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_KEY="..."
EOF

# Run with Docker
docker run -p 8080:8080 --env-file .env.local midday-api:local

# Test
curl http://localhost:8080/health
```

---

## ✅ Verify Deployment

After deploying, run these checks:

```bash
# 1. Check app status
fly status --app midday-api-christian

# 2. Test health endpoint
curl https://midday-api-christian.fly.dev/health
# Expected: {"status":"ok"}

# 3. View logs
fly logs --app midday-api-christian

# 4. Check metrics
fly dashboard --app midday-api-christian
```

---

## 🔧 Common Commands

### View Logs
```bash
fly logs --app midday-api-christian
```

### Restart App
```bash
fly machines restart --app midday-api-christian
```

### SSH into Instance
```bash
fly ssh console --app midday-api-christian
```

### Scale Up
```bash
# More instances
fly scale count 2 --app midday-api-christian

# More memory
fly scale memory 2048 --app midday-api-christian
```

### Rollback
```bash
fly releases rollback --app midday-api-christian
```

---

## 📚 Need More Info?

- **Full deployment guide**: `DEPLOYMENT.md`
- **Command reference**: `FLY_COMMANDS.md`
- **Architecture overview**: `ARCHITECTURE.md`
- **Solution details**: `DEPLOYMENT_SOLUTION.md`

---

## 🐛 Troubleshooting

### Build Fails
1. Check you're in monorepo root: `/mnt/c/Users/Owner/Documents/midday`
2. Verify turbo.json exists: `ls turbo.json`
3. Check Docker is running: `docker ps`

### App Won't Start
1. Check secrets are set: `fly secrets list --app midday-api-christian`
2. View error logs: `fly logs --app midday-api-christian`
3. Verify database is accessible

### Health Check Failing
1. Check app is running: `fly status --app midday-api-christian`
2. Check logs: `fly logs --app midday-api-christian`
3. Restart: `fly machines restart --app midday-api-christian`

---

## 🎯 Next Steps After Deployment

1. **Set custom domain** (optional)
   ```bash
   fly certs create api.yourdomain.com --app midday-api-christian
   ```

2. **Enable autoscaling** (optional)
   ```bash
   fly autoscale set min=1 max=3 --app midday-api-christian
   ```

3. **Setup monitoring** (optional)
   - Configure Sentry: Set `SENTRY_DSN` secret
   - Setup alerts in Fly.io dashboard

4. **Configure CI/CD** (optional)
   - See `DEPLOYMENT.md` for GitHub Actions example

---

## 💡 Pro Tips

1. **Faster deploys**: Don't change workspace packages unnecessarily
2. **Save costs**: Let auto-suspend work (enabled by default)
3. **Monitor**: Check logs regularly for errors
4. **Update secrets**: Use `fly secrets set` instead of redeploying
5. **Test locally**: Always test with `./deploy.sh --local-test` first

---

## 📞 Support

- Fly.io Docs: https://fly.io/docs/
- Fly.io Community: https://community.fly.io/
- Check status: https://status.flyio.net/
