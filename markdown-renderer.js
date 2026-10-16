'use strict';
// Shared by the writing preview and public article/diary views.
window.kikiMarkdown = Object.freeze({
  render(source, options = {}) {
    const escape = value => String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const safeImage = value => /^(?:https?:\/\/|blob:https?:\/\/|\/(?!\/)|(?:assets|media)\/)[^\s<>]*$/i.test(String(value || ''));
    const renderer = new marked.Renderer();
    const table = renderer.table, heading = renderer.heading;
    renderer.html = token => escape(token.text);
    renderer.heading = function (token) {
      if (token.depth === 1 && options.title && token.text === options.title) return '';
      return heading.call(this, token);
    };
    renderer.table = function (token) {
      return `<div class="markdown-table" role="region" aria-label="表格，可横向滚动" tabindex="0">${table.call(this, token)}</div>`;
    };
    renderer.image = function (token) {
      const match = /^diary-image:([a-zA-Z0-9-]+)$/.exec(token.href);
      const image = match ? options.resolveImage?.(match[1]) : { src: token.href };
      if (!image || !safeImage(image.src)) return `<span class="missing-image">${escape(token.text || '图片暂时无法读取')}</span>`;
      const caption = escape(token.text);
      const element = `<img src="${escape(image.src)}" alt="${caption}" loading="lazy">`;
      return Number.isInteger(image.photoIndex) && image.photoIndex >= 0
        ? `<button type="button" class="diary-inline-photo" data-photo="${image.photoIndex}" aria-label="放大 ${caption}">${element}</button><span class="diary-inline-caption">${caption}</span>`
        : element;
    };
    const parser = new marked.Marked({ gfm: true, breaks: true, renderer });
    const html = parser.parse(String(source || '').replace(/^[\u200B-\u200F\uFEFF]+/, ''));
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['div', 'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'strong', 'em', 'del', 'a', 'ul', 'ol', 'li', 'input', 'img', 'button', 'span'],
      ALLOWED_ATTR: ['href', 'title', 'src', 'alt', 'loading', 'class', 'data-photo', 'align', 'type', 'checked', 'disabled', 'start', 'role', 'tabindex', 'aria-label'],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|blob):|[#/?]|\.{0,2}\/?[a-z0-9_-][^:]*$)/i,
    });
  },
});
