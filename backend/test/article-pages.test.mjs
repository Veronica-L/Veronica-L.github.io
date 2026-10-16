import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
const require = createRequire(import.meta.url);
const { generateArticlePages, postPath } = require('../../scripts/article-pages.cjs');
const { buildPages } = require('../../scripts/build-pages.cjs');
const root = new URL('../../', import.meta.url);
const id = '11111111-1111-4111-8111-111111111111';
const imageId = '22222222-2222-4222-8222-222222222222';
const record = { id, published: true, type: 'blog', title: '文章发布测试', date: '2026-10-16', category: '技术手记', tags: ['MCP'], body: '# 文章发布测试\n\n不依赖脚本的完整正文。\n\n| 实验 | 结果 |\n|---|---|\n| A | **通过** |\n\n```mermaid\nflowchart LR\nA[开始]-->B[结束]\n```\n\n最后一段正文。', media: [] };
const feed = (posts = [record]) => ({ version: 1, posts, diaries: [] });
const html = (result, post = record) => result.files.get(`posts/${post.id}/index.html`);
const run = (dom, file) => vm.runInContext(fs.readFileSync(new URL(file, root), 'utf8'), dom.getInternalVMContext());

test('standalone HTML contains complete readable article, tables and Mermaid source with scripts disabled', () => {
  const result = generateArticlePages(feed());
  const dom = new JSDOM(html(result), { url: 'https://veronica-l.github.io' + postPath(record) });
  const doc = dom.window.document;
  assert.equal(doc.querySelectorAll('h1').length, 1); assert.equal(doc.querySelector('h1').textContent, record.title);
  assert(doc.querySelector('.markdown-content').textContent.includes('最后一段正文。'));
  assert.equal(doc.querySelector('tbody td strong').textContent, '通过');
  assert(doc.querySelector('code.language-mermaid').textContent.includes('A[开始]-->B[结束]'));
  assert.equal(doc.querySelector('link[rel=canonical]').href, 'https://veronica-l.github.io/posts/' + id + '/');
  assert.equal(doc.querySelector('meta[name=robots]').content, 'index,follow');
  assert.equal(JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent).headline, record.title);
  assert(result.index.includes('href="/posts/' + id + '/"')); assert(result.files.get('sitemap.xml').includes(postPath(record)));
  assert(!doc.querySelector('script[src="/app.js"],script[src="/content-client.js"]'));
  dom.window.close();
});
test('image tokens become root-based public media; metadata, tags and raw HTML cannot inject scripts', () => {
  const post = { ...record, title: '</title><script>bad()</script>', tags: ['"><img src=x onerror=bad()>'], body: record.body + `\n\n![公开插图](diary-image:${imageId})\n\n<img src=x onerror=bad()>\n\n![站内图片](assets/reference-flowers.jpg)`, media: [{ id: imageId, src: `media/blog/${imageId}.jpg` }] };
  const dom = new JSDOM(html(generateArticlePages(feed([post])), post));
  const doc = dom.window.document;
  assert.equal(doc.querySelector('title').textContent, post.title + " · Kiki's Blog");
  assert.equal(doc.querySelectorAll('script:not([src])').length, 1);
  assert.equal(JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent).headline, post.title);
  assert.equal(doc.querySelector('[onerror]'), null);
  assert.equal(doc.querySelector('.markdown-content img').getAttribute('src'), `/media/blog/${imageId}.jpg`);
  assert.equal([...doc.querySelectorAll('.markdown-content img')].at(-1).getAttribute('src'), '/assets/reference-flowers.jpg');
  assert(!doc.querySelector('.markdown-content').innerHTML.includes('diary-image:'));
  dom.window.close();
});
test('only published articles get indexable pages; private drafts and diaries are excluded; sample pages are noindex', () => {
  const input = feed([record, { ...record, id: 'private-draft', published: false, title: '私有草稿内容' }]);
  input.diaries = [{ ...record, id: 'diary-entry', title: '日记内容' }];
  const result = generateArticlePages(input);
  assert(!result.files.has('posts/private-draft/index.html')); assert(!result.files.has('posts/diary-entry/index.html'));
  assert(![...result.files.values()].join('').includes('私有草稿内容'));
  assert(!result.files.get('sitemap.xml').includes('slow-days'));
  assert.match(result.files.get('posts/slow-days/index.html'), /name="robots" content="noindex,follow"/);
  assert.throws(() => generateArticlePages(feed([{ ...record, id: '../escape' }])));
});
test('rebuilds update article HTML at the same URL and remove unpublished pages from the artifact and sitemap', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'kiki-article-build-'));
  try {
    buildPages(output, feed());
    const article = path.join(output, 'posts', id, 'index.html');
    assert(fs.existsSync(article));
    const changed = { ...record, title: '修改后的标题', body: '更新后的完整正文' };
    buildPages(output, feed([changed]));
    assert(fs.readFileSync(article, 'utf8').includes('更新后的完整正文'));
    assert(fs.readFileSync(path.join(output, 'index.html'), 'utf8').includes('修改后的标题'));
    buildPages(output, feed([]));
    assert(!fs.existsSync(article));
    assert(!fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8').includes(id));
    assert(!fs.readFileSync(path.join(output, 'index.html'), 'utf8').includes(id));
  } finally {
    assert(path.resolve(output).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(output).startsWith('kiki-article-build-'));
    fs.rmSync(output, { recursive: true, force: true });
  }
});
test('homepage, cards, archives and search expose normal links; browser-only drafts retain local reading', () => {
  const dom = new JSDOM(fs.readFileSync(new URL('index.html', root), 'utf8'), { url: 'https://veronica-l.github.io/', runScripts: 'outside-only' });
  for (const file of ['vendor/marked.umd.js', 'vendor/purify.min.js', 'markdown-renderer.js', 'diary-media.js', 'diary-ui.js', 'home-view.js', 'sample-posts.js', 'app.js']) run(dom, file);
  dom.window.cmsPost = record;
  vm.runInContext('posts.unshift(cmsPost);route()', dom.getInternalVMContext());
  assert.equal(dom.window.document.querySelector('.lead-copy h2 a').getAttribute('href'), 'posts/' + id + '/');
  dom.window.location.hash = '#blog'; vm.runInContext('route()', dom.getInternalVMContext());
  assert.equal(dom.window.document.querySelector('.article-card h3 a').getAttribute('href'), 'posts/' + id + '/');
  const archive = new JSDOM(vm.runInContext('archiveTimeline()', dom.getInternalVMContext()));
  assert(archive.window.document.querySelector(`a[href="posts/${id}/"]`)); archive.window.close();
  dom.window.document.getElementById('search-input').value = record.title; vm.runInContext('renderSearch()', dom.getInternalVMContext());
  assert.equal(dom.window.document.querySelector('.search-result').getAttribute('href'), 'posts/' + id + '/');
  assert.equal(vm.runInContext("postUrl({id:'local-only',title:'未发布'})", dom.getInternalVMContext()), null);
  dom.window.close();
});
test('standalone enhancements preserve content and track exactly the article without a false homepage visit', async () => {
  const page = html(generateArticlePages(feed()));
  const dom = new JSDOM(page, { url: 'https://veronica-l.github.io' + postPath(record), runScripts: 'outside-only' });
  const calls = [], before = dom.window.document.querySelector('.markdown-content').innerHTML;
  dom.window.fetch = async (input, options = {}) => {
    calls.push({ url: new URL(input), options });
    return Response.json(options.method === 'POST' ? { target: 'article:' + id, views: 12 } : { counts: { ['article:' + id]: 11 } });
  };
  let diagramRoot;
  dom.window.kikiDiagrams = { render: node => { diagramRoot = node; } };
  for (const file of ['site-config.js', 'analytics-client.js', 'article-page.js']) run(dom, file);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(dom.window.document.querySelector('.markdown-content').innerHTML, before);
  assert.equal(diagramRoot.id, 'article');
  assert.equal(dom.window.document.querySelector('[data-view-target]').textContent, '12');
  const visits = calls.filter(call => call.options.method === 'POST');
  assert.equal(visits.length, 1); assert.equal(JSON.parse(visits[0].options.body).target, 'article:' + id);
  dom.window.document.getElementById('article-theme').click();
  assert(dom.window.document.documentElement.classList.contains('dark'));
  dom.window.close();
});
