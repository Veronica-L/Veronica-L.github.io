import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const root = new URL('../../', import.meta.url);
function setup() {
  const dom = new JSDOM('<main id="preview"></main>', { url: 'https://example.test/admin', runScripts: 'outside-only' });
  const script = dom.window.document.createElement('script'); script.src = 'https://example.test/mermaid-client.js';
  Object.defineProperty(dom.window.document, 'currentScript', { value: script, configurable: true });
  for (const file of ['vendor/marked.umd.js', 'vendor/purify.min.js', 'markdown-renderer.js', 'mermaid-client.js']) vm.runInContext(fs.readFileSync(new URL(file, root), 'utf8'), dom.getInternalVMContext());
  return dom;
}
test('only mermaid fences become isolated frames and their original code remains available', () => {
  const dom = setup(), { window } = dom, view = window.document.getElementById('preview');
  const source = '```mermaid\nflowchart LR\n A[作者]-->B[网站]\n```\n\n```js\nconst mermaid = 1;\n```';
  view.innerHTML = window.kikiMarkdown.render(source); window.kikiDiagrams.render(view);
  const frame = view.querySelector('iframe');
  assert(frame); assert.equal(frame.getAttribute('sandbox'), 'allow-scripts'); assert(!frame.getAttribute('sandbox').includes('allow-same-origin'));
  assert.equal(frame.src, 'https://example.test/diagram.html');
  assert.match(view.querySelector('details code').textContent, /A\[作者\]-->B\[网站\]/);
  assert(view.querySelector('code.language-js'));
  window.kikiDiagrams.render(view); assert.equal(view.querySelectorAll('iframe').length, 1);
  window.close();
});
test('frame messages must match the actual frame and diagram id; errors are displayed as text', () => {
  const dom = setup(), { window } = dom, view = window.document.getElementById('preview');
  view.innerHTML = window.kikiMarkdown.render('```mermaid\ninvalid diagram\n```'); window.kikiDiagrams.render(view);
  const frame = view.querySelector('iframe'); let sent;
  frame.contentWindow.postMessage = message => { sent = message; };
  frame.dispatchEvent(new window.Event('load')); assert(sent.id); assert.equal(sent.source.trim(), 'invalid diagram');
  const status = view.querySelector('.mermaid-status');
  window.dispatchEvent(new window.MessageEvent('message', { origin: 'null', source: window, data: { type: 'kiki-diagram-result', id: sent.id, ok: false, error: 'spoofed' } }));
  assert(!status.textContent.includes('spoofed'));
  window.dispatchEvent(new window.MessageEvent('message', { origin: 'null', source: frame.contentWindow, data: { type: 'kiki-diagram-result', id: sent.id, ok: false, error: '<img src=x onerror=alert(1)>' } }));
  assert.match(status.textContent, /<img/); assert.equal(status.querySelector('img'), null); assert.equal(view.querySelector('details').open, true);
  window.dispatchEvent(new window.MessageEvent('message', { origin: 'null', source: frame.contentWindow, data: { type: 'kiki-diagram-height', id: sent.id, height: 999999 } }));
  assert.equal(frame.height, '1400');
  window.close();
});
test('all local Mermaid imports resolve to packaged modules, including lazy diagram loaders', () => {
  const directory = new URL('vendor/mermaid/', root);
  for (const file of fs.readdirSync(directory, { recursive: true }).filter(file => file.endsWith('.mjs'))) {
    const absolute = new URL(file.replaceAll('\\', '/'), directory);
    const text = fs.readFileSync(absolute, 'utf8');
    for (const match of text.matchAll(/["'](\.\.?\/[^"']+\.mjs)["']/g)) assert(fs.existsSync(new URL(match[1], absolute)), `Missing Mermaid module: ${path.basename(file)} -> ${match[1]}`);
  }
});
test('renderer-only frame policy keeps the admin API private and supports sandbox module loading', async () => {
  const { default: worker } = await import('../worker.mjs');
  const env = { ASSETS: { fetch: async () => new Response('asset') } };
  const frame = await worker.fetch(new Request('https://example.test/diagram.html'), env);
  assert.equal(frame.headers.get('Access-Control-Allow-Origin'), '*');
  assert.match(frame.headers.get('Content-Security-Policy'), /frame-ancestors 'self'/);
  assert.match(frame.headers.get('Content-Security-Policy'), /connect-src 'none'/);
  const canonicalFrame = await worker.fetch(new Request('https://example.test/diagram'), env);
  assert.equal(canonicalFrame.status, 200); assert.equal(canonicalFrame.headers.get('X-Frame-Options'), 'SAMEORIGIN');
  assert.match(canonicalFrame.headers.get('Content-Security-Policy'), /frame-ancestors 'self'/);
  const module = await worker.fetch(new Request('https://example.test/vendor/mermaid/mermaid.esm.min.mjs'), env);
  assert.equal(module.status, 200); assert.equal(module.headers.get('Access-Control-Allow-Origin'), '*');
  const privateResponse = await worker.fetch(new Request('https://example.test/api/entries'), env);
  assert.equal(privateResponse.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(privateResponse.headers.get('X-Frame-Options'), 'DENY');
});
