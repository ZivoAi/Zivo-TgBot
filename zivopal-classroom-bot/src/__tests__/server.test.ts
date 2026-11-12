process.env.LOG_LEVEL = 'silent';
process.env.TELEGRAM_WEBHOOK_SECRET = 'synthetic-webhook-secret-32-characters';
process.env.ZIVOPAL_API_URL = 'https://core.example.invalid';
process.env.ZIVOPAL_AI_SERVICE_KEY = 'synthetic-service-key';
process.env.LLM_PROVIDER = 'mock';
import { Server } from '../server';
import { config, validateConfig } from '../config';

let server: Server, app: any;
beforeEach(() => { server = new Server(); app = (server as any).fastify; });
afterEach(async () => { jest.restoreAllMocks(); await app.close(); });
const service = { 'x-service-key': 'synthetic-service-key' };

test('health and readiness describe configuration, not verified upstream health', async () => {
  expect((await app.inject('/health')).json().status).toBe('ok');
  expect((await app.inject('/readiness')).json()).toMatchObject({ ready: true, check: 'configuration_only' });
  delete process.env.ZIVOPAL_AI_SERVICE_KEY;
  try { expect((await app.inject('/readiness')).json().ready).toBe(false); }
  finally { process.env.ZIVOPAL_AI_SERVICE_KEY = 'synthetic-service-key'; }
  expect((await app.inject('/api/docs')).json().openapi).toBe('3.0.0');
});
test('only the official exact shared-secret header can dispatch a webhook', async () => {
  const handle = jest.spyOn(server.getInstances().telegramHandler, 'handleUpdate').mockResolvedValue(undefined);
  const inject = (headers: Record<string, string> = {}) => app.inject({ method: 'POST', url: '/webhook', headers, payload: { update_id: 9 } });
  const invalidHeaders: Record<string, string>[] = [{}, { 'x-telegram-bot-api-secret-sha256': config.telegram.webhookSecret },
    { 'x-telegram-bot-api-secret-token': 'x'.repeat(config.telegram.webhookSecret.length) }];
  for (const headers of invalidHeaders) {
    expect((await inject(headers)).statusCode).toBe(401);
  }
  expect(handle).not.toHaveBeenCalled();
  expect((await inject({ 'x-telegram-bot-api-secret-token': config.telegram.webhookSecret })).statusCode).toBe(200);
  handle.mockRejectedValue(new Error('synthetic-private-token'));
  const failed = await inject({ 'x-telegram-bot-api-secret-token': config.telegram.webhookSecret });
  expect(failed.statusCode).toBe(500); expect(failed.body).not.toContain('private-token');
});
test('legacy reporting is private and service access does not fabricate live data', async () => {
  const path = '/api/v1/teachers/classes/synthetic/report';
  expect((await app.inject(path)).statusCode).toBe(401);
  expect((await app.inject({ url: path, headers: { 'x-service-key': 'incorrect' } })).statusCode).toBe(401);
  const report = await app.inject({ url: path, headers: service });
  expect(report.json().leaderboard).toEqual([]);
  expect((await app.inject({ url: '/api/v1/teachers/classes/synthetic/students/fixture/metrics', headers: service })).statusCode).toBe(200);
  for (const url of ['/api/v1/curriculum/zimsec/search?keyword=math', '/api/v1/curriculum/zimsec/search', '/api/v1/curriculum/unknown/search']) {
    expect((await app.inject({ url, headers: service })).statusCode).toBe(200);
  }
});
test('legacy mute cannot silently succeed using a fabricated JWT', async () => {
  const result = await app.inject({ method: 'POST',
    url: '/api/v1/teachers/classes/synthetic/students/fixture/mute', headers: service,
    payload: { duration: 1000, reason: 'Synthetic' } });
  expect(result.statusCode).toBe(500);
  expect(result.json()).toEqual({ error: 'Failed to mute student' });
});
test('global failures do not expose exception details or query contents', async () => {
  app.get('/synthetic-failure', async () => { throw new Error('private synthetic content'); });
  const response = await app.inject('/synthetic-failure?private=synthetic');
  expect(response.statusCode).toBe(500);
  expect(response.body).not.toContain('private synthetic content');
});
test('lifecycle validates configuration and propagates startup/shutdown failures', async () => {
  await app.ready();
  const listen = jest.spyOn(app, 'listen').mockResolvedValue('http://127.0.0.1');
  await server.start(); expect(listen).toHaveBeenCalledWith({ port: config.server.port, host: '0.0.0.0' });
  listen.mockRejectedValue(new Error('Synthetic listen failure'));
  await expect(server.start()).rejects.toThrow('Synthetic listen failure');
  const close = jest.spyOn(app, 'close').mockRejectedValueOnce(new Error('Synthetic close failure'));
  await expect(server.stop()).rejects.toThrow('Synthetic close failure');
  close.mockRestore(); await server.stop();
});
test('validation refuses missing or malformed secrets without printing values', () => {
  delete process.env.ZIVOPAL_AI_SERVICE_KEY;
  expect(validateConfig).toThrow('ZIVOPAL_AI_SERVICE_KEY');
  process.env.ZIVOPAL_AI_SERVICE_KEY = 'synthetic-service-key';
  process.env.TELEGRAM_WEBHOOK_SECRET = 'short';
  expect(validateConfig).toThrow('32–256');
  process.env.TELEGRAM_WEBHOOK_SECRET = 'synthetic-webhook-secret-32-characters';
  expect(validateConfig).not.toThrow();
});
