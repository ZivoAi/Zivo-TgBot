# Deployment Guide

## Prerequisites

- Docker and Docker Compose (for containerization)
- Kubernetes cluster (for production deployment)
- Helm 3.0+ (for Kubernetes deployment)
- GitHub Container Registry access (or Docker Hub)
- Telegram bot token from @BotFather
- ZivoPal service credentials

## Deployment Options

### 1. Docker Compose (Development/Staging)

```bash
# Build image
docker build -t zivopal-classroom-bot:latest .

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  bot:
    image: zivopal-classroom-bot:latest
    ports:
      - "3000:3000"
    environment:
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
      TELEGRAM_WEBHOOK_SECRET: ${TELEGRAM_WEBHOOK_SECRET}
      TELEGRAM_WEBHOOK_URL: ${TELEGRAM_WEBHOOK_URL}
      ZIVOPAL_API_URL: ${ZIVOPAL_API_URL}
      ZIVOPAL_CLIENT_ID: ${ZIVOPAL_CLIENT_ID}
      ZIVOPAL_CLIENT_SECRET: ${ZIVOPAL_CLIENT_SECRET}
      NODE_ENV: production
      LOG_LEVEL: info
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
EOF

# Create .env.production
cp .env.example .env.production
# Edit with production values

# Run
docker-compose up -d
docker-compose logs -f bot
```

### 2. Kubernetes with Helm (Production)

#### Step 1: Create Namespace and Secrets

```bash
kubectl create namespace zivopal-classroom-bot

# Create secret with sensitive data
kubectl create secret generic classroom-bot-secrets \
  --from-literal=TELEGRAM_BOT_TOKEN="YOUR_TOKEN" \
  --from-literal=TELEGRAM_WEBHOOK_SECRET="YOUR_SECRET" \
  --from-literal=ZIVOPAL_CLIENT_SECRET="YOUR_SECRET" \
  -n zivopal-classroom-bot
```

#### Step 2: Update Helm Values

```bash
# Create custom values file
cat > values-prod.yaml << 'EOF'
replicaCount: 3

image:
  registry: ghcr.io
  repository: your-org/zivopal-classroom-bot
  tag: v1.0.0

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: classroom-bot.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: classroom-bot-tls
      hosts:
        - classroom-bot.yourdomain.com

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

telegram:
  botToken: "" # Set via kubectl secret
  webhookUrl: "https://classroom-bot.yourdomain.com/webhook"

zivopal:
  apiUrl: "https://api.zivopal.com"
  clientId: "your-client-id"

resources:
  requests:
    cpu: 200m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi
EOF

# Install/update release
helm upgrade --install zivopal-classroom-bot ./helm \
  -f values-prod.yaml \
  -n zivopal-classroom-bot
```

#### Step 3: Verify Deployment

```bash
# Check pod status
kubectl get pods -n zivopal-classroom-bot
kubectl describe pod <pod-name> -n zivopal-classroom-bot

# Check logs
kubectl logs -f deployment/zivopal-classroom-bot -n zivopal-classroom-bot

# Test webhook
kubectl port-forward svc/classroom-bot-svc 3000:80 -n zivopal-classroom-bot
curl http://localhost:3000/health
```

### 3. AWS ECS (Production)

#### Step 1: Push Image to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name zivopal-classroom-bot

# Login and push
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

docker tag zivopal-classroom-bot:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/zivopal-classroom-bot:latest

docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/zivopal-classroom-bot:latest
```

#### Step 2: Create ECS Task Definition

```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

See `ecs-task-definition.json` in repo.

#### Step 3: Create ECS Service

```bash
aws ecs create-service \
  --cluster classroom-bot-cluster \
  --service-name classroom-bot \
  --task-definition classroom-bot:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### 4. Google Cloud Run (Serverless)

```bash
# Build and push
gcloud builds submit --tag gcr.io/YOUR_PROJECT/zivopal-classroom-bot

# Deploy
gcloud run deploy zivopal-classroom-bot \
  --image gcr.io/YOUR_PROJECT/zivopal-classroom-bot \
  --platform managed \
  --region us-central1 \
  --set-env-vars TELEGRAM_BOT_TOKEN=YOUR_TOKEN,TELEGRAM_WEBHOOK_SECRET=YOUR_SECRET \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --concurrency 80
```

## Post-Deployment

### 1. Configure Telegram Webhook

```bash
WEBHOOK_URL=$(kubectl get ingress -n zivopal-classroom-bot -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}')

