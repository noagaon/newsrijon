/* আইডি কার্ডের কিউআর যাচাই: লিংকের id ও k দিয়ে সদস্যের তথ্য আনে */
(function () {
  'use strict';
  var URL_ = (window.SRIJON_CONFIG || {}).ACCOUNT_URL, box = document.getElementById('vf');
  if (!box) return;
  var q = new URLSearchParams(location.search), id = (q.get('f') || '').slice(0, 20), k = (q.get('k') || '').slice(0, 12);
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function bn(t) { return String(t).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); }
  function fail(msg) { box.innerHTML = '<div class="vf-card vf-bad"><div class="vf-mark">✕</div><h2>যাচাই করা যায়নি</h2><p>' + esc(msg) + '</p></div>'; }
  if (!id || !k || !URL_) return fail('এই লিংকে প্রয়োজনীয় তথ্য নেই। কার্ডের কিউআর কোড আবার স্ক্যান করুন।');
  fetch(URL_, { method: 'POST', body: JSON.stringify({ action: 'verify', f: id, k: k }) }).then(function (r) { return r.json(); }).then(function (r) {
    if (!r || !r.ok) return fail(r && r.error === 'busy' ? 'এখন অনেকে একসাথে যাচাই করছেন। কিছুক্ষণ পরে আবার চেষ্টা করুন।' : 'এই কার্ডটি আমাদের তালিকায় পাওয়া যায়নি। কার্ডটি জাল হতে পারে।');
    var ok = r.status === 'সক্রিয়', pend = r.kind === 'applicant' && !/বাতিল/.test(r.status);
    var cls = ok ? 'vf-ok' : pend ? 'vf-warn' : 'vf-warn', head = ok ? 'যাচাই সম্পন্ন — সক্রিয় সদস্য' : pend ? 'আবেদন গৃহীত — সদস্যপদ অনুমোদনের অপেক্ষায়' : 'সদস্যপদের অবস্থা: ' + esc(r.status);
    box.innerHTML = '<div class="vf-card ' + cls + '"><div class="vf-mark">' + (ok ? '✓' : '!') + '</div><h2>' + head + '</h2>'
      + (r.photo ? '<img class="vf-photo" alt="" src="' + esc(r.photo) + '">' : '')
      + '<dl><dt>নাম</dt><dd>' + esc(r.name) + '</dd><dt>সদস্যের ধরন</dt><dd>' + esc(r.type) + '</dd><dt>ফরম নম্বর</dt><dd>' + esc(r.formNo) + '</dd>'
      + (r.no ? '<dt>সদস্য নম্বর</dt><dd>' + esc(r.no) + '</dd>' : '') + (r.date ? '<dt>সদস্যপদ লাভের তারিখ</dt><dd>' + esc(bn(r.date)) + '</dd>' : '') + '</dl>'
      + '<p class="vf-note">' + (r.kind === 'member' ? 'ছবি ও নাম কার্ডের সাথে মিলিয়ে দেখুন। না মিললে কার্ডটি গ্রহণ করবেন না।' : 'এটি আবেদন ফরমের যাচাই। সদস্যপদ অনুমোদিত হলে একই কিউআর আইডি কার্ডেও কাজ করবে।') + '</p></div>';
  }).catch(function () { fail('সংযোগে সমস্যা হয়েছে। ইন্টারনেট দেখে আবার চেষ্টা করুন।'); });
})();
