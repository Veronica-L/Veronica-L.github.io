'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const siteFiles = ['index.html', 'art-style.css', 'app.js', 'home-view.js', 'diary-media.js', 'diary-ui.js', 'site-config.js', 'content-client.js', 'content/feed.json', 'admin/index.html', 'admin/admin-gateway.css', 'admin/admin-gateway.js', 'markdown-renderer.js', 'markdown.css', 'mermaid-client.js', 'diagram.html', 'diagram.css', 'diagram-frame.mjs'];
const vendorFiles = ['vendor/marked.umd.js', 'vendor/purify.min.js', 'vendor/MARKED-LICENSE.txt', 'vendor/DOMPURIFY-LICENSE.txt'];
for (const entry of fs.readdirSync(path.join(root, 'vendor/mermaid'), { recursive: true, withFileTypes: true })) {
  assert(!entry.isSymbolicLink(), 'Mermaid modules cannot contain links');
  if (entry.isFile() && (entry.name.endsWith('.mjs') || entry.name === 'LICENSE.txt')) vendorFiles.push(path.relative(root, path.join(entry.parentPath || entry.path, entry.name)).split(path.sep).join('/'));
}
const assetFiles = [
  'forest.jpg', 'lake.jpg', 'path.jpg', 'mountain.jpg', 'sea.jpg', 'coffee.jpg',
  'reference-abstract.jpg', 'reference-vinyl.jpg', 'reference-birds.jpg',
  'reference-flowers.jpg', 'reference-collage.jpg',
  'forest-letter.wav', 'evening-breeze.wav', 'after-sunset.wav',
];

// Copy an explicit public-file list. Screenshots, local tools and browser data
// never become part of the Pages artifact.
fs.mkdirSync(path.join(output, 'assets'), { recursive: true });
for (const file of siteFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  assert(!/(?:[A-Z]:[\\/]+Users[\\/]+|wxid_[a-z0-9_]+)/i.test(content), `Local identity/path in ${file}`);
  fs.mkdirSync(path.dirname(path.join(output, file)), { recursive: true });
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
const feed = JSON.parse(fs.readFileSync(path.join(root, 'content/feed.json'), 'utf8'));
assert(feed.version === 1 && Array.isArray(feed.posts) && Array.isArray(feed.diaries), 'Invalid public content index');
const mediaFiles = [...new Set([...feed.posts, ...feed.diaries].flatMap(record => record.media || []).map(media => media.src))];
for (const file of mediaFiles) {
  assert(/^media\/(?:diary|blog)\/[0-9a-f-]{36}\.jpg$/.test(file), `Invalid public media path: ${file}`);
  assert(!fs.lstatSync(path.join(root, file)).isSymbolicLink(), 'Public media cannot be a symbolic link');
  fs.mkdirSync(path.dirname(path.join(output, file)), { recursive: true });
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
for (const file of assetFiles) fs.copyFileSync(path.join(root, 'assets', file), path.join(output, 'assets', file));
for (const file of vendorFiles) {
  fs.mkdirSync(path.dirname(path.join(output, file)), { recursive: true });
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
fs.writeFileSync(path.join(output, '.nojekyll'), '');

// Check the generated artifact, including assets in scripts and CSS.
for (const file of siteFiles) {
  const content = fs.readFileSync(path.join(output, file), 'utf8');
  for (const match of content.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const target = match[1];
    if (/^(?:data:|https?:|blob:)/.test(target) || target.includes('${')) continue;
    assert(!target.startsWith('/'), `Absolute URL breaks project sites: ${target}`);
    assert(fs.existsSync(path.resolve(path.dirname(path.join(output, file)), target)), `Missing linked file: ${target}`);
  }
  for (const match of content.matchAll(/assets\/([a-z0-9-]+\.(?:jpg|wav))/g)) {
    assert(fs.existsSync(path.join(output, 'assets', match[1])), `Missing asset: ${match[1]}`);
  }
}
const allowed = new Set([...siteFiles, ...vendorFiles, ...mediaFiles, '.nojekyll', ...assetFiles.map(file => `assets/${file}`)]);
for (const file of fs.readdirSync(output, { recursive: true, withFileTypes: true })) {
  const parent = file.parentPath || file.path;
  const relative = path.relative(output, path.join(parent, file.name)).split(path.sep).join('/');
  assert(!file.isSymbolicLink(), `Links are not allowed in the Pages artifact: ${relative}`);
  assert(file.isDirectory() ? [...allowed].some(name => name.startsWith(relative + '/')) : allowed.has(relative), `Unexpected public file: ${relative}`);
}
console.log(`Pages build verified: ${allowed.size} public files in dist/.`);
