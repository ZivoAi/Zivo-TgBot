# ZivoPal Classroom Bot

A production-grade Telegram-based classroom engagement, moderation, and learning platform integrated with ZivoPal core services.

## Features

- **Real-time Moderation AI**: Classify messages (spam, harassment, bullying, hate speech, etc.) with configurable severity and actions
- **Engagement Tracking**: Track student metrics including message frequency, quality score, helpfulness, collaboration index, and learning momentum
- **Curriculum Support**: Integration with ZIMSEC, Cambridge, and US K-12 curricula
- **Assignment Management**: Telegram-based assignment reminders and file submissions
- **Teacher Dashboard**: REST API endpoints for analytics, moderation management, and leaderboards
- **Multilingual**: English and Shona support via i18n patterns
- **Secure Integration**: JWT-based service client authentication with zivopal-core
- **Structured Audit Logging**: Complete audit trail of all moderation and enforcement actions

## Technology Stack

- **Language**: TypeScript (strict mode)
- **Server**: Fastify with Helmet security
- **Telegram**: grammY for webhook-based message handling
- **LLM**: Abstract interface supporting OpenAI or mock classifiers
- **Database**: No direct DB access; all state persisted via zivopal-core APIs
- **Testing**: Jest with 80%+ coverage targets
- **CI/CD**: GitHub Actions with Docker and Helm
- **Logging**: Structured JSON logs with Pino

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Telegram Bot Token (from @BotFather)
- ZivoPal service credentials (client ID and secret)

### Installation

```bash
# Clone the repository
git clone https://github.com/zivopal/zivopal-classroom-bot.git
cd zivopal-classroom-bot

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Environment Variables

Required variables:
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token from @BotFather
- `TELEGRAM_WEBHOOK_SECRET`: A secret string for webhook signature validation
- `ZIVOPAL_CLIENT_ID`: Client ID for service authentication
- `ZIVOPAL_CLIENT_SECRET`: Client secret for service authentication
- `ZIVOPAL_API_URL`: Base URL of zivopal-core API

Optional variables:
- `NODE_ENV`: development, production, or test (default: development)
- `PORT`: Server port (default: 3000)
- `LOG_LEVEL`: debug, info, warn, error (default: info)
- `REDIS_URL`: Redis connection URL for caching (default: redis://localhost:6379)
- `LLM_PROVIDER`: openai or mock (default: mock)
- `OPENAI_API_KEY`: OpenAI API key if using OpenAI provider
- `SENTRY_DSN`: Sentry error tracking DSN (optional)

See [.env.example](.env.example) for all available options.

## Running Locally

### Development

```bash
# Start development server with hot reload
npm run dev

# In another terminal, run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Run linting and type checking
npm run lint
npm run type-check
```

### Production Build

```bash
# Build TypeScript
npm run build

# Start from compiled output
npm start
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Test Coverage

```bash
npm test -- --coverage
```

Current coverage targets: **80%+ for all metrics**

### Example Test Scenarios

1. **Harmful Message Detection**: Verify spam/harassment/bullying classification
2. **Escalation**: Confirm warnings → mutes after N violations
3. **Auto-Delete**: Verify high-severity messages auto-deleted
4. **Analytics**: Check engagement metric calculations
5. **Multilingual**: Test English and Shona message handling
6. **Curriculum**: Verify topic search across frameworks

## API Documentation

### Telegram Webhook

**Endpoint**: `POST /webhook`

Receives updates from Telegram. Signature validation required using `x-telegram-bot-api-secret-sha256` header.

### Health Endpoints

- `GET /health` - Server health status
- `GET /readiness` - Readiness for serving traffic

### Teacher Dashboard APIs

#### Get Class Engagement Report

```http
GET /api/v1/teachers/classes/{classId}/report
```

Response:
```json
{
  "classId": "class-123",
  "timestamp": "2026-01-09T10:00:00Z",
  "leaderboard": [
    {
      "userId": "student-1",
      "value": 87.5
    }
  ],
  "strugglingStudents": ["student-2", "student-3"]
}
```

#### Get Student Metrics

```http
GET /api/v1/teachers/classes/{classId}/students/{studentId}/metrics
```

Response:
```json
{
  "classId": "class-123",
  "userId": "student-1",
  "messageFrequency": 5.2,
  "qualityScore": 78.5,
  "helpfulness": 3,
  "collaborationIndex": 65.0,
  "learningMomentum": 12.5,
  "timestamp": "2026-01-09T10:00:00Z"
}
```

#### Mute/Unmute Student

```http
POST /api/v1/teachers/classes/{classId}/students/{studentId}/mute

{
  "duration": 3600000,
  "reason": "Repeated spam violations"
}
```

#### Search Curriculum

```http
GET /api/v1/curriculum/{framework}/search?keyword={keyword}
```

Frameworks: `zimsec`, `cambridge`, `us_k12`

### OpenAPI/Swagger

Visit `/api/docs` for full OpenAPI specification.

## Architecture

### Module Organization

```
src/
├── config.ts                    # Configuration management
├── logger.ts                    # Structured logging
├── server.ts                    # Fastify server setup
├── index.ts                     # Entry point
├── clients/
│   ├── zivopal-auth.ts          # JWT token management
│   └── zivopal-client.ts        # API client for zivopal-core
├── modules/
│   ├── moderation/
│   │   ├── llm-classifier.ts    # Mock and OpenAI classifiers
│   │   └── policy-engine.ts     # Escalation and action logic
│   ├── engagement/
│   │   └── score-engine.ts      # Metrics calculation
│   ├── curriculum/
│   │   └── service.ts           # Curriculum data and search
│   └── i18n/
│       └── service.ts           # Translation service
├── telegram/
│   └── webhook-handler.ts       # Telegram message handling
└── __tests__/
    ├── setup.ts                 # Test environment
    ├── moderation.test.ts
    ├── engagement.test.ts
    └── curriculum-i18n.test.ts
```

