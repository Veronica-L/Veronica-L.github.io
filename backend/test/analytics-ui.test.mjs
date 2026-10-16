import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
const root = new URL('../../', import.meta.url);
const flush = () => new Promise(resolve => setImmediate(resolve));
const run = (dom, file) => vm.runInContext(fs.readFileSync(new URL(file, root), 'utf8'), dom.getInternalVMContext());
function publicPage(url = 'https://veronica-l.github.io/') {
  const dom = new JSDOM(fs.readFileSync(new URL('index.html', root), 'utf8'), { url, runScripts: 'outside-only' });
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  for (const file of ['vendor/marked.umd.js', 'vendor/purify.min.js', 'markdown-renderer.js', 'diary-media.js', 'diary-ui.js', 'home-view.js', 'app.js', 'site-config.js']) run(dom, file);
  return dom;
}
test('real homepage/card/article counters share live counts; rerenders and repeat opens do not send duplicate visits', async () => {
  const dom = publicPage(), calls = [];
  dom.window.fetch = async (input, options = {}) => {
    const url = new URL(input); calls.push({ url, options });
    if (options.method === 'POST') { const { target } = JSON.parse(options.body); return Response.json({ target, views: target.startsWith('article:') ? 8 : 1 }); }
    return Response.json({ counts: Object.fromEntries(url.searchParams.get('targets').split(',').map(target => [target, 7])) });
  };
  run(dom, 'analytics-client.js'); await flush(); await flush();
  assert.equal(dom.window.document.querySelector('.lead-copy [data-view-target]').textContent, '7');
  vm.runInContext("openArticle('slow-days');openArticle('slow-days');route();route()", dom.getInternalVMContext());
  await flush(); await flush();
  const detail = dom.window.document.querySelector('.detail-body>.view-count');
  assert(detail); assert.equal(detail.previousElementSibling.className, 'detail-prose markdown-content');
  assert.equal(detail.querySelector('span').textContent, '8');
  assert.equal(dom.window.document.querySelector('.lead-copy [data-view-target]').textContent, '8');
  const visits = calls.filter(call => call.options.method === 'POST');
  assert.equal(visits.filter(call => JSON.parse(call.options.body).target === 'page:home').length, 1);
  assert.equal(visits.filter(call => JSON.parse(call.options.body).target === 'article:slow-days').length, 1);
  assert(visits.every(call => call.options.credentials === 'omit' && Object.keys(JSON.parse(call.options.body)).join() === 'target'));
  assert.equal(dom.window.document.querySelectorAll('.article-card .view-count').length, 2);
  dom.window.close();
});
test('local previews and browser-only drafts never send analytics; failed requests retain readable articles', async () => {
  const local = publicPage('http://127.0.0.1:4173/');
  local.window.fetch = () => { throw new Error('local analytics must not send'); };
  run(local, 'analytics-client.js'); vm.runInContext("openArticle('slow-days')", local.getInternalVMContext());
  assert.equal(local.window.document.querySelector('[data-view-target]').textContent, '—'); local.window.close();
  const dom = publicPage(); let sent = 0;
  dom.window.fetch = async () => { sent++; throw new Error('offline'); };
  run(dom, 'analytics-client.js'); await flush();
  const before = sent;
  vm.runInContext("posts.unshift({id:'private-local',title:'私有草稿',date:'2026-10-16',body:'私有文字',tags:[]});openArticle('private-local')", dom.getInternalVMContext());
  await flush(); assert.equal(sent, before);
  assert.equal(dom.window.document.querySelector('.detail-body .view-count'), null);
  assert(dom.window.document.querySelector('.detail-prose').textContent.includes('私有文字'));
  dom.window.close();
});
test('actual admin analytics supports filtering, pagination and returning to an unsaved draft; record text is escaped', async () => {
  const dom = new JSDOM(fs.readFileSync(new URL('backend/public/index.html', root), 'utf8'), { url: 'https://admin.example/admin', runScripts: 'outside-only' });
  const requests = [];
  dom.window.fetch = async path => {
    if (path === '/api/me') return Response.json({ siteUrl: 'https://veronica-l.github.io/' });
    if (path.startsWith('/api/entries')) return Response.json([]);
    requests.push(path);
    const next = path.includes('before=');
    return Response.json({ summary: { total: 2, today: 2, ips: 1 }, pages: [{ target: 'page:home', title: '首页', views: 2 }], records: [{ id: next ? 1 : 2, target: 'page:home', title: '<img src=x onerror=alert(1)>', visitedAt: Date.now(), ip: '192.0.2.10', country: 'CN', region: 'Shanghai', city: '<script>bad</script>' }], next: next ? null : 2 });
  };
  run(dom, 'backend/public/admin.js'); await flush();
  const $ = id => dom.window.document.getElementById(id);
  $('title').value = '未保存的标题'; $('body').value = '未保存的正文';
  $('show-analytics').click(); await flush();
  assert.equal($('workspace').hidden, true); assert.equal($('analytics-panel').hidden, false);
  assert.equal($('analytics-records').querySelectorAll('tr').length, 1);
  assert.equal($('analytics-records').querySelector('img,script'), null);
  assert($('analytics-records').textContent.includes('192.0.2.10'));
  $('analytics-more').click(); await flush();
  assert.equal($('analytics-records').querySelectorAll('tr').length, 2); assert(requests.at(-1).includes('before=2'));
  $('analytics-ip').value = '192.0.2.10'; $('analytics-target').value = 'page:home'; $('analytics-days').value = '7';
  $('analytics-filters').dispatchEvent(new dom.window.Event('submit', { cancelable: true })); await flush();
  assert(requests.at(-1).includes('days=7')); assert(requests.at(-1).includes('ip=192.0.2.10')); assert(!requests.at(-1).includes('before='));
  assert.equal($('analytics-records').querySelectorAll('tr').length, 1);
  $('back-to-editor').click(); assert.equal($('workspace').hidden, false);
  assert.equal($('title').value, '未保存的标题'); assert.equal($('body').value, '未保存的正文');
  dom.window.close();
});
