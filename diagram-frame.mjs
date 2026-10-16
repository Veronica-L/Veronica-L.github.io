import mermaid from './vendor/mermaid/mermaid.esm.min.mjs';

const locked = ['secure', 'securityLevel', 'startOnLoad', 'suppressErrorRendering', 'maxTextSize', 'maxEdges', 'theme', 'themeVariables', 'fontFamily', 'htmlLabels', 'layout', 'flowchart'];
mermaid.initialize({
  startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true,
  secure: locked, maxTextSize: 50000, maxEdges: 500, htmlLabels: false, layout: 'dagre',
  fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  theme: 'base', themeVariables: { primaryColor: '#ede9db', primaryTextColor: '#242923', primaryBorderColor: '#304e8d', lineColor: '#304e8d', secondaryColor: '#e9b746', tertiaryColor: '#e4ddd0', background: '#f6f2e7', fontSize: '15px' },
  flowchart: { htmlLabels: false, useMaxWidth: false },
});
export async function drawDiagram(source, container) {
  if (typeof source !== 'string' || !source.trim() || source.length > 50000) throw new Error('请提供 50000 字以内的 Mermaid 代码。');
  const stage = document.createElement('div'); stage.className = 'diagram-stage'; container.append(stage);
  try {
    const id = 'kikiDiagram' + crypto.randomUUID().replaceAll('-', '');
    const result = await mermaid.render(id, source, stage);
    const safe = window.DOMPurify.sanitize(result.svg, { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ['style'], FORBID_TAGS: ['foreignObject', 'script', 'iframe', 'a'], FORBID_ATTR: ['href', 'xlink:href'] });
    const template = document.createElement('template'); template.innerHTML = safe;
    const svg = template.content.querySelector('svg');
    if (!svg) throw new Error('未能生成图表。');
    // Diagrams can use local paint references, but cannot load CSS resources.
    const localUrls = value => value.replace(/url\(([^)]*)\)/gi, (match, url) => /^\s*['"]?#[a-zA-Z0-9_-]+['"]?\s*$/.test(url) ? match : 'none');
    svg.querySelectorAll('style').forEach(style => style.textContent = localUrls(style.textContent).replace(/@import[^;]*;/gi, ''));
    svg.querySelectorAll('[style]').forEach(node => node.setAttribute('style', localUrls(node.getAttribute('style'))));
    container.replaceChildren(svg);
    return svg;
  } finally { stage.remove(); }
}
if (window.parent !== window) {
  let received = false;
  window.addEventListener('message', async event => {
    if (received || event.source !== window.parent || event.data?.type !== 'kiki-diagram-render' || typeof event.data.id !== 'string') return;
    received = true;
    const id = event.data.id, container = document.getElementById('diagram');
    const reportSize = () => window.parent.postMessage({ type: 'kiki-diagram-height', id, height: Math.max(container.getBoundingClientRect().height, container.scrollHeight) + 36 }, '*');
    try {
      await drawDiagram(event.data.source, container);
      window.parent.postMessage({ type: 'kiki-diagram-result', id, ok: true }, '*');
      reportSize();
      new ResizeObserver(reportSize).observe(container);
    } catch (error) {
      const message = String(error?.message || '请检查 Mermaid 语法。').slice(0, 400);
      const note = document.createElement('p'); note.className = 'diagram-error'; note.textContent = message; container.replaceChildren(note);
      window.parent.postMessage({ type: 'kiki-diagram-result', id, ok: false, error: message }, '*'); reportSize();
    }
  });
}
