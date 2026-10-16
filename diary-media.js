'use strict';

// Image bytes live in IndexedDB; diary and draft records keep only image IDs.
const diaryMedia = (() => {
  const assets = new Map();
  const tokenPattern = /!\[([^\]\n]*)\]\(diary-image:([a-zA-Z0-9-]+)\)/g;
  let database;
  function openDatabase() {
    if (database) return database;
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('kiki-blog-media', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('images', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('图片存储暂时被其他页面占用'));
    });
    database.catch(() => { database = undefined; });
    return database;
  }
  function remember(record) {
    if (!assets.has(record.id)) assets.set(record.id, { ...record, src: URL.createObjectURL(record.blob) });
    return assets.get(record.id);
  }
  async function load() {
    const db = await openDatabase();
    const records = await new Promise((resolve, reject) => {
      const request = db.transaction('images', 'readonly').objectStore('images').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    records.forEach(remember);
  }
  async function importFiles(files) {
    const records = [];
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.type)) {
        throw new Error('请选择 JPG、PNG、WebP、GIF 或 AVIF 图片。');
      }
      if (file.size > 20 * 1024 * 1024) throw new Error('单张图片请小于 20 MB。');
      const temporaryURL = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = temporaryURL;
        await image.decode();
      } catch { throw new Error(`无法读取图片「${file.name}」，请换一张重试。`); }
      finally { URL.revokeObjectURL(temporaryURL); }
      records.push({ id: `img-${crypto.randomUUID()}`, name: file.name, blob: file, createdAt: Date.now() });
    }
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('images', 'readwrite');
      records.forEach(record => transaction.objectStore('images').put(record));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('图片保存失败'));
    });
    return records.map(remember);
  }
  function references(body) {
    return [...String(body).matchAll(tokenPattern)].map(match => ({ id: match[2], caption: match[1] }));
  }
  function text(body) { return String(body).replace(tokenPattern, '').trim(); }
  function parts(body) {
    const result = [];
    let end = 0;
    for (const match of String(body).matchAll(tokenPattern)) {
      if (match.index > end) result.push({ text: body.slice(end, match.index) });
      result.push({ id: match[2], caption: match[1] });
      end = match.index + match[0].length;
    }
    if (end < body.length) result.push({ text: body.slice(end) });
    return result;
  }
  function remove(body, id) {
    return String(body).replace(tokenPattern, (match, caption, imageId) => imageId === id ? '' : match);
  }
  return { assets, load, importFiles, references, text, parts, remove };
})();
