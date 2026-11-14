const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function classifier(fetch, env = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/modules/moderation/llm-classifier.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, process: { env }, URL, AbortSignal, fetch, Error });
  return exports;
}
const env = { NODE_ENV: 'production', ZIVOPAL_API_URL: 'https://core.test', ZIVOPAL_AI_SERVICE_KEY: 'synthetic-key' };
test('production cannot silently select mock moderation', () => {
  assert.throws(() => classifier(undefined, env).createClassifier('mock', {}), /not permitted/);
});
test('missing Core configuration fails closed', () => {
  assert.throws(() => classifier(undefined, { NODE_ENV: 'production' }).createClassifier('core', {}), /requires/);
});
test('classification uses the shared gateway without user identifiers or provider credentials', async () => {
  const instance = classifier(async (url, init) => {
    assert.equal(String(url), 'https://core.test/api/ai/internal/moderate');
    assert.deepEqual(JSON.parse(init.body), { text: 'Synthetic classroom text' });
    return { ok: true, json: async () => ({ category: 'harmless', severity: 'low', confidence: 0.9, shouldAction: false }) };
  }, env).createClassifier('core', {});
  assert.equal((await instance.classify('Synthetic classroom text')).shouldAction, false);
});
test('outages and invalid classifications do not become harmless mock results', async () => {
  for (const result of [{ ok: false }, { ok: true, json: async () => ({ category: 'unknown' }) }]) {
    await assert.rejects(classifier(async () => result, env).createClassifier('core', {}).classify('Synthetic'), /no AI classification was confirmed/);
  }
});
