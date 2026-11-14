// No Telegram, Core, OpenAI or other external requests are permitted.
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.TELEGRAM_BOT_TOKEN = '777:synthetic-token';
process.env.TELEGRAM_WEBHOOK_SECRET = 'synthetic-webhook-secret-32-characters';
process.env.ZIVOPAL_API_URL = 'https://core.example.invalid';
process.env.ZIVOPAL_AI_SERVICE_KEY = 'synthetic-service-key';
process.env.LLM_PROVIDER = 'core';
process.env.LOG_LEVEL = 'silent';
const { CoreTutorClient, CoreTutorError } = require('../dist/clients/core-tutor');
const { TelegramWebhookHandler } = require('../dist/telegram/webhook-handler');
const { ZivoPalAuthClient } = require('../dist/clients/zivopal-auth');
const { Server } = require('../dist/server');
const identity = { botId: '777', telegramUserId: '12345', chatId: '12345', chatType: 'private', messageDate: Math.floor(Date.now() / 1000) };
async function main() {
  let requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify({ reply: 'Synthetic Core answer.' }), { status: 200 });
  };
  const client = new CoreTutorClient('https://core.example.invalid/', 'synthetic-service-key');
  assert.equal(await client.chat(identity, '4', 'Synthetic question'), 'Synthetic Core answer.');
  assert.equal(requests[0].url, 'https://core.example.invalid/api/ai/internal/telegram/chat');
  assert.equal(requests[0].options.headers['X-Service-Key'], 'synthetic-service-key');
  assert.equal(requests[0].options.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(requests[0].options.body), { ...identity, updateId: '4', message: 'Synthetic question' });
  assert.equal(requests[0].options.redirect, 'error');
  assert.ok(requests[0].options.signal);
  global.fetch = async () => new Response(JSON.stringify({
    reply: 'x'.repeat(5000), curriculumCoverage: 'unverified', requiresTeacherReview: true,
  }), { status: 200 });
  const bounded = await client.chat(identity, '10', 'Synthetic question');
  assert.ok(bounded.length <= 4000);
  assert.match(bounded, /source documents have not been verified/);
  assert.match(bounded, /require teacher review/);
  global.fetch = async () => new Response('synthetic-private-upstream-error', { status: 403 });
  await assert.rejects(client.chat(identity, '5', 'Synthetic'), e => e instanceof CoreTutorError && !e.message.includes('upstream-error'));
  global.fetch = async () => { throw new Error('synthetic-header-and-code-must-not-leak'); };
  await assert.rejects(client.chat(identity, '6', 'Synthetic'), e => !e.message.includes('must-not-leak'));
  await assert.rejects(new ZivoPalAuthClient().getAccessToken(), /JWT minting is disabled/);
  console.log('PASS private Core transport, service auth, bounded timeout, safe errors and no JWT minting');

  const handler = new TelegramWebhookHandler('777:synthetic-token');
  const replies = [], calls = [];
  handler.core = {
    link: async (i, code) => calls.push({ type: 'link', i, code }),
    chat: async (i, updateId, text) => { calls.push({ type: 'chat', i, updateId, text }); return 'Synthetic tutor answer.'; },
  };
  handler.getBot().api.config.use(async (_prev, method, payload) => {
    if (method === 'getMe') return { ok: true, result: { id: 777, is_bot: true, first_name: 'Fixture', username: 'Fixture_bot' } };
    if (method === 'sendMessage') {
      replies.push(payload);
      return { ok: true, result: { message_id: replies.length, date: 0, chat: { id: 12345, type: 'private' }, text: payload.text } };
    }
    throw new Error('External Telegram request refused');
  });
  const update = (id, text, type = 'private', fromId = 12345, chatId = type === 'private' ? fromId : -1001) => ({
    update_id: id, message: { message_id: id, date: identity.messageDate, from: { id: fromId, is_bot: false, first_name: 'Fixture' },
      chat: { id: chatId, type }, text },
  });
  await handler.handleUpdate(update(1, 'Synthetic private question'));
  assert.equal(calls[0].type, 'chat');
  assert.deepEqual(calls[0].i, identity);
  assert.equal(calls[0].updateId, '1');
  assert.equal(replies[0].text, 'Synthetic tutor answer.');
  await handler.handleUpdate(update(2, '/link ' + 'a'.repeat(43), 'group'));
  await handler.handleUpdate(update(3, 'Synthetic group question', 'supergroup'));
  await handler.handleUpdate(update(4, 'Mismatched private chat', 'private', 12345, 99999));
  assert.equal(calls.length, 1);
  assert.equal(replies.length, 1);
  const linkUpdate = update(5, '/link ' + 'a'.repeat(43));
  linkUpdate.message.entities = [{ type: 'bot_command', offset: 0, length: 5 }];
  await handler.handleUpdate(linkUpdate);
  assert.equal(calls[1].type, 'link');
  assert.match(replies[1].text, /has not activated access/);
  const document = update(6, '');
  delete document.message.text;
  document.message.document = { file_id: 'synthetic-file', file_unique_id: 'synthetic', file_size: 1 };
  await handler.handleUpdate(document);
  assert.equal(calls.length, 2);
  assert.match(replies[2].text, /written questions only/);
  console.log('PASS actual grammY private routing, group isolation, identity matching, confirmation instructions and unsupported files');

  const server = new Server();
  let handled = 0;
  server.telegramHandler.handleUpdate = async () => { handled++; };
  const app = server.fastify;
  try {
    const inject = (headers = {}) => app.inject({ method: 'POST', url: '/webhook', headers, payload: { update_id: 9 } });
    assert.equal((await inject()).statusCode, 401);
    assert.equal((await inject({ 'x-telegram-bot-api-secret-sha256': process.env.TELEGRAM_WEBHOOK_SECRET })).statusCode, 401);
    assert.equal((await inject({ 'x-telegram-bot-api-secret-token': 'incorrect' })).statusCode, 401);
    assert.equal(handled, 0);
    assert.equal((await inject({ 'x-telegram-bot-api-secret-token': process.env.TELEGRAM_WEBHOOK_SECRET })).statusCode, 200);
    assert.equal(handled, 1);
    assert.equal((await app.inject('/api/v1/teachers/classes/synthetic/report')).statusCode, 401);
    console.log('PASS official Telegram secret-token header and private legacy reporting gate');
  } finally { await app.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
