'use strict';
// Each diagram renders in an opaque-origin frame. Writing previews never send
// diagram text to a third-party service or give diagrams access to login cookies.
(() => {
  const frameUrl = new URL('diagram.html', document.currentScript.src).href;
  const frames = new Map();
  window.addEventListener('message', event => {
    const item = [...frames.values()].find(value => value.frame.contentWindow === event.source);
    if (!item || !item.figure.isConnected || event.origin !== 'null') return;
    const data = event.data;
    if (!data || data.id !== item.id) return;
    if (data.type === 'kiki-diagram-result') {
      clearTimeout(item.timer);
      item.status.textContent = data.ok ? '' : '图表暂时无法显示：' + String(data.error || '请检查 Mermaid 语法。').slice(0, 400);
      item.status.hidden = Boolean(data.ok);
      item.details.open = !data.ok;
    }
    if (data.type === 'kiki-diagram-height' && Number.isFinite(data.height)) item.frame.height = String(Math.max(160, Math.min(1400, Math.ceil(data.height))));
  });
  function render(root) {
    for (const [key, item] of frames) if (!item.figure.isConnected) { clearTimeout(item.timer); frames.delete(key); }
    root.querySelectorAll('pre > code').forEach(code => {
      if (![...code.classList].some(name => /^language-mermaid$/i.test(name))) return;
      const source = code.textContent, pre = code.parentElement;
      const figure = document.createElement('figure'); figure.className = 'mermaid-diagram';
      const caption = document.createElement('figcaption'); caption.textContent = 'MERMAID / 图表';
      const frame = document.createElement('iframe'); frame.className = 'mermaid-frame'; frame.title = 'Mermaid 图表'; frame.height = '240';
      frame.setAttribute('sandbox', 'allow-scripts'); frame.referrerPolicy = 'no-referrer';
      const status = document.createElement('p'); status.className = 'mermaid-status'; status.setAttribute('role', 'status'); status.textContent = '正在渲染图表…';
      const details = document.createElement('details'), summary = document.createElement('summary'); summary.textContent = '查看 Mermaid 源码';
      const sourcePre = document.createElement('pre'), sourceCode = document.createElement('code'); sourceCode.textContent = source; sourcePre.append(sourceCode); details.append(summary, sourcePre);
      figure.append(caption, status, frame, details); pre.replaceWith(figure);
      const id = crypto.randomUUID();
      const item = { frame, figure, status, details, id, timer: setTimeout(() => { if (!figure.isConnected) return; status.textContent = '图表加载较慢，可以稍后重新预览；源码已保留。'; details.open = true; }, 45000) };
      frames.set(id, item);
      frame.addEventListener('load', () => frame.contentWindow?.postMessage({ type: 'kiki-diagram-render', id, source }, '*'), { once: true });
      frame.src = frameUrl;
    });
  }
  window.kikiDiagrams = Object.freeze({ render });
})();
