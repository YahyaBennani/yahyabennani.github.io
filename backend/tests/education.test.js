const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateEducation } = require('../lib/education');
const base = { title: ' CRTA ', kind: 'certification', sort_order: 0 };
const pdf = { name: 'certificate.pdf', type: 'application/pdf', data: Buffer.from('%PDF-1.7\nexample').toString('base64') };
test('valid fields normalize; omitted documents preserve attachments', () => {
  const data = validateEducation(base);
  assert.equal(data.title, 'CRTA');
  assert.equal(data.image, undefined);
  assert.equal(data.pdf, undefined);
});
test('supports both documents and explicit removal', () => {
  const image = { name: 'certificate.png', type: 'image/png', data: Buffer.from([137,80,78,71,13,10,26,10]).toString('base64') };
  assert.deepEqual(validateEducation({ ...base, image, pdf }).pdf, pdf);
  assert.equal(validateEducation({ ...base, image: null }).image, null);
});
test('rejects invalid fields and unsafe verification links', () => {
  for (const change of [{ title: ' ' }, { title: {} }, { kind: 'x' }, { sort_order: 1.5 }, { description: 'a'.repeat(2001) }, { verification_url: 'javascript:alert(1)' }, { verification_url: 'https://user:pass@example.com' }, { verification_url: 'https://' }]) {
    assert.throws(() => validateEducation({ ...base, ...change }));
  }
  assert.equal(validateEducation({ ...base, verification_url: 'https://example.com/verify?a=1&b=2' }).verification_url, 'https://example.com/verify?a=1&b=2');
});
test('rejects disguised, oversized and invalid base64 files', () => {
  for (const file of [{ ...pdf, data: Buffer.from('<script>alert(1)</script>').toString('base64') }, { ...pdf, data: '%%%%' }, { ...pdf, data: '' }, { ...pdf, type: 'text/html' }, { ...pdf, data: Buffer.alloc(1024 * 1024 + 1).toString('base64') }]) assert.throws(() => validateEducation({ ...base, pdf: file }));
});

// Exercise route contracts with isolated database/auth adapters.
const Module = require('node:module');
function route(path, authorized = true, rows = [{ id: 1 }]) {
  const calls = [];
  const original = Module._load;
  Module._load = function(name, ...args) {
    if (name === '../../lib/db') return { sql: async (strings, ...values) => { calls.push({ sql: strings.join('?'), values }); return { rows }; } };
    if (name === '../../lib/auth') return { requireAuth: (req, res) => { if (!authorized) res.status(401).json({ error: 'Unauthorized' }); return authorized; } };
    if (name === '../../lib/rateLimit') return { rateLimitOrReject: async () => false };
    if (name === '../../lib/cors') return { applyCors: () => false };
    return original.call(this, name, ...args);
  };
  let handler;
  try { delete require.cache[require.resolve(path)]; handler = require(path); } finally { Module._load = original; }
  return { calls, async invoke(method, body = base, query = { id: '1' }) {
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
    await handler({ method, body, query }, res);
    return res;
  } };
}
test('unauthenticated mutations never access the database', async () => {
  for (const [path, method] of [['../api/education/index', 'POST'], ['../api/education/[id]', 'PUT'], ['../api/education/[id]', 'DELETE']]) {
    const api = route(path, false);
    assert.equal((await api.invoke(method)).code, 401);
    assert.equal(api.calls.length, 0);
  }
});
test('list omits binary payloads; creation is parameterized', async () => {
  const api = route('../api/education/index');
  assert.equal((await api.invoke('GET')).code, 200);
  assert.match(api.calls[0].sql, /image->>'name'/);
  assert.doesNotMatch(api.calls[0].sql, /SELECT \*/);
  assert.equal((await api.invoke('POST', { ...base, title: "test'); DROP TABLE education;--", pdf })).code, 201);
  assert.doesNotMatch(api.calls[1].sql, /DROP TABLE/);
  assert.equal(api.calls[1].values[8], JSON.stringify(pdf));
});
test('update distinguishes preserved and removed documents; deletion handles missing records', async () => {
  const api = route('../api/education/[id]');
  assert.equal((await api.invoke('PUT', { ...base, pdf: null })).code, 200);
  assert.equal(api.calls[0].values[7], false);
  assert.equal(api.calls[0].values[9], true);
  assert.equal(api.calls[0].values[10], null);
  assert.equal((await route('../api/education/[id]', true, []).invoke('DELETE')).code, 404);
});
test('asset endpoint validates identifiers, missing files and returns documents', async () => {
  const api = route('../api/education/[id]', true, [{ file: pdf }]);
  assert.equal((await api.invoke('GET', null, { id: '1', asset: 'pdf' })).body, pdf);
  assert.equal((await api.invoke('GET', null, { id: 'invalid', asset: 'pdf' })).code, 400);
  assert.equal((await api.invoke('GET', null, { id: '1', asset: 'other' })).code, 400);
  assert.equal((await route('../api/education/[id]', true, [{ file: null }]).invoke('GET', null, { id: '1', asset: 'image' })).code, 404);
});
