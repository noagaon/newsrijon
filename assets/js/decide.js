/* ইমেইলের অনুমোদন/বাতিল লিংক: এখানে এক ট্যাপে নিশ্চিত করলে সিদ্ধান্ত সার্ভারে যায় (গুগল অ্যাকাউন্ট লাগে না) */
(function () {
  'use strict';
  var box = document.getElementById('dc'), URL_ = (window.SRIJON_CONFIG || {}).APPS_SCRIPT_URL;
  if (!box) return;
  var q = new URLSearchParams(location.search), rid = q.get('rid') || '', v = q.get('v') || '', u = q.get('u') || '', sig = q.get('sig') || '';
  var ok = v === 'approve';
  function card(cls, h, extra) { box.innerHTML = '<div class="vf-card ' + cls + '"><h2>' + h + '</h2>' + (extra || '') + '</div>'; }
  if (!/^[0-9a-f]{32}$/.test(rid) || (v !== 'approve' && v !== 'reject') || !sig || !URL_) return card('vf-warn', 'লিংকটি সঠিক নয়।');
  card(ok ? 'vf-ok' : 'vf-warn', ok ? 'অনুমতির অনুরোধ অনুমোদন করবেন?' : 'অনুমতির অনুরোধ বাতিল করবেন?',
    '<p><button type="button" class="btn btn-round" id="dcGo">' + (ok ? '✔ হ্যাঁ, অনুমোদন দিন' : '✖ হ্যাঁ, বাতিল করুন') + '</button></p>');
  document.getElementById('dcGo').addEventListener('click', function () {
    this.disabled = true; this.textContent = 'অপেক্ষা করুন…';
    fetch(URL_, { method: 'POST', body: JSON.stringify({ action: 'decide', rid: rid, v: v, u: u, sig: sig }) })
      .then(function (r) { return r.json(); })
      .then(function (r) { card(r && r.good ? 'vf-ok' : 'vf-warn', (r && r.msg) || 'সমস্যা হয়েছে, আবার চেষ্টা করুন।'); })
      .catch(function () { card('vf-warn', 'সংযোগে সমস্যা হয়েছে। ইন্টারনেট দেখে লিংকটি আবার খুলুন।'); });
  });
})();
