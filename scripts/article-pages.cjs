'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const samples = require('../sample-posts.js');
const root = path.resolve(__dirname, '..');
const origin = 'https://veronica-l.github.io';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const postPath = post => `/posts/${post.id}/`;
const covers = { 'slow-days': 'reference-collage', 'my-digital-garden': 'reference-abstract', 'mountain-weekend': 'reference-birds', 'coffee-morning': 'reference-vinyl', 'design-notes': 'reference-flowers', 'sea-letter': 'sea' };
function coverFor(post) { return '/' + (post.media?.[0]?.src || `assets/${covers[post.id] || post.image || 'reference-flowers'}.jpg`); }

function generateArticlePages(feed) {
  assert(feed.version === 1 && Array.isArray(feed.posts) && Array.isArray(feed.diaries), 'Invalid public content index');
  const published = feed.posts.filter(post => post.published === true);
  const records = [...published, ...samples.filter(sample => !published.some(post => post.id === sample.id))];
  const ids = new Set();
  for (const post of records) {
    assert(typeof post.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.id), 'Invalid public article ID');
    assert(!ids.has(post.id), 'Duplicate article ID'); ids.add(post.id);
    assert(typeof post.title === 'string' && typeof post.body === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(post.date), 'Invalid public article');
    assert(!post.image || /^[a-z0-9-]+$/.test(post.image), 'Invalid cover image');
    assert((post.media || []).every(media => /^[a-z0-9-]+$/.test(media.id) && /^media\/(?:blog|diary)\/[0-9a-f-]{36}\.jpg$/.test(media.src)), 'Invalid public article media');
  }
  const dom = new JSDOM('', { url: origin, runScripts: 'outside-only' });
  const output = new Map(), summaries = new Map();
  try {
    for (const file of ['vendor/marked.umd.js', 'vendor/purify.min.js', 'markdown-renderer.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), dom.getInternalVMContext());
    for (const post of records) {
      const media = new Map((post.media || []).map(image => [image.id, image]));
      const body = dom.window.document.createElement('div');
      body.innerHTML = dom.window.kikiMarkdown.render(post.body, { title: post.title, resolveImage: id => media.get(id) });
      // Resolve assets against the original site root, never the nested post URL.
      body.querySelectorAll('[src],a[href]').forEach(node => {
        const attr = node.hasAttribute('src') ? 'src' : 'href', value = node.getAttribute(attr);
        if (value && !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(value)) node.setAttribute(attr, new URL(value, origin + '/').pathname + new URL(value, origin + '/').search + new URL(value, origin + '/').hash);
      });
      const summaryNode = body.cloneNode(true); summaryNode.querySelectorAll('pre').forEach(node => node.remove());
      const description = (summaryNode.textContent.replace(/\s+/g, ' ').trim() || post.title).slice(0, 160);
      summaries.set(post.id, description);
      const canonical = origin + postPath(post), title = post.title + " · Kiki's Blog";
      const related = records.filter(item => item.id !== post.id && Boolean(item.published) === Boolean(post.published)).slice(0, 2);
      const tags = (post.tags || []).map(tag => `<a href="/#blog?tag=${encodeURIComponent(tag)}"># ${escape(tag)}</a>`).join('');
      const schema = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description, datePublished: post.publishedAt || post.date, dateModified: post.publishedAt || post.date, mainEntityOfPage: canonical, url: canonical, image: origin + coverFor(post), author: { '@type': 'Person', name: 'Kiki' }, publisher: { '@type': 'Organization', name: "Kiki's Blog" } }).replaceAll('<', '\\u003c');
      output.set(`posts/${post.id}/index.html`, `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ece8dd">
<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${post.published ? 'index,follow' : 'noindex,follow'}">
<link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:title" content="${escape(post.title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${origin + escape(coverFor(post))}">
<link rel="stylesheet" href="/art-style.css"><link rel="stylesheet" href="/markdown.css"><link rel="stylesheet" href="/article-page.css">
<script type="application/ld+json">${schema}</script><script src="/mermaid-client.js" defer></script><script src="/site-config.js" defer></script><script src="/analytics-client.js" defer></script><script src="/article-page.js" defer></script>
</head><body class="article-page" data-article-id="${escape(post.id)}">
<a class="skip-link" href="#article">跳到正文</a>
<header class="site-header"><div class="header-inner"><a class="brand" href="/#home"><span aria-hidden="true">K</span><span>Kiki's Blog</span></a><nav class="main-nav" aria-label="主导航"><a href="/#home">首页</a><a class="active" href="/#blog">文章</a><a href="/#diary">日记</a><a href="/#photos">照片墙</a><a href="/#music">云音乐</a><a href="/#explore">分类归档</a></nav><div class="header-tools"><button id="article-theme" class="secondary-button" aria-label="切换深色主题" hidden>深色</button></div></div></header>
<main class="standalone-main"><nav class="article-breadcrumb" aria-label="当前位置"><a href="/#blog">文章</a><span>/</span><a href="/#blog?category=${encodeURIComponent(post.category || '生活随笔')}">${escape(post.category || '生活随笔')}</a></nav>
<article id="article" class="standalone-article"><header class="standalone-heading"><div class="article-meta"><span>${escape(post.category || '生活随笔')}</span><time datetime="${escape(post.date)}">${post.date.replaceAll('-', '.')}</time><span>${Math.max(1, Math.ceil(post.body.length / 400))} 分钟阅读</span>${post.published ? '' : '<span>示例文章</span>'}</div><h1>${escape(post.title)}</h1><div class="tag-row">${tags}</div></header>
<img class="standalone-cover" src="${escape(coverFor(post))}" alt="${escape(post.title)}的配图" width="1200" height="450">
<div class="standalone-content"><div class="detail-prose markdown-content">${body.innerHTML}</div><div class="view-count">浏览量 <span data-view-target="article:${escape(post.id)}" aria-live="polite">—</span><noscript>（需要启用 JavaScript 才能显示统计）</noscript></div><div class="article-end"><span>文章结束</span><a href="/#blog">返回文章列表 ↗</a></div></div></article>
${related.length ? `<nav class="related-articles" aria-label="其他文章">${related.map(item => `<a href="${postPath(item)}"><small>继续阅读 ↗</small><span>${escape(item.title)}</span></a>`).join('')}</nav>` : ''}
</main><footer class="site-footer"><a class="footer-brand" href="/#home">Kiki's Blog · 个人博客</a><span>© 2026 Kiki's Blog</span><details class="analytics-disclosure"><summary>访问统计说明</summary><p>网站记录访问页面、IP 和大致地区，详细记录仅管理员可见，保留约 30 天并定期清理；累计浏览量继续保留。同一 IP 在 30 分钟内重复访问同一页面计一次。</p></details></footer>
</body></html>\n`);
    }
    const list = published.map(post => `<article><time datetime="${escape(post.date)}">${escape(post.date)}</time><h2><a href="${postPath(post)}">${escape(post.title)}</a></h2><p>${escape(summaries.get(post.id))}</p></article>`).join('');
    const index = `<section class="static-post-index" aria-label="已发布文章"><h1>Kiki's Blog · 文章</h1>${list || '<p>暂无已发布文章。</p>'}</section>`;
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url>${published.map(post => `<url><loc>${origin + postPath(post)}</loc>${Number.isFinite(Date.parse(post.publishedAt || post.date)) ? `<lastmod>${new Date(post.publishedAt || post.date).toISOString()}</lastmod>` : ''}</url>`).join('')}</urlset>\n`;
    output.set('sitemap.xml', sitemap);
    output.set('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${origin}/sitemap.xml\n`);
    return { files: output, index, count: records.length };
  } finally { dom.window.close(); }
}
module.exports = { generateArticlePages, postPath };
