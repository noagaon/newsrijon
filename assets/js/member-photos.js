/* সদস্য তালিকার ছোট ছবি: দেখার সময় আনে (ব্রাউজারে ১২ ঘণ্টা জমা থাকে); ক্লিক করলে বড় করে দেখায় */
(function () {
  'use strict';
  var URL_ = (window.SRIJON_CONFIG || {}).ACCOUNT_URL, KEY = 'srijon_mph_v1', TTL = 12 * 3600 * 1000;
  var els = [].slice.call(document.querySelectorAll('.mph')); if (!els.length || !URL_) return;
  var cache = {};
  try { cache = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { try { localStorage.removeItem(KEY); } catch (e2) {} } }
  function paint(no, uri) { els.forEach(function (e) { if (e.dataset.no === no) { e.style.backgroundImage = 'url("' + uri + '")'; e.classList.add('has'); e.tabIndex = 0; e.title = 'বড় করে দেখতে ক্লিক করুন'; } }); }
  var now = Date.now(), need = [];
  els.forEach(function (e) {
    var no = e.dataset.no, c = cache[no];
    if (c && now - c[0] < TTL) { if (c[1]) paint(no, c[1]); } else if (need.indexOf(no) < 0) need.push(no);
  });
  function post(body) { return fetch(URL_, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); }); }
  (function next() {
    if (!need.length) return;
    var batch = need.splice(0, 8);
    post({ action: 'public_photos', nos: batch }).then(function (r) {
      if (!r || !r.ok) return;
      batch.forEach(function (no) { var u = r.photos[no] || ''; cache[no] = [Date.now(), u]; if (u) paint(no, u); });
      save();
    }).catch(function () {}).then(next);
  })();

  /* জুম */
  var ov = document.createElement('div'); ov.className = 'mph-zoom'; ov.hidden = true;
  ov.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure><button type="button" aria-label="বন্ধ করুন">✕</button>';
  document.body.appendChild(ov);
  var img = ov.querySelector('img'), cap = ov.querySelector('figcaption');
  function close() { ov.hidden = true; img.removeAttribute('src'); }
  ov.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); else if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('has')) { e.preventDefault(); open(e.target); } });
  function open(el) {
    var no = el.dataset.no, small = (cache[no] || [])[1] || '';
    img.src = small; cap.textContent = el.getAttribute('aria-label').replace(/-এর ছবি$/, '') + ' • ' + no; ov.hidden = false;
    post({ action: 'public_photo', no: no }).then(function (r) { if (r && r.ok && !ov.hidden && cap.textContent.indexOf(no) > -1) img.src = r.photo; }).catch(function () {});
  }
  document.addEventListener('click', function (e) { var el = e.target.closest && e.target.closest('.mph.has'); if (el) open(el); });
})();
