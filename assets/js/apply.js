/* সদস্য আবেদন ফরম: ঠিকানার ড্রপডাউন, যাচাই, জমা, পিডিএফ ডাউনলোড ও ড্রাইভে সংরক্ষণ
 * ধাপ ১: তথ্য → Apps Script → শিট (ফরম নম্বর ও সময় সার্ভার দেয়)
 * ধাপ ২: ফরম নম্বরসহ পিডিএফ তৈরি → ডাউনলোড + Apps Script → সদস্য ধরণ অনুযায়ী ড্রাইভ ফোল্ডার
 */
(function () {
  'use strict';

  var CFG = window.SRIJON_CONFIG || {};
  var FEE_NUM = { general: 1000, expat: 1200, junior: 100, donor: 2000 };
  var REF_DISCOUNT = 0.2;                                    // রেফারেন্স থাকলে ২০% ছাড়
  var REF_LABEL = { none: 'কোন রেফারেন্স নেই', junior: 'জুনিয়র সদস্য ছিলাম', general: 'সাধারণ সদস্য ছিলাম', expat: 'প্রবাসী সদস্য ছিলাম', donor: 'দাতা সদস্য ছিলাম' };
  function feeAmount(t, ref) {
    if (!FEE_NUM[t]) return 0;
    return Math.round(FEE_NUM[t] * (ref && ref !== 'none' ? 1 - REF_DISCOUNT : 1));
  }
  function feeText(t, ref) { var n = feeAmount(t, ref); return n ? bnNum(n) + ' টাকা' : ''; }
  function bnNum(n) { return bn(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')); }
  var TYPE_LABEL = { general: 'সাধারণ সদস্য', expat: 'প্রবাসী সদস্য', junior: 'জুনিয়র সদস্য', donor: 'দাতা সদস্য' };
  var PHOTO_MAX_SIDE = 1600;                                 // সংরক্ষণের জন্য ছবি এর বেশি বড় হলে ছোট করা হয় (আপলোডের সীমা নেই)
  // সিটি কর্পোরেশনের ওয়ার্ড সংখ্যা
  var CITY_WARDS = {
    'ঢাকা দক্ষিণ সিটি কর্পোরেশন': 75, 'ঢাকা উত্তর সিটি কর্পোরেশন': 54, 'গাজীপুর সিটি কর্পোরেশন': 57,
    'সিলেট সিটি কর্পোরেশন': 42, 'চট্টগ্রাম সিটি কর্পোরেশন': 41, 'রংপুর সিটি কর্পোরেশন': 33,
    'ময়মনসিংহ সিটি কর্পোরেশন': 33, 'রাজশাহী সিটি কর্পোরেশন': 30, 'খুলনা সিটি কর্পোরেশন': 30,
    'বরিশাল সিটি কর্পোরেশন': 30, 'নারায়ণগঞ্জ সিটি কর্পোরেশন': 27, 'কুমিল্লা সিটি কর্পোরেশন': 27,
    'বগুড়া সিটি কর্পোরেশন': 21
  };
  var UNION_WARDS = 9;

  var $ = function (id) { return document.getElementById(id); };
  var form = $('applyForm');
  if (!form) return;

  var geo = null;
  var photoDataUrl = '';
  var photoThumbUrl = '';
  var busy = false;

  // ---------- ছোট হেল্পার ----------
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(s) { return String(s).replace(/\d/g, function (d) { return BN[d]; }); }
  function en(s) { return String(s).replace(/[০-৯]/g, function (d) { return BN.indexOf(d); }); }
  function val(id) { var el = $(id); return el ? el.value.trim() : ''; }
  // ড্রপডাউনে 'অন্য' বাছলে পাশের বক্সের লেখা নেয়
  function pickVal(id) {
    var v = val(id);
    return v === '__other' ? val(id + 'Other') : v;
  }
  function wireOther(id) {
    var sel = $(id), other = $(id + 'Other');
    sel.addEventListener('change', function () {
      var on = sel.value === '__other';
      other.hidden = !on;
      if (on) other.focus(); else other.value = '';
    });
  }
  function wardOptions(n) {
    var a = [];
    for (var i = 1; i <= n; i++) a.push(bn(i) + ' নং ওয়ার্ড');
    return a;
  }
  function setStatus(cls, msg) { var s = $('applyStatus'); s.className = 'status' + (cls ? ' ' + cls : ''); s.textContent = msg || ''; }

  function fillSelect(sel, items, placeholder) {
    sel.innerHTML = '';
    var o = document.createElement('option');
    o.value = ''; o.textContent = placeholder;
    sel.appendChild(o);
    items.forEach(function (t) {
      var op = document.createElement('option');
      op.value = t; op.textContent = t;
      sel.appendChild(op);
    });
  }

  // ---------- ঠিকানা ড্রপডাউন ----------
  function wireAddress(p) {
    var div = $(p + 'Div'), dist = $(p + 'Dist'), upa = $(p + 'Upa'), thana = $(p + 'Thana');
    function divObj() { return geo.divisions.filter(function (d) { return d.name === div.value; })[0]; }
    function distObj() { var d = divObj(); return d && d.districts.filter(function (z) { return z.name === dist.value; })[0]; }

    fillSelect(div, geo.divisions.map(function (d) { return d.name; }), '— নির্বাচন করুন —');
    div.addEventListener('change', function () {
      var d = divObj();
      fillSelect(dist, d ? d.districts.map(function (z) { return z.name; }) : [], d ? '— নির্বাচন করুন —' : '— আগে বিভাগ নির্বাচন করুন —');
      dist.disabled = !d;
      dist.dispatchEvent(new Event('change'));
    });
    var uw = $(p + 'UnionWrap'), ww = $(p + 'WardWrap'), ward = $(p + 'Ward'), wardText = $(p + 'WardText');
    function syncUnionWard() {
      var u = upa.value;
      uw.hidden = ww.hidden = true;
      $(p + 'Loc').classList.remove('city');
      wardText.hidden = true; wardText.value = '';
      ward.hidden = false;
      if (!u) return;
      if (/সিটি কর্পোরেশন$/.test(u)) {                       // সিটি কর্পোরেশন: শুধু ওয়ার্ড (সিটি কর্পোরেশনের ঠিক নিচে)
        ww.hidden = false;
        $(p + 'Loc').classList.add('city');
        if (CITY_WARDS[u]) fillSelect(ward, wardOptions(CITY_WARDS[u]), '— নির্বাচন করুন —');
        else { ward.hidden = true; wardText.hidden = false; }
      } else {                                                  // উপজেলা: ইউনিয়ন/পৌরসভা + ওয়ার্ড (১–৯)
        uw.hidden = ww.hidden = false;
        fillSelect(ward, wardOptions(UNION_WARDS), '— নির্বাচন করুন —');
      }
      $(p + 'Union').value = '';
    }
    upa.addEventListener('change', syncUnionWard);
    dist.addEventListener('change', function () {
      var z = distObj();
      fillSelect(upa, z ? z.upazilas : [], z ? '— নির্বাচন করুন —' : '— আগে জেলা নির্বাচন করুন —');
      fillSelect(thana, z ? z.thanas : [], z ? '— নির্বাচন করুন —' : '— আগে জেলা নির্বাচন করুন —');
      upa.disabled = thana.disabled = !z;
      syncUnionWard();
    });
  }

  function loadGeo() {
    return fetch('../data/geo.json').then(function (r) { return r.json(); }).then(function (g) {
      geo = g;
      wireAddress('perm');
      wireAddress('cur');
      fillSelect($('country'), g.countries.filter(function (c) { return c !== 'বাংলাদেশ'; }), '— নির্বাচন করুন —');
      ['perm', 'cur'].forEach(function (p) { wireOther(p + 'PO'); wireOther(p + 'Village'); wireOther(p + 'Para'); });
    });
  }

  // ---------- ইন্টারঅ্যাকশন ----------
  function syncNidRules() {
    var t = val('memberType');
    $('nidReq').hidden = t !== 'general';
    $('birthRegWrap').hidden = t !== 'junior';
    if (t !== 'junior') $('birthReg').value = '';
    $('nidHelp').textContent = t === 'junior' ? 'এনআইডি অথবা জন্মনিবন্ধন সনদ নম্বর — যেকোনো একটি বাধ্যতামূলক'
      : t === 'general' ? 'সাধারণ সদস্যের জন্য বাধ্যতামূলক' : 'ঐচ্ছিক';
  }
  // রেফারেন্স: নিজের সদস্য ধরণের রেফারেন্স বাছাই করা যাবে না
  function syncReference() {
    var t = val('memberType'), sel = $('reference');
    Array.prototype.forEach.call(sel.options, function (o) {
      var off = o.value !== 'none' && o.value === t;
      o.hidden = off; o.disabled = off;
    });
    if (sel.value !== 'none' && sel.value === t) sel.value = 'none';
  }
  function syncFee() {
    var t = val('memberType'), r = val('reference');
    $('fee').value = feeText(t, r);
    $('feeNote').hidden = !(t && r && r !== 'none');
  }
  $('memberType').addEventListener('change', function () { syncReference(); syncFee(); syncNidRules(); });
  $('reference').addEventListener('change', syncFee);
  wireOther('religion');
  syncNidRules();

  $('countryType').addEventListener('change', function () {
    var ab = this.value === 'abroad';
    $('countryWrap').hidden = !ab;
    if (!ab) $('country').value = '';
  });

  [['education', 'educationOther'], ['profession', 'professionOther']].forEach(function (pair) {
    var sel = $(pair[0]), other = $(pair[1]);
    sel.addEventListener('change', function () {
      var on = sel.value === '__other';
      other.hidden = !on;
      if (on) other.focus(); else other.value = '';
    });
  });

  Array.prototype.forEach.call(form.querySelectorAll('input[name="addrSame"]'), function (r) {
    r.addEventListener('change', function () {
      $('curWrap').hidden = form.addrSame.value !== 'diff';
    });
  });

  // ছবি: যেকোনো আকারের ছবি নেওয়া হয়; ব্রাউজারেই ছোট (সর্বোচ্চ ১৬০০ পিক্সেল) JPEG ও শিটের জন্য থাম্বনেইল বানানো হয়
  function scaled(img, maxSide, quality) {
    var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, maxSide / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    var x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);   // স্বচ্ছ PNG-র জন্য সাদা জমিন
    x.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  }
  $('photo').addEventListener('change', function () {
    var input = this, f = input.files && input.files[0];
    var prev = $('photoPreview');
    photoDataUrl = ''; photoThumbUrl = '';
    prev.hidden = true;
    if (!f) return;
    setStatus('', '');
    var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () {
      try {
        photoDataUrl = scaled(img, PHOTO_MAX_SIDE, 0.9);
        photoThumbUrl = scaled(img, 200, 0.75);
        $('photoImg').src = photoThumbUrl;
        $('photoInfo').textContent = f.name + ' (' + bn(Math.round(f.size / 1024)) + ' কেভি)';
        prev.hidden = false;
      } catch (e) { input.value = ''; setStatus('error', 'ছবিটি পড়া যায়নি। অন্য একটি JPG বা PNG ছবি দিন।'); }
      URL.revokeObjectURL(url);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url); input.value = '';
      setStatus('error', 'ছবিটি পড়া যায়নি। অনুগ্রহ করে JPG বা PNG ছবি দিন।');
    };
    img.src = url;
  });

  // ---------- যাচাই ----------
  function fail(id, msg) {
    var el = $(id);
    setStatus('error', msg);
    if (el) { el.focus(); if (el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    return false;
  }

  function validate() {
    if (!val('memberType')) return fail('memberType', 'সদস্য ধরণ নির্বাচন করুন।');
    if (!val('nameBn')) return fail('nameBn', 'নাম (বাংলায়) লিখুন।');
    if (!val('nameEn')) return fail('nameEn', 'নাম (ইংরেজিতে) লিখুন।');
    if (!val('father')) return fail('father', 'পিতার নাম লিখুন।');
    if (!val('mother')) return fail('mother', 'মাতার নাম লিখুন।');
    if (!val('dob')) return fail('dob', 'জন্ম তারিখ নির্বাচন করুন।');
    if (new Date(val('dob')) > new Date()) return fail('dob', 'জন্ম তারিখ ভবিষ্যতের হতে পারে না।');
    if (!val('gender')) return fail('gender', 'লিঙ্গ নির্বাচন করুন।');
    if (!val('education')) return fail('education', 'শিক্ষাগত যোগ্যতা নির্বাচন করুন।');
    if (val('education') === '__other' && !val('educationOther')) return fail('educationOther', 'শিক্ষাগত যোগ্যতা লিখুন।');
    if (!val('profession')) return fail('profession', 'পেশা নির্বাচন করুন।');
    if (val('profession') === '__other' && !val('professionOther')) return fail('professionOther', 'পেশা লিখুন।');
    if (!val('religion')) return fail('religion', 'ধর্ম নির্বাচন করুন।');
    if (val('religion') === '__other' && !val('religionOther')) return fail('religionOther', 'ধর্ম লিখুন।');
    var type = val('memberType');
    var nid = en(val('nid')).replace(/[\s-]/g, '');
    var reg = en(val('birthReg')).replace(/[\s-]/g, '');
    if (nid && !/^(\d{10}|\d{13}|\d{17})$/.test(nid)) return fail('nid', 'এনআইডি নম্বর সঠিক নয় (১০, ১৩ বা ১৭ অঙ্ক)।');
    if (reg && !/^\d{10,20}$/.test(reg)) return fail('birthReg', 'জন্মনিবন্ধন সনদ নম্বর সঠিক নয় (শুধু অঙ্ক)।');
    if (type === 'general' && !nid) return fail('nid', 'সাধারণ সদস্যের জন্য এনআইডি নম্বর দেওয়া বাধ্যতামূলক।');
    if (type === 'junior' && !nid && !reg) return fail('nid', 'জুনিয়র সদস্যের জন্য এনআইডি অথবা জন্মনিবন্ধন সনদ নম্বর — যেকোনো একটি দিন।');
    var phone = en(val('phone')).replace(/[\s-]/g, '');
    if (phone && !/^\+?\d{7,16}$/.test(phone)) return fail('phone', 'ফোন নম্বর সঠিক নয়।');
    var wa = en(val('whatsapp')).replace(/[\s-]/g, '');
    if (wa && !/^\+?\d{7,16}$/.test(wa)) return fail('whatsapp', 'ওয়াটসঅ্যাপ নম্বর সঠিক নয়।');
    if (val('email') && !$('email').checkValidity()) return fail('email', 'ইমেইল ঠিকানা সঠিক নয়।');

    var blocks = ['perm'];
    if (form.addrSame.value === 'diff') blocks.push('cur');
    for (var i = 0; i < blocks.length; i++) {
      var p = blocks[i], t = p === 'perm' ? 'স্থায়ী ঠিকানার ' : 'বর্তমান ঠিকানার ';
      if (!val(p + 'Div')) return fail(p + 'Div', t + 'বিভাগ নির্বাচন করুন।');
      if (!val(p + 'Dist')) return fail(p + 'Dist', t + 'জেলা নির্বাচন করুন।');
      if (!val(p + 'Upa')) return fail(p + 'Upa', t + 'উপজেলা/সিটি কর্পোরেশন নির্বাচন করুন।');
      if (!val(p + 'Thana')) return fail(p + 'Thana', t + 'থানা নির্বাচন করুন।');
      if (!$(p + 'UnionWrap').hidden && !val(p + 'Union')) return fail(p + 'Union', t + 'ইউনিয়ন/পৌরসভা লিখুন।');
      if (!$(p + 'WardWrap').hidden && !pickWard(p)) return fail($(p + 'Ward').hidden ? p + 'WardText' : p + 'Ward', t + 'ওয়ার্ড নির্বাচন করুন।');
      if (!pickVal(p + 'PO')) return fail(val(p + 'PO') === '__other' ? p + 'POOther' : p + 'PO', t + 'পোস্ট অফিস নির্বাচন করুন বা লিখুন।');
      if (!pickVal(p + 'Village')) return fail(val(p + 'Village') === '__other' ? p + 'VillageOther' : p + 'Village', t + 'গ্রাম নির্বাচন করুন বা লিখুন।');
      if (val(p + 'Para') === '__other' && !val(p + 'ParaOther')) return fail(p + 'ParaOther', t + 'পাড়ার নাম লিখুন।');
    }
    if (!val('countryType')) return fail('countryType', 'দেশের নাম নির্বাচন করুন।');
    if (val('countryType') === 'abroad' && !val('country')) return fail('country', 'প্রবাসের দেশ নির্বাচন করুন।');
    if (!photoDataUrl) return fail('photo', 'আপনার ছবি দিন।');
    if (!$('agree').checked) return fail('agree', 'অঙ্গীকারনামায় টিক চিহ্ন দিন।');
    return true;
  }

  // ---------- তথ্য সংগ্রহ ----------
  function pickWard(p) { return $(p + 'Ward').hidden ? val(p + 'WardText') : val(p + 'Ward'); }
  function addr(p) {
    return {
      div: val(p + 'Div'), dist: val(p + 'Dist'), upa: val(p + 'Upa'), thana: val(p + 'Thana'),
      union: $(p + 'UnionWrap').hidden ? '' : val(p + 'Union'),
      ward: $(p + 'WardWrap').hidden ? '' : pickWard(p),
      po: pickVal(p + 'PO'), village: pickVal(p + 'Village'), para: pickVal(p + 'Para')
    };
  }
  function addrText(a) {
    return [a.para && 'পাড়া: ' + a.para, 'গ্রাম: ' + a.village, 'পোস্ট অফিস: ' + a.po,
      a.union && 'ইউনিয়ন/পৌরসভা: ' + a.union, a.ward && 'ওয়ার্ড: ' + a.ward,
      'থানা: ' + a.thana, a.upa, 'জেলা: ' + a.dist, a.div + ' বিভাগ'].filter(Boolean).join(', ');
  }
  function collect() {
    var perm = addr('perm');
    var same = form.addrSame.value !== 'diff';
    var cur = same ? perm : addr('cur');
    var dob = val('dob').split('-');                       // yyyy-mm-dd
    return {
      memberType: val('memberType'),
      memberTypeLabel: TYPE_LABEL[val('memberType')],
      reference: val('reference') || 'none',
      referenceLabel: REF_LABEL[val('reference') || 'none'],
      feeText: feeText(val('memberType'), val('reference')),
      nameBn: val('nameBn'),
      nameEn: val('nameEn').toUpperCase(),
      father: val('father'),
      mother: val('mother'),
      dob: val('dob'),
      dobText: bn(dob[2] + '/' + dob[1] + '/' + dob[0]),
      gender: val('gender'),
      blood: val('blood'),
      education: val('education') === '__other' ? val('educationOther') : val('education'),
      profession: val('profession') === '__other' ? val('professionOther') : val('profession'),
      religion: val('religion') === '__other' ? val('religionOther') : val('religion'),
      nid: en(val('nid')).replace(/[\s-]/g, ''),
      birthReg: en(val('birthReg')).replace(/[\s-]/g, ''),
      phone: en(val('phone')).replace(/[\s-]/g, ''),
      whatsapp: en(val('whatsapp')).replace(/[\s-]/g, ''),
      email: val('email'),
      perm: perm,
      addrSame: same,
      cur: cur,
      currentText: same ? 'স্থায়ী ঠিকানার অনুরূপ' : addrText(cur),
      country: val('countryType') === 'abroad' ? val('country') : 'বাংলাদেশ',
      countryType: val('countryType') === 'abroad' ? 'প্রবাসী' : 'বাংলাদেশ',
      website: form.website.value
    };
  }

  // ---------- নেটওয়ার্ক ----------
  function post(payload) {
    return fetch(CFG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); });
  }

  // সার্ভারের সময় ("yyyy-MM-dd HH:mm:ss", ঢাকা) → "16/10/2026, 10:14:58 pm"
  function enStamp(ts) {
    var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(ts || '');
    var d, mo, y, h, mi, se;
    if (m) { y = m[1]; mo = m[2]; d = m[3]; h = +m[4]; mi = m[5]; se = m[6]; }
    else {
      var n = new Date(); function z(x) { return ('0' + x).slice(-2); }
      y = n.getFullYear(); mo = z(n.getMonth() + 1); d = z(n.getDate()); h = n.getHours(); mi = z(n.getMinutes()); se = z(n.getSeconds());
    }
    var ap = h >= 12 ? 'pm' : 'am', h12 = h % 12 || 12;
    return d + '/' + mo + '/' + y + ', ' + ('0' + h12).slice(-2) + ':' + mi + ':' + se + ' ' + ap;
  }

  function shortBlood(b) { var m = /\(([^)]+)\)/.exec(b || ''); return m ? m[1] : (b || ''); }

  function triggerDownload(url, name) {
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- জমা ----------
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    if (form.website.value) return;                        // হানিপট
    if (!geo) { setStatus('error', 'পেইজ লোড সম্পূর্ণ হয়নি, কিছুক্ষণ পর আবার চেষ্টা করুন।'); return; }
    if (!validate()) return;

    var data = collect();
    var btn = $('applySubmit');
    busy = true; btn.disabled = true;
    setStatus('info', 'আবেদন জমা হচ্ছে… অনুগ্রহ করে অপেক্ষা করুন।');

    var serverInfo;
    post({ action: 'submit', data: data }).then(function (res) {
      if (!res || !res.ok) throw new Error((res && res.error) || 'submit failed');
      serverInfo = res;
      setStatus('info', 'পিডিএফ তৈরি হচ্ছে…');
      var pdfData = {
        formNo: res.formNo, memberNo: '', feeText: data.feeText, memberType: data.memberType,
        nameBn: data.nameBn, nameEn: data.nameEn, father: data.father, mother: data.mother,
        dobText: data.dobText, gender: data.gender, blood: shortBlood(data.blood),
        education: data.education, profession: data.profession, religion: data.religion,
        nid: bn(data.nid), birthReg: bn(data.birthReg), phone: bn(data.phone), whatsapp: bn(data.whatsapp), email: data.email,
        perm: data.perm, currentText: data.currentText, country: data.country,
        photoDataUrl: photoDataUrl, timestampEn: enStamp(res.timestamp)
      };
      return window.SrijonPDF.build(pdfData);
    }).then(function (pdf) {
      var url = URL.createObjectURL(pdf.blob);
      var fname = 'Srijonshil-Application-' + serverInfo.formNo + '.pdf';
      $('successFormNo').textContent = serverInfo.formNo;
      var dl = $('downloadPdf');
      dl.href = url; dl.setAttribute('download', fname);
      form.hidden = true;
      $('applySuccess').hidden = false;
      $('applySuccess').scrollIntoView({ behavior: 'smooth', block: 'start' });
      triggerDownload(url, fname);

      // ড্রাইভে কপি (ব্যর্থ হলে একবার পুনরায় চেষ্টা)
      var payload = { action: 'pdf', formNo: serverInfo.formNo, token: serverInfo.token, memberType: data.memberType, nameEn: data.nameEn, pdf: window.SrijonPDF.toBase64(pdf.bytes) };
      var note = document.createElement('p');
      note.className = 'small muted';
      note.textContent = 'সংগঠনের কাছে পিডিএফ কপি ও ছবি সংরক্ষণ করা হচ্ছে…';
      $('applySuccess').insertBefore(note, $('applySuccess').querySelector('.btn-row'));
      var why = [];
      function upload(payload, retry) {
        return post(payload).then(function (r) {
          if (!r || !r.ok) throw new Error((r && r.error) || 'empty response');
          return true;
        }).catch(function (e) {
          var m = String(e && e.message || e);
          if (window.console) console.error('upload ' + payload.action + ' failed:', m);
          if (retry) return upload(payload, false);
          why.push(payload.action + ': ' + m.substring(0, 160));
          return false;
        });
      }
      var photoPayload = { action: 'photo', formNo: serverInfo.formNo, token: serverInfo.token, nameEn: data.nameEn, photo: photoDataUrl.split(',')[1], thumb: photoThumbUrl.split(',')[1] };
      return upload(payload, true).then(function (okPdf) {
        return upload(photoPayload, true).then(function (okPhoto) {
          note.textContent = okPdf && okPhoto ? '✔ পিডিএফ কপি ও ছবি সংগঠনের কাছে সংরক্ষিত হয়েছে।'
            : 'আপনার আবেদন গৃহীত হয়েছে। ' + (okPdf ? '' : 'পিডিএফ কপি ') + (!okPdf && !okPhoto ? 'ও ' : '') + (okPhoto ? '' : 'ছবি ') + 'সংরক্ষণে সমস্যা হয়েছে; আপনার ডাউনলোড করা কপিটি সংগঠনের কার্যালয়ে জমা দিন।';
          if (why.length) {
            var d = document.createElement('p');
            d.className = 'small muted'; d.style.wordBreak = 'break-word';
            d.textContent = 'কারিগরি তথ্য (প্রশাসকের জন্য): ' + why.join(' | ');
            note.parentNode.insertBefore(d, note.nextSibling);
          }
        });
      });
    }).catch(function (err) {
      if (serverInfo) {
        setStatus('error', 'আপনার আবেদন গৃহীত হয়েছে (ফরম নম্বর: ' + serverInfo.formNo + ') কিন্তু পিডিএফ তৈরি করা যায়নি। ফরম নম্বরটি সংরক্ষণ করে সংগঠনের সাথে যোগাযোগ করুন।');
      } else {
        setStatus('error', 'দুঃখিত, আবেদন জমা হয়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।' + (err && err.message && /[a-z]/i.test(err.message) ? '' : ' ' + (err.message || '')));
      }
    }).then(function () {
      busy = false; btn.disabled = false;
    });
  });

  loadGeo().catch(function () {
    setStatus('error', 'ঠিকানার তালিকা লোড করা যায়নি। পেইজটি রিফ্রেশ করুন।');
  });
})();
