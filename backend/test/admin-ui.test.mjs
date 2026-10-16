import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const id = '11111111-1111-4111-8111-111111111111';
const saved = { id, revision: 1, type: 'blog', title: '文章测试', body: '保留的正文', date: '2026-10-16', category: '生活随笔', tags: [], publishedRevision: null, deletedAt: null };
const flush = () => new Promise(resolve => setImmediate(resolve));
async function page({ failDelete = false } = {}) {
  const nodes = new Map(), calls = [];
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, { value: id === 'entry-filter' ? 'all' : '', hidden: false, disabled: false, textContent: '', innerHTML: '', classList: { toggle() {} }, addEventListener() {}, reportValidity: () => true, querySelectorAll: () => [], click() {} });
    return nodes.get(id);
  };
  get('workspace').querySelectorAll = () => [...nodes.values()];
  const context = vm.createContext({ document: { getElementById: get }, window: { addEventListener() {} }, location: { search: '' }, URLSearchParams, Intl, Date, console, setTimeout: () => 1, clearTimeout() {}, confirm: () => true, fetch: async (path, options = {}) => {
    calls.push({ path, method: options.method || 'GET', body: options.body && JSON.parse(options.body) });
    if (path === '/api/me') return Response.json({ siteUrl: 'https://example.test' });
    if (path === '/api/entries') return Response.json([saved]);
    if (path === '/api/entries?trash=1') return Response.json([]);
    if (options.method === 'DELETE') return failDelete ? Response.json({ error: '仓库发生冲突' }, { status: 409 }) : Response.json({ entry: { ...saved, revision: 2, deletedAt: '2026-10-16T00:00:00Z' }, deployment: null });
    if (path.endsWith('/restore')) return Response.json({ entry: { ...saved, revision: 3 }, deployment: null });
    throw new Error('Unexpected request: ' + path);
  } });
  vm.runInContext(fs.readFileSync(new URL('../public/admin.js', import.meta.url), 'utf8'), context);
  await flush();
  const select = () => get('entry-list').onclick({ target: { closest: () => ({ dataset: { id } }) } });
  return { get, calls, select };
}
test('delete button is absent for a new record; trash selection is read-only and restore enables editing', async () => {
  const { get, calls, select } = await page();
  assert.equal(get('delete-entry').hidden, true);
  select(); assert.equal(get('delete-entry').textContent, '删除文章'); assert.equal(get('delete-entry').hidden, false);
  get('delete-entry').onclick(); await flush();
  assert.equal(get('title').value, '');
  assert.match(get('publish-status').textContent, /已移入回收站/);
  get('entry-filter').value = 'trash'; get('entry-filter').onchange(); select();
  assert.equal(get('title').value, saved.title); assert.equal(get('body').value, saved.body);
  assert.equal(get('body').disabled, true); assert.equal(get('publish').hidden, true); assert.equal(get('save-draft').hidden, true);
  assert.equal(get('delete-entry').hidden, true); assert.equal(get('restore-entry').hidden, false);
  get('restore-entry').onclick(); await flush();
  assert.equal(get('entry-filter').value, 'all'); assert.equal(get('body').disabled, false); assert.equal(get('publish').hidden, false);
  assert.equal(get('restore-entry').hidden, true); assert.match(get('publish-status').textContent, /不会|才会/);
  assert.equal(calls.filter(call => call.method === 'DELETE').length, 1);
  assert.equal(calls.find(call => call.path.endsWith('/restore')).body.revision, 2);
  assert(!calls.some(call => call.path.startsWith('/api/publish/')));
});
test('failed deletion retains the selected article and leaves editing available', async () => {
  const { get, select } = await page({ failDelete: true }); select();
  get('delete-entry').onclick(); await flush();
  assert.equal(get('title').value, saved.title); assert.equal(get('body').value, saved.body);
  assert.equal(get('body').disabled, false); assert.equal(get('delete-entry').hidden, false);
  assert.match(get('notice').textContent, /仓库发生冲突/);
});
