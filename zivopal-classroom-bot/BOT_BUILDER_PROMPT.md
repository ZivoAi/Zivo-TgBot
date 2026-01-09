# Telegram Bot Builder Prompt - ZivoPal Classroom Bot

This document describes the complete system architecture, design decisions, and implementation guidance for the ZivoPal Classroom Bot project.

## System Overview

The ZivoPal Classroom Bot is a production-grade Telegram-based system designed to facilitate real-time classroom moderation, engagement tracking, and AI-powered learning support. It integrates exclusively with the ZivoPal core service via its REST API, ensuring clean separation of concerns and maintainability.

### Core Principles

1. **API-First Integration**: Never access zivopal-core databases directly; use only public REST APIs
2. **Security by Default**: JWT service authentication, PII redaction, HTTPS-only, structured audit logging
3. **Modular Architecture**: Business logic isolated in small, testable modules
4. **Scalability**: Webhook-based (not polling), horizontal scaling via Kubernetes, optional Redis caching
5. **Internationalization**: Full i18n support for English and Shona with extensible patterns
6. **Test Coverage**: Minimum 80% coverage with unit and integration tests

## Architecture Components

### 1. Telegram Webhook Server (src/telegram/webhook-handler.ts)

**Purpose**: Receive and route Telegram updates via webhook

**Key Features**:
- Fastify framework for HTTP handling
- grammY library for Telegram API abstraction
- Webhook signature validation (HMAC-SHA256)
- Graceful shutdown with signal handlers

**Flow**:
```
Telegram Update → HTTPS POST /webhook → Validate Signature → Route to Handler → Response
```

**Critical**: Validate every webhook with secret token to prevent spoofing.

### 2. Moderation AI Module (src/modules/moderation/)

#### LLM Classifier (llm-classifier.ts)
**Purpose**: Classify messages into categories: spam, insult_harassment, bullying, sexual_content, hate, off_topic, harmless

**Interface**:
```typescript
interface ModerationResult {
  category: ModerationCategory;
  severity: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  rationale: string;
  shouldAction: boolean;
}
```

**Implementations**:
- MockLLMClassifier: Keyword-based for testing
- OpenAILLMClassifier: GPT-powered (production)
- Custom: Implement LLMClassifier interface for self-hosted models

**Design Decision**: Abstract via interface to support multiple providers without changing business logic.

#### Policy Engine (policy-engine.ts)
**Purpose**: Determine actions based on moderation results and configurable policies

**Actions**:
- `none`: Message approved
- `warn`: Alert student and teacher
- `mute`: Soft-mute (delete/hide messages)
- `delete`: Immediately delete message

**Escalation Example**:
```
Message 1: violation → warn (count=1)
Message 2: violation → warn (count=2)
Message 3: violation → mute 1h (count=3, reached muteThreshold)
Message 4: violation (while muted) → mute 24h (repeat escalation)
```

**Moderation Flow**:
```
Message → Classify → Check Threshold → Decide Action → Log to Audit → Persist in ZivoPal
```

### 3. Engagement Scoring Engine (src/modules/engagement/score-engine.ts)

**Purpose**: Track student interaction metrics and calculate engagement scores

**Metrics**:
- `messageFrequency`: Messages per day
- `qualityScore`: 0-100 (heuristic: message length, detail, relevance)
- `helpfulness`: Count of helpful/answered interactions
- `collaborationIndex`: 0-100 (replies, mentions, group contributions)
- `learningMomentum`: Trend of quality over time (%)

**Scoring Heuristics**:
- Quality: Longer messages scored higher (simple but practical)
- Collaboration: High ratio of replies+mentions to total messages
- Momentum: Percentage change in quality from first to last message

**Output**: Snapshots sent to zivopal-core analytics endpoint periodically

### 4. Curriculum Service (src/modules/curriculum/service.ts)

**Purpose**: Store and search curriculum-aligned topics for learning support

**Frameworks**:
- ZIMSEC (Zimbabwe)
- Cambridge International
- US K-12

**Data Structure**:
```json
{
  "framework": "zimsec",
  "topics": [
    {
      "id": "zimsec-eng-lit",
      "name": "English Literature",
      "keywords": ["literature", "poetry", "prose"],
      "subTopics": [...]
    }
  ]
}
```

**Search**: Keyword matching against topic keywords (case-insensitive)

**Extensibility**: Add frameworks by creating new JSON files in curriculum/ directory

### 5. Internationalization Service (src/modules/i18n/service.ts)

**Purpose**: Provide multilingual bot messages and teacher notifications

**Supported Languages**: English (en), Shona (sn)

**Translation Files**: `i18n/{language}.json` with key-value pairs

**Variable Interpolation**:
```typescript
i18n.t('student_muted', 'en', { duration: '24' })
// Output: "You have been muted for 24 hours due to {{reason}}."
```

**Human-in-the-Loop**: Teachers can override translations or add custom messages via dashboard (future)

### 6. ZivoPal Client (src/clients/)

#### Authentication (zivopal-auth.ts)
**Purpose**: Manage JWT service client credentials

