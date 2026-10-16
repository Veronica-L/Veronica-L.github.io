'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'backend/public');
const files = ['markdown-renderer.js', 'markdown.css', 'vendor/marked.umd.js', 'vendor/purify.min.js', 'vendor/MARKED-LICENSE.txt', 'vendor/DOMPURIFY-LICENSE.txt'];
for (const file of files) {
  fs.mkdirSync(path.dirname(path.join(target, file)), { recursive: true });
  fs.copyFileSync(path.join(root, file), path.join(target, file));
}
console.log('Shared Markdown assets prepared for admin.');
