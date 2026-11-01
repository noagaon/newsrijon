(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(s) { return String(s).replace(/\d/g, function (d) { return BN[d]; }); }
  var ids = ['rNo', 'rDate', 'rType', 'rMemNo', 'rName', 'rKind', 'rAmount', 'rWords', 'rMethod'];

  function show(id) {
    var v = $(id).value || '';
    if (id === 'rDate' && v) { var q = v.split('-'); v = bn(q[2] + '/' + q[1] + '/' + q[0]); }
    if (id === 'rAmount' && v) v = bn(v) + ' টাকা';
    Array.prototype.forEach.call(document.querySelectorAll('.mir[data-for="' + id + '"]'), function (o) { o.textContent = v; });
  }
  function today() {
    var d = new Date(), z = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  }
  ids.forEach(function (id) {
    ['input', 'change'].forEach(function (ev) { $(id).addEventListener(ev, function () { show(id); }); });
  });
  $('rDate').value = today(); ids.forEach(show);
  function status(cls, msg) { var s = $('rStatus'); s.className = 'status' + (cls ? ' ' + cls : ''); s.textContent = msg || ''; }
  var saved = false;
  ids.forEach(function (id) { $(id).addEventListener('input', function () { if (saved) { saved = false; $('rSave').disabled = false; } }); });
  var ERR = { duplicate: 'এই রসিদ নম্বর আগেই সংরক্ষিত আছে। অন্য নম্বর দিন বা ঘরটি ফাঁকা রাখুন।', 'missing name': 'প্রদানকারীর নাম লিখুন।', 'invalid amount': 'চাঁদার পরিমাণ (অঙ্কে) শুধু সংখ্যায় লিখুন।', busy: 'অনেক অনুরোধ এসেছে, এক মিনিট পর আবার চেষ্টা করুন।', permission: 'সংরক্ষণের অনুমতি নেই।' };
  $('rSave').addEventListener('click', function () {
    var cfg = window.SRIJON_CONFIG || {};
    if (!cfg.RECEIPT_URL) { status('error', 'সংরক্ষণের লিংক এখনো বসানো হয়নি (config.js এর RECEIPT_URL)। প্রশাসককে জানান।'); return; }
    if (!$('rName').value.trim()) { status('error', 'প্রদানকারীর নাম লিখুন।'); $('rName').focus(); return; }
    if (!/\d/.test($('rAmount').value)) { status('error', 'চাঁদার পরিমাণ (অঙ্কে) লিখুন।'); $('rAmount').focus(); return; }
    var btn = $('rSave'); btn.disabled = true; status('info', 'সংরক্ষণ হচ্ছে…');
    fetch(cfg.RECEIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'receipt_save', website: $('rWebsite').value, data: {
      no: $('rNo').value, date: $('rDate').value, type: $('rType').value, memberNo: $('rMemNo').value, name: $('rName').value,
      kind: $('rKind').value, amount: $('rAmount').value, words: $('rWords').value, method: $('rMethod').value } }) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (r && r.ok) { $('rNo').value = r.no; show('rNo'); saved = true; status('ok-strong', '✔ সংরক্ষিত হয়েছে। রসিদ নম্বর: ' + r.no + ' — এখন প্রিন্ট করতে পারেন।'); }
        else { btn.disabled = false; status('error', ERR[r && r.error] || 'সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।'); }
      }).catch(function () { btn.disabled = false; status('error', 'ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।'); });
  });
  $('rPrint').addEventListener('click', function () { window.print(); });
  $('rClear').addEventListener('click', function () {
    ids.forEach(function (id) { $(id).value = id === 'rDate' ? today() : ''; show(id); }); saved = false; $('rSave').disabled = false; status('', '');
  });
})();
