import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWorker } from '../src/worker.mjs';

const valid = { name: 'Alex Müller', email: 'alex@example.com', company: '', message: 'Please help with our software.\nVielen Dank!', website: '', token: 'valid-token' };
function setup({ verification = { success: true, hostname: 'cad-dev.com', action: 'contact' }, verifyError, sendError, acceptance = { messageId: 'test-message' } } = {}) {
  const calls = { verify: [], email: [], assets: [] };
  const worker = createWorker(async (url, options) => {
    calls.verify.push({ url, body: JSON.parse(options.body) });
    if (verifyError) throw verifyError;
    return Response.json(verification);
  });
  const env = {
    TURNSTILE_SECRET_KEY: 'mock-secret',
    CONTACT_EMAIL: { async send(email) { calls.email.push(email); if (sendError) throw sendError; return acceptance; } },
    ASSETS: { async fetch(req) { calls.assets.push(req.url); return new Response('static page'); } },
  };
  const request = (body = valid, options = {}) => {
    const { headers, ...rest } = options;
    return worker.fetch(new Request('https://cad-dev.com/api/contact', {
      method: 'POST', headers: { Origin: 'https://cad-dev.com', 'Content-Type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body), ...rest,
    }), env);
  };
  return { calls, worker, env, request };
}

test('valid submission sends to the fixed inbox with a validated Reply-To', async () => {
  const { request, calls } = setup();
  const res = await request();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, code: 'sent' });
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(calls.email.length, 1);
  assert.deepEqual(calls.email[0], {
    from: 'contact@cad-dev.com', to: 'cristian.cristea.dev@gmail.com', replyTo: valid.email,
    subject: 'CAD Development website enquiry',
    text: `Name: ${valid.name}\nEmail: ${valid.email}\nCompany: Not provided\n\nMessage:\n${valid.message}`,
  });
  assert.equal(calls.verify[0].url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.deepEqual(calls.verify[0].body, { secret: 'mock-secret', response: 'valid-token' });
});

test('success waits for actual email acceptance', async () => {
  const s = setup(); let accept; let settled = false;
  s.env.CONTACT_EMAIL.send = () => new Promise(resolve => { accept = resolve; });
  const response = s.request().then(r => { settled = true; return r; });
  while (!accept) await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  accept({ messageId: 'accepted' });
  assert.equal((await response).status, 200);
});

test('required fields, invalid types, lengths, header injection and address lists are rejected before external calls', async () => {
  const invalid = [null, [], { ...valid, name: '' }, { ...valid, name: '   ' }, { ...valid, name: 42 },
    { ...valid, name: 'a'.repeat(101) }, { ...valid, email: 'a'.repeat(255) },
    { ...valid, email: 'alex@example.com\r\nBcc: x@example.com' }, { ...valid, email: 'a@example.com,b@example.com' },
    { ...valid, email: 'a..b@example.com' }, { ...valid, email: 'a@-example.com' },
    { ...valid, name: 'Alex\nHeader' }, { ...valid, company: null }, { ...valid, company: 'a'.repeat(201) },
    { ...valid, message: '' }, { ...valid, message: 'a'.repeat(5001) }, { ...valid, message: '\u0000' },
    { ...valid, token: '' }, { ...valid, token: 'a'.repeat(2049) }, { ...valid, token: {} },
    { ...valid, from: 'attacker@example.com' }, { ...valid, to: 'attacker@example.com' }];
  for (const input of invalid) {
    const s = setup(); assert.equal((await s.request(input)).status, 400, JSON.stringify(input));
    assert.equal(s.calls.email.length, 0); assert.equal(s.calls.verify.length, 0);
  }
});

test('boundary lengths, optional company, Unicode and multiline messages work', async () => {
  const s = setup();
  assert.equal((await s.request({ ...valid, name: 'a'.repeat(100), company: 'b'.repeat(200), message: 'é'.repeat(5000), token: 't'.repeat(2048) })).status, 200);
  const { company, ...withoutCompany } = valid;
  assert.equal((await s.request(withoutCompany)).status, 200);
});

test('honeypot never produces success or calls external services', async () => {
  const s = setup(); assert.equal((await s.request({ ...valid, website: 'https://spam.test' })).status, 403);
  assert.equal(s.calls.verify.length, 0); assert.equal(s.calls.email.length, 0);
});

test('origin, media type, malformed JSON, methods and API routes are enforced', async () => {
  const s = setup();
  assert.equal((await s.request(valid, { headers: { Origin: 'https://www.cad-dev.com' } })).status, 403);
  assert.equal((await s.request(valid, { headers: { Origin: '' } })).status, 403);
  assert.equal((await s.request(valid, { headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await s.request('{')).status, 400);
  const res = await s.worker.fetch(new Request('https://cad-dev.com/api/contact'), s.env);
  assert.equal(res.status, 405); assert.equal(res.headers.get('allow'), 'POST');
  assert.equal((await s.worker.fetch(new Request('https://cad-dev.com/api/other'), s.env)).status, 404);
  assert.equal(s.calls.email.length, 0);
});

test('request size is enforced with missing and dishonest Content-Length', async () => {
  for (const length of [undefined, '2', '32769']) {
    const s = setup();
    const body = JSON.stringify({ ...valid, message: 'x'.repeat(33000) });
    const headers = length ? { 'Content-Length': length } : {};
    assert.equal((await s.request(body, { headers })).status, 413);
    assert.equal(s.calls.verify.length, 0); assert.equal(s.calls.email.length, 0);
  }
  const s = setup();
  const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(16384)); c.enqueue(new Uint8Array(16385)); c.close(); } });
  assert.equal((await s.request(valid, { body: stream, duplex: 'half' })).status, 413);
});

test('failed, expired, replayed and mismatched Turnstile tokens never send', async () => {
  for (const verification of [null, { success: false }, { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { success: true, hostname: 'evil.test', action: 'contact' }, { success: true, hostname: 'cad-dev.com', action: 'login' }]) {
    const s = setup({ verification }); assert.equal((await s.request()).status, 403); assert.equal(s.calls.email.length, 0);
  }
  const s = setup({ verifyError: new Error('timeout') });
  assert.equal((await s.request()).status, 503); assert.equal(s.calls.email.length, 0);
});

test('configuration and email failures fail closed without leaking service errors', async () => {
  const missing = setup(); delete missing.env.TURNSTILE_SECRET_KEY;
  assert.equal((await missing.request()).status, 503); assert.equal(missing.calls.email.length, 0);
  for (const options of [{ sendError: new Error('secret service details') }, { acceptance: undefined }, { acceptance: {} }]) {
    const s = setup(options);
    if (options.acceptance === undefined && !options.sendError) s.env.CONTACT_EMAIL.send = async () => undefined;
    const r = await s.request(); assert.equal(r.status, 502); assert.deepEqual(await r.json(), { ok: false, code: 'email_unavailable' });
  }
});

test('static pages use the existing assets binding and recipient agrees with Wrangler', async () => {
  const s = setup();
  for (const path of ['/', '/legal.html', '/assets/css/blue.css']) {
    assert.equal(await (await s.worker.fetch(new Request('https://cad-dev.com' + path), s.env)).text(), 'static page');
  }
  const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.assets.directory, './cad-website');
  assert.deepEqual(config.assets.run_worker_first, ['/api/*']);
  assert.equal(config.send_email[0].destination_address, 'cristian.cristea.dev@gmail.com');
  assert.equal(config.send_email[0].remote, false);
});
