# TODO
# Deployment Runbook

## Local Development
```bash
# Install dependencies
pnpm install

# Start services
docker-compose -f infra/docker-compose/docker-compose.yml up

# Start web UI separately
cd apps/web
pnpm dev
```

## Production

1. Build Docker images
2. Deploy to container orchestration (K8s/ECS)
3. Configure environment variables
4. Set up Redis cluster