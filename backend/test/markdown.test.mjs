import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const root = new URL('../../', import.meta.url);
const table = '| 实验 | 问题 | 代价 |\n|------|------|------|\n| 实验 A | 有**公开资料**（`示例代码`），但尚未查询 | 预算耗尽 |\n| 实验 B | 多个工具之间缺少信息传递 | 任务空转 |';
const mediaId = '11111111-1111-4111-8111-111111111111';
function run(dom, file) { vm.runInContext(fs.readFileSync(new URL(file, root), 'utf8'), dom.getInternalVMContext(), { filename: file }); }
function page(html = '<main id="result"></main>') {
  const dom = new JSDOM(html, { url: 'https://example.test/admin', runScripts: 'outside-only' });
  for (const file of ['vendor/marked.umd.js', 'vendor/purify.min.js', 'markdown-renderer.js']) run(dom, file);
  return dom;
}
test('GFM tables render headers, rows, bold and inline code with a scrollable wrapper', () => {
  const dom = page(), { window } = dom;
  window.document.getElementById('result').innerHTML = window.kikiMarkdown.render('\uFEFF' + table);
  assert.equal(window.document.querySelectorAll('thead th').length, 3);
  assert.equal(window.document.querySelectorAll('tbody tr').length, 2);
  assert.equal(window.document.querySelector('strong').textContent, '公开资料');
  assert.equal(window.document.querySelector('code').textContent, '示例代码');
  assert.equal(window.document.querySelector('.markdown-table').getAttribute('tabindex'), '0');
  dom.window.close();
});
test('lists, quotes, links, aligned tables, fenced code and escaped table pipes retain their meaning', () => {
  const dom = page(), { window } = dom;
  const source = '# 标题\n\n- **粗体**\n- [参考](https://example.test/docs)\n\n> 引用\n\n```html\n<img src=x onerror=alert(1)>\n```\n\n| 左 | 右 |\n| :--- | ---: |\n| A\\|B | 1 |';
  window.document.getElementById('result').innerHTML = window.kikiMarkdown.render(source);
  assert.equal(window.document.querySelectorAll('li').length, 2);
  assert.equal(window.document.querySelector('blockquote').textContent.trim(), '引用');
  assert.equal(window.document.querySelector('pre code').textContent.trim(), '<img src=x onerror=alert(1)>');
  assert.equal(window.document.querySelector('tbody td').textContent, 'A|B');
  assert.equal(window.document.querySelectorAll('td')[1].getAttribute('align'), 'right');
  assert.equal(window.document.querySelector('a').getAttribute('href'), 'https://example.test/docs');
  dom.window.close();
});
test('HTML and unsafe image/link URLs cannot create executable elements or event handlers', () => {
  const dom = page(), { window } = dom;
  const input = '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[链接](javascript:alert(1))\n\n![坏图](javascript:alert(1))';
  const target = window.document.getElementById('result'); target.innerHTML = window.kikiMarkdown.render(input);
  assert.equal(target.querySelector('script,img,iframe,form'), null);
  assert.equal(target.querySelector('[onerror],[onclick]'), null);
  assert.equal(target.querySelector('a')?.getAttribute('href'), null);
  dom.window.close();
});
test('diary image resolution retains lightbox links without exposing its private storage syntax', () => {
  const dom = page(), { window } = dom;
  const target = window.document.getElementById('result');
  target.innerHTML = window.kikiMarkdown.render(`![照片](diary-image:${mediaId})`, { resolveImage: () => ({ src: `media/diary/${mediaId}.jpg`, photoIndex: 3 }) });
  assert.equal(target.querySelector('img').getAttribute('src'), `media/diary/${mediaId}.jpg`);
  assert.equal(target.querySelector('button').getAttribute('data-photo'), '3');
  assert(!target.innerHTML.includes('diary-image:'));
  target.innerHTML = window.kikiMarkdown.render(`![未找到](diary-image:${mediaId})`, { resolveImage: () => null });
  assert.equal(target.querySelector('img'), null);
  dom.window.close();
});
test('the actual admin Preview button renders a table using the shared renderer', async () => {
  const dom = page(fs.readFileSync(new URL('backend/public/index.html', root), 'utf8'));
  dom.window.fetch = async path => Response.json(path === '/api/me' ? { siteUrl: 'https://example.test' } : []);
  run(dom, 'backend/public/admin.js');
  await new Promise(resolve => setImmediate(resolve));
  dom.window.document.getElementById('title').value = '表格预览';
  dom.window.document.getElementById('body').value = table;
  dom.window.document.getElementById('preview-tab').click();
  const preview = dom.window.document.getElementById('preview');
  assert.equal(preview.hidden, false); assert.equal(preview.querySelectorAll('tbody tr').length, 2);
  assert.equal(preview.querySelector('strong').textContent, '公开资料');
  dom.window.close();
});
test('public article and diary views render the same table as the admin preview', () => {
  const dom = page(fs.readFileSync(new URL('index.html', root), 'utf8'));
  for (const file of ['diary-media.js', 'diary-ui.js', 'home-view.js', 'sample-posts.js', 'app.js']) run(dom, file);
  dom.window.sample = { title: '表格', body: table, id: 'test-entry' };
  const article = vm.runInContext('articleBody(sample)', dom.getInternalVMContext());
  const diary = vm.runInContext('diaryUI.body(sample)', dom.getInternalVMContext());
  const target = dom.window.document.createElement('div');
  for (const html of [article, diary]) {
    target.innerHTML = html;
    assert.equal(target.querySelectorAll('thead th').length, 3);
    assert.equal(target.querySelectorAll('tbody tr').length, 2);
    assert.equal(target.querySelector('strong').textContent, '公开资料');
    assert.equal(target.querySelector('code').textContent, '示例代码');
  }
  dom.window.close();
});
