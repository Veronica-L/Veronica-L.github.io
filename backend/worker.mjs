const encoder = new TextEncoder();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SESSION = '__Host-kiki-session';
const STATE = '__Host-kiki-oauth';
const MAX_IMAGE = 1024 * 1024;
const FEED = 'content/feed.json';
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const json = (data, status = 200) => Response.json(data, { status });
const cookie = (name, value, age) => `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
const cookies = request => Object.fromEntries((request.headers.get('Cookie') || '').split(';').map(v => v.trim().split('=')));
function b64(bytes) {
  const data = new Uint8Array(bytes);
  if (typeof data.toBase64 === 'function') return data.toBase64();
  const chunks = [];
  for (let offset = 0; offset < data.length; offset += 32768) chunks.push(String.fromCharCode(...data.subarray(offset, offset + 32768)));
  return btoa(chunks.join(''));
}
function unb64(value) { return typeof Uint8Array.fromBase64 === 'function' ? Uint8Array.fromBase64(value) : Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
const base64url = bytes => b64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
const digest = async text => base64url(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
async function secretKey(env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) fail(503, '后台尚未完成密钥配置。');
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', encoder.encode(env.SESSION_SECRET)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(value, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await secretKey(env), encoder.encode(JSON.stringify(value)));
  return `${base64url(iv)}.${base64url(ciphertext)}`;
}
export async function unseal(value, env) {
  const [iv, data] = String(value).split('.').map(s => unb64(s.replaceAll('-', '+').replaceAll('_', '/')));
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await secretKey(env), data)));
}
export function protect(response) {
  const result = new Response(response.body, response);
  result.headers.set('Cache-Control', 'no-store');
  result.headers.set('X-Content-Type-Options', 'nosniff');
  result.headers.set('Referrer-Policy', 'no-referrer');
  result.headers.set('X-Frame-Options', 'DENY');
  result.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  return result;
}
async function body(request, limit = 150000) {
  if (Number(request.headers.get('Content-Length')) > limit) fail(413, '内容过大。');
  const reader = request.body?.getReader();
  if (!reader) fail(400, '缺少内容。');
  const chunks = []; let size = 0;
  while (true) {
    const part = await reader.read(); if (part.done) break;
    size += part.value.byteLength;
    if (size > limit) { await reader.cancel(); fail(413, '内容过大。'); }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
async function jsonBody(request) {
  try { return JSON.parse(new TextDecoder().decode(await body(request))); }
  catch (error) { if (error instanceof HttpError) throw error; fail(400, '请求格式不正确。'); }
}
function sameOrigin(request) {
  if (request.headers.get('Origin') !== new URL(request.url).origin || request.headers.get('X-Kiki-Request') !== '1') fail(403, '请求来源验证失败，请刷新页面。');
}
async function github(env, token, path, method = 'GET', value) {
  const response = await (env.GITHUB_FETCH || fetch)(`https://api.github.com/${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Kiki-Blog-Admin', 'X-GitHub-Api-Version': '2022-11-28', ...(value ? { 'Content-Type': 'application/json' } : {}) },
    ...(value ? { body: JSON.stringify(value) } : {}),
  });
  if (!response.ok) {
    if (response.status === 404) fail(404, 'GitHub 内容不存在，请检查仓库设置。');
    if ([409, 422].includes(response.status)) fail(409, '仓库刚刚发生变化，请稍后重新发布。');
    if (response.status === 401) fail(401, 'GitHub 授权已失效，请重新登录。');
    fail(502, `GitHub 暂时无法完成操作（${response.status}），已保存的草稿不会丢失。`);
  }
  return response.status === 204 ? null : response.json();
}
const repoPath = env => `repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}`;
async function session(request, env) {
  const raw = cookies(request)[SESSION];
  if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) fail(401, '请先登录管理后台。');
  const row = await env.DB.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?').bind(await digest(raw), Date.now()).first();
  if (!row || row.owner_id !== env.OWNER_ID) fail(401, '登录已过期，请重新登录。');
  return { ...row, token: (await unseal(row.encrypted_token, env)).token };
}
async function login(request, env) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.DB) fail(503, '后台登录尚未配置完成。');
  const state = random(), verifier = random();
  const pending = await seal({ state, verifier, expires: Date.now() + 600000 }, env);
  const url = new URL('https://github.com/login/oauth/authorize');
  url.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: new URL('/auth/callback', request.url).href, login: env.GITHUB_OWNER, scope: 'public_repo', state, code_challenge: await digest(verifier), code_challenge_method: 'S256', allow_signup: 'false' });
  return new Response(null, { status: 302, headers: { Location: url.href, 'Set-Cookie': cookie(STATE, pending, 600) } });
}
async function callback(request, env) {
  const url = new URL(request.url); let pending;
  try { pending = await unseal(cookies(request)[STATE], env); } catch { fail(400, '登录验证已过期，请返回后台重新登录。'); }
  if (!pending.state || pending.state !== url.searchParams.get('state') || pending.expires < Date.now()) fail(400, '登录验证未通过，请重新登录。');
  if (!url.searchParams.get('code')) fail(400, 'GitHub 授权未完成，请重新登录。');
  const response = await (env.OAUTH_FETCH || fetch)('https://github.com/login/oauth/access_token', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get('code'), redirect_uri: new URL('/auth/callback', request.url).href, code_verifier: pending.verifier }),
  });
  if (!response.ok) fail(502, 'GitHub 登录暂时无法完成，请重试。');
  const access = await response.json();
  if (!access.access_token) fail(400, 'GitHub 授权未完成，请重新登录。');
  const user = await github(env, access.access_token, 'user');
  if (String(user.id) !== env.OWNER_ID) fail(403, '此账号没有博客管理权限。请使用博客所有者账号登录。');
  const raw = random(), id = await digest(raw);
  const age = Math.min(8 * 60 * 60, Number(access.expires_in) || 8 * 60 * 60);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Date.now()),
    env.DB.prepare('INSERT INTO sessions (id, owner_id, encrypted_token, expires_at) VALUES (?, ?, ?, ?)').bind(id, String(user.id), await seal({ token: access.access_token }, env), Date.now() + age * 1000),
  ]);
  const headers = new Headers({ Location: '/admin' });
  headers.append('Set-Cookie', cookie(SESSION, raw, age));
  headers.append('Set-Cookie', cookie(STATE, '', 0));
  return new Response(null, { status: 302, headers });
}
export function imageReferences(text) {
  return [...new Set([...String(text).matchAll(/!\[[^\]\n]*\]\(diary-image:([a-z0-9-]+)\)/g)].map(m => m[1]))];
}
export function validateEntry(input) {
  if (!input || typeof input !== 'object' || !['blog', 'diary'].includes(input.type)) fail(400, '请选择文章或日记。');
  const title = String(input.title || '').trim(), text = String(input.body || '').trim();
  if (!title || title.length > 100) fail(400, '标题需要 1–100 个字。');
  if (!text || text.length > 50000) fail(400, '正文需要 1–50000 个字。');
  const date = String(input.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) fail(400, '请选择有效日期。');
  const images = imageReferences(text);
  if (images.length > 12 || images.some(id => !UUID.test(id))) fail(400, '每篇最多插入 12 张图片。');
  if (/diary-image:/.test(text.replace(/!\[[^\]\n]*\]\(diary-image:[a-z0-9-]+\)/g, ''))) fail(400, '图片引用格式有误。');
  return { type: input.type, title, body: text, date, category: ['生活随笔', '技术手记', '旅行见闻'].includes(input.category) ? input.category : '生活随笔', tags: [...new Set((Array.isArray(input.tags) ? input.tags : []).map(t => String(t).trim()).filter(Boolean))].slice(0, 8).map(t => t.slice(0, 30)), images };
}
const entryResult = row => ({ ...JSON.parse(row.document), id: row.id, revision: row.revision, publishedRevision: row.published_revision, commitSha: row.commit_sha, updatedAt: row.updated_at });
async function getEntry(env, id) {
  if (!UUID.test(id)) fail(400, '记录编号无效。');
  const row = await env.DB.prepare('SELECT * FROM entries WHERE id = ?').bind(id).first();
  if (!row) fail(404, '记录不存在。');
  return row;
}
async function saveEntry(request, env, id) {
  const input = await jsonBody(request), doc = validateEntry(input), now = new Date().toISOString();
  for (const mediaId of doc.images) if (!await env.DB.prepare('SELECT id FROM media WHERE id = ?').bind(mediaId).first()) fail(400, '部分插图尚未上传成功，请重新插入。');
  if (!id) {
    id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO entries (id, document, updated_at) VALUES (?, ?, ?)').bind(id, JSON.stringify(doc), now).run();
  } else {
    await getEntry(env, id);
    if (!Number.isInteger(input.revision)) fail(400, '缺少记录版本，请刷新后重试。');
    const result = await env.DB.prepare('UPDATE entries SET document = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?').bind(JSON.stringify(doc), now, id, input.revision).run();
    if (!result.meta.changes) fail(409, '这篇内容已在其他窗口更新。请先备份正文，再刷新列表打开最新版本。');
  }
  return json(entryResult(await getEntry(env, id)));
}
async function upload(request, env) {
  if (request.headers.get('Content-Type') !== 'image/jpeg') fail(415, '请上传转换后的 JPG 图片。');
  const bytes = await body(request, MAX_IMAGE);
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255 || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) fail(415, '图片格式无效。');
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO media (id, content, created_at) VALUES (?, ?, ?)').bind(id, bytes.buffer, new Date().toISOString()).run();
  return json({ id, url: `/api/media/${id}` }, 201);
}
function decodeContent(data) { return JSON.parse(new TextDecoder().decode(unb64(data.content.replace(/\s/g, '')))); }
export async function publish(env, token, id, revision, unpublish = false) {
  const entry = await getEntry(env, id), doc = JSON.parse(entry.document);
  if (entry.revision !== revision) fail(409, '内容版本已更新，请刷新后重试。');
  const holder = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO locks (id, holder, expires_at) VALUES ('publish', ?, ?) ON CONFLICT(id) DO UPDATE SET holder = excluded.holder, expires_at = excluded.expires_at WHERE locks.expires_at < ?").bind(holder, Date.now() + 300000, Date.now()).run();
  const lock = await env.DB.prepare("SELECT holder FROM locks WHERE id = 'publish'").first();
  if (lock?.holder !== holder) fail(409, '另一项发布正在进行，请稍后重试。');
  try {
    const repo = repoPath(env), branch = encodeURIComponent(env.GITHUB_BRANCH || 'main');
    const ref = await github(env, token, `${repo}/git/ref/heads/${branch}`);
    const commit = await github(env, token, `${repo}/git/commits/${ref.object.sha}`);
    // Read the exact parent commit. A branch update during publication must fail,
    // rather than overwrite a newer feed or unrelated source changes.
    const existing = await github(env, token, `${repo}/contents/${FEED}?ref=${ref.object.sha}`);
    const content = existing.encoding === 'none' ? await github(env, token, `${repo}/git/blobs/${existing.sha}`) : existing;
    const feed = decodeContent(content);
    if (feed.version !== 1 || !Array.isArray(feed.posts) || !Array.isArray(feed.diaries)) fail(502, '网站内容索引格式有误，未修改仓库。');
    feed.posts = feed.posts.filter(item => item.id !== id);
    feed.diaries = feed.diaries.filter(item => item.id !== id);
    const tree = [];
    if (!unpublish) {
      const media = [];
      for (const mediaId of doc.images) {
        const image = await env.DB.prepare('SELECT content FROM media WHERE id = ?').bind(mediaId).first();
        if (!image) fail(400, '插图已丢失，未发布。请重新上传。');
        const path = `media/${doc.type}/${mediaId}.jpg`;
        const blob = await github(env, token, `${repo}/git/blobs`, 'POST', { encoding: 'base64', content: b64(image.content) });
        tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
        media.push({ id: mediaId, src: path, name: '日记插图' });
      }
      const record = { ...doc, id, published: true, media, image: 'reference-flowers', excerpt: doc.body.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/^#+\s*/gm, '').slice(0, 95), mood: '日记', publishedAt: new Date().toISOString() };
      feed[doc.type === 'diary' ? 'diaries' : 'posts'].push(record);
    }
    feed.updatedAt = new Date().toISOString();
    tree.push({ path: FEED, mode: '100644', type: 'blob', content: JSON.stringify(feed, null, 2) + '\n' });
    const nextTree = await github(env, token, `${repo}/git/trees`, 'POST', { base_tree: commit.tree.sha, tree });
    const author = { name: 'Kiki', email: `${env.OWNER_ID}+${env.GITHUB_OWNER}@users.noreply.github.com` };
    const next = await github(env, token, `${repo}/git/commits`, 'POST', { message: `${unpublish ? 'Unpublish' : 'Publish'} blog content`, tree: nextTree.sha, parents: [ref.object.sha], author, committer: author });
    await github(env, token, `${repo}/git/refs/heads/${branch}`, 'PATCH', { sha: next.sha, force: false });
    await env.DB.prepare('UPDATE entries SET published_revision = ?, commit_sha = ? WHERE id = ?').bind(unpublish ? null : revision, next.sha, id).run();
    return { sha: next.sha, state: 'queued', siteUrl: env.SITE_URL, actionsUrl: `https://github.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions` };
  } finally {
    await env.DB.prepare("DELETE FROM locks WHERE id = 'publish' AND holder = ?").bind(holder).run();
  }
}
async function handle(request, env) {
  const url = new URL(request.url), path = url.pathname;
  if (path === '/health' && request.method === 'GET') return json({ ok: true, configured: Boolean(env.DB && env.SESSION_SECRET && env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) });
  if (path === '/auth/login' && request.method === 'GET') return login(request, env);
  if (path === '/auth/callback' && request.method === 'GET') return callback(request, env);
  if (path.startsWith('/api/')) {
    if (!env.DB) fail(503, '后台数据库尚未配置。');
    const auth = await session(request, env);
    if (!['GET', 'HEAD'].includes(request.method)) sameOrigin(request);
    if (path === '/api/me' && request.method === 'GET') return json({ login: env.GITHUB_OWNER, siteUrl: env.SITE_URL });
    if (path === '/api/logout' && request.method === 'POST') {
      await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(auth.id).run();
      return new Response('{}', { headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie(SESSION, '', 0) } });
    }
    if (path === '/api/entries' && request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT * FROM entries ORDER BY updated_at DESC LIMIT 500').all();
      return json(rows.results.map(entryResult));
    }
    if (path === '/api/entries' && request.method === 'POST') return saveEntry(request, env);
    const match = /^\/api\/entries\/([a-z0-9-]+)$/.exec(path);
    if (match && request.method === 'PUT') return saveEntry(request, env, match[1]);
    if (path === '/api/media' && request.method === 'POST') return upload(request, env);
    const media = /^\/api\/media\/([a-z0-9-]+)$/.exec(path);
    if (media && request.method === 'GET') {
      if (!UUID.test(media[1])) fail(404, '图片不存在。');
      const row = await env.DB.prepare('SELECT content FROM media WHERE id = ?').bind(media[1]).first();
      if (!row) fail(404, '图片不存在。');
      return new Response(new Uint8Array(row.content), { headers: { 'Content-Type': 'image/jpeg' } });
    }
    const publication = /^\/api\/(publish|unpublish)\/([a-z0-9-]+)$/.exec(path);
    if (publication && request.method === 'POST') {
      const input = await jsonBody(request);
      return json(await publish(env, auth.token, publication[2], input.revision, publication[1] === 'unpublish'));
    }
    const status = /^\/api\/deployments\/([a-f0-9]{40})$/.exec(path);
    if (status && request.method === 'GET') {
      const runs = await github(env, auth.token, `${repoPath(env)}/actions/runs?head_sha=${status[1]}&per_page=5`);
      const run = runs.workflow_runs.find(item => item.path === '.github/workflows/pages.yml');
      return json(run ? { state: run.status, conclusion: run.conclusion, url: run.html_url } : { state: 'queued' });
    }
    fail(404, '接口不存在。');
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') fail(405, '不支持此操作。');
  if (path === '/') return Response.redirect(new URL('/admin', request.url), 302);
  if (path === '/admin' || path === '/admin/') return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
  if (['/admin.js', '/admin.css'].includes(path)) return env.ASSETS.fetch(request);
  fail(404, '页面不存在。');
}
export default {
  async fetch(request, env) {
    try { return protect(await handle(request, env)); }
    catch (error) { return protect(json({ error: error instanceof HttpError ? error.message : '服务暂时无法完成操作，请稍后重试。' }, error instanceof HttpError ? error.status : 500)); }
  },
};
