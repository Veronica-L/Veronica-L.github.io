'use strict';
(() => {
  try {
    const target = new URL(window.KIKI_SITE.adminUrl);
    if (target.protocol !== 'https:') throw new Error('HTTPS required');
    target.pathname = '/admin';
    const type = new URLSearchParams(location.search).get('type');
    if (['diary', 'blog'].includes(type)) target.searchParams.set('type', type);
    document.getElementById('open-admin').href = target.href;
    document.getElementById('open-admin').hidden = false;
    location.replace(target.href);
  } catch {
    document.getElementById('state').textContent = '管理后台尚未接通。';
    document.getElementById('setup').hidden = false;
  }
})();
