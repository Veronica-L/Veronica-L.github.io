'use strict';

function postCover(post) {
  if (post.media?.[0]?.src) return e(post.media[0].src);
  const covers = {
    'slow-days': 'reference-collage',
    'my-digital-garden': 'reference-abstract',
    'mountain-weekend': 'reference-birds',
    'coffee-morning': 'reference-vinyl',
    'design-notes': 'reference-flowers',
    'sea-letter': 'sea',
  };
  return `assets/${covers[post.id] || post.image || 'reference-flowers'}.jpg`;
}

function viewCounter(post) {
  if (!post.published && !initialPosts.some(sample => sample.id === post.id)) return '';
  return `<div class="view-count">浏览量 <span data-view-target="article:${e(post.id)}" aria-live="polite">—</span></div>`;
}

const artHome = {
  render() {
    const lead = sortNewest(posts.filter(post => post.published))[0] || posts.find(post => post.id === 'slow-days');
    const diary = sortNewest(diaries)[0];
    const recent = sortNewest(posts.filter(post => post.id !== lead.id)).slice(0, 2);
    return `<div class="page-enter art-home">
      <header class="home-masthead">
        <div class="masthead-index"><span>PERSONAL WEBSITE</span><span>01 / INDEX</span></div>
        <div class="masthead-title"><h1>Kiki's Blog<span class="title-period">.</span></h1><div class="masthead-meta"><span>文章 / 日记 / 照片 / 音乐</span><span>EST. 2026</span></div></div>
      </header>
      <section class="cover-grid" aria-label="首页精选">
        <article class="lead-story keyboard-card" role="button" tabindex="0" data-post="${e(lead.id)}" aria-label="阅读 ${e(lead.title)}">
          <div class="lead-image"><img src="${postCover(lead)}" alt="海浪、地图与色块的复古拼贴"><span class="cover-stamp">SELECTED<br><b>01</b></span><span class="cover-caption">ARTICLE / ${dateDisplay(lead.date)}</span></div>
          <div class="lead-copy"><div class="article-meta"><span class="category">置顶文章 / ${e(lead.category)}</span><time datetime="${lead.date}">${dateDisplay(lead.date)}</time></div><h2>${e(lead.title)}</h2><div class="lead-bottom">${renderTags(lead)}<span class="lead-read">阅读文章 ${icon('arrowUpRight')}</span></div>${viewCounter(lead)}</div>
        </article>
        <div class="cover-side">
          <section class="cover-diary"><div class="section-heading"><h2>${icon('notebook')}最近日记</h2><a href="#diary">全部 ${icon('arrowUpRight')}</a></div><div class="cover-date"><b>${diary.date.slice(8)}</b><span>${diary.date.slice(0, 4)} / ${diary.date.slice(5, 7)}</span><span class="diary-number">DIARY / 01</span></div><p>${e(diaryMedia.text(diary.body).split('\n\n')[0] || '这篇日记包含图片。')}</p><a href="#diary" class="cover-diary-link">查看日记 ${icon('arrowRight')}</a></section>
          <a class="cover-music" href="#music" aria-label="打开云音乐"><img src="assets/reference-vinyl.jpg" alt="复古唱片与微缩人物"><span class="music-card-label">NOW IN ROTATION</span><span class="music-card-bottom"><span><small>03 TRACKS / LOCAL</small><strong>云音乐</strong></span><span class="music-card-arrow">${icon('arrowUpRight')}</span></span></a>
        </div>
      </section>
      <div class="home-grid">
        <aside class="side-stack home-left">${profileCard()}${categoryCard()}<figure class="paper-art"><img src="assets/reference-abstract.jpg" alt="抽象色块与手绘线条"><figcaption>VISUAL NOTES <span>01—05</span></figcaption></figure></aside>
        <section class="home-feed"><div class="feed-heading"><h2><span class="section-number">01</span>最新文章</h2><a href="#blog">全部文章 ${icon('arrowUpRight')}</a></div><div class="article-grid">${recent.map(post => articleCard(post)).join('')}</div><a class="more-writing" href="#blog">查看全部 ${posts.length} 篇文章 ${icon('arrowRight')}</a><section class="little-gallery"><div class="feed-heading"><h2><span class="section-number">02</span>照片墙</h2><a href="#photos">全部照片 ${icon('arrowUpRight')}</a></div><div class="gallery-strip">${[photos[2], photos[3], photos[1]].map(photo => `<button data-photo="${photos.indexOf(photo)}" aria-label="查看照片 ${e(photo.title)}"><img src="${e(diaryUI.source(photo))}" alt="${e(photo.title)}" loading="lazy"></button>`).join('')}</div></section></section>
        <aside class="side-stack home-right">${tagsCard()}${archiveCard()}<a class="diary-directory-link" href="#photos?category=${encodeURIComponent('日记')}">${icon('folder')}<span>日记相册<small>日记插图自动收录</small></span>${icon('arrowUpRight')}</a></aside>
      </div>
    </div>`;
  },
};
