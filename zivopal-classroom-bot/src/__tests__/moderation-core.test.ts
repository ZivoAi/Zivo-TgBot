import { CoreLLMClassifier, OpenAILLMClassifier, createClassifier } from '../modules/moderation/llm-classifier';
const nativeFetch = global.fetch;
let transport: jest.Mock;
beforeEach(() => {
  process.env.ZIVOPAL_API_URL = 'https://core.example.invalid';
  process.env.ZIVOPAL_AI_SERVICE_KEY = 'synthetic-service-key';
  transport = jest.fn(); global.fetch = transport;
});
afterEach(() => { global.fetch = nativeFetch; process.env.NODE_ENV = 'test'; });
const valid = { category: 'harmless', severity: 'low', confidence: 0.95, shouldAction: false };
test('moderation uses the Core contract without learner identifiers or independent OpenAI credentials', async () => {
  transport.mockResolvedValue(new Response(JSON.stringify(valid)));
  const result = await new CoreLLMClassifier().classify('Synthetic', { studentId: 'must-not-forward' });
  expect(result.category).toBe('harmless');
  expect(result.rationale).toContain('manual review');
  const [url, options] = transport.mock.calls[0];
  expect(String(url)).toBe('https://core.example.invalid/api/ai/internal/moderate');
  expect(JSON.parse(options.body)).toEqual({ text: 'Synthetic' });
  expect(options.headers['X-Service-Key']).toBe('synthetic-service-key');
});
test.each([
  { category: 'unknown' }, { severity: 'unknown' }, { confidence: '0.5' },
  { confidence: -0.1 }, { confidence: 1.1 }, { shouldAction: 'yes' },
])('invalid classification %j never becomes a mocked harmless result', async change => {
  transport.mockResolvedValue(new Response(JSON.stringify({ ...valid, ...change })));
  await expect(new CoreLLMClassifier().classify('Synthetic')).rejects.toThrow('no AI classification was confirmed');
});
test('HTTP and transport failures are explicit and sanitized', async () => {
  transport.mockResolvedValueOnce(new Response('private-content', { status: 503 }))
    .mockRejectedValueOnce(new Error('private-header'));
  for (let i = 0; i < 2; i++) await expect(new CoreLLMClassifier().classify('Synthetic')).rejects.toThrow('Core moderation unavailable');
});
test('missing credentials and insecure origins are rejected before network access', () => {
  delete process.env.ZIVOPAL_AI_SERVICE_KEY;
  expect(() => new CoreLLMClassifier()).toThrow('requires');
  process.env.ZIVOPAL_AI_SERVICE_KEY = 'synthetic-service-key';
  for (const url of ['http://core.example.invalid', 'ftp://core.example.invalid', 'https://user:password@core.example.invalid']) {
    process.env.ZIVOPAL_API_URL = url;
    expect(() => new CoreLLMClassifier()).toThrow('secure Core URL');
  }
  process.env.ZIVOPAL_API_URL = 'http://127.0.0.1';
  expect(() => new CoreLLMClassifier()).not.toThrow();
  expect(transport).not.toHaveBeenCalled();
});
test('production cannot choose mocks and the old provider name still uses Core', () => {
  process.env.NODE_ENV = 'production';
  expect(() => createClassifier('mock', {})).toThrow('not permitted');
  expect(createClassifier('core', {})).toBeInstanceOf(CoreLLMClassifier);
  expect(createClassifier('openai', { apiKey: 'must-not-use' })).toBeInstanceOf(CoreLLMClassifier);
  expect(new OpenAILLMClassifier('must-not-use')).toBeInstanceOf(CoreLLMClassifier);
});
