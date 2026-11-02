(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(s) { return String(s).replace(/\d/g, function (d) { return BN[d]; }); }
  function en(s) { return String(s).replace(/[০-৯]/g, function (c) { return BN.indexOf(c); }); }
  var ids = ['rNo', 'rDate', 'rType', 'rMemNo', 'rName', 'rKind', 'rAmount', 'rWords', 'rMethod'];

  /* ---------- অঙ্ক → বাংলা কথা ---------- */
  var W = ('শূন্য,এক,দুই,তিন,চার,পাঁচ,ছয়,সাত,আট,নয়,দশ,এগার,বার,তের,চৌদ্দ,পনের,ষোল,সতের,আঠার,উনিশ,' +
    'বিশ,একুশ,বাইশ,তেইশ,চব্বিশ,পঁচিশ,ছাব্বিশ,সাতাশ,আটাশ,ঊনত্রিশ,ত্রিশ,একত্রিশ,বত্রিশ,তেত্রিশ,চৌত্রিশ,পঁয়ত্রিশ,ছত্রিশ,সাঁইত্রিশ,আটত্রিশ,ঊনচল্লিশ,' +
    'চল্লিশ,একচল্লিশ,বিয়াল্লিশ,তেতাল্লিশ,চুয়াল্লিশ,পঁয়তাল্লিশ,ছেচল্লিশ,সাতচল্লিশ,আটচল্লিশ,ঊনপঞ্চাশ,পঞ্চাশ,একান্ন,বায়ান্ন,তিপ্পান্ন,চুয়ান্ন,পঞ্চান্ন,ছাপ্পান্ন,সাতান্ন,আটান্ন,ঊনষাট,' +
    'ষাট,একষট্টি,বাষট্টি,তেষট্টি,চৌষট্টি,পঁয়ষট্টি,ছেষট্টি,সাতষট্টি,আটষট্টি,ঊনসত্তর,সত্তর,একাত্তর,বাহাত্তর,তিয়াত্তর,চুয়াত্তর,পঁচাত্তর,ছিয়াত্তর,সাতাত্তর,আটাত্তর,ঊনআশি,' +
    'আশি,একাশি,বিরাশি,তিরাশি,চুরাশি,পঁচাশি,ছিয়াশি,সাতাশি,আটাশি,ঊননব্বই,নব্বই,একানব্বই,বিরানব্বই,তিরানব্বই,চুরানব্বই,পঁচানব্বই,ছিয়ানব্বই,সাতানব্বই,আটানব্বই,নিরানব্বই').split(',');
  function words(n) {
    if (n === 0) return 'শূন্য';
    var parts = [], units = [[10000000, 'কোটি'], [100000, 'লক্ষ'], [1000, 'হাজার'], [100, 'শত']];
    units.forEach(function (u) {
      var q = Math.floor(n / u[0]);
      if (q > 0) { parts.push((u[0] === 10000000 && q >= 100 ? words(q) : W[q]) + ' ' + u[1]); n -= q * u[0]; }
    });
    if (n > 0) parts.push(W[n]);
    return parts.join(' ');
  }

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
  function nowText() {
    var d = new Date(), z = function (n) { return ('0' + n).slice(-2); }, h = d.getHours(), ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return bn(z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + z(h) + ':' + z(d.getMinutes())) + ' ' + (ap === 'AM' ? 'পূর্বাহ্ণ' : 'অপরাহ্ণ');
  }
  function stamp() { Array.prototype.forEach.call(document.querySelectorAll('.r-now'), function (o) { o.textContent = nowText(); }); }

  /* ---------- চাঁদার ধরণ ও মাধ্যম (মিরর-মান) ---------- */
  var kindVal = '', methodVal = '';
  function kindText() { var k = $('rKind').value; return k === 'অন্যান্য চাঁদা' && $('rKindOther').value.trim() ? $('rKindOther').value.trim() : k; }
  function methodText() {
    var m = $('rMethod').value;
    if (m === 'মোবাইল ব্যাংকিং এ প্রদান করুন') {
      var b = $('rMob').value, a = en($('rAcc').value).replace(/\D/g, '');
      return b ? 'মোবাইল ব্যাংকিং — ' + b.replace(' করুন', '') + (a ? ' (' + bn(a) + ')' : '') : m;
    }
    return m;
  }
  function mirror(id, v) { Array.prototype.forEach.call(document.querySelectorAll('.mir[data-for="' + id + '"]'), function (o) { o.textContent = v; }); }
  function syncKind() {
    $('rKindOtherW').hidden = $('rKind').value !== 'অন্যান্য চাঁদা';
    kindVal = kindText(); mirror('rKind', kindVal);
  }
  function syncMethod() {
    var mob = $('rMethod').value === 'মোবাইল ব্যাংকিং এ প্রদান করুন';
    $('rMobW').hidden = !mob;
    $('rAcc').hidden = !(mob && $('rMob').value);
    var a = en($('rAcc').value).replace(/\D/g, '');
    $('rAccHint').hidden = !(mob && $('rMob').value && a.length > 0 && a.length !== 11);
    methodVal = methodText(); mirror('rMethod', methodVal);
  }
  $('rKind').addEventListener('change', syncKind); $('rKindOther').addEventListener('input', syncKind);
  ['rMethod', 'rMob'].forEach(function (i) { $(i).addEventListener('change', syncMethod); });
  $('rAcc').addEventListener('input', function () { this.value = en(this.value).replace(/\D/g, '').slice(0, 11); syncMethod(); });

  /* ---------- অঙ্ক ও কথা ---------- */
  $('rAmount').addEventListener('input', function () {
    var v = en(this.value).replace(/\D/g, '').slice(0, 9); this.value = v;
    $('rWords').value = v ? words(parseInt(v, 10)) + ' টাকা মাত্র' : '';
    show('rAmount'); show('rWords');
  });

  /* ---------- সদস্য-তালিকা: নাম ↔ নম্বর ---------- */
  var KEY = { 'সাধারণ সদস্য': 'general', 'প্রবাসী সদস্য': 'expat', 'জুনিয়র সদস্য': 'junior', 'দাতা সদস্য': 'donor' };
  function list() { var m = window.SRIJON_MEMBERS || {}; return m[KEY[$('rType').value]] || []; }
  var sug = $('rSug');
  function closeSug() { sug.hidden = true; sug.innerHTML = ''; }
  function pick(m) { $('rName').value = m.n; $('rMemNo').value = m.no; show('rName'); show('rMemNo'); closeSug(); dirty(); }
  $('rName').addEventListener('input', function () {
    show('rName');
    var q = this.value.trim(); sug.innerHTML = '';
    if (!q || !list().length) { closeSug(); return; }
    var hit = list().filter(function (m) { return m.n.indexOf(q) >= 0; }).slice(0, 8);
    if (!hit.length) { closeSug(); return; }
    hit.forEach(function (m) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = m.n + '  (' + m.no + ')';
      b.addEventListener('mousedown', function (e) { e.preventDefault(); pick(m); }); sug.appendChild(b);
    });
    sug.hidden = false;
  });
  $('rName').addEventListener('blur', function () { setTimeout(closeSug, 150); });
  $('rMemNo').addEventListener('input', function () {
    var v = en(this.value).trim().toUpperCase(); show('rMemNo');
    var m = list().filter(function (x) { return x.no === v; })[0];
    if (!m) { var all = window.SRIJON_MEMBERS || {}; Object.keys(all).some(function (k) { var f = all[k].filter(function (x) { return x.no === v; })[0]; if (f) { m = f; return true; } }); }
    if (m) { $('rName').value = m.n; show('rName'); }
  });
  $('rType').addEventListener('change', function () { $('rName').value = ''; $('rMemNo').value = ''; show('rName'); show('rMemNo'); closeSug(); });

  /* ---------- নম্বর, সংরক্ষণ, প্রিন্ট ---------- */
  function status(cls, msg) { var s = $('rStatus'); s.className = 'status' + (cls ? ' ' + cls : ''); s.textContent = msg || ''; }
  var saved = false;
  function dirty() { if (saved) { saved = false; lastPdf = null; $('rSave').disabled = false; } }
  ['rDate', 'rType', 'rMemNo', 'rName', 'rKind', 'rKindOther', 'rAmount', 'rMethod', 'rMob', 'rAcc'].forEach(function (id) { $(id).addEventListener('input', dirty); $(id).addEventListener('change', dirty); });
  ['rDate', 'rType'].forEach(function (id) { $(id).addEventListener('input', function () { show(id); }); $(id).addEventListener('change', function () { show(id); }); });
  $('rMemNo').addEventListener('change', function () { show('rMemNo'); });

  function call(payload) {
    var cfg = window.SRIJON_CONFIG || {};
    if (!cfg.RECEIPT_URL) return Promise.reject(new Error('nourl'));
    return fetch(cfg.RECEIPT_URL, { method: 'POST', body: JSON.stringify(payload) }).then(function (r) { return r.json(); });
  }
  function nextNo() {
    call({ action: 'receipt_next' }).then(function (r) { if (r && r.ok && !saved) { $('rNo').value = r.no; show('rNo'); } }).catch(function () {});
  }
  var ERR = { 'missing name': 'চাঁদা প্রদানকারীর নাম লিখুন।', 'invalid amount': 'চাঁদার পরিমাণ (অঙ্কে) শুধু সংখ্যায় লিখুন।', busy: 'অনেক অনুরোধ এসেছে, এক মিনিট পর আবার চেষ্টা করুন।', permission: 'সংরক্ষণের অনুমতি নেই।' };
  $('rSave').addEventListener('click', function () {
    var cfg = window.SRIJON_CONFIG || {};
    if (!cfg.RECEIPT_URL) { status('error', 'সংরক্ষণের লিংক এখনো বসানো হয়নি (config.js এর RECEIPT_URL)। প্রশাসককে জানান।'); return; }
    if (!$('rName').value.trim()) { status('error', 'চাঁদা প্রদানকারীর নাম লিখুন।'); $('rName').focus(); return; }
    if (!$('rKind').value) { status('error', 'চাঁদার ধরণ বাছাই করুন।'); $('rKind').focus(); return; }
    if ($('rKind').value === 'অন্যান্য চাঁদা' && !$('rKindOther').value.trim()) { status('error', 'কী চাঁদা তা লিখুন।'); $('rKindOther').focus(); return; }
    if (!/\d/.test($('rAmount').value)) { status('error', 'চাঁদার পরিমাণ (অঙ্কে) লিখুন।'); $('rAmount').focus(); return; }
    if (!$('rMethod').value) { status('error', 'চাঁদা প্রদানের মাধ্যম বাছাই করুন।'); $('rMethod').focus(); return; }
    if ($('rMethod').value === 'মোবাইল ব্যাংকিং এ প্রদান করুন') {
      if (!$('rMob').value) { status('error', 'মোবাইল ব্যাংকিংয়ের মাধ্যম বাছাই করুন।'); $('rMob').focus(); return; }
      if (en($('rAcc').value).replace(/\D/g, '').length !== 11) { status('error', 'অ্যাকাউন্ট নম্বর ১১ ডিজিটের হতে হবে।'); $('rAcc').focus(); return; }
    }
    var btn = $('rSave'); btn.disabled = true; status('info', 'সংরক্ষণ হচ্ছে…');
    call({ action: 'receipt_save', website: $('rWebsite').value, data: {
      date: $('rDate').value, type: $('rType').value, memberNo: $('rMemNo').value, name: $('rName').value,
      kind: kindText(), amount: $('rAmount').value, words: $('rWords').value, method: methodText() } })
      .then(function (r) {
        if (r && r.ok) {
          $('rNo').value = r.no; show('rNo'); saved = true; stamp();
          status('ok-strong', '✔ সংরক্ষিত হয়েছে। রসিদ নম্বর: ' + r.no + ' — পিডিএফ তৈরি ও জমা হচ্ছে…');
          makePdf().then(function (pdf) {
            lastPdf = { pdf: pdf, no: r.no };
            return call({ action: 'receipt_pdf', no: r.no, kind: $('rKind').value, name: $('rName').value, pdf: window.SrijonPDF.toBase64(pdf.bytes) });
          }).then(function (x) {
            status('ok-strong', '✔ সংরক্ষিত হয়েছে। রসিদ নম্বর: ' + r.no + (x && x.ok ? ' — পিডিএফ Drive-এ জমা হয়েছে। এখন ডাউনলোড করুন।' : ' — তথ্য সংরক্ষিত, কিন্তু পিডিএফ Drive-এ জমা হয়নি। ডাউনলোড করে রাখুন।'));
          }).catch(function () { status('ok-strong', '✔ সংরক্ষিত হয়েছে। রসিদ নম্বর: ' + r.no + ' — পিডিএফ জমা হয়নি; ডাউনলোড করে রাখুন।'); });
        }
        else { btn.disabled = false; status('error', ERR[r && r.error] || 'সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।'); }
      }).catch(function () { btn.disabled = false; status('error', 'ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।'); });
  });
  var lastPdf = null, ADDR = 'নোয়াগাঁও, টুকেরবাজার, ৩৯ নং ওয়ার্ড, সিলেট সিটি কর্পোরেশন, সিলেট।  ইমেইল– srijonshil2011@gmail.com';
  function makePdf() {
    var q = $('rDate').value.split('-');
    return window.ReceiptPDF.build({
      addr: ADDR, slogan: 'সামাজিক উন্নয়ন ও ন্যায়বিচার, তারুণ্যের অঙ্গীকার', no: $('rNo').value, date: bn(q[2] + '/' + q[1] + '/' + q[0]),
      type: $('rType').value, memberNo: $('rMemNo').value, name: $('rName').value, kind: kindText(),
      amount: $('rAmount').value ? bn($('rAmount').value) + ' টাকা' : '', words: $('rWords').value, method: methodText(), time: nowText() });
  }
  $('rPrint').addEventListener('click', function () {
    if (!saved || !lastPdf) { status('error', 'আগে "সংরক্ষণ করুন" বোতামে চাপ দিন, তারপর ডাউনলোড করুন।'); return; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(lastPdf.pdf.blob); a.download = 'Receipt-' + lastPdf.no.replace('/', '-') + '.pdf';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  });
  window.addEventListener('beforeprint', stamp);
  $('rClear').addEventListener('click', function () {
    ['rDate', 'rType', 'rMemNo', 'rName', 'rKind', 'rKindOther', 'rAmount', 'rWords', 'rMethod', 'rMob', 'rAcc'].forEach(function (id) { $(id).value = id === 'rDate' ? today() : ''; });
    ids.forEach(show); syncKind(); syncMethod(); saved = false; lastPdf = null; $('rSave').disabled = false; status('', ''); $('rNo').value = ''; show('rNo'); nextNo();
  });

  $('rDate').value = today(); ids.forEach(show); syncKind(); syncMethod(); stamp(); nextNo();
})();
