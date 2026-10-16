# Markdown browser assets

- `marked.umd.js`: Marked 18.1.1, MIT. Source: https://github.com/markedjs/marked
- `purify.min.js`: DOMPurify 3.4.17, Apache-2.0 OR MPL-2.0. Source: https://github.com/cure53/DOMPurify

Files are copied unchanged from the npm versions pinned in the root package-lock.json. Original licenses are included alongside them. The public website uses local files, not a CDN. `scripts/sync-markdown.cjs` copies the renderer, stylesheet, libraries and licenses to the Worker assets directory before deployment.

When upgrading either package, copy the matching browser distribution and license from node_modules, and rerun `npm test` and `npm run build` before deployment.