curl -X POST \
  "https://api.telegram.org/botYOUR_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://$WEBHOOK_URL/webhook\",
    \"secret_token\": \"YOUR_SECRET\"
  }"
```

### 2. Verify Health

```bash
curl https://classroom-bot.yourdomain.com/health
curl https://classroom-bot.yourdomain.com/readiness
```

### 3. Monitor Logs

```bash
# Kubernetes
kubectl logs -f deployment/zivopal-classroom-bot -n zivopal-classroom-bot

# Docker Compose
docker-compose logs -f bot

# ECS
aws logs tail /ecs/classroom-bot --follow

# Cloud Run
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=zivopal-classroom-bot" --limit 50 --follow
```

### 4. Setup Monitoring & Alerts

#### Prometheus (Kubernetes)

```bash
# Install Prometheus operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack

# Create ServiceMonitor
kubectl apply -f - << 'EOF'
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: classroom-bot
  namespace: zivopal-classroom-bot
spec:
  selector:
    matchLabels:
      app: classroom-bot
  endpoints:
  - port: http
    interval: 30s
    path: /metrics
EOF
```

#### Sentry (Error Tracking)

```bash
# Set Sentry DSN in environment
kubectl set env deployment/zivopal-classroom-bot \
  SENTRY_DSN="https://key@sentry.io/project-id" \
  SENTRY_ENABLED=true \
  -n zivopal-classroom-bot
```

## Scaling & Performance

### Auto-scaling (Kubernetes)

```bash
# HPA already configured in Helm values
# Monitor:
kubectl get hpa -n zivopal-classroom-bot -w

# Manual scale
kubectl scale deployment/zivopal-classroom-bot --replicas=5 -n zivopal-classroom-bot
```

### Resource Optimization

- **Memory**: Min 256Mi per pod; increase for high-volume environments
- **CPU**: Min 100m; adjust based on LLM usage
- **Connection limits**: Max 40 concurrent Telegram connections per instance

### Redis Caching (Optional)

For high-frequency classification and muting:

```bash
helm install redis bitnami/redis \
  --set auth.enabled=true \
  --set auth.password=YOUR_PASSWORD \
  -n zivopal-classroom-bot

# Update bot environment
kubectl set env deployment/zivopal-classroom-bot \
  REDIS_ENABLED=true \
  REDIS_URL=redis://:PASSWORD@redis-master:6379 \
  -n zivopal-classroom-bot
```

## Backup & Disaster Recovery

### State Persistence

All state is persisted to `zivopal-core` API. No database backups needed.

### Webhook Recovery

If webhook fails, Telegram queues updates for 24 hours:

```bash
# Get pending updates (fallback polling)
curl "https://api.telegram.org/botYOUR_TOKEN/getUpdates?limit=100"
```

### Configuration Backups

```bash
# Backup Helm values
helm get values zivopal-classroom-bot -n zivopal-classroom-bot > helm-values-backup.yaml

# Backup Kubernetes manifest
kubectl get all -n zivopal-classroom-bot -o yaml > k8s-backup.yaml
```

## Troubleshooting

### Pod Not Starting

```bash
kubectl describe pod <pod-name> -n zivopal-classroom-bot
kubectl logs <pod-name> -n zivopal-classroom-bot

# Check events
kubectl get events -n zivopal-classroom-bot --sort-by='.lastTimestamp'
```

### Webhook Not Receiving Updates

1. Verify webhook endpoint is publicly accessible:
   ```bash
   curl -I https://classroom-bot.yourdomain.com/webhook
   ```

2. Check webhook registration:
   ```bash
   curl "https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo"
   ```

3. Verify secret token matches:
   ```bash
   # Check in logs for signature validation errors
   ```

### High Latency

- Increase Pod resources
- Enable Redis caching
- Check zivopal-core API response times
- Review LLM provider latency

### Out of Memory

1. Check memory usage:
   ```bash
   kubectl top pods -n zivopal-classroom-bot
   ```

2. Increase memory limits in Helm values
3. Reduce Redis cache size or disable if not needed

## Rollback

```bash
# Helm rollback
helm rollback zivopal-classroom-bot 1 -n zivopal-classroom-bot

# Kubernetes deployment
kubectl rollout undo deployment/zivopal-classroom-bot -n zivopal-classroom-bot
```

## Next Steps

1. Configure monitoring and alerting
2. Setup automated backups (if needed)
3. Configure CI/CD pipeline for automated deployments
4. Run load tests to determine optimal scaling
5. Setup incident response procedures
