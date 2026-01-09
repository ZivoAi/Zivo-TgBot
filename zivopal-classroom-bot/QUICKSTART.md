# ZivoPal Classroom Bot - Quick Start

This is a production-ready Telegram classroom management bot with real-time moderation, engagement tracking, and curriculum support.

## 🚀 Quick Setup (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/zivopal/zivopal-classroom-bot.git
cd zivopal-classroom-bot
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Run locally
npm run dev

# 4. Test health endpoint
curl http://localhost:3000/health
```

## 📋 Requirements

### Before Starting

- [ ] Telegram bot token from @BotFather
- [ ] ZivoPal client credentials (ID + secret)
- [ ] Node.js >= 18.0.0
- [ ] npm >= 9.0.0

### For Production

- [ ] HTTPS domain for webhook
- [ ] Docker for containerization
- [ ] Kubernetes cluster (recommended for scale)
- [ ] Redis instance (optional, for caching)

## 🎯 Key Features

| Feature | Status | Notes |
|---------|--------|-------|
| Real-time Message Moderation | ✅ | Classifies spam, harassment, bullying, hate speech |
| Engagement Tracking | ✅ | Calculates quality, helpfulness, collaboration scores |
| Curriculum Support | ✅ | ZIMSEC, Cambridge, US K-12 frameworks |
| Teacher Dashboard APIs | ✅ | 6+ endpoints with JWT authentication |
| Multilingual (EN/SN) | ✅ | Full i18n support for English and Shona |
| Assignment Management | ✅ | Reminders, submissions, teacher notifications |
| Structured Audit Logging | ✅ | Every action logged to zivopal-core |
| Auto-muting & Escalation | ✅ | Configurable per-class moderation policies |

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Full feature overview and API reference |
| [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md) | Step-by-step bot configuration |
| [API_REQUIREMENTS.md](API_REQUIREMENTS.md) | Expected zivopal-core API contracts |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Docker, Kubernetes, AWS, GCP deployment |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development guidelines and code style |

## 🧪 Testing

```bash
# Run all tests with coverage
npm test

# Watch mode
npm run test:watch

# Integration tests only
npm run test:integration

# Check coverage
npm test -- --coverage
```

**Coverage Target**: 80%+ for all metrics

## 🔐 Security

- ✅ Service JWT authentication with zivopal-core
- ✅ PII redaction in logs and LLM prompts
- ✅ Webhook signature validation (HMAC-SHA256)
- ✅ TLS for all external API calls
- ✅ Rate limiting enabled by default
- ✅ Non-root container execution

## 📊 API Endpoints

### Public
- `GET /health` - Server health status
- `GET /readiness` - Readiness for traffic

### Teacher Dashboard (JWT Protected)
- `GET /api/v1/teachers/classes/{classId}/report` - Engagement analytics
- `GET /api/v1/teachers/classes/{classId}/students/{studentId}/metrics` - Student metrics
- `POST /api/v1/teachers/classes/{classId}/students/{studentId}/mute` - Mute student
- `GET /api/v1/curriculum/{framework}/search?keyword=...` - Search curriculum

### Telegram
- `POST /webhook` - Receives Telegram updates

See [API_REQUIREMENTS.md](API_REQUIREMENTS.md) for full contract specifications.

## 🚢 Deployment

### Docker Compose
```bash
docker-compose up -d
```

### Kubernetes (Helm)
```bash
helm install zivopal-classroom-bot ./helm \
  --set telegram.botToken="YOUR_TOKEN" \
  --set telegram.webhookUrl="YOUR_WEBHOOK_URL"
```

### Cloud Platforms
- AWS ECS: [See DEPLOYMENT.md](DEPLOYMENT.md#3-aws-ecs-production)
- Google Cloud Run: [See DEPLOYMENT.md](DEPLOYMENT.md#4-google-cloud-run-serverless)
- Any Kubernetes: [See DEPLOYMENT.md](DEPLOYMENT.md#2-kubernetes-with-helm-production)

## 🔧 Configuration

Key environment variables:

```bash
# Telegram
TELEGRAM_BOT_TOKEN=your-token
TELEGRAM_WEBHOOK_SECRET=your-secret
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook

# ZivoPal Integration
ZIVOPAL_API_URL=https://api.zivopal.com
ZIVOPAL_CLIENT_ID=your-client-id
ZIVOPAL_CLIENT_SECRET=your-client-secret

# LLM (optional)
LLM_PROVIDER=mock          # Use "openai" for production
OPENAI_API_KEY=sk-...      # Only if using OpenAI

# Optional Features
REDIS_ENABLED=false
SENTRY_ENABLED=false
```

See [.env.example](.env.example) for all options.

## 📈 Moderation Settings

Customize per-class:

```typescript
engine.setPolicy({
  classId: 'class-1',
  warningThreshold: 1,              // First violation → warning
  muteThresholdAfterWarnings: 3,    // 3 warnings → mute
  initialMuteDurationMs: 3600000,   // 1 hour
  severeMuteDurationMs: 86400000,   // 24 hours for repeats
  autoDeleteHighSeverity: true,     // Auto-delete hate/sexual
});
```

## 🎓 Curriculum Data

Included frameworks with example topics:

- **ZIMSEC** (Zimbabwe): English Literature, Mathematics
- **Cambridge**: IGCSE English, Mathematics
- **US K-12**: ELA, Math, Science

Extend with JSON in `curriculum/` directory. See format in [src/modules/curriculum/service.ts](src/modules/curriculum/service.ts).

## 🌍 Multilingual Support

Messages available in:
- **English** (en): `i18n/en.json`
- **Shona** (sn): `i18n/sn.json`

Add more languages easily:
```typescript
i18nService.addTranslation('fr', 'welcome', 'Bienvenue');
```

## 📞 Support

### For Issues
- GitHub Issues: https://github.com/zivopal/zivopal-classroom-bot/issues
- Email: team@zivopal.com

### Common Problems

**Bot not receiving messages?**
1. Verify webhook URL is HTTPS
2. Check webhook was registered: `curl https://api.telegram.org/botXXX/getWebhookInfo`
3. Ensure server is running: `curl https://your-domain.com/health`

**zivopal-core API fails?**
1. Verify client credentials
2. Check API URL is correct
3. Ensure JWT token is refreshing properly

**High latency?**
1. Reduce LLM model complexity
2. Enable Redis caching
3. Check zivopal-core API response times

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Code style (ESLint + Prettier)
- Commit conventions
- Testing requirements
- Pull request process

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

**Ready to deploy?** Start with [DEPLOYMENT.md](DEPLOYMENT.md)

**Setting up Telegram?** See [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md)

**Questions?** Check [README.md](README.md) for full documentation
