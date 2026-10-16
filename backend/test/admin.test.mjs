import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker, { seal, unseal, validateEntry } from '../worker.mjs';

const origin = 'https://admin.example';
const id = '11111111-1111-4111-8111-111111111111';
const imageId = '22222222-2222-4222-8222-222222222222';
const sha = 'a'.repeat(40), nextSha = 'b'.repeat(40);
class TestDB {
  constructor() { this.db = new DatabaseSync(':memory:'); this.db.exec(fs.readFileSync(new URL('../migrations/0001_admin.sql', import.meta.url), 'utf8')); }
  prepare(sql) {
    const stmt = this.db.prepare(sql); let values = [];
    const wrapper = {
      bind(...input) { values = input.map(value => value instanceof ArrayBuffer ? new Uint8Array(value) : value); return wrapper; },
      async first() { return stmt.get(...values) || null; },
      async all() { return { results: stmt.all(...values) }; },
      async run() { return { meta: { changes: Number(stmt.run(...values).changes) } }; },
    };
    return wrapper;
  }
  async batch(statements) { const result = []; for (const stmt of statements) result.push(await stmt.run()); return result; }
}
async function fixture() {
  const env = { DB: new TestDB(), SESSION_SECRET: 'test-only-encryption-key-with-enough-entropy', OWNER_ID: '22854117', GITHUB_OWNER: 'Veronica-L', GITHUB_REPO: 'Veronica-L.github.io', GITHUB_BRANCH: 'main', SITE_URL: 'https://veronica-l.github.io', GITHUB_CLIENT_ID: 'test-client', GITHUB_CLIENT_SECRET: 'test-client-secret', ASSETS: { fetch: async () => new Response('<html>admin</html>', { headers: { 'Content-Type': 'text/html' } }) } };
  const raw = 's'.repeat(43);
  const hash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))).toString('base64url');
  await env.DB.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)').bind(hash, env.OWNER_ID, await seal({ token: 'test-github-token' }, env), Date.now() + 60000).run();
  return { env, raw, hash };
}
function req(path, { method = 'GET', data, raw, headers = {}, bytes } = {}) {
  return new Request(origin + path, { method, headers: { ...(raw ? { Cookie: `__Host-kiki-session=${raw}` } : {}), ...(method !== 'GET' ? { Origin: origin, 'X-Kiki-Request': '1', 'Content-Type': bytes ? 'image/jpeg' : 'application/json' } : {}), ...headers }, ...(data ? { body: JSON.stringify(data) } : bytes ? { body: bytes } : {}) });
}
const doc = { type: 'diary', title: '测试日记', date: '2026-10-16', body: '今天的记录', tags: ['日常'] };
async function insert(env, body = doc) { await env.DB.prepare('INSERT INTO entries (id, document, updated_at) VALUES (?, ?, ?)').bind(id, JSON.stringify(validateEntry(body)), new Date().toISOString()).run(); }

