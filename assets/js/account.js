/* সদস্য অ্যাকাউন্ট — খোলা, লগইন, পাসওয়ার্ড রিকভারি, প্রোফাইল, কার্ড, রসিদ, চাঁদার হিসাব */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('acct')) return;
  var CFG = window.SRIJON_CONFIG || {}, TK = 'srijon_acct_token', token = '', me = null, loaded = {};
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(s) { return String(s).replace(/\d/g, function (d) { return BN[d]; }); }
  function money(n) { return '৳ ' + bn(Number(n || 0).toLocaleString('en-US')); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function status(cls, m) { var s = $('aStatus'); s.className = 'status' + (cls ? ' ' + cls : ''); s.textContent = m || ''; if (m) s.scrollIntoView({ block: 'nearest' }); }
  function store(v) { try { if (v) sessionStorage.setItem(TK, v); else sessionStorage.removeItem(TK); } catch (e) {} }
  function stored() { try { return sessionStorage.getItem(TK) || ''; } catch (e) { return ''; } }

  var ERR = {
    invalid: 'তথ্য সঠিকভাবে দিন (ফোন ০১ দিয়ে ১১ সংখ্যা, এনআইডি শুধু সংখ্যা)।',
    nomatch: 'দেওয়া তথ্য সদস্য আবেদন ফরমের তথ্যের সাথে মেলেনি। নাম, সদস্য নম্বর, এনআইডি ও ফোন ফরমে যেমন দিয়েছিলেন ঠিক তেমন লিখুন।',
    exists: 'এই সদস্য নম্বরে আগেই অ্যাকাউন্ট খোলা হয়েছে। লগইন করুন, না পারলে "পাসওয়ার্ড ভুলে গেছেন?" ব্যবহার করুন।',
    sms_not_configured: 'আপনার আবেদনে ইমেইল নেই এবং SMS সেবাও চালু নেই, তাই কোড পাঠানো যাচ্ছে না। কর্তৃপক্ষের সাথে যোগাযোগ করুন।',
    mail_failed: 'কোড ইমেইলে পাঠানো যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    sms_failed: 'OTP পাঠানো যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    bad_image: 'ছবিটি নেওয়া যায়নি। JPG/PNG ছবি দিন।', bad_pdf: 'কার্ড সংরক্ষণ করা যায়নি।', too_many: 'অনেক বেশিবার আপলোড হয়েছে, এক ঘণ্টা পরে চেষ্টা করুন।', nocard: 'সংরক্ষিত কার্ড পাওয়া যায়নি।',
    too_many_otp: 'এই নম্বরে ঘণ্টায় অনেকবার OTP চাওয়া হয়েছে। পরে চেষ্টা করুন।',
    otp_wrong: 'কোড ভুল হয়েছে।', otp_expired: 'কোডের মেয়াদ শেষ বা ভুল চেষ্টা বেশি হয়েছে। নতুন কোড নিন।',
    bad_username: 'ইউজারনেম ৩–৩০ অক্ষরের, ইংরেজি ছোট হরফ/সংখ্যা/_/. দিয়ে হতে হবে।',
    bad_password: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে এবং ইউজারনেমের সমান নয়।',
    user_taken: 'এই ইউজারনেম আগেই নেওয়া হয়েছে, অন্যটি দিন।',
    need_email: 'সঠিক ইমেইল দিন (পাসওয়ার্ড রিকভারির জন্য)।',
    badlogin: 'ইউজারনেম বা পাসওয়ার্ড ভুল।', locked: 'অনেকবার ভুল হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    busy: 'এখন অনেক অনুরোধ চলছে, একটু পরে চেষ্টা করুন।', session: 'সেশনের মেয়াদ শেষ। আবার লগইন করুন।'
  };
  function errMsg(r) { return ERR[r && r.error] || 'কিছু ভুল হয়েছে। আবার চেষ্টা করুন।'; }
  function call(p) {
    if (!CFG.ACCOUNT_URL) return Promise.reject(new Error('nourl'));
    return fetch(CFG.ACCOUNT_URL, { method: 'POST', body: JSON.stringify(p) }).then(function (r) { return r.json(); });
  }
  function busy(btn, on) { btn.disabled = on; }
  function run(btn, p, ok) {
    status('info', 'অপেক্ষা করুন…'); busy(btn, true);
    call(p).then(function (r) { busy(btn, false); if (r && r.ok) { status('', ''); ok(r); } else { if (r && r.error === 'session') logoutLocal(); status('error', errMsg(r)); } })
      .catch(function (e) { busy(btn, false); status('error', e.message === 'nourl' ? 'অ্যাকাউন্ট সেবা এখনো চালু হয়নি।' : 'সংযোগে সমস্যা। ইন্টারনেট দেখে আবার চেষ্টা করুন।'); });
  }

  /* ---------- অতিথি: ট্যাব ---------- */
  var gTabs = $('aGuestTabs').querySelectorAll('a'), panes = { login: $('gLogin'), signup: $('gSignup'), forgot: $('gForgot') };
  function gShow(k) { Object.keys(panes).forEach(function (x) { panes[x].hidden = x !== k; }); Array.prototype.forEach.call(gTabs, function (a) { a.classList.toggle('active', a.dataset.g === k); }); status('', ''); }
  Array.prototype.forEach.call(gTabs, function (a) { a.addEventListener('click', function (e) { e.preventDefault(); gShow(a.dataset.g); }); });
  function fromHash() { gShow(/^#(signup|forgot)$/.test(location.hash) ? location.hash.slice(1) : 'login'); }
  fromHash(); window.addEventListener('hashchange', function () { if (!$('aGuest').hidden) fromHash(); });

  /* ---------- লগইন ---------- */
  $('gLogin').addEventListener('submit', function () {
    if (!$('lUser').value.trim() || !$('lPass').value) { status('error', 'ইউজারনেম ও পাসওয়ার্ড দিন।'); return; }
    run($('lGo'), { action: 'acct_login', username: $('lUser').value, password: $('lPass').value }, function (r) { $('lPass').value = ''; enter(r); });
  });

  /* ---------- অ্যাকাউন্ট খোলা ---------- */
  var signNo = '';
  $('gSignup').addEventListener('submit', function (e) { e.preventDefault(); });
  $('sGo1').addEventListener('click', function () {
    if (!$('sName').value.trim() || !$('sNo').value.trim() || !$('sNid').value.trim() || !$('sPhone').value.trim()) { status('error', 'চারটি ঘরই পূরণ করুন।'); return; }
    signNo = $('sNo').value;
    run($('sGo1'), { action: 'acct_signup_start', name: $('sName').value, memberNo: signNo, nid: $('sNid').value, phone: $('sPhone').value }, function (r) {
      $('sStep1').hidden = true; $('sStep2').hidden = false; $('sEmailWrap').hidden = !r.needEmail;
      $('sOtpInfo').textContent = (r.channel === 'sms' ? 'আপনার ফোনে (' + bn(r.phoneMasked || '') + ')' : 'আবেদন ফরমের ইমেইলে (' + (r.emailMasked || '') + ') স্প্যাম ফোল্ডারও দেখুন —') + ' একটি OTP পাঠানো হয়েছে। সেটি ও নিজের পছন্দের ইউজারনেম-পাসওয়ার্ড দিন।';
    });
  });
  $('sGo2').addEventListener('click', function () {
    if (!$('sOtp').value.trim() || !$('sUser').value.trim() || !$('sPass').value) { status('error', 'OTP, ইউজারনেম ও পাসওয়ার্ড দিন।'); return; }
    if ($('sPass').value !== $('sPass2').value) { status('error', 'দুই পাসওয়ার্ড মিলছে না।'); return; }
    run($('sGo2'), { action: 'acct_signup_verify', memberNo: signNo, otp: $('sOtp').value, username: $('sUser').value, password: $('sPass').value, email: $('sEmail').value }, function (r) {
      var u = $('sUser').value; ['sOtp', 'sPass', 'sPass2'].forEach(function (i) { $(i).value = ''; });
      $('sStep1').hidden = false; $('sStep2').hidden = true; gShow('login'); $('lUser').value = u.trim().toLowerCase();
      status('info', 'অ্যাকাউন্ট তৈরি হয়েছে। এখন লগইন করুন' + (r.emailMasked ? '। রিকভারি ইমেইল: ' + r.emailMasked : '।'));
    });
  });

  /* ---------- পাসওয়ার্ড রিকভারি ---------- */
  var fUser = '';
  $('gForgot').addEventListener('submit', function (e) { e.preventDefault(); });
  $('fGo1').addEventListener('click', function () {
    if (!$('fUser').value.trim()) { status('error', 'ইউজারনেম দিন।'); return; }
    fUser = $('fUser').value;
    run($('fGo1'), { action: 'acct_recover_start', username: fUser }, function (r) {
      $('fStep1').hidden = true; $('fStep2').hidden = false;
      $('fInfo').textContent = 'ইউজারনেমটি সঠিক হলে রিকভারি ইমেইলে' + (r.emailMasked ? ' (' + r.emailMasked + ')' : '') + ' একটি কোড পাঠানো হয়েছে (১৫ মিনিট বৈধ; স্প্যাম ফোল্ডারও দেখুন)।';
    });
  });
  $('fGo2').addEventListener('click', function () {
    if (!$('fCode').value.trim() || !$('fPass').value) { status('error', 'কোড ও নতুন পাসওয়ার্ড দিন।'); return; }
    if ($('fPass').value !== $('fPass2').value) { status('error', 'দুই পাসওয়ার্ড মিলছে না।'); return; }
    run($('fGo2'), { action: 'acct_recover_verify', username: fUser, code: $('fCode').value, password: $('fPass').value }, function () {
      ['fCode', 'fPass', 'fPass2'].forEach(function (i) { $(i).value = ''; });
      $('fStep1').hidden = false; $('fStep2').hidden = true; gShow('login'); $('lUser').value = fUser.trim().toLowerCase();
      status('info', 'পাসওয়ার্ড বদলানো হয়েছে। নতুন পাসওয়ার্ডে লগইন করুন।');
    });
  });

  /* ---------- ভেতরের অংশ ---------- */
  var uTabs = $('aTabs').querySelectorAll('a'), secs = document.querySelectorAll('[data-tab]'), ctl = document.querySelector('[data-cardctl]');
  function tab(k) {
    Array.prototype.forEach.call(secs, function (s) { s.hidden = s.dataset.tab !== k; });
    Array.prototype.forEach.call(uTabs, function (a) { a.classList.toggle('active', a.dataset.t === k); });
    ctl.hidden = !(k === 'idcard' || k === 'photocard');
    if (k === 'profile') loadProfile(); if (k === 'receipts' || k === 'fund') loadReceipts();
    if ((k === 'idcard' || k === 'photocard') && window.SrijonCard) window.SrijonCard.render();
  }
  Array.prototype.forEach.call(uTabs, function (a) { a.addEventListener('click', function (e) { e.preventDefault(); tab(a.dataset.t); }); });
  function logoutLocal() { token = ''; me = null; loaded = {}; store(''); $('aUser').hidden = true; $('aGuest').hidden = false; }
  $('uOut').addEventListener('click', function () { call({ action: 'acct_logout', token: token }).catch(function () {}); logoutLocal(); status('info', 'লগআউট হয়েছে।'); });
  function enter(r) {
    token = r.token; store(token); me = r; loaded = {};
    $('aGuest').hidden = true; $('aUser').hidden = false; $('uName').textContent = r.name || ''; $('uSub').textContent = 'সদস্য নম্বর: ' + (r.memberNo || '') + (r.username ? ' • ইউজারনেম: ' + r.username : '');
    status('', ''); tab('profile');
  }
  function api(action, extra) { var p = { action: action, token: token }; for (var k in extra) p[k] = extra[k]; return call(p).then(function (r) { if (r && r.error === 'session') { logoutLocal(); status('error', errMsg(r)); throw new Error('session'); } return r; }); }

  function loadProfile() {
    if (loaded.profile) return; loaded.profile = 1;
    api('acct_profile').then(function (r) {
      if (!r.ok) { $('pBody').innerHTML = '<p class="status error">আবেদনের তথ্য পাওয়া যায়নি।</p>'; return; }
      $('pBody').innerHTML = r.groups.map(function (g) {
        if (!g.items.length) return '';
        return '<h3>' + esc(g.title) + '</h3><div class="table-wrap"><table><tbody>' + g.items.map(function (i) { return '<tr><th scope="row">' + esc(i.k) + '</th><td>' + esc(i.v) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }).join('') + '<p class="muted">এনআইডি/জন্মনিবন্ধন নম্বরের শেষ ৪ সংখ্যা ছাড়া বাকি অংশ নিরাপত্তার জন্য ঢেকে দেখানো হয়। তথ্যে ভুল থাকলে কর্তৃপক্ষকে জানান।</p>';
      if (window.SrijonCard) window.SrijonCard.set(r.card);
      loaded.sv = r.saved; showSaved(r.saved);
      if (r.hasPhoto) api('acct_photo').then(function (p) { if (p.ok && window.SrijonCard) { var du = 'data:' + p.mime + ';base64,' + p.data; window.SrijonCard.photo(du); $('aPhotoImg').src = du; $('aPhotoImg').hidden = false; } }).catch(function () {});
    }).catch(function () { loaded.profile = 0; });
  }
  /* ---------- সংরক্ষিত কার্ড ও ছবি আপলোড ---------- */
  var SAVE_TXT = { id: 'আইডি কার্ড', photo: 'ফটোকার্ড' };
  function showSaved(sv) {
    sv = sv || {};
    [['id', 'savedId'], ['photo', 'savedPhoto']].forEach(function (x) {
      var el = $(x[1]); if (!el) return;
      el.innerHTML = (sv[x[0]] ? 'সংরক্ষিত ' + SAVE_TXT[x[0]] + ' (' + esc(bn(sv[x[0]])) + ') <button class="btn btn-outline" type="button" data-getcard="' + x[0] + '">⬇️ সংরক্ষিত কপি ডাউনলোড</button> — ' : '') + 'পিডিএফ ডাউনলোড করলে কার্ডটি আপনার অ্যাকাউন্টে নিজে থেকে সংরক্ষিত হয়।';
    });
  }
  function saveDownload(b64, name) {
    var bin = atob(b64), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    var u = URL.createObjectURL(new Blob([a], { type: 'application/pdf' })), l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); setTimeout(function () { l.remove(); URL.revokeObjectURL(u); }, 1500);
  }
  function b64OfBytes(bytes) { var s = '', ch = 0x8000; for (var i = 0; i < bytes.length; i += ch) s += String.fromCharCode.apply(null, bytes.subarray(i, i + ch)); return btoa(s); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-getcard]'); if (!b) return; b.disabled = true;
    api('acct_card_get', { kind: b.dataset.getcard }).then(function (r) { b.disabled = false; if (!r.ok) { status('error', errMsg(r)); return; } saveDownload(r.data, r.name); }).catch(function () { b.disabled = false; });
  });
  window.SRIJON_ONPDF = function (kind, bytes) {
    if (!token) return;
    api('acct_card_save', { kind: kind, data: b64OfBytes(new Uint8Array(bytes)) }).then(function (r) {
      if (r.ok) { var sv = Object.assign({}, loaded.sv || {}); sv[kind] = r.at; loaded.sv = sv; showSaved(sv); status('info', SAVE_TXT[kind] + ' আপনার অ্যাকাউন্টে সংরক্ষিত হয়েছে।'); }
      else status('error', errMsg(r));
    }).catch(function () {});
  };
  // ছবি আপলোড: ছোট করে JPEG বানিয়ে পাঠানো
  var upFile = null;
  $('aPhotoFile').addEventListener('change', function () { upFile = this.files[0] || null; $('aPhotoGo').disabled = !upFile; });
  $('aPhotoGo').addEventListener('click', function () {
    if (!upFile) return; var btn = this;
    if (!/^image\//.test(upFile.type)) { status('error', 'শুধু ছবির ফাইল দিন।'); return; }
    var im = new Image(), u = URL.createObjectURL(upFile);
    im.onerror = function () { status('error', 'ছবিটি খোলা যায়নি।'); };
    im.onload = function () {
      var m = 1000, k = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      var data = c.toDataURL('image/jpeg', 0.9);
      run(btn, { action: 'acct_photo_upload', token: token, data: data }, function () {
        $('aPhotoImg').src = data; $('aPhotoImg').hidden = false; if (window.SrijonCard) window.SrijonCard.photo(data);
        $('aPhotoFile').value = ''; upFile = null; btn.disabled = true; status('info', 'ছবি সংরক্ষিত হয়েছে। আইডি কার্ড ও ফটোকার্ডে নতুন ছবি ব্যবহার হবে।');
      });
    };
    im.src = u;
  });

  function loadReceipts() {
    if (loaded.rc) return; loaded.rc = 1;
    api('acct_receipts').then(function (r) {
      if (!r.ok) throw new Error('x');
      var note = '<p class="muted">শুধু সেইসব রসিদ দেখানো হয় যেগুলোতে আপনার সদস্য নম্বর লেখা আছে।</p>';
      $('rBody').innerHTML = r.list.length ? '<div class="table-wrap"><table><thead><tr><th>রসিদ নম্বর</th><th>তারিখ</th><th>চাঁদার ধরণ</th><th>পরিমাণ</th><th>মাধ্যম</th><th>পিডিএফ</th></tr></thead><tbody>' +
        r.list.map(function (x) { return '<tr><td>' + esc(x.no) + '</td><td>' + esc(x.date) + '</td><td>' + esc(x.kind) + '</td><td>' + money(x.amount) + '</td><td>' + esc(x.method) + '</td><td>' + (x.hasPdf ? '<button class="btn btn-outline" type="button" data-rno="' + esc(x.no) + '">⬇️ ডাউনলোড</button>' : '—') + '</td></tr>'; }).join('') + '</tbody></table></div>' + note
        : '<p>এখনো কোনো রসিদ পাওয়া যায়নি।</p>' + note;
      $('fBody').innerHTML = '<div class="fund-total"><span>এ পর্যন্ত মোট প্রদান</span><strong>' + money(r.total) + '</strong><small>' + bn(r.count) + 'টি রসিদ</small></div>' +
        (r.kinds.length ? '<h3>খাত অনুযায়ী</h3><div class="table-wrap"><table><thead><tr><th>খাত</th><th>মোট</th></tr></thead><tbody>' + r.kinds.map(function (k) { return '<tr><td>' + esc(k.kind) + '</td><td>' + money(k.amount) + '</td></tr>'; }).join('') + '<tr><th>সর্বমোট</th><th>' + money(r.total) + '</th></tr></tbody></table></div>' : '') +
        (r.list.length ? '<h3>সব লেনদেন (নতুন আগে)</h3><div class="table-wrap"><table><thead><tr><th>তারিখ</th><th>রসিদ</th><th>খাত</th><th>পরিমাণ</th></tr></thead><tbody>' + r.list.map(function (x) { return '<tr><td>' + esc(x.date) + '</td><td>' + esc(x.no) + '</td><td>' + esc(x.kind) + '</td><td>' + money(x.amount) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') + note;
    }).catch(function () { loaded.rc = 0; $('rBody').innerHTML = $('fBody').innerHTML = '<p class="status error">তথ্য আনা যায়নি। পরে আবার চেষ্টা করুন।</p>'; });
  }
  $('rBody').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rno]'); if (!b) return; b.disabled = true;
    api('acct_receipt_pdf', { rno: b.dataset.rno }).then(function (r) {
      b.disabled = false; if (!r.ok) { status('error', 'পিডিএফ পাওয়া যায়নি।'); return; }
      var bin = atob(r.data), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
      var u = URL.createObjectURL(new Blob([a], { type: 'application/pdf' })), l = document.createElement('a'); l.href = u; l.download = r.name; document.body.appendChild(l); l.click(); setTimeout(function () { l.remove(); URL.revokeObjectURL(u); }, 1500);
    }).catch(function () { b.disabled = false; });
  });

  if (!CFG.ACCOUNT_URL) status('info', 'অ্যাকাউন্ট সেবা শিগগিরই চালু হচ্ছে।');
  else if (stored()) {   // পাতা রিফ্রেশে সেশন ফিরিয়ে আনা
    token = stored();
    call({ action: 'acct_profile', token: token }).then(function (r) { if (r && r.ok) { me = {}; $('aGuest').hidden = true; $('aUser').hidden = false; $('uName').textContent = r.card.name; $('uSub').textContent = 'সদস্য নম্বর: ' + r.card.no; loaded.profile = 0; tab('profile'); } else logoutLocal(); }).catch(logoutLocal);
  }
})();
