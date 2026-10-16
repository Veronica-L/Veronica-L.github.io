'use strict';
// The complete article already exists in HTML; these are optional enhancements.
(() => {
  const button = document.getElementById('article-theme');
  function apply(dark) {
    document.documentElement.classList.toggle('dark', dark);
    button.textContent = dark ? '浅色' : '深色';
    button.setAttribute('aria-label', dark ? '切换浅色主题' : '切换深色主题');
  }
  try { apply(localStorage.getItem('yiyu-theme') === 'dark'); } catch { apply(false); }
  button.hidden = false;
  button.onclick = () => {
    const dark = !document.documentElement.classList.contains('dark'); apply(dark);
    try { localStorage.setItem('yiyu-theme', dark ? 'dark' : 'light'); } catch { /* Reading does not require storage. */ }
  };
  window.kikiDiagrams?.render(document.getElementById('article'));
})();
