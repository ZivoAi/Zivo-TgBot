# Telegram Bot Setup Guide

## Step 1: Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Follow prompts:
   - Name: e.g., "ZivoPal Classroom Bot"
   - Username: e.g., `@zivopal_classroom_bot` (must be unique)
4. You'll receive a **Bot Token** - save this securely

## Step 2: Configure Webhook

Once your bot server is deployed, configure the webhook:

```bash
# Replace YOUR_BOT_TOKEN and YOUR_DOMAIN
curl -X POST \
  "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_DOMAIN/webhook",
    "secret_token": "YOUR_WEBHOOK_SECRET"
  }'
```

**Example**:
```bash
curl -X POST \
  "https://api.telegram.org/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://classroom-bot.zivopal.com/webhook",
    "secret_token": "super-secret-webhook-token-12345"
  }'
```

## Step 3: Verify Webhook

Check webhook info:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo" | jq
```

Expected response:
```json
{
  "ok": true,
  "result": {
    "url": "https://YOUR_DOMAIN/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40,
    "allowed_updates": ["message", "document", "callback_query"]
  }
}
```

## Step 4: Test the Webhook

1. Add bot to a test group or send it a DM
2. Send a message
3. Check server logs: should see the webhook POST request
4. Bot should respond

## Step 5: Configure Bot Commands

```bash
curl -X POST \
  "https://api.telegram.org/botYOUR_BOT_TOKEN/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {
        "command": "start",
        "description": "Start the bot and join the classroom"
      },
      {
        "command": "help",
        "description": "Get help with available commands"
      },
      {
        "command": "status",
        "description": "Check your current engagement status"
      },
      {
        "command": "leaderboard",
        "description": "View class engagement leaderboard"
      },
      {
        "command": "assignments",
        "description": "List your pending assignments"
      }
    ]
  }'
```

## Step 6: Set Bot Privacy

By default, bots can't see all group messages. For moderation, enable group privacy mode off:

```bash
curl -X POST \
  "https://api.telegram.org/botYOUR_BOT_TOKEN/setMyDefaultAdministratorRights" \
  -H "Content-Type: application/json" \
  -d '{
    "rights": {
      "can_manage_chat": true,
      "can_delete_messages": true,
      "can_restrict_members": true
    },
    "for_channels": false
  }'
```

## Step 7: Get Bot Username

Use the username returned by @BotFather. You'll need it for documentation and invites.

## Environment Variables

Set these in `.env`:

```bash
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_WEBHOOK_SECRET=super-secret-webhook-token-12345
TELEGRAM_WEBHOOK_URL=https://classroom-bot.zivopal.com/webhook
```

## Troubleshooting

### Webhook Not Receiving Updates

1. **Verify URL is HTTPS**: Telegram requires HTTPS
2. **Check DNS**: `nslookup YOUR_DOMAIN`
3. **Verify Server is Running**: `curl https://YOUR_DOMAIN/health`
4. **Check Webhook Info**: `curl https://api.telegram.org/botXXX/getWebhookInfo`
5. **Check Firewall**: Ensure port 443 is open

### Bot Not Responding to Messages

1. Check server logs for errors
2. Verify bot has been added to group with appropriate permissions
3. Ensure privacy mode is disabled (see Step 6)
4. Test with `/start` command in DM

### 401 Unauthorized

- Bot token is invalid or expired
- @BotFather can regenerate token
- Update `.env` and restart server

## Useful Commands

```bash
# Get bot info
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getMe"

# Remove webhook (back to polling)
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/deleteWebhook"

# Get update count
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates?limit=1"

# Send test message
curl -X POST \
  "https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": YOUR_CHAT_ID, "text": "Test message"}'
```

## Reference

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Telegram Webhooks Guide](https://core.telegram.org/bots/webhooks)
- [Bot Father Commands](https://core.telegram.org/bots#botfather)
