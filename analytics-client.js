'use strict';
(() => {
  const config = window.KIKI_SITE;
  const live = config && location.origin === new URL(config.siteUrl).origin;
  const counts = new Map(), recent = new Map(), pending = new Set();
  const rule = '同一 IP 在 30 分钟内重复访问同一页面计一次';
  function paint() {
    document.querySelectorAll('[data-view-target]').forEach(node => {
      const value = counts.get(node.dataset.viewTarget);
      node.textContent = Number.isSafeInteger(value) ? value.toLocaleString('zh-CN') : '—';
      node.title = live ? rule : '仅在正式网站统计浏览量';
    });
  }
  function remember(target, views) {
    if (Number.isSafeInteger(views) && views >= 0) counts.set(target, Math.max(counts.get(target) || 0, views));
  }
  async function request(path, options = {}) {
    const response = await fetch(new URL(path, config.adminUrl), { ...options, credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('统计暂不可用');
    return response.json();
  }
  async function hydrate() {
    paint();
    if (!live) return;
    const targets = [...new Set([...document.querySelectorAll('[data-view-target]')].map(node => node.dataset.viewTarget))];
    if (!targets.length) return;
    try {
      for (let i = 0; i < targets.length; i += 100) {
        const data = await request('/public/analytics/counts?targets=' + encodeURIComponent(targets.slice(i, i + 100).join(',')));
        Object.entries(data.counts || {}).forEach(([target, views]) => remember(target, views));
      }
      paint();
    } catch { /* Reading stays available if statistics are unavailable. */ }
  }
  async function visit(target) {
    if (!live || pending.has(target) || Date.now() - (recent.get(target) || 0) < 30 * 60000) return;
    pending.add(target);
    try {
      const data = await request('/public/analytics/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target }) });
      recent.set(target, Date.now()); remember(target, data.views); paint();
    } catch { /* Do not show an invented count or interrupt reading. */ }
    finally { pending.delete(target); }
  }
  const pages = new Set(['home', 'blog', 'diary', 'photos', 'music', 'explore']);
  window.kikiAnalytics = Object.freeze({
    page(page) { hydrate(); if (pages.has(page)) visit('page:' + page); },
    article(id) { hydrate(); visit('article:' + id); },
  });
  const initial = (location.hash.slice(1) || 'home').split('?')[0];
  window.kikiAnalytics.page(pages.has(initial) ? initial : 'home');
})();
