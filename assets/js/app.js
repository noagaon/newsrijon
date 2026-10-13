/* মোবাইল মেনু টগল */
(function () {
  'use strict';
  var btn = document.getElementById('menuBtn');
  var nav = document.getElementById('siteNav');
  if (!btn || !nav) return;

  function set(open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন');
    nav.hidden = !open;
  }
  btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  document.addEventListener('click', function (e) {
    if (btn.getAttribute('aria-expanded') === 'true' && !nav.contains(e.target) && !btn.contains(e.target)) set(false);
  });
})();
