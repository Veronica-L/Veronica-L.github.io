'use strict';

const diaryUI = {
  uploading: false,
  collection: [],
  source(photo) { return photo.src || `assets/${photo.image}.jpg`; },

  syncGallery() {
    for (let i = photos.length - 1; i >= 0; i--) {
      if (photos[i].category === '日记') photos.splice(i, 1);
    }
    for (const diary of sortNewest(diaries)) {
      const base = { category: '日记', diaryId: diary.id, location: diary.title, date: dateDisplay(diary.date) };
      if (diary.image) {
        const existing = photos.find(photo => photo.image === diary.image);
        if (existing) existing.diaryId = diary.id;
        else photos.push({ ...base, image: diary.image, title: diary.title });
      }
      const unique = [...new Map(diaryMedia.references(diary.body).map(ref => [ref.id, ref])).values()];
      for (const ref of unique) {
        const asset = diaryMedia.assets.get(ref.id);
        if (asset) photos.push({ ...base, assetId: ref.id, src: asset.src, title: ref.caption || asset.name });
      }
    }
  },

  body(diary) {
    let body = diaryMedia.parts(diary.body).map(part => {
      if (part.text !== undefined) return part.text.trim() ? `<p>${e(part.text.trim())}</p>` : '';
      const asset = diaryMedia.assets.get(part.id);
      if (!asset) return '<div class="missing-image">这张图片暂时无法读取，请在保存它的浏览器里查看。</div>';
      const index = photos.findIndex(photo => photo.assetId === part.id && photo.diaryId === diary.id);
      return `<button class="diary-inline-photo" data-photo="${index}" aria-label="放大 ${e(part.caption || asset.name)}"><img src="${e(asset.src)}" alt="${e(part.caption || asset.name)}" loading="lazy"></button><div class="diary-inline-caption">${e(part.caption || asset.name)}</div>`;
    }).join('');
    if (diary.image) {
      const index = photos.findIndex(photo => photo.diaryId === diary.id && photo.image === diary.image);
      body += `<button class="diary-inline-photo" data-photo="${index}" aria-label="放大日记配图"><img src="assets/${e(diary.image)}.jpg" alt="${e(diary.title)}的配图" loading="lazy"></button>`;
    }
    return body;
  },

  diaryView(params) {
    let currentMonth = '';
    return `<div class="page-enter">${pageTop('DIARY', '日记', '按日期查看图文日记。')}
      <div class="diary-layout"><div class="glass diary-intro"><p>支持文字记录与图片插入。</p><button class="primary-button" data-action="write-diary">${icon('pen')} 写一则日记</button></div>
      <div class="diary-timeline">${sortNewest(diaries).map(diary => {
        const month = diary.date.slice(0, 7);
        const heading = month !== currentMonth ? `<h2 class="diary-month">${diary.date.slice(0, 4)} 年 · ${Number(diary.date.slice(5, 7))} 月</h2>` : '';
        currentMonth = month;
        const photoCount = photos.filter(photo => photo.diaryId === diary.id).length;
        return `${heading}<article id="diary-${e(diary.id)}" class="glass diary-entry ${params.get('entry') === diary.id ? 'highlight' : ''}">
          <div class="diary-side-date"><b>${diary.date.slice(8)}</b>${diary.date.slice(5, 7)} 月</div>
          <div class="article-meta"><time datetime="${e(diary.date)}">${dateDisplay(diary.date)}</time><span>·</span><span>☀ ${e(diary.mood || '留住当下')}</span></div>
          <h2>${e(diary.title)}</h2>${this.body(diary)}
          ${photoCount ? `<a class="diary-album-link" href="#photos?category=${encodeURIComponent('日记')}">${icon('folder')}已收进「日记」相册 · ${photoCount} 张 ${icon('arrowUpRight')}</a>` : ''}
        </article>`;
      }).join('')}</div></div></div>`;
  },

  photosView(params) {
    const category = params.get('category');
    const list = category === '日记' ? photos.filter(photo => photo.diaryId) : category ? photos.filter(photo => photo.category === category) : photos;
    const diaryPhotos = photos.filter(photo => photo.diaryId);
    return `<div class="page-enter">${pageTop('PHOTOS', category === '日记' ? '日记相册' : '照片墙', category === '日记' ? '日记插图自动收录于此，可返回对应日记。' : '按分类浏览照片，点击查看大图。', `<div class="page-counter"><span class="photo-count">${list.length.toString().padStart(2, '0')}</span>张照片</div>`)}
      ${category === '日记' ? `<div class="photo-breadcrumb"><a href="#photos">照片墙</a>${icon('chevron')}${icon('folder')}<strong>日记</strong><span>· ${diaryPhotos.length} 张照片</span></div>` : `<a class="glass photo-folder" href="#photos?category=${encodeURIComponent('日记')}" aria-label="打开日记目录"><span class="photo-folder-icon">${icon('folder')}</span><span class="photo-folder-copy"><strong>日记</strong><span>${diaryPhotos.length} 张照片 · 日记插图自动收录</span></span><span class="photo-folder-thumbs">${diaryPhotos.slice(0, 3).map(photo => `<img src="${e(this.source(photo))}" alt="" loading="lazy">`).join('')}</span>${icon('chevron')}</a>`}
      <nav class="photo-filters" aria-label="照片分类">${['全部', '山野', '日常', '海边', '日记'].map(name => `<a href="${name === '全部' ? '#photos' : `#photos?category=${encodeURIComponent(name)}`}" class="filter-chip ${(category === name || (!category && name === '全部')) ? 'active' : ''}">${name === '全部' ? '所有瞬间' : name}</a>`).join('')}<span class="page-counter" style="margin-left:auto">点击照片查看大图 ${icon('arrowUpRight')}</span></nav>
      ${list.length ? `<div class="photo-grid">${list.map(photo => `<button class="photo-tile" data-photo="${photos.indexOf(photo)}" aria-label="放大 ${e(photo.title)}"><img src="${e(this.source(photo))}" alt="${e(photo.title)}" loading="lazy"><span class="photo-caption"><strong>${e(photo.title)}</strong><span>${e(photo.location)} · ${e(photo.date)}</span></span></button>`).join('')}</div>` : `<div class="glass empty-state">${icon('camera')}<h3>暂无照片</h3><p>写一则日记并插入图片，保存后会自动出现在这里。</p></div>`}
      <p class="music-source-note">${category === '日记' ? '已发布日记的插图自动收录。旧版浏览器本地记录仍仅自己可见。' : '示例摄影：Unsplash · 日记插图来自已发布的日记。'}</p></div>`;
  },

  showPhoto(index, keepCollection = false) {
    if (!photos[index]) return;
    if (!keepCollection) {
      this.collection = [...new Set([...$('main').querySelectorAll('[data-photo]')].map(el => Number(el.dataset.photo)))].filter(i => photos[i]);
      if (!this.collection.includes(index)) this.collection = photos.map((photo, i) => i);
    }
    photoIndex = index;
    const photo = photos[index];
    $('lightbox-img').src = this.source(photo);
    $('lightbox-img').alt = photo.title;
    $('lightbox-caption').textContent = `${photo.title} · ${photo.location} · ${photo.date}　 ${this.collection.indexOf(index) + 1} / ${this.collection.length}`;
    $('lightbox-source').hidden = !photo.diaryId;
    if (photo.diaryId) $('lightbox-source').href = '#diary?entry=' + encodeURIComponent(photo.diaryId);
    if (!$('photo-dialog').open) showDialog('photo-dialog');
  },

  stepPhoto(offset) {
    const position = this.collection.indexOf(photoIndex);
    this.showPhoto(this.collection[(position + offset + this.collection.length) % this.collection.length], true);
  },

  updateEditorType() {
    const isDiary = $('entry-type').value === 'diary';
    $('category-field').hidden = isDiary;
    $('diary-image-tools').hidden = !isDiary && !diaryMedia.references($('entry-body').value).length;
  },

  renderPreviews() {
    const unique = [...new Map(diaryMedia.references($('entry-body').value).map(ref => [ref.id, ref])).values()];
    $('diary-image-previews').innerHTML = unique.map(ref => {
      const asset = diaryMedia.assets.get(ref.id);
      if (!asset) return '';
      return `<figure class="diary-image-preview"><img src="${e(asset.src)}" alt="${e(ref.caption || asset.name)}"><figcaption>${e(ref.caption || asset.name)}</figcaption><button type="button" class="icon-button" data-remove-image="${e(ref.id)}" aria-label="移除图片 ${e(ref.caption || asset.name)}">${icon('close')}</button></figure>`;
    }).join('');
  },

  removeImage(id) {
    $('entry-body').value = diaryMedia.remove($('entry-body').value, id);
    this.renderPreviews();
    saveDraft(true);
  },

  async insertImages(files) {
    if (!files.length) return;
    this.uploading = true;
    $('insert-diary-image').disabled = true;
    $('example-diary-images').disabled = true;
    $('editor-form').querySelector('[type="submit"]').disabled = true;
    $('image-upload-status').textContent = '正在保存图片…';
    try {
      const assets = await diaryMedia.importFiles(files);
      const field = $('entry-body');
      const start = field.selectionStart, end = field.selectionEnd;
      const insertion = assets.map(asset => `![${asset.name.replace(/[\[\]\n\r]/g, '').replace(/\.[^.]+$/, '')}](diary-image:${asset.id})`).join('\n\n');
      field.value = field.value.slice(0, start) + (start ? '\n\n' : '') + insertion + '\n\n' + field.value.slice(end);
      const caret = start + (start ? 2 : 0) + insertion.length + 2;
      field.setSelectionRange(caret, caret);
      this.renderPreviews();
      saveDraft(true);
      toast(`已插入 ${assets.length} 张图片，保存日记后会收进「日记」目录。`);
    } catch (error) {
      toast(error.message || '图片未能保存，请稍后重试。');
    } finally {
      this.uploading = false;
      $('insert-diary-image').disabled = false;
      $('example-diary-images').disabled = false;
      $('editor-form').querySelector('[type="submit"]').disabled = false;
      $('image-upload-status').textContent = '保存后自动收进照片墙的「日记」目录';
    }
  },

  initialize() {
    $('entry-type').onchange = () => this.updateEditorType();
    $('editor-form').addEventListener('input', () => this.renderPreviews());
    $('insert-diary-image').onclick = () => $('diary-image-input').click();
    $('diary-image-input').onchange = event => {
      const files = [...event.target.files];
      event.target.value = '';
      this.insertImages(files);
    };
    $('example-diary-images').onclick = async () => {
      $('example-diary-images').disabled = true;
      try {
        const files = await Promise.all([
          ['forest', '秋日森林.jpg'], ['sea', '海边散步.jpg'],
        ].map(async ([asset, name]) => {
          const response = await fetch(`assets/${asset}.jpg`);
          if (!response.ok) throw new Error('示例图片暂时无法读取');
          return new File([await response.blob()], name, { type: 'image/jpeg' });
        }));
        await this.insertImages(files);
      } catch (error) { toast(error.message || '示例图片暂时无法读取'); }
      finally { $('example-diary-images').disabled = false; }
    };
    this.syncGallery();
    route();
    this.ready = diaryMedia.load().then(() => {
      this.syncGallery();
      route();
    }).catch(() => {
      this.syncGallery();
      route();
    });
  },
};