### ZivoPal Integration

The bot integrates with zivopal-core exclusively via REST APIs:

- **Audit Endpoint**: `POST /api/v1/audit` - Send enforcement and event logs
- **Analytics Endpoint**: `POST /api/v1/analytics` - Report engagement metrics
- **Notifications Endpoint**: `POST /api/v1/notifications` - Alert teachers
- **Submissions Endpoint**: `POST /api/v1/submissions` - Forward assignment files
- **Flags Endpoint**: `POST /api/v1/flags` - Report policy violations

All requests use JWT bearer token authentication with exponential backoff retries.

### Moderation Flow

```
Message Received
  ↓
Extract text, redact PII
  ↓
LLM Classification (spam/harassment/etc.)
  ↓
Policy Engine Decision (warn/mute/delete)
  ↓
Send Audit Log → zivopal-core
  ↓
Send Teacher Notification → zivopal-core
  ↓
Execute Action (delete message, soft-mute, etc.)
```

### Engagement Tracking

```
Message Recorded
  ↓
Calculate Quality Score (heuristics)
  ↓
Track Collaboration (mentions, replies)
  ↓
Update Metrics (frequency, helpfulness)
  ↓
Periodic Snapshot → zivopal-core Analytics
```

## Deployment

### Docker

Build and run Docker image:

```bash
docker build -t zivopal-classroom-bot:latest .
docker run -p 3000:3000 --env-file .env zivopal-classroom-bot:latest
```

### Kubernetes / Helm

Deploy using provided Helm chart:

```bash
helm install zivopal-classroom-bot ./helm \
  --set telegram.botToken="YOUR_BOT_TOKEN" \
  --set zivopal.clientSecret="YOUR_CLIENT_SECRET"
```

See [helm/values.yaml](helm/values.yaml) for all configurable options.

### GitHub Actions CI/CD

Automated testing, linting, building, and deployment on push:

```bash
git push origin main
# → Runs lint, type-check, tests, build
# → Builds Docker image
# → Pushes to container registry
# → Deploys to Kubernetes (if configured)
```

## Configuration & Feature Flags

### Moderation Policy

Customize per-class via policy engine:

```typescript
engine.setPolicy({
  classId: 'class-1',
  warningThreshold: 1,           // First violation triggers warning
  muteThresholdAfterWarnings: 3, // 3 warnings → mute
  initialMuteDurationMs: 3600000, // 1 hour
  severeMuteDurationMs: 86400000, // 24 hours for repeats
  autoDeleteHighSeverity: true,
});
```

### LLM Provider

Switch between mock and OpenAI:

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-3.5-turbo
```

### Rate Limiting

Configure per-endpoint:

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
```

## Security

### PII Redaction

Student names and email addresses are automatically masked in logs and LLM prompts.

### Service Authentication

JWT service client credentials flow with token refresh:

```typescript
const token = await authClient.getAccessToken(); // Auto-refreshes if expired
```

### Webhook Signature Validation

All incoming Telegram webhooks validated using HMAC-SHA256:

```typescript
const valid = validateWebhookSignature(body, signature);
```

### HTTPS/TLS

All outgoing requests to zivopal-core use TLS (enforced by axios client).

### Environment Secrets

- Never commit `.env` file
- Use secret manager in production (e.g., AWS Secrets Manager, HashiCorp Vault)
- Rotate `ZIVOPAL_CLIENT_SECRET` regularly

## Troubleshooting

### Bot Not Receiving Messages

1. Verify Telegram bot token in `.env`
2. Check webhook URL and secret in Telegram settings
3. Validate webhook signature: `GET https://your-domain.com/health` returns 200
4. Check logs: `npm run dev` and look for webhook processing errors

### Failed zivopal-core API Calls

1. Verify `ZIVOPAL_API_URL` is correct
2. Check `ZIVOPAL_CLIENT_ID` and `ZIVOPAL_CLIENT_SECRET`
3. Ensure service has required API endpoints (see [Requirements](#requirements-for-zivopal-core))
4. Check network connectivity and TLS certificates

### High LLM Latency

1. Consider batch processing for metrics calculation
2. Use Redis cache for classification results
3. Reduce model complexity (e.g., use gpt-3.5-turbo instead of gpt-4)

## Contributing

1. Create feature branch: `git checkout -b feat/my-feature`
2. Follow [Conventional Commits](https://www.conventionalcommits.org/)
3. Ensure tests pass: `npm test`
4. Submit pull request with clear description

## Requirements for zivopal-core

The bot expects the following endpoints from zivopal-core. If missing, please open an Issue with sample request/response bodies:

- `POST /api/v1/audit` - Accept audit logs
- `POST /api/v1/analytics` - Accept engagement metrics
- `POST /api/v1/notifications` - Send teacher notifications
- `POST /api/v1/submissions` - Accept assignment submissions
- `POST /api/v1/flags` - Accept flagged messages
- `GET /api/v1/classes/{classId}/students/{userId}/mute-status` - Check mute status
- `PUT /api/v1/classes/{classId}/students/{userId}/mute-status` - Set mute status

See [API_REQUIREMENTS.md](API_REQUIREMENTS.md) for detailed schemas.

## License

MIT

## Support

For issues or questions, open an Issue on GitHub or contact the ZivoPal team.
