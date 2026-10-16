'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'backend/public');
const files = ['markdown-renderer.js', 'markdown.css', 'mermaid-client.js', 'diagram.html', 'diagram.css', 'diagram-frame.mjs', 'vendor/marked.umd.js', 'vendor/purify.min.js', 'vendor/MARKED-LICENSE.txt', 'vendor/DOMPURIFY-LICENSE.txt'];
for (const entry of fs.readdirSync(path.join(root, 'vendor/mermaid'), { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !(entry.name.endsWith('.mjs') || entry.name === 'LICENSE.txt')) continue;
  files.push(path.relative(root, path.join(entry.parentPath || entry.path, entry.name)));
}
for (const file of files) {
  fs.mkdirSync(path.dirname(path.join(target, file)), { recursive: true });
  fs.copyFileSync(path.join(root, file), path.join(target, file));
}
console.log('Shared Markdown assets prepared for admin.');
