import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker, { seal } from '../worker.mjs';
import { cleanVisits } from '../analytics.mjs';

const origin = 'https://veronica-l.github.io', admin = 'https://admin.example';
const article = '11111111-1111-4111-8111-111111111111';
class DB {
  constructor() {
    this.db = new DatabaseSync(':memory:');
    for (const file of fs.readdirSync(new URL('../migrations/', import.meta.url)).sort()) this.db.exec(fs.readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  }
  prepare(sql) {
    const stmt = this.db.prepare(sql); let args = [];
    const bound = { bind(...values) { args = values; return bound; }, async first() { return stmt.get(...args) || null; }, async all() { return { results: stmt.all(...args) }; }, async run() { return { meta: { changes: Number(stmt.run(...args).changes) } }; } };
    return bound;
  }
}
async function fixture() {
  const env = { DB: new DB(), SITE_URL: origin, SESSION_SECRET: 'test-only-secret-with-sufficient-entropy', OWNER_ID: 'test-owner' };
  const raw = 'a'.repeat(43), hash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))).toString('base64url');
  await env.DB.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)').bind(hash, env.OWNER_ID, await seal({ token: 'test-only-token' }, env), Date.now() + 60000).run();
  await env.DB.prepare('INSERT INTO entries (id, document, published_revision, updated_at) VALUES (?, ?, 1, ?)').bind(article, JSON.stringify({ title: '公开文章' }), new Date().toISOString()).run();
  return { env, raw };
}
function request(path, { method = 'GET', data, ip = '192.0.2.10', from = origin, raw, cf = { country: 'CN', region: 'Shanghai', city: 'Shanghai' }, headers = {} } = {}) {
  const req = new Request(admin + path, { method, headers: { ...(from ? { Origin: from } : {}), ...(raw ? { Cookie: '__Host-kiki-session=' + raw } : {}), 'CF-Connecting-IP': ip, 'Content-Type': 'application/json', ...headers }, ...(data ? { body: JSON.stringify(data) } : {}) });
  if (cf) Object.defineProperty(req, 'cf', { value: cf });
  return req;
}
const visit = (env, target, opts = {}) => worker.fetch(request('/public/analytics/visit', { method: 'POST', data: { target }, ...opts }), env);
const counts = (env, target) => worker.fetch(request('/public/analytics/counts?targets=' + encodeURIComponent(target)), env);

