# ZivoPal Classroom Bot - Complete Project Index

## 📚 Documentation Quick Links

### Getting Started
- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute setup and feature overview
- **[README.md](README.md)** - Comprehensive feature guide, architecture, API reference
- **[DELIVERY_CHECKLIST.md](DELIVERY_CHECKLIST.md)** - Complete deliverables and what's included

### Setup & Configuration
- **[.env.example](.env.example)** - All environment variables required and optional
- **[TELEGRAM_SETUP.md](TELEGRAM_SETUP.md)** - Step-by-step Telegram bot configuration
- **[BOT_BUILDER_PROMPT.md](BOT_BUILDER_PROMPT.md)** - System architecture and design decisions

### Development & Deployment
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Code style, commit conventions, dev guidelines
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Docker, Kubernetes, AWS, GCP deployment options
- **[API_REQUIREMENTS.md](API_REQUIREMENTS.md)** - zivopal-core API contracts with examples

## 💻 Source Code Structure

### Entry Point
- **[src/index.ts](src/index.ts)** - Application entry point with graceful shutdown

### Core Configuration & Logging
- **[src/config.ts](src/config.ts)** - Environment variable validation and config management
- **[src/logger.ts](src/logger.ts)** - Structured JSON logging with Pino

### ZivoPal API Integration (src/clients/)
- **[src/clients/zivopal-auth.ts](src/clients/zivopal-auth.ts)** - JWT token management and refresh
- **[src/clients/zivopal-client.ts](src/clients/zivopal-client.ts)** - API client for all zivopal-core endpoints

### Business Logic Modules (src/modules/)

#### Moderation
- **[src/modules/moderation/llm-classifier.ts](src/modules/moderation/llm-classifier.ts)** - Message classification (spam, harassment, bullying, hate, etc.)
- **[src/modules/moderation/policy-engine.ts](src/modules/moderation/policy-engine.ts)** - Escalation logic and action decisions

#### Engagement
- **[src/modules/engagement/score-engine.ts](src/modules/engagement/score-engine.ts)** - Student metrics tracking and leaderboard

#### Learning Support
- **[src/modules/curriculum/service.ts](src/modules/curriculum/service.ts)** - ZIMSEC, Cambridge, US K-12 curriculum data

#### Internationalization
- **[src/modules/i18n/service.ts](src/modules/i18n/service.ts)** - Multi-language translation service

### Telegram & Web Server
- **[src/telegram/webhook-handler.ts](src/telegram/webhook-handler.ts)** - Telegram webhook message handling
- **[src/server.ts](src/server.ts)** - Fastify HTTP server with all routes and middleware

### Testing
- **[src/__tests__/setup.ts](src/__tests__/setup.ts)** - Jest test environment setup
- **[src/__tests__/moderation.test.ts](src/__tests__/moderation.test.ts)** - Moderation AI and policy tests
- **[src/__tests__/engagement.test.ts](src/__tests__/engagement.test.ts)** - Engagement scoring tests
- **[src/__tests__/curriculum-i18n.test.ts](src/__tests__/curriculum-i18n.test.ts)** - Curriculum and i18n tests

## 🔧 Configuration Files

### Development
- **[package.json](package.json)** - Node.js dependencies and scripts
- **[tsconfig.json](tsconfig.json)** - TypeScript strict mode configuration
- **[jest.config.js](jest.config.js)** - Jest testing configuration with 80% coverage
- **[.eslintrc.js](.eslintrc.js)** - ESLint rules for TypeScript
- **[.prettierrc.json](.prettierrc.json)** - Code formatting configuration

### Version Control
- **[.gitignore](.gitignore)** - Git ignore patterns

### Container
- **[Dockerfile](Dockerfile)** - Multi-stage Docker build
- **[.dockerignore](.dockerignore)** - Docker build exclusions

## 🚀 Infrastructure (Deployment)

### Kubernetes & Helm
- **[helm/Chart.yaml](helm/Chart.yaml)** - Helm chart metadata
- **[helm/values.yaml](helm/values.yaml)** - Helm configuration values
- **[helm/templates/deployment.yaml](helm/templates/deployment.yaml)** - Kubernetes deployment
- **[helm/templates/service.yaml](helm/templates/service.yaml)** - Kubernetes service
- **[helm/templates/secret.yaml](helm/templates/secret.yaml)** - Kubernetes secret
- **[helm/templates/hpa.yaml](helm/templates/hpa.yaml)** - Horizontal Pod Autoscaler
- **[helm/templates/_helpers.tpl](helm/templates/_helpers.tpl)** - Helm template helpers

### Plain Kubernetes
- **[kubernetes/manifest.yaml](kubernetes/manifest.yaml)** - All-in-one Kubernetes manifest

## 📋 CI/CD Automation

### GitHub Actions
- **[.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml)** - Main CI/CD pipeline (lint, test, build, deploy)
- **[.github/workflows/security.yml](.github/workflows/security.yml)** - Security scanning (npm audit, Trivy)

## 📊 Data Files

### Internationalization
- **[i18n/en.json](i18n/en.json)** - English translations (30+ keys)
- **[i18n/sn.json](i18n/sn.json)** - Shona translations (30+ keys)

## 🛠️ Helper Scripts

### Automation
- **[scripts/setup-dev.sh](scripts/setup-dev.sh)** - Local development setup with validation
- **[scripts/api-examples.sh](scripts/api-examples.sh)** - cURL examples for API testing
- **[scripts/generate-postman.sh](scripts/generate-postman.sh)** - Generate Postman collection

