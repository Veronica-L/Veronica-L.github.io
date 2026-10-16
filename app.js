'use strict';

const paths = {
  leaf:'<path d="M5 19C3 8 10 3 20 4c0 11-6 17-15 15Z"/><path d="m5 19 10-10"/>',
  search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon:'<path d="M20 15.5A8.7 8.7 0 0 1 8.5 4 8.7 8.7 0 1 0 20 15.5Z"/>',
  pen:'<path d="m15 4 5 5M4 20l5-1L20 8a2.5 2.5 0 0 0-5-5L4 14Z"/>',
  arrowRight:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  arrowLeft:'<path d="M20 12H4m6-6-6 6 6 6"/>',
  arrowUpRight:'<path d="M6 18 18 6M6 6h12v12"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  book:'<path d="M12 6C8 3 5 4 3 4v15c3-1 6 0 9 2 3-2 6-3 9-2V4c-3 0-6-1-9 2Zm0 0v15"/>',
  notebook:'<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M3 7h4m-4 5h4m-4 5h4m4-10h5m-5 5h5"/>',
  camera:'<path d="M8 6 10 3h4l2 3h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/>',
  tag:'<path d="m3 3 9 0 9 9-9 9-9-9Z"/><circle cx="7.5" cy="7.5" r="1"/>',
  folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  archive:'<path d="M4 8v13h16V8M3 3h18v5H3Zm6 9h6"/>',
  code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',
  coffee:'<path d="M3 8h13v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Zm13 1h2a3 3 0 0 1 0 6h-2M6 2v3m4-3v3m4-3v3"/>',
  pin:'<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  spark:'<path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7Z"/>',
  play:'<path d="m8 5 11 7-11 7Z"/>',
  pause:'<path d="M7 5h3v14H7Zm7 0h3v14h-3Z"/>',
  prev:'<path d="M5 5v14M19 5 8 12l11 7Z"/>',
  next:'<path d="M19 5v14M5 5l11 7-11 7Z"/>',
  volume:'<path d="m11 4-6 5H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute:'<path d="m11 4-6 5H2v6h3l6 5Zm5 5 5 6m0-6-5 6"/>',
  list:'<path d="M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  music:'<path d="M9 17V5l12-2v12M9 8l12-2"/><ellipse cx="5.5" cy="18" rx="3.5" ry="3"/><ellipse cx="17.5" cy="16" rx="3.5" ry="3"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6"/>',
  cloud:'<path d="M6 19a5 5 0 1 1 .5-10A7 7 0 0 1 20 11a4 4 0 0 1-1 8Z"/>',
  check:'<path d="m5 12 4 4L20 5"/>',
};
const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.leaf}</svg>`;
function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
const escapeHTML=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e=escapeHTML;
const $=(id)=>document.getElementById(id);
const initialPosts=[
  {id:'slow-days',title:'十月日常记录',date:'2026-10-14',category:'生活随笔',tags:['慢生活','日常','随想'],image:'lake',excerpt:'记录这个月的散步、咖啡和周末安排。',body:'# 十月日常记录\n\n以前总觉得，日子应该被填得满满当当。待办清单打满勾，才算认真度过一天。\n\n后来才发现，那些真正留在记忆里的时刻，往往什么也没完成。比如一个人坐在湖边，看云从山的这一头走到另一头。\n\n## 给生活留一点空白\n\n这个周末，我没有安排目的地。带上相机，沿着一条不认识的小路一直走。树影落在肩上，风里有草木的味道。\n\n走累了就坐下来。没有看手机，也没有着急去下一个地方。那一刻突然觉得，慢下来并不是浪费时间，而是终于有时间看见生活。\n\n## 一些小小的练习\n\n- 早起十分钟，认真吃一顿早餐。\n- 散步时收起耳机，听听周围的声音。\n- 每天写三句话，记录一个值得记住的瞬间。\n\n不必每一天都精彩。但每一天，都可以有值得收藏的小事。\n\n愿我们都能在忙碌的缝隙里，找到属于自己的一隅。'},
  {id:'my-digital-garden',title:'个人博客的结构与设计',date:'2026-10-10',category:'技术手记',tags:['个人博客','设计','灵感'],image:'path',excerpt:'整理个人博客的页面结构、内容分类，以及标签和归档的设计。',body:'# 个人博客的结构与设计\n\n我想要一个地方，能安放那些还没有完全想明白的念头。它可以不完美，但必须属于自己。\n\n## 从一篇记录开始\n\n博客像一座花园。文章是树，日记是新长出的叶子，照片是落在枝头的光。分类和标签则是穿过花园的小径。\n\n好的分类不需要复杂。按内容的方向分几组，再让标签连接那些跨越分类的想法。比如一篇旅行记录，既可以标记「摄影」，也可以标记「慢生活」。\n\n## 把记录变成习惯\n\n先记下来，再慢慢整理。比起一次搭出完美的网站，更有价值的是每隔几天回来，添一点新的内容。\n\n这个小小的空间，会随着生活一起生长。'},
  {id:'mountain-weekend',title:'十月假期：山间徒步记录',date:'2026-10-06',category:'旅行见闻',tags:['旅行','摄影','自然'],image:'mountain',excerpt:'十月假期的徒步路线、湖边照片和出行记录。',body:'# 十月假期：山间徒步记录\n\n清晨出发的时候，城里还没有完全醒来。车窗外的楼房渐渐变成田野，山一点一点靠近。\n\n## 去听一座山的声音\n\n山里很安静，但安静不是没有声音。树叶会响，溪水会转弯，远处偶尔传来一声鸟鸣。\n\n沿着湖边走了一段，云从山脊上慢慢铺下来。我举起相机，然后又放下。眼前的风景，更适合先用眼睛记住。\n\n## 带回来一点什么\n\n没有买纪念品，只拍了几张照片，在本子上写下一句：去过的地方，会成为你的一部分。\n\n等下次疲惫的时候，再翻开这一页。'},
  {id:'coffee-morning',title:'手冲咖啡的日常记录',date:'2026-09-26',category:'生活随笔',tags:['咖啡','日常','慢生活'],image:'coffee',excerpt:'记录最近尝试的手冲方法和日常咖啡习惯。',body:'# 手冲咖啡的日常记录\n\n最近迷上了自己冲咖啡。并不追求多么专业，只是喜欢等待热水穿过咖啡粉的那几分钟。\n\n## 给清晨一个仪式\n\n烧水，磨豆，打开窗。一连串细小的动作，让刚刚醒来的思绪有了落点。\n\n窗外的光慢慢挪到桌角。今天还有很多事要做，但眼前这一刻，只属于一杯咖啡。'},
  {id:'design-notes',title:'博客界面设计笔记',date:'2026-09-12',category:'技术手记',tags:['设计','灵感','个人博客'],image:'forest',excerpt:'关于字体、页面间距、配色和内容层级的设计笔记。',body:'# 博客界面设计笔记\n\n尝试为自己的博客选择一种视觉语言。我喜欢透明的层次，喜欢自然的颜色，也喜欢文字有足够的空间。\n\n## 界面也有呼吸的节奏\n\n毛玻璃的意义，不只是模糊的背景。它让内容浮在风景之上，同时保留与环境的联系。\n\n标题、正文、日期和标签，各有各的位置与音量。无需让每一处都引人注目，读者自然会知道该看哪里。\n\n我希望这个博客像一扇半开的窗，有风景，也有自己的温度。'},
  {id:'sea-letter',title:'海边旅行记录',date:'2026-08-22',category:'旅行见闻',tags:['旅行','摄影','随想'],image:'sea',excerpt:'整理这次海边旅行的照片与行程。',body:'# 海边旅行记录\n\n在海边坐到天黑。没有等日落，也没有拍到特别的照片，只是看着潮水来了又走。\n\n## 关于远方\n\n有时候想去远方，其实不是因为远方有什么。而是想暂时离开熟悉的生活，从另一个角度看看自己。\n\n风把头发吹得很乱，鞋里进了沙。但没关系，那是属于今天的证据。\n\n把这封没有地址的信留在这里。等某一天，再读给自己听。'},
];
const initialDiaries=[
  {id:'d1',title:'平凡的一天，也值得被记住',date:'2026-10-15',mood:'心情晴朗',body:'傍晚散步的时候，发现街角的桂花开了。\n原来秋天真的有自己的香气。\n\n绕了远路回家，顺便买了一束小雏菊。今天没有发生什么大事，但这样就很好。'},
  {id:'d2',title:'给自己一个不赶时间的周末',date:'2026-10-11',mood:'好好休息',image:'coffee',body:'睡到自然醒，做一顿慢吞吞的早餐。\n翻了几页放在床头很久的书，阳光刚好落在字里行间。\n\n想起一句话：生活不是日程表上的任务，而是那些你愿意停留的瞬间。'},
  {id:'d3',title:'下过雨的森林',date:'2026-09-28',mood:'被自然治愈',image:'path',body:'雨停后，沿着林间小路走了一会儿。\n空气很清凉，鞋底沾了一点泥。树叶上的水滴还没落下来，世界像被重新洗过。\n\n拍了几张照片，又删掉几张。有些感觉，好像只能留在心里。'},
];
function readLocal(key,fallback){try{const value=JSON.parse(localStorage.getItem(key));return Array.isArray(value)?value:fallback;}catch{return fallback;}}
let posts=[...readLocal('yiyu-posts',[]),...initialPosts];
let diaries=[...readLocal('yiyu-diaries',[]),...initialDiaries];
const photos=[
  {image:'lake',title:'山色落进湖里',location:'山间来信',date:'2026.10',category:'山野'},
  {image:'coffee',title:'把清晨泡进咖啡',location:'日常碎片',date:'2026.09',category:'日常'},
  {image:'path',title:'走进一片绿色',location:'森林漫游',date:'2026.09',category:'山野'},
  {image:'sea',title:'风从海上来',location:'海边散步',date:'2026.08',category:'海边'},
  {image:'mountain',title:'去没有天花板的地方',location:'山野之间',date:'2026.10',category:'山野'},
  {image:'forest',title:'光落下的地方',location:'林间小路',date:'2026.09',category:'山野'},
];
const tracks=[
  {title:'林间来信',subtitle:'森林和弦 · 原创氛围音',file:'assets/forest-letter.wav',duration:'00:32'},
  {title:'晚风轻轻',subtitle:'柔和泛音 · 原创氛围音',file:'assets/evening-breeze.wav',duration:'00:32'},
  {title:'日落之后',subtitle:'缓慢和弦 · 原创氛围音',file:'assets/after-sunset.wav',duration:'00:32'},
];
const categories=['生活随笔','技术手记','旅行见闻'];
const categoryIcons={'生活随笔':'coffee','技术手记':'code','旅行见闻':'compass'};
const tags=()=>[...new Set(posts.flatMap(p=>p.tags||[]))];
const tagCount=t=>posts.filter(p=>(p.tags||[]).includes(t)).length;
const catCount=c=>posts.filter(p=>p.category===c).length;
const dateDisplay=d=>d.replaceAll('-','.');
const readMinutes=p=>Math.max(1,Math.ceil(p.body.length/400));
const sortNewest=items=>[...items].sort((a,b)=>b.date.localeCompare(a.date));
const blogLink=(key,value)=>`#blog?${key}=${encodeURIComponent(value)}`;
const renderTags=p=>`<div class="tag-row">${(p.tags||[]).map(t=>`<a href="${blogLink('tag',t)}"># ${e(t)}</a>`).join('')}</div>`;
function articleCard(p,featured=false){return `<article class="${featured?'featured-article':'article-card'} glass keyboard-card" tabindex="0" role="button" aria-label="阅读 ${e(p.title)}" data-post="${e(p.id)}"><div class="cover-wrap"><img class="${featured?'featured-cover':'card-image'}" src="${postCover(p)}" alt="${e(p.title)}的配图" ${featured?'':'loading="lazy"'}>${featured?`<span class="feature-pill">${icon('pin')} 置顶文章</span><span class="cover-caption">FEATURED ARTICLE</span>`:''}</div><div class="article-body"><div class="article-meta"><a class="category" href="${blogLink('category',p.category)}">${e(p.category)}</a><span class="meta-dot">·</span><time datetime="${e(p.date)}">${dateDisplay(p.date)}</time>${featured?`<span class="meta-dot">·</span><span>${readMinutes(p)} 分钟阅读</span>`:''}</div><h3>${e(p.title)}</h3><p class="article-excerpt">${e(p.excerpt)}</p><div class="article-bottom">${renderTags(p)}<span class="read-more">${featured?'继续阅读 ':''}${icon('arrowUpRight')}</span></div></div></article>`;}
function sectionHeading(title,ic,href,label='查看全部'){return `<div class="section-heading"><h3>${icon(ic)}${title}</h3>${href?`<a href="${href}">${label}${icon('chevron')}</a>`:''}</div>`;}
function categoryCard(){return `<section class="glass small-card">${sectionHeading('文章分类','folder','#explore?tab=categories','')}<div class="category-list">${categories.map(c=>`<a class="category-row" href="${blogLink('category',c)}"><span>${icon(categoryIcons[c])}${c}</span><b>${String(catCount(c)).padStart(2,'0')}</b></a>`).join('')}</div></section>`;}
function tagsCard(){return `<section class="glass small-card">${sectionHeading('标签','tag','#explore?tab=tags','全部')}<div class="tags-cloud">${tags().slice(0,10).map(t=>`<a class="cloud-tag" href="${blogLink('tag',t)}">${e(t)}<span>${tagCount(t)}</span></a>`).join('')}</div></section>`;}
function archiveCard(){const months=[...new Set(sortNewest(posts).map(p=>p.date.slice(0,7)))];return `<section class="glass small-card">${sectionHeading('归档','archive','#explore?tab=archives','全部')}<div class="archive-rows">${months.slice(0,4).map(m=>`<a class="archive-row" href="${blogLink('month',m)}"><span>${m.slice(0,4)} <small>/</small> ${m.slice(5)} 月</span><span>${String(posts.filter(p=>p.date.startsWith(m)).length).padStart(2,'0')}</span></a>`).join('')}</div></section>`;}
function profileCard(){return `<section class="glass profile-card"><div class="avatar"><div class="avatar-inner"><span aria-hidden="true">K</span></div></div><h2 class="profile-name">内容概览</h2><p class="intro">个人博客</p><div class="profile-stats"><a href="#blog"><b>${posts.length}</b><span>篇文章</span></a><a href="#diary"><b>${diaries.length}</b><span>则日记</span></a><a href="#photos"><b>${photos.length}</b><span>张照片</span></a></div><div class="profile-foot"><a href="#explore">${icon('compass')}分类与标签</a><a href="#music">${icon('music')}云音乐</a></div></section>`;}
function homeView(){return artHome.render();}
function pageTop(eyebrow,title,subtitle,extra=''){return `<header class="page-top"><div><div class="page-eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>${extra}</header>`;}
function blogView(params){const category=params.get('category'),tag=params.get('tag'),month=params.get('month');let list=sortNewest(posts);if(category)list=list.filter(p=>p.category===category);if(tag)list=list.filter(p=>p.tags.includes(tag));if(month)list=list.filter(p=>p.date.startsWith(month));let activeFilters=[category,tag?`# ${tag}`:null,month?`${month.replace('-',' 年 ')} 月`:null].filter(Boolean);return `<div class="page-enter">${pageTop('ARTICLES','文章','按分类、标签或日期浏览文章。',`<span class="page-counter">共 ${posts.length} 篇文章</span>`)}<div class="page-layout"><aside class="side-stack">${profileCard()}${tagsCard()}${archiveCard()}</aside><div class="page-feed"><nav class="filter-bar glass" aria-label="文章分类筛选"><a class="filter-chip ${!category?'active':''}" href="#blog">全部文章 <small>${posts.length}</small></a>${categories.map(c=>`<a class="filter-chip ${category===c?'active':''}" href="${blogLink('category',c)}">${c} <small>${catCount(c)}</small></a>`).join('')}</nav>${activeFilters.length?`<div class="filter-description">正在浏览：${activeFilters.map(e).join(' · ')}<span>（${list.length} 篇）</span><a href="#blog" class="filter-chip">清除筛选 ×</a></div>`:''}${list.length?`<div class="article-grid blog-grid">${list.map(p=>articleCard(p)).join('')}</div>`:`<div class="glass empty-state">${icon('book')}<h3>没有符合条件的文章</h3><p>更换筛选条件，或新建文章。</p></div>`}</div></div></div>`;}
function diaryView(params=new URLSearchParams()){return diaryUI.diaryView(params);}
function photosView(params){return diaryUI.photosView(params);}
function musicView(){let saved='';try{saved=localStorage.getItem('yiyu-cloud-playlist')||'';}catch{}return `<div class="page-enter">${pageTop('MUSIC','云音乐','本地音频试听与歌单管理。')}<div class="music-layout"><section class="glass album-card"><div class="album-art"><h2>MUSIC<br>LIBRARY<span>LOCAL COLLECTION / 01</span></h2></div><h2>我的歌单</h2><p>支持本地音频导入、播放与切换。</p><div class="album-actions"><button class="primary-button" data-action="play-all">${icon('play')} 从头播放</button><button class="secondary-button" id="import-audio">${icon('upload')}<span>导入音乐</span></button><input type="file" id="audio-file" accept="audio/*" multiple hidden></div><div class="music-source-note">原型内置 3 段原创合成氛围音，可实际试听。</div></section><div><section class="glass playlist-card"><div class="section-heading"><h2>${icon('music')}我的日常歌单</h2><span class="tiny-label">LOCAL SESSION</span></div><p class="playlist-caption">${tracks.length} 段声音 · 在页面切换时继续播放</p><div class="track-head"><span>#</span><span>曲目</span><span class="track-kind">声音来源</span><span>时长</span></div><div id="track-list">${trackList()}</div></section><section class="glass music-note"><h3>${icon('cloud')} 网易云音乐 · 歌单链接</h3><p>粘贴并保存网易云歌单链接。当前原型试听使用本地音频；网易云歌单同步与歌曲播放将在正式版接入。</p><form class="cloud-form" id="cloud-form"><label class="sr-only" for="cloud-url">网易云歌单链接</label><input type="url" id="cloud-url" placeholder="https://music.163.com/playlist?id=…" value="${e(saved)}" required><button class="secondary-button" type="submit">保存链接</button></form>${saved?`<a class="saved-link" href="${e(saved)}" target="_blank" rel="noopener noreferrer">在网易云打开已保存的歌单 ${icon('arrowUpRight')}</a>`:''}</section></div></div></div>`;}
function exploreView(params){const tab=params.get('tab')||'tags';return `<div class="page-enter">${pageTop('INDEX','分类、标签与归档','按分类、标签或时间查找文章。')}<nav class="explore-tabs">${[['tags','标签','tag'],['categories','文章分类','folder'],['archives','归档','archive']].map(([t,label,ic])=>`<a href="#explore?tab=${t}" class="filter-chip ${tab===t?'active':''}">${icon(ic)} ${label}</a>`).join('')}</nav><section class="glass explore-panel">${tab==='categories'?`<h2 class="explore-summary">文章分类</h2><div class="explore-categories">${categories.map(c=>`<a class="explore-category" href="${blogLink('category',c)}">${icon(categoryIcons[c])}<h3>${c}</h3><span>${catCount(c)} 篇文字 · 点击探索 ${icon('arrowUpRight')}</span></a>`).join('')}</div>`:tab==='archives'?archiveTimeline():`<h2 class="explore-summary">${tags().length} 个标签</h2><div class="tags-cloud">${tags().map(t=>`<a class="cloud-tag" href="${blogLink('tag',t)}"># ${e(t)}<span>${tagCount(t)} 篇</span></a>`).join('')}</div><p class="music-source-note">一篇文章可以属于多个标签。点击标签，发现关联的记录。</p>`}</section></div>`;}
function archiveTimeline(){let year='',month='';return sortNewest(posts).map(p=>{let h='';if(p.date.slice(0,4)!==year){year=p.date.slice(0,4);h+=`<div class="archive-year"><b>${year}</b><span>${posts.filter(x=>x.date.startsWith(year)).length} 篇文章</span></div>`;}if(p.date.slice(0,7)!==month){month=p.date.slice(0,7);h+=`<div class="archive-month">${Number(p.date.slice(5,7))} 月</div>`;}return h+`<button class="archive-item" data-post="${e(p.id)}"><time datetime="${e(p.date)}">${p.date.slice(5).replace('-','.')}</time><span>${e(p.title)}</span><small>${e(p.category)}</small>${icon('arrowUpRight')}</button>`;}).join('');}
function route(){const [raw,query='']=(location.hash.slice(1)||'home').split('?');const page=['home','blog','diary','photos','music','explore'].includes(raw)?raw:'home';const params=new URLSearchParams(query);const view={home:homeView,blog:blogView,diary:diaryView,photos:photosView,music:musicView,explore:exploreView};$('main').innerHTML=view[page](params);document.querySelectorAll('[data-page]').forEach(a=>{a.classList.toggle('active',a.dataset.page===page);if(a.dataset.page===page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});document.title=`${{home:'首页',blog:'文章',diary:'日记',photos:'照片墙',music:'云音乐',explore:'分类归档'}[page]} · Kiki's Blog`;hydrateIcons($('main'));bindPage(page);if(page==='diary'&&params.get('entry'))requestAnimationFrame(()=>document.getElementById('diary-'+params.get('entry'))?.scrollIntoView({block:'center'}));}
function markdown(text){return e(text).split(/\n\s*\n/).map(block=>{if(block.startsWith('# '))return '';if(block.startsWith('## '))return `<h2>${block.slice(3)}</h2>`;if(block.startsWith('### '))return `<h3>${block.slice(4)}</h3>`;if(block.split('\n').every(l=>l.startsWith('- ')))return `<ul>${block.split('\n').map(l=>`<li>${l.slice(2)}</li>`).join('')}</ul>`;return `<p>${block}</p>`;}).join('');}
function articleBody(post){return diaryMedia.parts(post.body).map(part=>{if(part.text!==undefined)return markdown(part.text);const media=diaryMedia.assets.get(part.id);return media?`<figure><img src="${e(media.src)}" alt="${e(part.caption)}" loading="lazy"><figcaption>${e(part.caption)}</figcaption></figure>`:'<p>图片暂时无法读取。</p>';}).join('');}
function openArticle(id){const p=posts.find(p=>p.id===id);if(!p)return;$('article-content').innerHTML=`<img class="detail-cover" src="${postCover(p)}" alt="${e(p.title)}的配图"><div class="detail-body"><div class="article-meta"><span class="category">${e(p.category)}</span><span>·</span><time datetime="${e(p.date)}">${dateDisplay(p.date)}</time><span>·</span><span>${readMinutes(p)} 分钟阅读</span></div><h1>${e(p.title)}</h1><div class="detail-prose">${articleBody(p)}</div><div class="detail-bottom">${renderTags(p)}<span>${p.published?'已发布':initialPosts.some(s=>s.id===p.id)?'示例文章':'仅保存在此浏览器'}</span></div></div>`;showDialog('article-dialog');$('article-dialog').scrollTop=0;}
let photoIndex=0;
function showPhoto(i,keepCollection=false){diaryUI.showPhoto(i,keepCollection);}
function showDialog(id){const dialog=$(id);if(!dialog.open)dialog.showModal();document.body.style.overflow='hidden';}
function closeDialog(id){$(id).close();if(!document.querySelector('dialog[open]'))document.body.style.overflow='';}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),3600);}
function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('浏览器未能保存内容，请复制文字备份后重试。');return false;}}
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
async function openEditor(type='blog'){if(window.KIKI_SITE){location.href='admin/?type='+encodeURIComponent(type);return;}await diaryUI.ready;let draft=null;try{draft=JSON.parse(localStorage.getItem('yiyu-draft'));}catch{}$('entry-type').value=draft?.type||type;$('entry-date').value=draft?.date||today();$('entry-title').value=draft?.title||'';$('entry-body').value=draft?.body||'';$('entry-tags').value=draft?.tags||'';$('entry-category').value=draft?.category||'生活随笔';diaryUI.updateEditorType();diaryUI.renderPreviews();$('draft-status').textContent=draft?'已恢复上次保存的草稿':'内容仅保存在当前浏览器';showDialog('editor-dialog');}
function draftData(){return {type:$('entry-type').value,date:$('entry-date').value,title:$('entry-title').value,body:$('entry-body').value,tags:$('entry-tags').value,category:$('entry-category').value};}
function saveDraft(quiet=false){if(persist('yiyu-draft',draftData())){$('draft-status').textContent='草稿已保存到当前浏览器';if(!quiet)toast('草稿已保存，下次打开可以继续写。');}}
function bindPage(page){if(page==='music'){$('import-audio').onclick=()=>$('audio-file').click();$('audio-file').onchange=event=>{const files=[...event.target.files].filter(f=>f.type.startsWith('audio/'));if(!files.length)return;files.forEach(file=>tracks.push({title:file.name.replace(/\.[^.]+$/,''),subtitle:'你导入的本地音乐',file:URL.createObjectURL(file),duration:'—',local:true}));route();toast(`已加入 ${files.length} 首本地音乐，仅在本次打开期间有效。`);};$('cloud-form').onsubmit=event=>{event.preventDefault();let url;try{url=new URL($('cloud-url').value.trim());}catch{toast('请输入有效的网易云歌单链接。');return;}if(url.protocol!=='https:'||!['music.163.com','y.music.163.com'].includes(url.hostname)){toast('请粘贴 music.163.com 的 HTTPS 歌单链接。');return;}try{localStorage.setItem('yiyu-cloud-playlist',url.href);route();toast('歌单链接已保存；歌曲同步将在正式版接入。');}catch{toast('浏览器无法保存歌单链接。');}};}}
let trackIndex=0;
const audio=$('audio');
function trackList(){return tracks.map((t,i)=>`<button class="track-row ${i===trackIndex?'current':''}" data-track="${i}" aria-label="播放 ${e(t.title)}"><span class="track-number">${i===trackIndex&&!audio.paused?icon('music'):String(i+1).padStart(2,'0')}</span><span class="track-title">${e(t.title)}<small>${e(t.subtitle)}</small></span><span class="track-kind">${t.local?'本地导入':'原型试听'}</span><span class="track-duration">${t.duration}</span></button>`).join('');}
function updatePlayUI(){const playing=!audio.paused;$('play-toggle').innerHTML=icon(playing?'pause':'play');$('play-toggle').setAttribute('aria-label',playing?'暂停':'播放');document.querySelector('.mini-player').classList.toggle('playing',playing);$('player-title').textContent=tracks[trackIndex].title;$('player-subtitle').textContent=tracks[trackIndex].subtitle;if($('track-list'))$('track-list').innerHTML=trackList();}
async function playTrack(index,shouldPlay=true){trackIndex=(index+tracks.length)%tracks.length;audio.src=tracks[trackIndex].file;updatePlayUI();if(shouldPlay)await safePlay();}
async function safePlay(){try{await audio.play();}catch(error){if(error.name==='AbortError')return;toast('暂时无法播放这段音频，请重试或导入本地音乐。');updatePlayUI();}}
function togglePlay(){if(audio.paused)safePlay();else audio.pause();}
const timeLabel=seconds=>{if(!Number.isFinite(seconds))return '00:00';return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;};
audio.volume=.35;
audio.addEventListener('play',updatePlayUI);audio.addEventListener('pause',updatePlayUI);
audio.addEventListener('ended',()=>playTrack(trackIndex+1));
audio.addEventListener('timeupdate',()=>{$('seek').value=audio.duration?audio.currentTime/audio.duration*100:0;$('player-time').textContent=`${timeLabel(audio.currentTime)} / ${timeLabel(audio.duration)}`;});
audio.addEventListener('loadedmetadata',()=>{$('player-time').textContent=`00:00 / ${timeLabel(audio.duration)}`;});
$('play-toggle').onclick=togglePlay;$('prev-track').onclick=()=>playTrack(trackIndex-1);$('next-track').onclick=()=>playTrack(trackIndex+1);
$('seek').oninput=()=>{if(Number.isFinite(audio.duration))audio.currentTime=Number($('seek').value)/100*audio.duration;};
$('mute-toggle').onclick=()=>{audio.muted=!audio.muted;$('mute-toggle').innerHTML=icon(audio.muted?'mute':'volume');$('mute-toggle').setAttribute('aria-label',audio.muted?'取消静音':'静音');};
$('playlist-open').onclick=$('player-cover').onclick=()=>location.hash='music';
$('write-open').onclick=()=>openEditor();
$('save-draft').onclick=()=>saveDraft();
$('entry-type').onchange=()=>{$('category-field').hidden=$('entry-type').value==='diary';};
let draftTimer;
$('editor-form').addEventListener('input',()=>{clearTimeout(draftTimer);draftTimer=setTimeout(()=>saveDraft(true),1200);});
$('editor-form').onsubmit=event=>{event.preventDefault();clearTimeout(draftTimer);if(diaryUI.uploading){toast('图片正在保存，请稍等片刻。');return;}const draft=draftData();if(draft.type!=='diary'&&diaryMedia.references(draft.body).length){toast('这段内容包含日记插图，请选择「日记」类型保存。');return;}const title=draft.title.trim(),body=draft.body.trim();if(!title||!body){toast('写下标题和正文，再保存这段记录。');return;}const id=`local-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;const base={id,title,body,date:draft.date};if(draft.type==='diary'){const entry={...base,mood:'留住当下',images:diaryMedia.references(body).map(ref=>ref.id)};const saved=[entry,...readLocal('yiyu-diaries',[])];if(!persist('yiyu-diaries',saved))return;diaries=[entry,...diaries];}else{const newTags=[...new Set(draft.tags.split(/[,，、]/).map(s=>s.trim()).filter(Boolean))].slice(0,8);const post={...base,category:draft.category,tags:newTags,image:'forest',excerpt:body.replace(/^#+\s*/gm,'').slice(0,95)};const saved=[post,...readLocal('yiyu-posts',[])];if(!persist('yiyu-posts',saved))return;posts=[post,...posts];}try{localStorage.removeItem('yiyu-draft');}catch{}diaryUI.syncGallery();closeDialog('editor-dialog');const target=draft.type==='diary'?'diary':'blog';if(location.hash===`#${target}`)route();else location.hash=target;toast('已保存到当前浏览器。你的新记录出现了。');};
$('article-close').onclick=()=>closeDialog('article-dialog');$('photo-close').onclick=()=>closeDialog('photo-dialog');$('photo-prev').onclick=()=>diaryUI.stepPhoto(-1);$('photo-next').onclick=()=>diaryUI.stepPhoto(1);
document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.style.overflow='';});dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog(dialog.id);}});});
function renderSearch(){const query=$('search-input').value.trim().toLocaleLowerCase();if(!query){$('search-results').innerHTML=`<p class="playlist-caption" style="padding:18px 5px 0">输入关键词搜索标题、正文或标签。</p>`;return;}const hits=[...posts.map(p=>({...p,kind:'文章'})),...diaries.map(d=>({...d,kind:'日记'}))].filter(p=>[p.title,p.body,p.category,...(p.tags||[])].join(' ').toLocaleLowerCase().includes(query));$('search-results').innerHTML=hits.length?hits.map(p=>`<button class="search-result" ${p.kind==='文章'?`data-search-post="${e(p.id)}"`:'data-search-diary="true"'}><strong>${e(p.title)}</strong><span>${p.kind} · ${dateDisplay(p.date)}${p.category?` · ${e(p.category)}`:''}</span></button>`).join(''):`<div class="empty-state"><h3>没有找到匹配内容</h3><p>请尝试其他关键词。</p></div>`;}
function openSearch(){showDialog('search-dialog');$('search-input').value='';renderSearch();$('search-input').focus();}
$('search-open').onclick=openSearch;$('search-input').oninput=renderSearch;
$('theme-toggle').onclick=()=>{const dark=document.documentElement.classList.toggle('dark');$('theme-toggle').innerHTML=icon(dark?'sun':'moon');$('theme-toggle').setAttribute('aria-label',dark?'切换浅色主题':'切换深色主题');try{localStorage.setItem('yiyu-theme',dark?'dark':'light');}catch{}};
document.addEventListener('click',event=>{const target=event.target.closest('a,button,[data-post]');if(!target)return;if(target.matches('a')&&target.hash.startsWith('#blog')&&$('article-dialog').open)closeDialog('article-dialog');if(target.matches('a')&&target.hash.startsWith('#diary')&&$('photo-dialog').open)closeDialog('photo-dialog');if(target.dataset.removeImage)diaryUI.removeImage(target.dataset.removeImage);if(target.dataset.post)openArticle(target.dataset.post);if(target.dataset.photo!==undefined)showPhoto(Number(target.dataset.photo));if(target.dataset.track!==undefined)playTrack(Number(target.dataset.track));if(target.dataset.action==='write-diary')openEditor('diary');if(target.dataset.action==='play-all')playTrack(0);if(target.dataset.searchPost){closeDialog('search-dialog');openArticle(target.dataset.searchPost);}if(target.dataset.searchDiary){closeDialog('search-dialog');location.hash='diary';}});
document.addEventListener('keydown',event=>{if(event.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();openSearch();}if($('photo-dialog').open){if(event.key==='ArrowLeft')diaryUI.stepPhoto(-1);if(event.key==='ArrowRight')diaryUI.stepPhoto(1);}if((event.key==='Enter'||event.key===' ')&&event.target.matches('article[data-post]')){event.preventDefault();openArticle(event.target.dataset.post);}});
window.addEventListener('hashchange',()=>{route();window.scrollTo({top:0,behavior:'instant'});});
try{if(localStorage.getItem('yiyu-theme')==='dark'){document.documentElement.classList.add('dark');$('theme-toggle').dataset.icon='sun';$('theme-toggle').setAttribute('aria-label','切换浅色主题');}}catch{}
hydrateIcons();route();

diaryUI.initialize();