test('private APIs and media never allow anonymous access; security headers are present', async () => {
  const { env } = await fixture();
  for (const path of ['/api/me', '/api/entries', `/api/media/${imageId}`]) {
    const response = await worker.fetch(req(path), env);
    assert.equal(response.status, 401); assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.match(response.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  }
});
test('session expiry and logout revoke server access', async () => {
  const { env, raw, hash } = await fixture();
  assert.equal((await worker.fetch(req('/api/me', { raw }), env)).status, 200);
  await env.DB.prepare('UPDATE sessions SET expires_at = 1 WHERE id = ?').bind(hash).run();
  assert.equal((await worker.fetch(req('/api/me', { raw }), env)).status, 401);
  await env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').bind(Date.now() + 60000, hash).run();
  const response = await worker.fetch(req('/api/logout', { method: 'POST', raw, data: {} }), env);
  assert.equal(response.status, 200); assert.match(response.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.equal((await worker.fetch(req('/api/me', { raw }), env)).status, 401);
});
test('cross-origin writes and missing custom header are denied even with a valid session', async () => {
  const { env, raw } = await fixture();
  for (const headers of [{ Origin: 'https://attacker.example' }, { 'X-Kiki-Request': '' }]) {
    const response = await worker.fetch(req('/api/entries', { method: 'POST', raw, data: doc, headers }), env);
    assert.equal(response.status, 403);
  }
  assert.equal((await env.DB.prepare('SELECT * FROM entries').all()).results.length, 0);
});
test('draft writes persist independently and stale edits cannot overwrite a newer draft', async () => {
  const { env, raw } = await fixture();
  const response = await worker.fetch(req('/api/entries', { method: 'POST', raw, data: doc }), env);
  assert.equal(response.status, 200); const entry = await response.json();
  assert.equal(entry.revision, 1); assert.equal(entry.publishedRevision, null);
  const updated = await worker.fetch(req('/api/entries/' + entry.id, { method: 'PUT', raw, data: { ...doc, title: '新版本', revision: 1 } }), env);
  assert.equal(updated.status, 200); assert.equal((await updated.json()).revision, 2);
  const stale = await worker.fetch(req('/api/entries/' + entry.id, { method: 'PUT', raw, data: { ...doc, revision: 1 } }), env);
  assert.equal(stale.status, 409);
  const list = await (await worker.fetch(req('/api/entries', { raw }), env)).json();
  assert.equal(list[0].title, '新版本');
});
test('invalid dates, broken image references and missing images are rejected', async () => {
  const { env, raw } = await fixture();
  for (const data of [{ ...doc, date: '2026-02-30' }, { ...doc, body: '![图片](diary-image:../../secret)' }, { ...doc, body: `![图片](diary-image:${imageId})` }]) {
    assert.equal((await worker.fetch(req('/api/entries', { method: 'POST', raw, data }), env)).status, 400);
  }
});
test('private image upload enforces size and type, and requires login for later retrieval', async () => {
  const { env, raw } = await fixture();
  const bytes = new Uint8Array([255, 216, 255, 224, 0, 0, 255, 217]);
  const response = await worker.fetch(req('/api/media', { method: 'POST', raw, bytes }), env);
  assert.equal(response.status, 201); const media = await response.json();
  const downloaded = await worker.fetch(req(media.url, { raw }), env);
  assert.equal(downloaded.headers.get('Content-Type'), 'image/jpeg'); assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()), bytes);
  assert.equal((await worker.fetch(req(media.url), env)).status, 401);
  assert.equal((await worker.fetch(req('/api/media', { method: 'POST', raw, bytes: new Uint8Array([1, 2, 3]) }), env)).status, 415);
  assert.equal((await worker.fetch(req('/api/media', { method: 'POST', raw, bytes: new Uint8Array(1024 * 1024 + 1) }), env)).status, 413);
});
test('OAuth verifies state, uses PKCE, checks numeric owner and stores only encrypted GitHub credentials', async () => {
  const { env } = await fixture();
  const login = await worker.fetch(req('/auth/login'), env);
  const authorize = new URL(login.headers.get('Location'));
  assert.equal(authorize.searchParams.get('scope'), 'public_repo'); assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
  const pendingCookie = login.headers.get('Set-Cookie').split(';')[0];
  const state = authorize.searchParams.get('state');
  assert.equal((await worker.fetch(req('/auth/callback?state=wrong&code=sample', { headers: { Cookie: pendingCookie } }), env)).status, 400);
  env.OAUTH_FETCH = async (url, options) => { const input = JSON.parse(options.body); assert.equal(input.redirect_uri, origin + '/auth/callback'); const challenge = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.code_verifier))).toString('base64url'); assert.equal(challenge, authorize.searchParams.get('code_challenge')); return Response.json({ access_token: 'private-test-token' }); };
  env.GITHUB_FETCH = async () => Response.json({ id: 99 });
  assert.equal((await worker.fetch(req(`/auth/callback?state=${state}&code=sample`, { headers: { Cookie: pendingCookie } }), env)).status, 403);
  env.GITHUB_FETCH = async () => Response.json({ id: Number(env.OWNER_ID) });
  const success = await worker.fetch(req(`/auth/callback?state=${state}&code=sample`, { headers: { Cookie: pendingCookie } }), env);
  assert.equal(success.status, 302); assert.equal(success.headers.get('Location'), '/admin');
  assert.match(success.headers.get('Set-Cookie'), /HttpOnly/); assert.doesNotMatch(success.headers.get('Set-Cookie'), /private-test-token/);
  const rows = (await env.DB.prepare('SELECT * FROM sessions').all()).results;
  assert(rows.every(row => !row.encrypted_token.includes('private-test-token')));
  const encrypted = rows.find(row => row.owner_id === env.OWNER_ID && row.encrypted_token);
  assert(await unseal(encrypted.encrypted_token, env));
});
function githubMock(env, { failRef = false } = {}) {
  const calls = [];
  const feed = { version: 1, posts: [{ id: 'preserved-public-entry', title: '保留的公开文章' }], diaries: [] };
  env.GITHUB_FETCH = async (input, options) => {
    const url = new URL(input); const body = options.body ? JSON.parse(options.body) : undefined; calls.push({ path: url.pathname, method: options.method, body });
    if (url.pathname.endsWith('/git/ref/heads/main')) return Response.json({ object: { sha } });
    if (url.pathname.endsWith('/git/commits/' + sha)) return Response.json({ tree: { sha: 'c'.repeat(40) } });
    if (url.pathname.endsWith('/contents/content/feed.json')) { assert.equal(url.searchParams.get('ref'), sha); return Response.json({ content: Buffer.from(JSON.stringify(feed)).toString('base64') }); }
    if (url.pathname.endsWith('/git/blobs')) return Response.json({ sha: 'd'.repeat(40) });
    if (url.pathname.endsWith('/git/trees')) return Response.json({ sha: 'e'.repeat(40) });
    if (url.pathname.endsWith('/git/commits')) return Response.json({ sha: nextSha });
    if (url.pathname.endsWith('/git/refs/heads/main')) return failRef ? Response.json({}, { status: 422 }) : Response.json({ object: { sha: nextSha } });
    throw new Error('Unexpected GitHub call: ' + url);
  };
  return calls;
}
test('publishing commits only selected content and images atomically; other public entries survive', async () => {
  const { env, raw } = await fixture();
  await insert(env, { ...doc, body: `文字\n\n![照片](diary-image:${imageId})` });
  await env.DB.prepare('INSERT INTO media VALUES (?, ?, ?)').bind(imageId, new Uint8Array([255, 216, 255, 217]), 'now').run();
  await env.DB.prepare('INSERT INTO entries (id, document, updated_at) VALUES (?, ?, ?)').bind('33333333-3333-4333-8333-333333333333', JSON.stringify({ ...doc, title: '绝不能公开的另一份草稿' }), 'now').run();
  const calls = githubMock(env);
  const response = await worker.fetch(req('/api/publish/' + id, { method: 'POST', raw, data: { revision: 1 } }), env);
  assert.equal(response.status, 200); assert.equal((await response.json()).state, 'queued');
  const tree = calls.find(call => call.path.endsWith('/git/trees')).body;
  assert.deepEqual(tree.tree.map(item => item.path), [`media/diary/${imageId}.jpg`, 'content/feed.json']);
  const content = tree.tree.at(-1).content; assert(!content.includes('绝不能公开')); const feed = JSON.parse(content);
  assert.equal(feed.posts.length, 1); assert.equal(feed.diaries[0].media[0].src, `media/diary/${imageId}.jpg`);
  const commit = calls.find(call => call.path.endsWith('/git/commits')).body;
  assert.deepEqual(commit.parents, [sha]); assert.equal(commit.author.name, 'Kiki'); assert.match(commit.author.email, /users.noreply.github.com$/);
  assert.equal(calls.at(-1).body.force, false);
  assert.equal((await env.DB.prepare('SELECT * FROM entries WHERE id = ?').bind(id).first()).published_revision, 1);
  assert.equal(await env.DB.prepare("SELECT * FROM locks WHERE id = 'publish'").first(), null);
});
test('conflicting repository update leaves draft intact and does not report a successful publication', async () => {
  const { env, raw } = await fixture(); await insert(env); githubMock(env, { failRef: true });
  const response = await worker.fetch(req('/api/publish/' + id, { method: 'POST', raw, data: { revision: 1 } }), env);
  assert.equal(response.status, 409);
  const draft = await env.DB.prepare('SELECT * FROM entries WHERE id = ?').bind(id).first();
  assert.equal(draft.published_revision, null); assert.equal(JSON.parse(draft.document).title, doc.title);
  assert.equal(await env.DB.prepare("SELECT * FROM locks WHERE id = 'publish'").first(), null);
});
test('a concurrent publication cannot acquire the same repository lock', async () => {
  const { env, raw } = await fixture(); await insert(env);
  await env.DB.prepare('INSERT INTO locks VALUES (?, ?, ?)').bind('publish', 'another-publisher', Date.now() + 60000).run();
  env.GITHUB_FETCH = () => { throw new Error('GitHub must not be called'); };
  assert.equal((await worker.fetch(req('/api/publish/' + id, { method: 'POST', raw, data: { revision: 1 } }), env)).status, 409);
});
test('unpublishing removes only the selected public record while retaining the editable draft', async () => {
  const { env, raw } = await fixture(); await insert(env); const calls = githubMock(env);
  const response = await worker.fetch(req('/api/unpublish/' + id, { method: 'POST', raw, data: { revision: 1 } }), env);
  assert.equal(response.status, 200);
  const tree = calls.find(call => call.path.endsWith('/git/trees')).body.tree;
  assert.deepEqual(tree.map(item => item.path), ['content/feed.json']);
  const feed = JSON.parse(tree[0].content); assert.equal(feed.posts.length, 1); assert.equal(feed.diaries.length, 0);
  const draft = await env.DB.prepare('SELECT * FROM entries WHERE id = ?').bind(id).first();
  assert.equal(draft.published_revision, null); assert.equal(JSON.parse(draft.document).title, doc.title);
});
test('stale publication requests never contact GitHub', async () => {
  const { env, raw } = await fixture(); await insert(env);
  env.GITHUB_FETCH = () => { throw new Error('Stale version must not publish'); };
  assert.equal((await worker.fetch(req('/api/publish/' + id, { method: 'POST', raw, data: { revision: 0 } }), env)).status, 409);
});
