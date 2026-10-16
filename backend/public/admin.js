'use strict';
const $ = id => document.getElementById(id);
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let entries = [], active = null, dirty = false, busy = false, statusTimer, statusGeneration = 0;
function notice(text) { $('notice').textContent = text; $('notice').hidden = false; clearTimeout(notice.timer); notice.timer = setTimeout(() => $('notice').hidden = true, 8000); }
async function api(path, method = 'GET', data, image = false) {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: { 'X-Kiki-Request': '1', ...(data ? { 'Content-Type': image ? 'image/jpeg' : 'application/json' } : {}) }, ...(data ? { body: image ? data : JSON.stringify(data) } : {}) });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) { $('login-panel').hidden = false; $('logout').hidden = true; $('show-analytics').hidden = true; $('analytics-panel').hidden = true; $('analytics-records').innerHTML = ''; $('login-status').textContent = '请登录后继续。编辑器中的文字仍保留在页面中，可先导出备份。'; }
    throw new Error(result.error || '操作未完成，请重试。');
  }
  return result;
}
function formData() { return { type: $('type').value, title: $('title').value, body: $('body').value, date: $('date').value, category: $('category').value, tags: $('tags').value.split(/[,，、]/).map(s => s.trim()).filter(Boolean), ...(active ? { revision: active.revision } : {}) }; }
function stateLabel(entry) { return entry.deletedAt ? '已在回收站' : entry.publishedRevision == null ? '未发布草稿' : entry.publishedRevision === entry.revision ? '已提交发布' : '有未发布修改'; }
function renderList() {
  const filter = $('entry-filter').value;
  const list = entries.filter(entry => filter === 'trash' ? Boolean(entry.deletedAt) : !entry.deletedAt && (filter === 'all' || entry.type === filter || (filter === 'draft' && entry.publishedRevision == null)));
  $('entry-list').innerHTML = list.length ? list.map(entry => `<button class="entry-item ${entry.id === active?.id ? 'active' : ''}" data-id="${entry.id}"><strong>${escape(entry.title)}</strong><small>${entry.type === 'diary' ? '日记' : '文章'} · ${escape(entry.date)} · ${stateLabel(entry)}</small></button>`).join('') : `<p class="muted">${filter === 'trash' ? '回收站为空。' : '暂无内容。新建一篇开始写作。'}</p>`;
}
function setEditorMode() {
  const trashed = Boolean(active?.deletedAt);
  for (const id of ['type', 'date', 'title', 'body', 'category', 'tags', 'insert-image']) $(id).disabled = trashed;
  $('image-list').querySelectorAll('button').forEach(button => button.disabled = trashed);
  $('save-draft').hidden = $('publish').hidden = trashed;
  $('delete-entry').hidden = !active || trashed;
  $('delete-entry').textContent = active?.type === 'diary' ? '删除日记' : '删除文章';
  $('restore-entry').hidden = !trashed;
  $('unpublish').hidden = trashed || active?.publishedRevision == null;
}
function markDirty() { dirty = true; $('save-state').textContent = '有未保存的修改'; $('record-state').textContent = '未保存修改'; renderImages(); }
function canLeave() { return !dirty || confirm('当前修改尚未保存，确定离开吗？可以先保存草稿。'); }
function clearStatus() { clearTimeout(statusTimer); statusGeneration++; }
function openEntry(entry = null) {
  if (!canLeave()) return;
  clearStatus(); active = entry; dirty = false;
  $('type').value = entry?.type || new URLSearchParams(location.search).get('type') || 'blog';
  $('date').value = entry?.date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  $('title').value = entry?.title || ''; $('body').value = entry?.body || ''; $('tags').value = (entry?.tags || []).join(', '); $('category').value = entry?.category || '生活随笔';
  $('category-label').hidden = $('type').value === 'diary';
  $('editor-heading').textContent = entry ? '编辑内容' : '新建内容';
  $('record-state').textContent = entry ? stateLabel(entry) : '未保存';
  $('save-state').textContent = entry?.deletedAt ? '内容保留在回收站，可恢复为草稿。' : entry ? '草稿已保存在后台' : '内容尚未保存。';
  $('unpublish').hidden = entry?.publishedRevision == null;
  $('publish-status').textContent = entry?.deletedAt ? '已移入回收站。公开版本的移除需等待网站部署完成；恢复后不会自动重新发布。' : entry?.publishedRevision != null ? '已提交过公开版本；草稿修改需要再次发布才会公开。' : '尚未发布。保存草稿不会公开内容。';
  renderImages(); renderList(); selectTab(false); setEditorMode();
  if (entry?.commitSha) watchDeployment(entry.commitSha);
}
const imageRefs = text => [...text.matchAll(/!\[([^\]\n]*)\]\(diary-image:([a-z0-9-]+)\)/g)].map(m => ({ id: m[2], caption: m[1] }));
function renderImages() {
  const refs = [...new Map(imageRefs($('body').value).map(ref => [ref.id, ref])).values()];
  $('image-list').innerHTML = refs.map((ref, index) => `<figure class="image-item"><img src="/api/media/${ref.id}" alt="插图 ${index + 1}"><button type="button" data-remove="${ref.id}" aria-label="移除插图 ${index + 1}">×</button><figcaption>插图 ${index + 1}</figcaption></figure>`).join('');
}
function prose(text) {
  return window.kikiMarkdown.render(text, { title: $('title').value, resolveImage: id => ({ src: '/api/media/' + id }) });
}
function selectTab(preview) {
  $('body').hidden = preview; $('preview').hidden = !preview;
  $('write-tab').classList.toggle('selected', !preview); $('preview-tab').classList.toggle('selected', preview);
  if (preview) {
    $('preview').innerHTML = `<h1>${escape($('title').value)}</h1>` + prose($('body').value);
    window.kikiDiagrams?.render($('preview'));
  }
}
async function withBusy(action) {
  if (busy) return;
  busy = true;
  const controls = [...$('workspace').querySelectorAll('button,input,textarea,select')];
  controls.forEach(button => button.disabled = true);
  try { await action(); } catch (error) {
    notice(error.message);
    $('save-state').textContent = dirty ? '修改尚未保存，请重试或导出备份。' : active?.deletedAt ? '内容保留在回收站，可恢复为草稿。' : active ? '草稿已保存在后台' : '内容尚未保存。';
    if (/正在提交|正在撤下|正在删除/.test($('publish-status').textContent)) $('publish-status').textContent = '操作未完成：' + error.message;
  }
  finally { busy = false; controls.forEach(button => button.disabled = false); setEditorMode(); }
}
async function save() {
  if (!$('content-form').reportValidity()) return null;
  $('save-state').textContent = '正在保存到后台…';
  const saved = await api(active ? `/api/entries/${active.id}` : '/api/entries', active ? 'PUT' : 'POST', formData());
  active = saved; entries = [saved, ...entries.filter(entry => entry.id !== saved.id)]; dirty = false;
  $('save-state').textContent = '草稿已保存在后台'; $('record-state').textContent = stateLabel(saved); renderList();
  return saved;
}
async function watchDeployment(sha, attempt = 0, generation = ++statusGeneration) {
  clearTimeout(statusTimer);
  try {
    const state = await api(`/api/deployments/${sha}`);
    if (generation !== statusGeneration) return;
    if (state.state === 'completed') {
      $('publish-status').textContent = state.conclusion === 'success' ? '网站部署成功。打开网站或刷新页面即可看到当前公开版本。' : '网站部署未成功，草稿仍在。请前往 GitHub Actions 查看原因后重试。';
    } else {
      $('publish-status').textContent = '内容已提交到 GitHub，网站正在自动部署…';
      if (attempt < 30) statusTimer = setTimeout(() => watchDeployment(sha, attempt + 1, generation), 4000);
      else $('publish-status').textContent += '\n部署仍在进行，可稍后重新打开这篇内容查看状态。';
    }
  } catch (error) { if (generation === statusGeneration) $('publish-status').textContent = '暂时无法读取部署状态：' + error.message; }
}
async function jpeg(file) {
  if (file.size > 20 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) throw new Error('请选择 20 MB 以内的 JPG、PNG、WebP 或 AVIF 图片。');
  const image = await createImageBitmap(file);
  try {
    let width = Math.min(1800, image.width), quality = .86;
    for (let attempt = 0; attempt < 5; attempt++) {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = Math.max(1, Math.round(image.height * width / image.width));
      const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= 1024 * 1024) return blob;
      width = Math.round(width * .8); quality -= .08;
    }
    throw new Error('图片处理后仍过大，请缩小图片重试。');
  } finally { image.close(); }
}
$('content-form').addEventListener('input', () => { $('category-label').hidden = $('type').value === 'diary'; markDirty(); });
$('content-form').onsubmit = event => { event.preventDefault(); withBusy(async () => { await save(); }); };
$('publish').onclick = () => withBusy(async () => {
  const saved = await save(); if (!saved) return;
  $('publish-status').textContent = '正在提交公开版本…';
  const result = await api(`/api/publish/${saved.id}`, 'POST', { revision: saved.revision });
  active.publishedRevision = saved.revision; active.commitSha = result.sha; $('record-state').textContent = stateLabel(active); $('unpublish').hidden = false; renderList(); watchDeployment(result.sha);
});
$('unpublish').onclick = () => {
  if (!active || !confirm('撤下后，网站将不再展示此内容；已公开的仓库历史和图片仍可能被访问。确定撤下吗？')) return;
  withBusy(async () => {
    const result = await api(`/api/unpublish/${active.id}`, 'POST', { revision: active.revision });
    active.publishedRevision = null; active.commitSha = result.sha; $('unpublish').hidden = true; $('record-state').textContent = stateLabel(active); renderList(); watchDeployment(result.sha);
  });
};
$('delete-entry').onclick = () => {
  if (!active || active.deletedAt) return;
  const title = active.title, kind = active.type === 'diary' ? '日记' : '文章';
  const detail = active.publishedRevision != null ? '公开版本也会从网站移除，需等待部署完成。' : '';
  if (!confirm(`删除${kind}「${title}」并移入回收站？${detail}${dirty ? '当前未保存的修改不会保留。' : ''}之后可以从回收站恢复，已公开的图片与仓库历史不会被清除。`)) return;
  withBusy(async () => {
    clearStatus(); $('publish-status').textContent = '正在删除并处理公开版本…';
    const result = await api(`/api/entries/${active.id}`, 'DELETE', { revision: active.revision });
    entries = [result.entry, ...entries.filter(entry => entry.id !== result.entry.id)];
    dirty = false; openEntry();
    $('publish-status').textContent = result.deployment ? '已移入回收站，正在移除网站上的公开版本…' : '已移入回收站，可在左侧选择「回收站」恢复。';
    if (result.deployment) watchDeployment(result.deployment.sha);
    notice(`${kind}已移入回收站。`);
  });
};
$('restore-entry').onclick = () => {
  if (!active?.deletedAt) return;
  withBusy(async () => {
    const result = await api(`/api/entries/${active.id}/restore`, 'POST', { revision: active.revision });
    entries = [result.entry, ...entries.filter(entry => entry.id !== result.entry.id)];
    $('entry-filter').value = 'all'; openEntry(result.entry);
    clearStatus(); $('publish-status').textContent = '已恢复为草稿。需要点击「发布到网站」才会重新公开。';
    notice('已恢复为草稿。');
  });
};
$('new-entry').onclick = () => openEntry(); $('entry-filter').onchange = renderList;
$('entry-list').onclick = event => { const button = event.target.closest('[data-id]'); if (button) openEntry(entries.find(entry => entry.id === button.dataset.id)); };
$('write-tab').onclick = () => selectTab(false); $('preview-tab').onclick = () => selectTab(true);
$('insert-image').onclick = () => $('image-input').click();
$('image-input').onchange = event => {
  const files = [...event.target.files]; event.target.value = '';
  const start = $('body').selectionStart, end = $('body').selectionEnd;
  if (imageRefs($('body').value).length + files.length > 12) { notice('每篇最多插入 12 张图片。'); return; }
  withBusy(async () => {
    selectTab(false);
    const tokens = [];
    try {
      for (const file of files) {
        $('save-state').textContent = `正在上传图片 ${tokens.length + 1} / ${files.length}…`;
        const uploaded = await api('/api/media', 'POST', await jpeg(file), true);
        tokens.push(`![插图 ${imageRefs($('body').value).length + tokens.length + 1}](diary-image:${uploaded.id})`);
      }
    } finally {
      if (tokens.length) { const insertion = '\n\n' + tokens.join('\n\n') + '\n\n'; $('body').value = $('body').value.slice(0, start) + insertion + $('body').value.slice(end); markDirty(); $('save-state').textContent = '图片已上传；请保存草稿或发布。'; }
    }
  });
};
$('image-list').onclick = event => { const button = event.target.closest('[data-remove]'); if (!button) return; $('body').value = $('body').value.replace(/!\[[^\]\n]*\]\(diary-image:([a-z0-9-]+)\)/g, (token, id) => id === button.dataset.remove ? '' : token); markDirty(); };
$('download-draft').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(formData(), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'kiki-draft.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  notice('已导出文字备份。图片仍保存在后台。');
};
$('logout').onclick = () => { if (!canLeave()) return; withBusy(async () => { await api('/api/logout', 'POST', {}); dirty = false; location.replace('/admin'); }); };
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
(async () => {
  try {
    const user = await api('/api/me');
    $('visit-site').href = user.siteUrl;
    const [current, trash] = await Promise.all([api('/api/entries'), api('/api/entries?trash=1')]); entries = [...current, ...trash];
    $('login-panel').hidden = true; $('workspace').hidden = false; $('logout').hidden = false; $('show-analytics').hidden = false; openEntry();
  } catch (error) { $('login-status').textContent = error.message; }
})();

