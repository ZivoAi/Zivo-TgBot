# Core-led private Zivo AI (draft; not deployed)

## Boundaries

Core is the sole account authority and provider gateway. The bot never mints a
learner/service JWT, stores a learner login token, chooses a model, or resolves
school membership from Telegram profile names. The legacy synthetic JWT client
now fails explicitly; its unregistered `/api/v1/*` Core write assumptions remain
unsupported, not silently remapped to user endpoints.

Group/supergroup messages never dispatch private tutoring or account linking.
The separate Core moderation adapter remains available, but group enforcement
and classroom/assignment delivery are not wired by this change. No automatic
punishment is added. The existing policy engine's first mute now uses the
configured initial duration; subsequent violations use its severe duration.

Only written private tutoring is connected in this draft. Voice, files,
assignment submissions/results, and child-specific Guardian reporting are not
implemented in this bot. Unsupported attachments receive an explicit notice.
Teacher suggestions are not published marks. Replies disclose unverified
curriculum coverage; this is not verified curriculum retrieval.

## Account linking and revocation

1. Authenticated ZivoPal profile → Connections → generate code.
2. Send `/link CODE` only in the configured bot's private chat.
3. Core consumes the hashed, ten-minute code and records a candidate identity.
   No account access is activated yet.
4. `/identity` shows the Telegram account ID privately. The signed-in Core user
   compares the full ID in their profile and explicitly confirms it.
5. Core enforces unique bot/account bindings. An identity owned by another Core
   account cannot be reassigned by guessing IDs or supplying a user JWT to the bot.
6. Disconnect in ZivoPal. It cancels pending codes and increments the link
   revision; current role, link revision and entitlement are checked on every
   request and again before committing a generated answer. Revocation remains
   possible without an active school subscription or configured bot.

The bot is a trusted service boundary: compromise of its service credential
would allow impersonation of linked Telegram senders for tutoring. Protect and
rotate that credential; it grants no management or ordinary user API privileges.
This is not end-to-end encryption, and Telegram receives the private messages
and linking command. Never send passwords or login tokens to the bot.

## Runtime contract

Configured Core origin in `ZIVOPAL_API_URL` must not already include `/api`.
Production requires HTTPS. Redirects are refused. Requests have a 90-second
deadline and do not automatically retry a model call.
Telegram Bot API calls have a separate ten-second timeout.

`POST /api/ai/internal/telegram/link`:
`{ botId, telegramUserId, chatId, chatType: "private", code }`.
Success: `{ confirmationRequired: true }`, no Core identity details.

`POST /api/ai/internal/telegram/chat`:
`{ botId, telegramUserId, chatId, chatType: "private", updateId, message }`.
Success: `{ reply, requiresTeacherReview, curriculumCoverage, sources }`.

Both require `X-Service-Key`, matching Core's `TELEGRAM_AI_SERVICE_KEY`.
Sender/bot/chat IDs come from the verified Telegram update and initialized
grammY bot info. Core rejects mismatched IDs/groups and ignores supplied role,
Core account IDs, child IDs, history and alleged curriculum documents.

Core owns the private thread. Update IDs reserve a durable request marker before
the provider runs; duplicate completed updates reuse the stored answer, failed
or processing updates do not automatically call the provider again. Concurrent
questions are refused while the previous request is active. A two-minute lease
allows a new update after a crashed worker; the older worker cannot overwrite
the newer reservation. Delivery to Telegram is still at-least-once, not exactly
once: a retried webhook may resend a completed answer without another model call.

## Configuration names

Bot: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_WEBHOOK_URL`,
`ZIVOPAL_API_URL`, `ZIVOPAL_AI_SERVICE_KEY`, `LLM_PROVIDER`, `NODE_ENV`.
Core: `TELEGRAM_AI_SERVICE_KEY`, `TELEGRAM_BOT_ID`, `TELEGRAM_BOT_USERNAME`,
and the existing AI Engine/OpenAI/school-entitlement configuration.
Do not copy credential values to frontend configuration.

Register the existing HTTPS `/webhook` using Telegram `setWebhook` with
`secret_token` matching `TELEGRAM_WEBHOOK_SECRET`. The handler verifies
`X-Telegram-Bot-Api-Secret-Token`, not an invented HMAC header. The secret must
have 32–256 URL-safe characters. No live registration was performed.
Official reference: https://core.telegram.org/bots/api#setwebhook

The bot's legacy teacher reports/mute endpoints are service-key-only, not
authenticated teacher APIs. They must not be consumed directly by the web app.
`/readiness` reports configuration checks only, not verified upstream health.
Logs exclude update bodies, codes, service/webhook headers and query strings.

## Checks and remaining release gates

Build: TypeScript over the full bot source using compatible declared dependency
ranges in an isolated local dependency installation.
`scripts/telegram-tutor.test.cjs`: actual grammY routing and Fastify injection,
synthetic Core/Telegram responses only. No outside requests.
`scripts/core-ai-contract.test.cjs`: four moderation adapter checks.
Existing Jest suites cover curriculum metadata, i18n, engagement and policy
logic; these do not demonstrate actual curriculum retrieval.
`npm run test:core-contract` builds then runs both isolated contract scripts.
All thirty existing Jest tests pass, but the unchanged coverage-gated `npm test`
still fails: 31.05% line coverage versus its 80% requirement. The Node contract
scripts do not contribute to Jest's coverage counters. That coverage gate was
not weakened; CI/coverage work remains before calling the bot production-ready.

Before enabling: separately approved Core/bot rollout and additive migrations,
real configured bot identity and webhook registration, production entitlement
check, documented cleanup/retention for challenges/links/request markers and
Core conversations, and a consented low-cost synthetic live AI acceptance test.
Do not purge request markers without a durable anti-replay watermark/expiry
design: deleting a marker currently permits an old update to trigger another
provider call. There is no quota/financial hard cap across replicas yet.
