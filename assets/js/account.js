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
  function store(v) { try { if (v) localStorage.setItem(TK, v); else { localStorage.removeItem(TK); sessionStorage.removeItem(TK); } } catch (e) { try { if (v) sessionStorage.setItem(TK, v); } catch (e2) {} } }   // লগআউট না করা পর্যন্ত এই ডিভাইসে লগইন থাকে
  function stored() { try { return localStorage.getItem(TK) || sessionStorage.getItem(TK) || ''; } catch (e) { return ''; } }

  var ERR = {
    invalid: 'তথ্য সঠিকভাবে দিন (এনআইডি শুধু সংখ্যা)।',
    nomatch: 'দেওয়া তথ্য আমাদের রেকর্ডের সাথে মেলেনি। সদস্য ধরণ, নম্বর ও এনআইডি ঠিক আছে কি না দেখুন। বারবার ভুল হলে ৩০ মিনিটের জন্য তালা পড়বে।',
    ticket_expired: 'যাচাইয়ের মেয়াদ (১৫ মিনিট) শেষ। আবার তথ্য যাচাই করুন।',
    exists: 'এই সদস্য নম্বরে আগেই অ্যাকাউন্ট খোলা হয়েছে। লগইন করুন, না পারলে "পাসওয়ার্ড ভুলে গেছেন?" ব্যবহার করুন।',
    mail_failed: 'কোড ইমেইলে পাঠানো যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    bad_image: 'ছবিটি নেওয়া যায়নি। JPG/PNG ছবি দিন।', bad_pdf: 'কার্ড সংরক্ষণ করা যায়নি।', too_many: 'অনেক বেশিবার আপলোড হয়েছে, এক ঘণ্টা পরে চেষ্টা করুন।', nocard: 'সংরক্ষিত কার্ড পাওয়া যায়নি।',
    empty: 'কিছু লিখুন।', too_long: 'লেখাটি অনেক বড় (সর্বোচ্চ ১০০০ অক্ষর)।', too_many_posts: 'অনেক বেশি পোস্ট করা হয়েছে, কিছুক্ষণ পরে চেষ্টা করুন।', nopdf: 'আবেদন ফরমের কপি পাওয়া যায়নি।',
    too_many_otp: 'এই নম্বরে ঘণ্টায় অনেকবার OTP চাওয়া হয়েছে। পরে চেষ্টা করুন।',
    otp_wrong: 'কোড ভুল হয়েছে।', otp_expired: 'কোডের মেয়াদ শেষ বা ভুল চেষ্টা বেশি হয়েছে। নতুন কোড নিন।',
    bad_username: 'ইউজারনেম ৩–৩০ অক্ষরের, ইংরেজি ছোট হরফ/সংখ্যা/_/. দিয়ে হতে হবে।',
    bad_password: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে এবং ইউজারনেমের সমান নয়।',
    user_taken: 'এই ইউজারনেম আগেই নেওয়া হয়েছে, অন্যটি দিন।',
    need_email: 'সঠিক ইমেইল দিন (পাসওয়ার্ড রিকভারির জন্য)।',
    badlogin: 'ইউজারনেম বা পাসওয়ার্ড ভুল।', locked: 'অনেকবার ভুল হয়েছে। ৩০ মিনিট পর আবার চেষ্টা করুন।',
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

  /* ---------- অ্যাকাউন্ট খোলা: ধরণ → নম্বর (সাজেস্ট) → নাম (নিজে বসে) → এনআইডি যাচাই → পাসওয়ার্ড ---------- */
  var ALL = window.SRIJON_MEMBERS || {}, ticket = '', signNo = '';
  var PREFIX = { general: 'STS/GM/', expat: 'STS/OM/', donor: 'STS/DM/', junior: 'STS/JM/' };
  function toEn(v) { return String(v).replace(/[০-৯]/g, function (c) { return BN.indexOf(c); }); }
  function prefix() { return PREFIX[$('sType').value] || ''; }
  function suggestList() {
    var list = ALL[$('sType').value] || [], dl = $('sNoList'), pf = prefix();
    dl.innerHTML = list.map(function (m) { return '<option value="' + esc(m.no) + '">' + esc(m.n) + '</option>'; }).join('');
    $('sNo').disabled = !pf; $('sNo').value = pf; $('sName').value = ''; $('sNid').disabled = true; $('sNid').value = ''; $('sCheck').disabled = true;
    $('sNo').placeholder = pf ? pf + '0000' : 'আগে সদস্য ধরণ বাছাই করুন';
    if (pf) { $('sNo').focus(); }
    if (pf && !list.length) status('info', 'এই ধরণে এখনো কোনো সদস্য তালিকাভুক্ত নেই।'); else status('', '');
  }
  function memberOf(no) { var l = ALL[$('sType').value] || [], k = String(no).trim().toUpperCase(); for (var i = 0; i < l.length; i++) if (l[i].no.toUpperCase() === k) return l[i]; return null; }
  // সদস্য নম্বর: প্রিফিক্স (STS/GM/) ঠিক থাকে; বাংলা/ইংরেজি সংখ্যা লিখলে ইংরেজি হয়ে যায়; ৪ সংখ্যা হলেই নাম বসে
  function onNo(e) {
    var pf = prefix(); if (!pf) return;
    var en = toEn($('sNo').value).toUpperCase(), suf = (en.indexOf(pf) === 0 ? en.slice(pf.length) : en).replace(/\D/g, '').slice(0, 4);
    if (e && e.type === 'change' && suf.length > 0 && suf.length < 4) suf = ('0000' + suf).slice(-4);   // ফাঁকা হলে ০ দিয়ে ভরে (5 → 0005)
    var v = pf + suf; if ($('sNo').value !== v) $('sNo').value = v;
    var m = suf.length === 4 ? memberOf(v) : null;
    $('sName').value = m ? m.n : ''; $('sNid').disabled = !m; if (!m) $('sNid').value = '';
    if (suf.length === 4 && !m) status('error', 'এই নম্বরে কোনো সদস্য পাওয়া যায়নি। নম্বরটি আবার দেখুন।'); else if (m) status('', '');
    checkReady();
  }
  function checkReady() { $('sCheck').disabled = !(memberOf($('sNo').value) && /^\d{10,17}$/.test(toEn($('sNid').value).trim())); }
  $('sType').addEventListener('change', suggestList);
  $('sNo').addEventListener('input', onNo); $('sNo').addEventListener('change', onNo);
  $('sNid').addEventListener('input', function () { var v = toEn($('sNid').value).replace(/\D/g, ''); if ($('sNid').value !== v) $('sNid').value = v; checkReady(); });
  $('gSignup').addEventListener('submit', function (e) { e.preventDefault(); });
  function lockIdentity(on) { ['sType', 'sNo', 'sNid'].forEach(function (i) { $(i).disabled = on; }); $('sCheck').hidden = on; if (!on) onNo(); }
  $('sCheck').addEventListener('click', function () {
    var m = memberOf($('sNo').value); if (!m) { status('error', 'তালিকা থেকে সদস্য নম্বর বাছাই করুন।'); return; }
    signNo = m.no;
    run($('sCheck'), { action: 'acct_signup_check', type: $('sType').value, memberNo: m.no, name: m.n, nid: toEn($('sNid').value) }, function (r) {
      ticket = r.ticket; lockIdentity(true); $('sStep2').hidden = false; $('sEmailWrap').hidden = !r.needEmail; $('sUser').focus();
    });
  });
  $('sBack').addEventListener('click', function (e) { e.preventDefault(); ticket = ''; lockIdentity(false); $('sStep2').hidden = true; ['sPass', 'sPass2'].forEach(function (i) { $(i).value = ''; }); status('', ''); });
  $('sGo2').addEventListener('click', function () {
    if (!ticket) { status('error', 'আগে তথ্য যাচাই করুন।'); return; }
    if (!$('sUser').value.trim() || !$('sPass').value) { status('error', 'ইউজারনেম ও পাসওয়ার্ড দিন।'); return; }
    if ($('sPass').value !== $('sPass2').value) { status('error', 'দুই পাসওয়ার্ড মিলছে না।'); return; }
    run($('sGo2'), { action: 'acct_signup_create', ticket: ticket, username: $('sUser').value, password: $('sPass').value, email: $('sEmail').value }, function (r) {
      var u = $('sUser').value.trim().toLowerCase(); ['sPass', 'sPass2', 'sNid'].forEach(function (i) { $(i).value = ''; }); ticket = '';
      $('sStep1').hidden = true; $('sStep2').hidden = true; $('sDone').hidden = false;
      $('sDoneMsg').textContent = (r.name || '') + ', সংগঠনের সদস্য অ্যাকাউন্টে আপনাকে স্বাগতম! আপনার অ্যাকাউন্ট সফলভাবে খোলা হয়েছে। সদস্য নম্বর: ' + (r.memberNo || signNo) + ', ইউজারনেম: ' + u + '। এখন লগইন করে প্রোফাইল, আইডি কার্ড, ফটোকার্ড, রসিদ ও চাঁদার হিসাব দেখুন।';
      $('sToLogin').onclick = function () { $('sDone').hidden = true; $('sStep1').hidden = false; lockIdentity(false); suggestList(); $('sType').value = ''; gShow('login'); $('lUser').value = u; $('lPass').focus(); };
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
    if (k === 'profile') loadProfile(); if (k === 'receipts' || k === 'fund') loadReceipts(); if (k === 'feed') loadFeed(true);
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
      var pdfBox = r.hasFormPdf ? '<div class="form-pdf"><h3>আবেদন ফরমের কপি</h3><p>সদস্যপদের জন্য সর্বপ্রথম জমা দেওয়া পূরণকৃত আবেদন ফরম। এটি শুধু ডাউনলোড করা যাবে, বদলানো যাবে না।</p><button class="btn btn-outline" type="button" id="formPdfGo">⬇️ আবেদন ফরম (PDF) ডাউনলোড</button></div>' : '';
      $('pBody').innerHTML = pdfBox + r.groups.map(function (g) {
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
    var f = e.target.closest('#formPdfGo'); if (!f) return; f.disabled = true;
    api('acct_form_pdf').then(function (r) { f.disabled = false; if (!r.ok) { status('error', errMsg(r)); return; } saveDownload(r.data, r.name); }).catch(function () { f.disabled = false; });
  });
  /* ---------- নিউজফিড ---------- */
  var feedLast = 0;
  function feedItem(p) {
    return '<article class="feed-post" data-id="' + p.id + '"><header><strong>' + esc(p.name) + '</strong> <small>' + esc(bn(p.time)) + '</small>' + (p.mine ? ' <button type="button" class="feed-del" data-fdel="' + p.id + '">মুছুন</button>' : '') + '</header><p>' + esc(p.text).replace(/\n/g, '<br>') + '</p></article>';
  }
  function loadFeed(reset) {
    if (reset) { feedLast = 0; $('feedList').innerHTML = '<p>লোড হচ্ছে…</p>'; }
    api('acct_feed_list', { before: feedLast }).then(function (r) {
      if (!r.ok) { $('feedList').innerHTML = '<p class="status error">লোড করা যায়নি।</p>'; return; }
      var h = r.posts.map(feedItem).join('');
      if (reset) $('feedList').innerHTML = h || '<p class="muted">এখনো কোনো পোস্ট নেই। প্রথম পোস্টটি আপনিই করুন!</p>'; else $('feedList').insertAdjacentHTML('beforeend', h);
      if (r.posts.length) feedLast = r.posts[r.posts.length - 1].id; $('feedMore').hidden = !r.more;
    }).catch(function () {});
  }
  $('feedMore').addEventListener('click', function () { loadFeed(false); });
  $('feedText').addEventListener('input', function () { $('feedCnt').textContent = bn(this.value.length) + '/১০০০'; });
  $('feedGo').addEventListener('click', function () {
    var t = $('feedText').value.trim(); if (!t) { status('error', errMsg({ error: 'empty' })); return; }
    run(this, { action: 'acct_feed_post', token: token, text: t }, function () { $('feedText').value = ''; $('feedCnt').textContent = '০/১০০০'; status('info', 'পোস্ট করা হয়েছে।'); loadFeed(true); });
  });
  document.addEventListener('click', function (e) {
    var d = e.target.closest('[data-fdel]'); if (!d || !confirm('পোস্টটি মুছে ফেলবেন?')) return;
    api('acct_feed_delete', { id: d.dataset.fdel }).then(function (r) { if (r.ok) { var a = d.closest('.feed-post'); if (a) a.remove(); } else status('error', errMsg(r)); }).catch(function () {});
  });
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
  /* ---------- পাসওয়ার্ড দেখান ---------- */
  ['lPass', 'sPass', 'fPass'].forEach(function (id) {
    var inp = $(id); if (!inp) return; var ids = id === 'lPass' ? [id] : [id, id + '2'];
    var l = document.createElement('label'); l.className = 'showpw'; l.innerHTML = '<input type="checkbox"> Show Password';
    l.firstChild.addEventListener('change', function () { var t = this.checked ? 'text' : 'password'; ids.forEach(function (i) { var e = $(i); if (e) e.type = t; }); });
    var host = $(ids[ids.length - 1]).parentNode; host.appendChild(l);
  });
})();