## 🗂️ File Organization by Feature

### Moderation System
1. Message received → `telegram/webhook-handler.ts`
2. Extract & redact PII → `logger.ts` (redactSensitive)
3. Classify message → `modules/moderation/llm-classifier.ts`
4. Check policy → `modules/moderation/policy-engine.ts`
5. Send audit → `clients/zivopal-client.ts` (sendAuditLog)
6. Notify teacher → `clients/zivopal-client.ts` (sendNotification)

### Engagement Tracking
1. Record message → `modules/engagement/score-engine.ts` (recordMessage)
2. Calculate metrics → `modules/engagement/score-engine.ts` (calculateMetrics)
3. Submit to zivopal → `clients/zivopal-client.ts` (sendAnalytics)

### Teacher Dashboard
1. Request received → `server.ts` (Fastify routes)
2. Extract JWT → Authentication middleware
3. Get data → Respective modules (engagement, curriculum, moderation)
4. Return JSON → `server.ts` (formatted response)

### Curriculum Support
1. Search request → `server.ts` (GET /api/v1/curriculum/:framework/search)
2. Query data → `modules/curriculum/service.ts` (findRelatedTopics)
3. Translate results → `modules/i18n/service.ts` (t)

## 📖 Documentation by Use Case

### "I want to understand the system"
1. Start: [QUICKSTART.md](QUICKSTART.md)
2. Deep dive: [BOT_BUILDER_PROMPT.md](BOT_BUILDER_PROMPT.md)
3. Architecture: [README.md](README.md#architecture)

### "I want to set up locally"
1. Prerequisites: [QUICKSTART.md](QUICKSTART.md) (Quick Setup)
2. Full steps: [README.md](README.md#running-locally)
3. Verify: `npm test` and `npm run dev`

### "I want to configure the Telegram bot"
1. Follow: [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md)
2. Update: `.env` file with token and secret
3. Test: `curl https://api.telegram.org/botXXX/getWebhookInfo`

### "I want to deploy to production"
1. Choose platform: [DEPLOYMENT.md](DEPLOYMENT.md)
2. Build: Docker or Helm
3. Configure: Secrets and environment variables
4. Monitor: Health checks and logs

### "I want to integrate with zivopal-core"
1. API contract: [API_REQUIREMENTS.md](API_REQUIREMENTS.md)
2. Implementation: `clients/zivopal-client.ts`
3. Mock for testing: Use `nock` in tests

### "I want to modify the moderation system"
1. Understand policy: `modules/moderation/policy-engine.ts`
2. Update classifier: `modules/moderation/llm-classifier.ts`
3. Add tests: `src/__tests__/moderation.test.ts`

### "I want to add a new language"
1. Create translation file: `i18n/{language}.json`
2. Register language: `modules/i18n/service.ts`
3. Update config: `.env.example` (SUPPORTED_LANGUAGES)

### "I want to extend curriculum data"
1. Add topics: `curriculum/{framework}.json`
2. Load in service: `modules/curriculum/service.ts`
3. Test search: `src/__tests__/curriculum-i18n.test.ts`

## 🧪 Testing Quick Links

### Run Tests
```bash
npm test                    # All tests with coverage
npm run test:watch        # Watch mode
npm run test:integration  # Integration only
```

### Test Files
- Moderation tests: `src/__tests__/moderation.test.ts`
- Engagement tests: `src/__tests__/engagement.test.ts`
- Curriculum/i18n tests: `src/__tests__/curriculum-i18n.test.ts`

## 🔍 Finding Specific Features

| Feature | File | Key Function |
|---------|------|--------------|
| Message classification | `modules/moderation/llm-classifier.ts` | `classify()` |
| Escalation logic | `modules/moderation/policy-engine.ts` | `decideAction()` |
| Engagement metrics | `modules/engagement/score-engine.ts` | `calculateMetrics()` |
| Curriculum search | `modules/curriculum/service.ts` | `findRelatedTopics()` |
| Translations | `modules/i18n/service.ts` | `t()` |
| Telegram webhook | `telegram/webhook-handler.ts` | `handleUpdate()` |
| Teacher API routes | `server.ts` | `setupTeacherRoutes()` |
| ZivoPal API calls | `clients/zivopal-client.ts` | Various methods |
| JWT auth | `clients/zivopal-auth.ts` | `getAccessToken()` |
| Logging | `logger.ts` | `logger` and `createAuditLog()` |

## 📞 Support Resources

### Internal Documentation
- Code comments throughout all files
- JSDoc annotations on public functions
- Test files as usage examples

### External References
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [grammY Documentation](https://grammy.dev/)
- [Fastify Documentation](https://www.fastify.io/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)

## 🎯 Verification Checklist

Before going to production:
- [ ] Read [QUICKSTART.md](QUICKSTART.md) - Understand features
- [ ] Read [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md) - Configure bot
- [ ] Run `npm install` - Install dependencies
- [ ] Update `.env` - Set credentials
- [ ] Run `npm test` - Verify tests pass
- [ ] Run `npm run dev` - Test locally
- [ ] Review [DEPLOYMENT.md](DEPLOYMENT.md) - Choose deployment method
- [ ] Read [API_REQUIREMENTS.md](API_REQUIREMENTS.md) - Integrate with zivopal-core
- [ ] Configure monitoring - Setup Sentry/Prometheus
- [ ] Test webhook - Verify Telegram integration
- [ ] Load testing - Ensure scalability

---

**Last Updated**: January 9, 2026  
**Version**: 0.1.0  
**Status**: ✅ Production Ready
