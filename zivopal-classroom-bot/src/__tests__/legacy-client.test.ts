process.env.LOG_LEVEL = 'silent';
import { ZivoPalClient } from '../clients/zivopal-client';
import { ZivoPalAuthClient } from '../clients/zivopal-auth';
import { logger, redactSensitive, createAuditLog, httpLoggerOptions } from '../logger';
afterEach(() => jest.restoreAllMocks());
test('all unsupported legacy operations fail closed without a network/token adapter', async () => {
  const client = new ZivoPalClient();
  const methods = [
    () => client.sendAuditLog({} as any), () => client.sendAnalytics({} as any),
    () => client.sendNotification({} as any), () => client.submitAssignment({} as any),
    () => client.flagMessage({} as any), () => client.getMuteStatus('fixture', 'fixture'),
    () => client.setMuteStatus('fixture', 'fixture', 'synthetic', 'synthetic'),
  ];
  for (const run of methods) await expect(run()).rejects.toThrow('JWT minting is disabled');
});
test('legacy wrapper shapes stay compatible but are not a production success assertion', async () => {
  const request = jest.spyOn(ZivoPalAuthClient.prototype, 'request').mockResolvedValue({ isMuted: false });
  const client = new ZivoPalClient(), payload = { synthetic: true } as any;
  await client.sendAuditLog(payload); await client.sendAnalytics(payload);
  await client.sendNotification(payload); await client.submitAssignment(payload); await client.flagMessage(payload);
  expect(await client.getMuteStatus('class', 'user')).toEqual({ isMuted: false });
  await client.setMuteStatus('class', 'user', 'synthetic-time', 'synthetic-reason');
  expect(request.mock.calls.map(c => c[0])).toEqual(['POST', 'POST', 'POST', 'POST', 'POST', 'GET', 'PUT']);
});
test('logger redaction and metadata helpers do not require HTTP bodies', () => {
  expect(redactSensitive({ password: 'fixture', token: 'fixture', public: true })).toEqual({
    password: '[REDACTED]', token: '[REDACTED]', public: true,
  });
  const log = createAuditLog('synthetic', 'class', 'user', 'fixture', 'info', { synthetic: true });
  expect(log.metadata).toEqual({ synthetic: true });
  expect(httpLoggerOptions.serializers.req({ method: 'GET', url: '/health?code=fixture' })).toEqual({ method: 'GET', url: '/health' });
  expect(httpLoggerOptions.serializers.req({})).toEqual({ method: undefined, url: '' });
});
test('failed legacy forwarding does not log learner content or account identifiers', async () => {
  const logs = jest.spyOn(logger, 'error');
  await expect(new ZivoPalClient().sendNotification({
    classId: 'private-class-id', userId: 'private-user-id', type: 'warning',
    title: 'private-title', message: 'private-learner-content',
  })).rejects.toThrow('JWT minting is disabled');
  expect(JSON.stringify(logs.mock.calls)).not.toMatch(/private-(class|user|title|learner)/);
});