test('public tracking counts atomically; same IP and target deduplicate across requests for 30 minutes', async () => {
  const { env } = await fixture();
  const first = await visit(env, 'article:' + article);
  assert.equal(first.status, 200); assert.deepEqual(await first.json(), { target: 'article:' + article, views: 1, recorded: true });
  const repeated = await Promise.all([visit(env, 'article:' + article), visit(env, 'article:' + article)]);
  for (const response of repeated) assert.equal((await response.json()).recorded, false);
  assert.equal((await (await visit(env, 'article:' + article, { ip: '2001:db8::1' })).json()).views, 2);
  await visit(env, 'page:home');
  await env.DB.prepare('UPDATE visit_events SET visited_at = ? WHERE target = ?').bind(Date.now() - 31 * 60000, 'article:' + article).run();
  assert.equal((await (await visit(env, 'article:' + article)).json()).views, 3);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM visit_events').first()).n, 4);
});
test('public responses expose only counts, never IPs, locations, titles, or visitor keys; private reports require owner login', async () => {
  const { env, raw } = await fixture(); await visit(env, 'page:home');
  const response = await counts(env, 'page:home,article:' + article), text = await response.text();
  assert.deepEqual(JSON.parse(text), { counts: { 'page:home': 1, ['article:' + article]: 0 } });
  assert(!/192\.0\.2|Shanghai|visitor_key|首页/.test(text));
  assert.equal((await worker.fetch(request('/api/analytics'), env)).status, 401);
  const report = await worker.fetch(request('/api/analytics', { raw, from: admin }), env);
  assert.equal(report.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(report.headers.get('Cache-Control'), 'no-store');
  const data = await report.json();
  assert.equal(data.summary.total, 1); assert.equal(data.records[0].ip, '192.0.2.10');
  assert.equal(data.records[0].title, '首页'); assert.equal(data.records[0].city, 'Shanghai');
  assert(!JSON.stringify(data).includes('visitor_key'));
});
test('only configured site may submit tracking, with correct CORS including errors and preflight', async () => {
  const { env } = await fixture();
  for (const from of ['https://attacker.example', null, 'null']) assert.equal((await visit(env, 'page:home', { from })).status, 403);
  const preflight = await worker.fetch(request('/public/analytics/visit', { method: 'OPTIONS' }), env);
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(preflight.headers.get('Access-Control-Allow-Credentials'), null);
  const bad = await visit(env, 'page:made-up');
  assert.equal(bad.status, 400); assert.equal(bad.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal((await visit(env, 'page:home', { headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await visit(env, 'page:home', { data: { target: 'page:home', padding: 'x'.repeat(2100) } })).status, 413);
});
test('edge metadata overrides spoofed browser data; local or unknown IPs do not create false visitors', async () => {
  const { env, raw } = await fixture();
  await visit(env, 'page:home', { data: { target: 'page:home', ip: '203.0.113.9', city: 'fake', title: 'fake' }, headers: { 'X-Forwarded-For': '203.0.113.9' } });
  const response = await worker.fetch(request('/api/analytics', { raw }), env), data = await response.json();
  assert.equal(data.records[0].ip, '192.0.2.10'); assert.equal(data.records[0].city, 'Shanghai');
  assert.equal(data.records[0].title, '首页');
  assert.equal((await (await visit(env, 'page:blog', { cf: null })).json()).recorded, false);
  await visit(env, 'page:photos', { cf: {} });
  const row = await env.DB.prepare('SELECT city FROM visit_events WHERE target = ?').bind('page:photos').first();
  assert.equal(row.city, '');
});
test('arbitrary paths and unpublished or trashed articles cannot become visit records', async () => {
  const { env } = await fixture();
  for (const target of ['https://example.test/private', 'page:home?token=private', 'article:../../secret', '__proto__']) assert.equal((await visit(env, target)).status, 400);
  await env.DB.prepare('UPDATE entries SET published_revision = NULL WHERE id = ?').bind(article).run();
  assert.equal((await visit(env, 'article:' + article)).status, 404);
  await env.DB.prepare('UPDATE entries SET published_revision = 1, deleted_at = ? WHERE id = ?').bind(new Date().toISOString(), article).run();
  assert.equal((await visit(env, 'article:' + article)).status, 404);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM visit_events').first()).n, 0);
});
test('retention erases detailed IP logs while preserving lifetime totals and current summaries', async () => {
  const { env, raw } = await fixture(); await visit(env, 'page:home');
  await env.DB.prepare('UPDATE visit_events SET visited_at = ?').bind(Date.now() - 31 * 86400000).run();
  let report = await (await worker.fetch(request('/api/analytics', { raw }), env)).json();
  assert.equal(report.records.length, 0); assert.equal(report.summary.total, 1); assert.equal(report.summary.ips, 0);
  await cleanVisits(env);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM visit_events').first()).n, 0);
  assert.equal((await (await counts(env, 'page:home')).json()).counts['page:home'], 1);
  const jobs = []; worker.scheduled({}, env, { waitUntil: job => jobs.push(job) }); await Promise.all(jobs);
  report = await (await worker.fetch(request('/api/analytics', { raw }), env)).json();
  assert.equal(report.summary.total, 1);
});
test('admin records filter by exact IP, target and time; keyset pagination has no duplicates', async () => {
  const { env, raw } = await fixture();
  for (let i = 1; i <= 55; i++) await visit(env, i === 1 ? 'page:blog' : 'page:home', { ip: '192.0.2.' + i });
  const report = async query => (await worker.fetch(request('/api/analytics?' + query, { raw }), env)).json();
  const first = await report('days=30'); assert.equal(first.records.length, 50); assert(first.next);
  const next = await report('days=30&before=' + first.next); assert.equal(next.records.length, 5); assert.equal(next.next, null);
  assert.equal(new Set([...first.records, ...next.records].map(row => row.id)).size, 55);
  assert.equal((await report('ip=192.0.2.1&target=page%3Ablog')).records.length, 1);
  assert.equal((await report('ip=192.0.2.1&target=page%3Ahome')).records.length, 0);
  assert.equal((await worker.fetch(request('/api/analytics?days=365', { raw }), env)).status, 400);
});
