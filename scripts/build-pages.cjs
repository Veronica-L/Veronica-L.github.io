'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const siteFiles = ['index.html', 'art-style.css', 'app.js', 'home-view.js', 'diary-media.js', 'diary-ui.js'];
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
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
for (const file of assetFiles) fs.copyFileSync(path.join(root, 'assets', file), path.join(output, 'assets', file));
fs.writeFileSync(path.join(output, '.nojekyll'), '');

// Check the generated artifact, including assets in scripts and CSS.
for (const file of siteFiles) {
  const content = fs.readFileSync(path.join(output, file), 'utf8');
  for (const match of content.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const target = match[1];
    if (/^(?:data:|https?:|blob:)/.test(target) || target.includes('${')) continue;
    assert(!target.startsWith('/'), `Absolute URL breaks project sites: ${target}`);
    assert(fs.existsSync(path.join(output, target)), `Missing linked file: ${target}`);
  }
  for (const match of content.matchAll(/assets\/([a-z0-9-]+\.(?:jpg|wav))/g)) {
    assert(fs.existsSync(path.join(output, 'assets', match[1])), `Missing asset: ${match[1]}`);
  }
}
const allowed = new Set([...siteFiles, '.nojekyll', ...assetFiles.map(file => `assets/${file}`)]);
for (const file of fs.readdirSync(output, { recursive: true, withFileTypes: true })) {
  const parent = file.parentPath || file.path;
  const relative = path.relative(output, path.join(parent, file.name)).split(path.sep).join('/');
  assert(!file.isSymbolicLink(), `Links are not allowed in the Pages artifact: ${relative}`);
  assert(file.isDirectory() ? relative === 'assets' : allowed.has(relative), `Unexpected public file: ${relative}`);
}
console.log(`Pages build verified: ${allowed.size} public files in dist/.`);
