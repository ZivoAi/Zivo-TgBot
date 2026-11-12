process.env.LOG_LEVEL = 'silent';
process.env.ZIVOPAL_API_URL = 'https://core.example.invalid';
process.env.ZIVOPAL_AI_SERVICE_KEY = 'synthetic-service-key';
import { CoreTutorClient, CoreTutorError } from '../clients/core-tutor';
import { ZivoPalAuthClient } from '../clients/zivopal-auth';

const identity = { botId: '777', telegramUserId: '12345', chatId: '12345', chatType: 'private' as const, messageDate: Math.floor(Date.now() / 1000) };
const originalFetch = global.fetch;
let transport: jest.Mock;
beforeEach(() => {
  transport = jest.fn();
  global.fetch = transport;
});
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });
const client = () => new CoreTutorClient('https://core.example.invalid/', 'synthetic-service-key');

test('keeps source attribution and licence links intact when a long answer is shortened', async () => {
  const attribution = '\n\nSubject references (curriculum alignment unverified):\n[1] Siyavula — CC BY 3.0. https://example.invalid/source\nLicence: https://creativecommons.org/licenses/by/3.0/';
  transport.mockResolvedValue(new Response(JSON.stringify({
    reply: 'A'.repeat(5000) + attribution, curriculumCoverage: 'unverified', requiresTeacherReview: true,
  })));
  const answer = await client().chat(identity, 'source-test', 'Synthetic question');
  expect(answer.length).toBeLessThanOrEqual(4000);
  expect(answer).toContain('Answer shortened to retain source references');
  expect(answer).toContain(attribution);
  expect(answer).toContain('require teacher review');
});
test('keeps a short sourced answer unchanged apart from established notices', async () => {
  const reply = 'An explanation.\n\nSubject references (curriculum alignment unverified):\n[1] Source and licence.';
  transport.mockResolvedValue(new Response(JSON.stringify({ reply })));
  expect(await client().chat(identity, 'source-short', 'Synthetic')).toBe(reply);
});
test('fails explicitly rather than stripping an oversized attribution block', async () => {
  transport.mockResolvedValue(new Response(JSON.stringify({
    reply: 'Explanation.\n\nSubject references (curriculum alignment unverified):\n' + 'source'.repeat(500),
  })));
  await expect(client().chat(identity, 'source-too-long', 'Synthetic')).rejects.toThrow(CoreTutorError);
});

test('uses only the private service header and exact Core chat contract', async () => {
  transport.mockResolvedValue(new Response(JSON.stringify({ reply: 'Synthetic reply' })));
  expect(await client().chat(identity, '2', 'Synthetic question')).toBe('Synthetic reply');
  const [url, opts] = transport.mock.calls[0];
  expect(String(url)).toBe('https://core.example.invalid/api/ai/internal/telegram/chat');
  expect(opts.headers).toEqual({ 'Content-Type': 'application/json', 'X-Service-Key': 'synthetic-service-key' });
  expect(JSON.parse(opts.body)).toEqual({ ...identity, updateId: '2', message: 'Synthetic question' });
  expect(opts.redirect).toBe('error');
});
test('does not report a link before Core requires owner confirmation', async () => {
  transport.mockResolvedValueOnce(new Response(JSON.stringify({ confirmationRequired: true })));
  await expect(client().link(identity, 'synthetic-code')).resolves.toBeUndefined();
  expect(String(transport.mock.calls[0][0])).toMatch(/\/api\/ai\/internal\/telegram\/link$/);
  transport.mockResolvedValueOnce(new Response('{}'));
  await expect(client().link(identity, 'synthetic-code')).rejects.toThrow('Linking was not confirmed');
});
test.each([400, 402, 403, 409, 429, 500, 503])('sanitizes HTTP %s and never retries a model request', async status => {
  transport.mockResolvedValue(new Response('private-upstream-content', { status }));
  await expect(client().chat(identity, '3', 'Synthetic')).rejects.toBeInstanceOf(CoreTutorError);
  expect(transport).toHaveBeenCalledTimes(1);
  await expect(client().chat(identity, '4', 'Synthetic')).rejects.not.toThrow('private-upstream-content');
});
test('explains invalid linking codes safely', async () => {
  transport.mockResolvedValue(new Response('private-code', { status: 400 }));
  await expect(client().link(identity, 'fixture')).rejects.toThrow('invalid or expired');
});
test.each(['null', '[]', '"text"', '{', '{"reply":""}', '{"reply":4}'])('rejects invalid Core response %s', async body => {
  transport.mockResolvedValue(new Response(body));
  await expect(client().chat(identity, '5', 'Synthetic')).rejects.toBeInstanceOf(CoreTutorError);
});
test('adds honest coverage/review notices within the Telegram length limit', async () => {
  transport.mockResolvedValue(new Response(JSON.stringify({
    reply: 'x'.repeat(5000), curriculumCoverage: 'unverified', requiresTeacherReview: true,
  })));
  const reply = await client().chat(identity, '6', 'Synthetic');
  expect(reply.length).toBeLessThanOrEqual(4000);
  expect(reply).toContain('have not been verified');
  expect(reply).toContain('require teacher review');
});
test.each(['invalid', 'ftp://core.example.invalid', 'https://user:password@core.example.invalid'])('refuses unsafe Core URL %s', async base => {
  await expect(new CoreTutorClient(base, 'fixture').chat(identity, '7', 'Synthetic')).rejects.toThrow('not configured');
  expect(transport).not.toHaveBeenCalled();
});
test('requires a configured credential and HTTPS in production', async () => {
  await expect(new CoreTutorClient('https://core.example.invalid', '').chat(identity, '8', 'Synthetic')).rejects.toThrow('not configured');
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try { await expect(new CoreTutorClient('http://core.example.invalid', 'fixture').chat(identity, '8', 'Synthetic')).rejects.toThrow('not configured'); }
  finally { process.env.NODE_ENV = previous; }
  expect(transport).not.toHaveBeenCalled();
});
test('aborts at the deadline and clears its timer without a retry', async () => {
  jest.useFakeTimers();
  transport.mockImplementation((_url, opts) => new Promise((_resolve, reject) => {
    opts.signal.addEventListener('abort', () => reject(new Error('private transport details')));
  }));
  const pending = expect(client().chat(identity, '9', 'Synthetic')).rejects.toThrow('No answer was confirmed');
  jest.advanceTimersByTime(90000);
  await pending;
  expect(transport).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});
test('network failures cannot expose headers or reactivate legacy JWT minting', async () => {
  transport.mockRejectedValue(new Error('synthetic-sensitive-transport-header'));
  await expect(client().chat(identity, '10', 'Synthetic')).rejects.not.toThrow('transport-header');
  const legacy = new ZivoPalAuthClient();
  (legacy as any).token = { accessToken: 'forged-synthetic-token', expiresAt: Date.now() + 3600000 };
  await expect(legacy.getAccessToken()).rejects.toThrow('JWT minting is disabled');
  await expect(legacy.request('POST', '/api/v1/anything', { userId: 'forged' })).rejects.toThrow('JWT minting is disabled');
  expect(transport).toHaveBeenCalledTimes(1);
});
