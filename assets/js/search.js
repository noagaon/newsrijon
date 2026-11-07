/* হোম পেইজের সাইট-সার্চ: পেজগুলোর লেখা থেকে বানানো ইনডেক্সে খোঁজে (প্রথমবার ফোকাসে ইনডেক্স লোড হয়) */
(function () {
  'use strict';
  var box = document.getElementById('qBox'), res = document.getElementById('qRes');
  if (!box || !res) return;
  var BN = '০১২৩৪৫৬৭৮৯', loading = false, timer = 0;
  function norm(s) { return String(s || '').replace(/[‌‍]/g, '').replace(/[০-৯]/g, function (c) { return BN.indexOf(c); }).toLowerCase(); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load(cb) {
    if (window.SRIJON_SEARCH) return cb();
    if (loading) return; loading = true;
    var s = document.createElement('script'); s.src = 'assets/js/search-index.js'; s.onload = cb; document.head.appendChild(s);
  }
  function search(q) {
    var terms = norm(q).split(/\s+/).filter(Boolean), out = [];
    if (!terms.length) return out;
    window.SRIJON_SEARCH.forEach(function (d) {
      var x = norm(d.x), t = norm(d.t), score = 0, first = -1;
      for (var i = 0; i < terms.length; i++) {
        var inT = t.indexOf(terms[i]) >= 0, at = x.indexOf(terms[i]);
        if (!inT && at < 0) return;
        if (first < 0 && at >= 0) first = at;
        score += (inT ? 50 : 0) + Math.min(20, x.split(terms[i]).length - 1);
      }
      var snip = '';
      if (first >= 0) { var a = Math.max(0, first - 40); if (a) { var sp = d.x.indexOf(' ', a); a = sp >= 0 && sp < first ? sp + 1 : a; } snip = (a ? '… ' : '') + d.x.substring(a, first + 110) + ' …'; }
      out.push({ d: d, score: score, snip: snip });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 8);
  }
  function show() {
    var q = box.value.trim();
    if (q.length < 2) { res.hidden = true; return; }
    load(function () {
      var r = search(q);
      res.innerHTML = r.length ? r.map(function (x) { return '<a href="' + x.d.u + '"><strong>' + esc(x.d.t) + '</strong><span>' + esc(x.snip) + '</span></a>'; }).join('') : '<p>কিছু পাওয়া যায়নি। অন্য শব্দ দিয়ে চেষ্টা করুন।</p>';
      res.hidden = false;
    });
  }
  box.addEventListener('focus', function () { load(function () {}); });
  box.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(show, 150); });
  box.addEventListener('keydown', function (e) { if (e.key === 'Escape') res.hidden = true; if (e.key === 'Enter') { var a = res.querySelector('a'); if (a) location.href = a.getAttribute('href'); } });
  document.addEventListener('click', function (e) { if (!e.target.closest('#siteSearch')) res.hidden = true; });
})();
