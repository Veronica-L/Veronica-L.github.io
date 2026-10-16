const PAGES = { home: '首页', blog: '文章列表', diary: '日记', photos: '照片墙', music: '云音乐', explore: '分类归档' };
const SAMPLES = { 'slow-days': '十月日常记录', 'my-digital-garden': '个人博客的结构与设计', 'mountain-weekend': '十月假期：山间徒步记录', 'coffee-morning': '手冲咖啡的日常记录', 'design-notes': '博客界面设计笔记', 'sea-letter': '海边旅行记录' };
const DAY = 86400000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export class AnalyticsError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function fail(status, message) { throw new AnalyticsError(status, message); }
function validTarget(target) {
  if (typeof target !== 'string') return false;
  if (target.startsWith('page:')) return Object.hasOwn(PAGES, target.slice(5));
  return target.startsWith('article:') && (UUID.test(target.slice(8)) || Object.hasOwn(SAMPLES, target.slice(8)));
}
function siteOrigin(env) { return new URL(env.SITE_URL).origin; }
export function analyticsCors(request, env, response) {
  if (request.headers.get('Origin') === siteOrigin(env)) {
    response.headers.set('Access-Control-Allow-Origin', siteOrigin(env));
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Max-Age', '600');
    response.headers.append('Vary', 'Origin');
  }
  return response;
}
export async function cleanVisits(env, now = Date.now()) {
  await env.DB.prepare('DELETE FROM visit_events WHERE visited_at < ?').bind(now - 30 * DAY).run();
}
async function titleFor(target, env) {
  if (target.startsWith('page:')) return PAGES[target.slice(5)];
  const id = target.slice(8);
  if (Object.hasOwn(SAMPLES, id)) return SAMPLES[id];
  const row = await env.DB.prepare('SELECT document FROM entries WHERE id = ? AND published_revision IS NOT NULL AND deleted_at IS NULL').bind(id).first();
  if (!row) fail(404, '公开文章不存在。');
  return String(JSON.parse(row.document).title).slice(0, 100);
}
async function visitorKey(ip, env) {
  if (!env.SESSION_SECRET) fail(503, '统计尚未配置。');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode('analytics-v1:' + ip))), b => b.toString(16).padStart(2, '0')).join('');
}
const geoText = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, '').slice(0, 100) : '';
export async function publicAnalytics(request, env, readJSON) {
  const url = new URL(request.url), origin = request.headers.get('Origin');
  if (origin && origin !== siteOrigin(env)) fail(403, '统计来源不受支持。');
  if (request.method === 'OPTIONS') {
    if (origin !== siteOrigin(env)) fail(403, '统计来源不受支持。');
    return new Response(null, { status: 204 });
  }
  if (url.pathname === '/public/analytics/counts' && request.method === 'GET') {
    const targets = (url.searchParams.get('targets') || '').split(',');
    if (targets.length > 100 || targets.some(target => !validTarget(target))) fail(400, '统计页面无效。');
    const unique = [...new Set(targets)];
    const rows = await env.DB.prepare(`SELECT target, views FROM view_totals WHERE target IN (${unique.map(() => '?').join(',')})`).bind(...unique).all();
    const counts = Object.fromEntries(unique.map(target => [target, 0]));
    for (const row of rows.results) counts[row.target] = row.views;
    return Response.json({ counts });
  }
  if (url.pathname !== '/public/analytics/visit' || request.method !== 'POST') fail(404, '统计接口不存在。');
  if (origin !== siteOrigin(env)) fail(403, '统计来源不受支持。');
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') fail(415, '统计格式无效。');
  const input = await readJSON(request);
  if (!validTarget(input?.target)) fail(400, '统计页面无效。');
  const target = input.target, title = await titleFor(target, env);
  // Only Cloudflare's edge metadata is authoritative. Never accept body IPs,
  // X-Forwarded-For, arbitrary URLs, query strings, or client-supplied titles.
  const ip = request.cf ? request.headers.get('CF-Connecting-IPv6') || request.headers.get('CF-Connecting-IP') || '' : '';
  let recorded = false;
  if (/^[0-9a-fA-F:.]{3,45}$/.test(ip)) {
    const key = await visitorKey(ip, env), now = Date.now(), cf = request.cf;
    const result = await env.DB.prepare(`INSERT INTO visit_events (target, title, visited_at, visitor_key, ip, country, region, city)
      SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS
      (SELECT 1 FROM visit_events WHERE visitor_key = ? AND target = ? AND visited_at > ?)`)
      .bind(target, title, now, key, ip, geoText(cf.country), geoText(cf.region), geoText(cf.city), key, target, now - 30 * 60000).run();
    recorded = result.meta.changes > 0;
  }
  const total = await env.DB.prepare('SELECT views FROM view_totals WHERE target = ?').bind(target).first();
  return Response.json({ target, views: total?.views || 0, recorded });
}
export async function analyticsReport(url, env) {
  const now = Date.now(), days = Number(url.searchParams.get('days') || 30);
  const target = url.searchParams.get('target') || '', ip = url.searchParams.get('ip')?.trim() || '';
  const cursor = Number(url.searchParams.get('before') || 0);
  if (![1, 7, 30].includes(days) || (target && !validTarget(target)) || (ip && !/^[0-9a-fA-F:.]{3,45}$/.test(ip)) || !Number.isSafeInteger(cursor) || cursor < 0) fail(400, '访问记录筛选条件有误。');
  const where = ['visited_at >= ?'], values = [now - days * DAY];
  if (target) { where.push('target = ?'); values.push(target); }
  if (ip) { where.push('ip = ?'); values.push(ip); }
  if (cursor) { where.push('id < ?'); values.push(cursor); }
  const today = Math.floor((now + 8 * 3600000) / DAY) * DAY - 8 * 3600000;
  const [records, totals, recent] = await Promise.all([
    env.DB.prepare(`SELECT id, target, title, visited_at AS visitedAt, ip, country, region, city FROM visit_events WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT 51`).bind(...values).all(),
    env.DB.prepare('SELECT target, title, views FROM view_totals ORDER BY views DESC, target').all(),
    env.DB.prepare('SELECT COUNT(*) AS recentViews, COUNT(DISTINCT visitor_key) AS ips, COALESCE(SUM(CASE WHEN visited_at >= ? THEN 1 ELSE 0 END), 0) AS today FROM visit_events WHERE visited_at >= ?').bind(today, now - 30 * DAY).first(),
  ]);
  const rows = records.results.slice(0, 50);
  return Response.json({ summary: { total: totals.results.reduce((sum, row) => sum + row.views, 0), today: recent.today, ips: recent.ips }, pages: totals.results, records: rows, next: records.results.length > 50 ? rows.at(-1).id : null, retentionDays: 30 });
}