let analyticsCursor = null, analyticsLoading = false;
const number = value => Number(value).toLocaleString('zh-CN');
const visitTime = value => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(value));
function visitRegion(row) {
  let country = row.country;
  try { country = new Intl.DisplayNames(['zh-CN'], { type: 'region' }).of(country) || country; } catch { /* Keep unknown codes readable. */ }
  return [...new Set([country, row.region, row.city].filter(Boolean))].join(' / ') || '未知地区';
}
async function loadAnalytics(more = false) {
  if (analyticsLoading) return;
  analyticsLoading = true;
  $('analytics-filters').querySelectorAll('button,input,select').forEach(node => node.disabled = true);
  $('analytics-more').disabled = true;
  $('analytics-status').textContent = '正在读取访问记录…';
  if (!more) { $('analytics-records').innerHTML = ''; analyticsCursor = null; $('analytics-more').hidden = true; }
  try {
    const params = new URLSearchParams({ days: $('analytics-days').value, target: $('analytics-target').value, ip: $('analytics-ip').value.trim() });
    if (more && analyticsCursor) params.set('before', analyticsCursor);
    const data = await api('/api/analytics?' + params);
    if ($('show-analytics').hidden) return;
    $('analytics-total').textContent = number(data.summary.total);
    $('analytics-today').textContent = number(data.summary.today);
    $('analytics-ips').textContent = number(data.summary.ips);
    const target = $('analytics-target').value;
    $('analytics-target').innerHTML = '<option value="">全部页面</option>' + data.pages.map(page => `<option value="${escape(page.target)}">${escape(page.title)}</option>`).join('');
    $('analytics-target').value = target;
    $('analytics-pages').innerHTML = data.pages.length ? data.pages.map(page => `<div><span>${escape(page.title)}<small>${page.target.startsWith('article:') ? '文章' : '页面'}</small></span><strong>${number(page.views)}</strong></div>`).join('') : '<p class="muted">暂无访问记录。</p>';
    $('analytics-records').insertAdjacentHTML('beforeend', data.records.map(row => `<tr><td>${escape(visitTime(row.visitedAt))}</td><td>${escape(row.title)}<small>${row.target.startsWith('article:') ? '文章' : '页面'}</small></td><td class="visit-ip">${escape(row.ip)}</td><td>${escape(visitRegion(row))}</td></tr>`).join(''));
    analyticsCursor = data.next; $('analytics-more').hidden = !analyticsCursor;
    const size = $('analytics-records').children.length;
    $('analytics-status').textContent = size ? `已显示 ${size} 条访问记录${analyticsCursor ? '，可继续加载。' : '。'}` : '此筛选条件下暂无访问记录。';
  } catch (error) { $('analytics-status').textContent = '读取失败：' + error.message; }
  finally {
    analyticsLoading = false; $('analytics-more').disabled = false;
    $('analytics-filters').querySelectorAll('button,input,select').forEach(node => node.disabled = false);
  }
}
$('show-analytics').onclick = () => { $('workspace').hidden = true; $('analytics-panel').hidden = false; loadAnalytics(); };
$('back-to-editor').onclick = () => { $('analytics-panel').hidden = true; $('workspace').hidden = false; };
$('analytics-filters').onsubmit = event => { event.preventDefault(); loadAnalytics(); };
$('analytics-more').onclick = () => loadAnalytics(true);
$('analytics-filters').oninput = () => { analyticsCursor = null; $('analytics-more').hidden = true; };