**Token Lifecycle**:
1. Generate JWT with client ID as subject
2. Cache token if valid for > 1 minute remaining
3. Auto-refresh before expiry
4. Implement exponential backoff on 401 (unauthorized)

**JWT Payload**:
```json
{
  "sub": "zivopal-classroom-bot",
  "iss": "zivopal-classroom-bot",
  "aud": "zivopal-core",
  "iat": 1672531200,
  "exp": 1672534800
}
```

#### API Client (zivopal-client.ts)
**Purpose**: Encapsulate all outbound API calls to zivopal-core

**Endpoints**:
- `POST /api/v1/audit` - Send enforcement logs
- `POST /api/v1/analytics` - Submit engagement snapshots
- `POST /api/v1/notifications` - Notify teachers
- `POST /api/v1/submissions` - Forward assignment files
- `POST /api/v1/flags` - Report flagged messages
- `GET /api/v1/classes/{classId}/students/{userId}/mute-status` - Check mute
- `PUT /api/v1/classes/{classId}/students/{userId}/mute-status` - Set mute

**Resilience**:
- Exponential backoff on 5xx and 429 (rate limit)
- Automatic token refresh on 401
- Idempotency headers for audit/analytics

### 7. Fastify Server (src/server.ts)

**Purpose**: HTTP server with security, routing, and middleware

**Middleware**:
- Helmet: Security headers
- CORS: Cross-origin requests
- Rate Limiting: Prevent abuse (configurable)

**Routes**:
- Public: `/health`, `/readiness`
- Telegram: `POST /webhook`
- Teacher APIs: `/api/v1/teachers/...`
- Docs: `/api/docs` (OpenAPI)

**Security**:
- HTTPS only in production
- TLS for all zivopal-core calls
- Secrets never logged or exposed in responses

## Data Flow Examples

### Example 1: Harmful Message Detection & Auto-Warn

```
1. User sends message in Telegram group
   ↓
2. Telegram sends webhook POST to /webhook
   ↓
3. Validate webhook signature (HMAC-SHA256)
   ↓
4. Extract message text, redact PII (remove names, email patterns)
   ↓
5. Pass to LLM Classifier → returns {category: 'hate', severity: 'high', confidence: 0.92}
   ↓
6. Policy Engine decides: severity=high + autoDeleteHighSeverity=true → DELETE
   ↓
7. Create Audit Log:
   {
     "timestamp": "2026-01-09T10:00:00Z",
     "eventType": "message_moderation",
     "classId": "class-123",
     "userId": "student-456",
     "action": "message_deleted",
     "severity": "high",
     "metadata": {
       "category": "hate",
       "confidence": 0.92,
       "rationale": "Message contains hate speech"
     }
   }
   ↓
8. POST /api/v1/audit → zivopal-core (with JWT auth, exponential backoff)
   ↓
9. POST /api/v1/notifications → Notify teacher
   ↓
10. Execute action: Delete message from group (Telegram API)
    ↓
11. Log result and metrics
```

### Example 2: Engagement Snapshot Generation

```
1. Every hour (cron job via BullMQ):
   ↓
2. For each active student in each class:
   ↓
3. Calculate metrics:
   - messageFrequency = messages_last_24h / 1 day
   - qualityScore = avg(message_lengths_last_7d) / 100
   - helpfulness = count(marked_as_helpful_last_7d)
   - collaborationIndex = (replies + mentions) / totalMessages * 50
   - learningMomentum = (qualityScore_today - qualityScore_week1) / qualityScore_week1 * 100
   ↓
4. Create Analytics Snapshot:
   {
     "classId": "class-123",
     "userId": "student-456",
     "timestamp": "2026-01-09T11:00:00Z",
     "metrics": {
       "messageFrequency": 5.2,
       "qualityScore": 78.5,
       ...
     }
   }
   ↓
5. POST /api/v1/analytics → zivopal-core
   ↓
6. Snapshot persisted for teacher dashboard queries
```

### Example 3: Assignment Submission

```
1. Student sends file via Telegram
   ↓
2. Webhook receives document update
   ↓
3. Download file from Telegram servers
   ↓
4. Create Submission Payload:
   {
     "classId": "class-123",
     "assignmentId": "assign-789",
     "studentId": "student-456",
     "submittedAt": "2026-01-09T10:00:00Z",
     "fileUrl": "https://telegram.org/file/botXXX/YYYY",
     "fileName": "essay.pdf",
     "mimeType": "application/pdf"
   }
   ↓
5. POST /api/v1/submissions → zivopal-core
   ↓
6. Send confirmation to student: "Submission received!"
   ↓
7. POST /api/v1/notifications → Notify teacher
   ↓
8. Audit log recorded
```

## Configuration & Feature Flags

### Per-Class Moderation Policy

```typescript
engine.setPolicy({
  classId: 'class-1',
  warningThreshold: 1,              // First violation triggers warning
  muteThresholdAfterWarnings: 3,    // 3 warnings → 1h mute
  initialMuteDurationMs: 3600000,   // 1 hour
  severeMuteDurationMs: 86400000,   // 24 hours for repeats
  autoDeleteHighSeverity: true,     // Auto-delete hate/sexual content
});
```

