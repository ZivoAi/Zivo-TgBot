# First Telegram deployment: approval and private configuration

This bot is a Core client, not a separate AI backend. It supports private written
tutoring after confirmed Core account linking. Voice, files, assignments and
private assessment results are not connected through Telegram.

## Hosting proposal — not an authorization to deploy

Reuse the existing Railway application project. Create one Node service sourced
from `ZivoAi/Zivo-TgBot`, rooted at `zivopal-classroom-bot`. No new database or
Redis service is required for the private-tutoring pilot. Additional Railway
hosting charges may apply; obtain approval before creating the service.

Build: install the declared npm development dependencies with lifecycle scripts
disabled, then run `npm run build`. The existing package has no npm lockfile:
this is tested compatibility, not locked reproducibility. Do not run its Husky
prepare hook in the deployment. Start with `npm start`, listen on the injected
`PORT`, and probe `/readiness`. Expose only HTTPS through the Railway domain.

Required private configuration:

- `TELEGRAM_BOT_TOKEN`: enter directly in the bot service's private settings.
- `TELEGRAM_WEBHOOK_SECRET`: a distinct 32–256-character URL-safe secret.
- `ZIVOPAL_AI_SERVICE_KEY`: match Core's `TELEGRAM_AI_SERVICE_KEY`.
- `ZIVOPAL_API_URL`: the deployed Core HTTPS origin, without an API path suffix.
- `NODE_ENV` and `LLM_PROVIDER`: use production and Core routing respectively.
- `TELEGRAM_WEBHOOK_URL`: this service's public HTTPS URL ending in `/webhook`,
  without credentials, query strings or fragments.

Do not place provider keys, Core JWT secrets or service credentials in Vercel
public variables, mobile public variables, source code, URLs or chat.
`OPENAI_API_KEY`, legacy `ZIVOPAL_CLIENT_SECRET` and Firebase credentials are not
required for this bot's private Core tutoring path.

## Explicit webhook registration

Setting the URL alone does not register it. After deployment approval, explicitly
set `TELEGRAM_WEBHOOK_SETUP_ENABLED` to `true` for the first launch. On startup,
the server listens, checks the existing Telegram webhook and registers the
expected HTTPS `/webhook` endpoint using Telegram's official secret-token
header. Only ordinary message updates are requested.

The setup refuses a different existing webhook URL; investigate ownership
rather than automatically overwriting it. Pending updates are not discarded.
No model call or user message is sent by setup. SDK failure details are replaced
with a generic error because they can contain bot credentials.

With setup enabled, readiness is HTTP 503 until registration succeeds; failure
closes the server rather than reporting a healthy launch. After verification,
disable the setup flag to avoid configuring Telegram on later restarts.
Readiness with setup disabled is configuration-only, not proof that Telegram or
Core is reachable. Real controlled acceptance remains required.

## Deployment ordering and acceptance

Do not create or connect a live service before approval and private configuration.
Core's migrations, matching service credential and routes must be available
before enabling Telegram tutoring. Keep retention cleanup off unless separately
approved. Coordinate the web proxy's Core revision pin with the Core rollout.

Check health/readiness, reject a missing/wrong webhook secret and confirm private
`/start` and linking using a synthetic test account. Confirm the matching Telegram
ID in that authenticated Core account before asking one approved bounded model
question. Verify revocation and group isolation; do not use real learner data.
An actual Telegram token and webhook registration are still required: passing
fixture tests does not create or launch a bot.
