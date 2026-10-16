'use strict';
const publishedContent = {
  valid(record) {
    if (!record || typeof record.id !== 'string' || !/^[a-z0-9-]+$/.test(record.id) || typeof record.title !== 'string' || typeof record.body !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) return false;
    return (record.media || []).every(media => /^[a-z0-9-]+$/.test(media.id) && /^media\/(blog|diary)\/[0-9a-f-]+\.jpg$/.test(media.src));
  },
  async load() {
    try {
      const response = await fetch('content/feed.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Unable to read public content');
      const feed = await response.json();
      if (feed.version !== 1 || !Array.isArray(feed.posts) || !Array.isArray(feed.diaries) || ![...feed.posts, ...feed.diaries].every(record => this.valid(record))) throw new Error('Invalid content index');
      for (const record of [...feed.posts, ...feed.diaries]) for (const media of record.media || []) diaryMedia.assets.set(media.id, { ...media, published: true });
      posts = [...feed.posts.map(record => ({ ...record, published: true })), ...posts.filter(record => !feed.posts.some(published => published.id === record.id))];
      diaries = [...feed.diaries.map(record => ({ ...record, published: true })), ...diaries.filter(record => !feed.diaries.some(published => published.id === record.id))];
      diaryUI.syncGallery(); route();
    } catch { toast('公开内容暂时无法加载，请稍后刷新。'); }
  },
  openAdmin(type = 'blog') { location.href = 'admin/?type=' + encodeURIComponent(type); },
};
publishedContent.load();
$('write-open').onclick = () => publishedContent.openAdmin();
$('write-open').querySelector('span:last-child').textContent = '管理后台';