### LLM Provider Selection

```bash
# Use mock classifier (fast, deterministic, for testing)
LLM_PROVIDER=mock

# Use OpenAI (production, requires API key)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-3.5-turbo
```

### Caching & Performance

```bash
# Optional Redis for mute status and classification caching
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

### Rate Limiting

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100              # Requests per window
RATE_LIMIT_WINDOW_MS=60000      # 1 minute
```

## Logging & Monitoring

### Audit Log Levels

- `info`: Normal operations (warnings issued, mutes applied)
- `warn`: Policy violations that auto-actions were taken on
- `error`: System errors (API failures, processing errors)
- `critical`: Major issues (zivopal-core unreachable, auth failure)

### Structured Logging

All logs are JSON for easy parsing:

```json
{
  "level": 30,
  "time": "2026-01-09T10:00:00.000Z",
  "eventType": "message_moderation",
  "classId": "class-123",
  "userId": "student-456",
  "action": "message_deleted",
  "severity": "high",
  "metadata": {
    "category": "hate",
    "confidence": 0.92
  }
}
```

### Sentry Integration (Optional)

For error tracking in production:

```bash
SENTRY_ENABLED=true
SENTRY_DSN=https://key@sentry.io/project-id
```

## Testing Strategy

### Unit Tests (80% coverage target)

1. **Moderation**: Classification accuracy on known samples
   - Spam detection: ≥90% precision
   - Harassment detection: ≥85% precision
   - False positives < 5%

2. **Engagement**: Scoring accuracy
   - Quality score calculation
   - Collaboration index
   - Learning momentum trends

3. **Curriculum**: Topic search
   - Keyword matching
   - Framework switching
   - Empty result handling

4. **I18n**: Translation service
   - Fallback to English
   - Variable interpolation
   - Language detection

### Integration Tests

1. **Moderation Flow**: Message → classify → action → audit log → teacher notification
2. **Escalation**: Multiple violations → warnings → mute escalation
3. **Analytics**: Message recording → metric calculation → zivopal-core submission
4. **Multilingual**: Messages in English and Shona

### E2E Tests (with mocked zivopal-core)

1. Webhook signature validation
2. Complete moderation flow with nock mocks
3. Teacher API authentication and authorization
4. Error handling and retry logic

## Deployment Strategy

### Local Development
```bash
npm run dev    # With hot reload via ts-node
npm test       # With watch mode
```

### Docker Staging
```bash
docker-compose up
# Includes Redis, database, monitoring
```

### Kubernetes Production
```bash
helm install zivopal-classroom-bot ./helm \
  --set telegram.botToken=XXX \
  --set zivopal.clientSecret=XXX
```

Features:
- Horizontal Pod Autoscaler (2-10 replicas)
- Health checks (liveness + readiness)
- Network policies (ingress/egress)
- Resource limits (256Mi min, 512Mi max)

## Security Checklist

- [x] PII redaction in logs (names, emails)
- [x] JWT token refresh and expiry
- [x] Webhook signature validation
- [x] HTTPS-only for external calls
- [x] Non-root container execution
- [x] Rate limiting enabled
- [x] Secret rotation via env variables
- [x] Structured audit logging
- [x] No database direct access
- [x] Human-in-the-loop for overrides

## Performance Targets

- Moderation latency: < 500ms p95
- Audit log submission: < 1s p95
- Teacher API responses: < 200ms p95
- Webhook processing: < 2s p99
- Memory per pod: 256Mi minimum, < 512Mi typical

## Future Enhancements

1. **Custom LLM Models**: Support Hugging Face, Llama, local models
2. **Batch Processing**: Bulk moderation job queue
3. **Advanced Analytics**: ML-powered insight generation
4. **Human Review Dashboard**: Teachers can override moderation decisions
5. **Webhook Signing**: Add HMAC signing to outbound notifications
6. **Multi-language LLM**: Support moderation in non-English languages
7. **Plagiarism Detection**: For assignment submissions
8. **Real-time Collaboration**: Group project tracking

## API Contract Example

### Request to zivopal-core

```http
POST /api/v1/audit HTTP/1.1
Host: api.zivopal.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

{
  "timestamp": "2026-01-09T10:00:00Z",
  "eventType": "message_moderation",
  "classId": "class-123",
  "userId": "student-456",
  "action": "message_deleted",
  "severity": "high",
  "metadata": {
    "messageId": "msg-789",
    "category": "hate",
    "confidence": 0.92,
    "rationale": "Message contains targeted hate speech"
  }
}
```

### Response from zivopal-core

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "audit-log-12345",
  "acknowledged": true,
  "timestamp": "2026-01-09T10:00:01Z"
}
```

## Conclusion

The ZivoPal Classroom Bot is designed as a modular, secure, scalable system that enhances classroom engagement while maintaining strict separation from the core ZivoPal platform. All business logic is testable, configurable, and extensible to support future features and customizations.

For implementation questions or clarifications, refer to the inline code comments and test cases throughout the repository.
