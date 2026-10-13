/* সদস্য আবেদন ফরম: ঠিকানার ড্রপডাউন, যাচাই, জমা, পিডিএফ ডাউনলোড ও ড্রাইভে সংরক্ষণ
 * ধাপ ১: তথ্য → Apps Script → শিট (ফরম নম্বর ও সময় সার্ভার দেয়)
 * ধাপ ২: ফরম নম্বরসহ পিডিএফ তৈরি → ডাউনলোড + Apps Script → সদস্য ধরণ অনুযায়ী ড্রাইভ ফোল্ডার
 */
(function () {
  'use strict';

  var CFG = window.SRIJON_CONFIG || {};
  var FEES = { general: '১,০০০ টাকা', expat: '১,২০০ টাকা', junior: '১০০ টাকা', donor: '২,০০০ টাকা' };
  var TYPE_LABEL = { general: 'সাধারণ সদস্য', expat: 'প্রবাসী সদস্য', junior: 'জুনিয়র সদস্য', donor: 'দাতা সদস্য' };
  var MAX_PHOTO = 500 * 1024;

  var $ = function (id) { return document.getElementById(id); };
  var form = $('applyForm');
  if (!form) return;

  var geo = null;
  var photoDataUrl = '';
  var busy = false;

  // ---------- ছোট হেল্পার ----------
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(s) { return String(s).replace(/\d/g, function (d) { return BN[d]; }); }
  function en(s) { return String(s).replace(/[০-৯]/g, function (d) { return BN.indexOf(d); }); }
  function val(id) { var el = $(id); return el ? el.value.trim() : ''; }
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
    dist.addEventListener('change', function () {
      var z = distObj();
      fillSelect(upa, z ? z.upazilas : [], z ? '— নির্বাচন করুন —' : '— আগে জেলা নির্বাচন করুন —');
      fillSelect(thana, z ? z.thanas : [], z ? '— নির্বাচন করুন —' : '— আগে জেলা নির্বাচন করুন —');
      upa.disabled = thana.disabled = !z;
    });
  }

  function loadGeo() {
    return fetch('../data/geo.json').then(function (r) { return r.json(); }).then(function (g) {
      geo = g;
      wireAddress('perm');
      wireAddress('cur');
      fillSelect($('country'), g.countries, '— নির্বাচন করুন —');
      var bd = g.countries.indexOf('বাংলাদেশ');
      if (bd > -1) $('country').value = 'বাংলাদেশ';
    });
  }

  // ---------- ইন্টারঅ্যাকশন ----------
  $('memberType').addEventListener('change', function () {
    $('fee').value = FEES[this.value] || '';
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

  $('nameBn').addEventListener('input', function () {
    $('pledgeName').textContent = this.value.trim() || '………………………';
  });

  $('photo').addEventListener('change', function () {
    var f = this.files && this.files[0];
    var prev = $('photoPreview');
    photoDataUrl = '';
    prev.hidden = true;
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      this.value = ''; setStatus('error', 'ছবি অবশ্যই JPG, PNG বা WEBP হতে হবে।'); return;
    }
    if (f.size > MAX_PHOTO) {
      this.value = '';
      setStatus('error', 'ছবির আকার সর্বোচ্চ ৫০০ কেভি হতে হবে। আপনার ছবি ' + bn(Math.round(f.size / 1024)) + ' কেভি। ছোট আকারের ছবি দিন।');
      return;
    }
    setStatus('', '');
    var fr = new FileReader();
    fr.onload = function () {
      photoDataUrl = fr.result;
      $('photoImg').src = photoDataUrl;
      $('photoInfo').textContent = f.name + ' (' + bn(Math.round(f.size / 1024)) + ' কেভি)';
      prev.hidden = false;
    };
    fr.readAsDataURL(f);
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
    if (!val('blood')) return fail('blood', 'রক্ত গ্রুপ নির্বাচন করুন।');
    if (!val('education')) return fail('education', 'শিক্ষাগত যোগ্যতা নির্বাচন করুন।');
    if (val('education') === '__other' && !val('educationOther')) return fail('educationOther', 'শিক্ষাগত যোগ্যতা লিখুন।');
    if (!val('profession')) return fail('profession', 'পেশা নির্বাচন করুন।');
    if (val('profession') === '__other' && !val('professionOther')) return fail('professionOther', 'পেশা লিখুন।');
    if (!val('religion')) return fail('religion', 'ধর্ম নির্বাচন করুন।');
    var nid = en(val('nid')).replace(/[\s-]/g, '');
    if (!/^(\d{10}|\d{13}|\d{17})$/.test(nid)) return fail('nid', 'এনআইডি নম্বর সঠিক নয় (১০, ১৩ বা ১৭ অঙ্ক)।');
    var phone = en(val('phone')).replace(/[\s-]/g, '');
    if (!/^\+?\d{7,16}$/.test(phone)) return fail('phone', 'ফোন নম্বর সঠিক নয়।');
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
      if (!val(p + 'PO')) return fail(p + 'PO', t + 'পোস্ট অফিস লিখুন।');
      if (!val(p + 'Village')) return fail(p + 'Village', t + 'গ্রাম লিখুন।');
    }
    if (!val('country')) return fail('country', 'বর্তমান দেশের নাম নির্বাচন করুন।');
    if (!photoDataUrl) return fail('photo', 'আপনার ছবি দিন (সর্বোচ্চ ৫০০ কেভি)।');
    if (!$('agree').checked) return fail('agree', 'অঙ্গীকারনামায় টিক চিহ্ন দিন।');
    return true;
  }

  // ---------- তথ্য সংগ্রহ ----------
  function addr(p) {
    return { div: val(p + 'Div'), dist: val(p + 'Dist'), upa: val(p + 'Upa'), thana: val(p + 'Thana'), po: val(p + 'PO'), village: val(p + 'Village'), para: val(p + 'Para') };
  }
  function addrText(a) {
    return [a.para && 'পাড়া: ' + a.para, 'গ্রাম: ' + a.village, 'পোস্ট অফিস: ' + a.po, 'থানা: ' + a.thana, a.upa, 'জেলা: ' + a.dist, a.div + ' বিভাগ'].filter(Boolean).join(', ');
  }
  function collect() {
    var perm = addr('perm');
    var same = form.addrSame.value !== 'diff';
    var cur = same ? perm : addr('cur');
    var dob = val('dob').split('-');                       // yyyy-mm-dd
    return {
      memberType: val('memberType'),
      memberTypeLabel: TYPE_LABEL[val('memberType')],
      feeText: FEES[val('memberType')],
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
      religion: val('religion'),
      nid: en(val('nid')).replace(/[\s-]/g, ''),
      phone: en(val('phone')).replace(/[\s-]/g, ''),
      whatsapp: en(val('whatsapp')).replace(/[\s-]/g, ''),
      email: val('email'),
      perm: perm,
      addrSame: same,
      cur: cur,
      currentText: same ? 'স্থায়ী ঠিকানার অনুরূপ' : addrText(cur),
      country: val('country'),
      website: form.website.value
    };
  }

  // ---------- নেটওয়ার্ক ----------
  function post(payload) {
    return fetch(CFG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); });
  }

  function shortBlood(b) { var m = /\(([^)]+)\)/.exec(b); return m ? m[1] : b; }

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
        nid: bn(data.nid), phone: bn(data.phone), whatsapp: bn(data.whatsapp), email: data.email,
        perm: data.perm, currentText: data.currentText, country: data.country,
        photoDataUrl: photoDataUrl, timestampBn: res.timestampBn
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
      note.textContent = 'সংগঠনের কাছে পিডিএফ কপি সংরক্ষণ করা হচ্ছে…';
      $('applySuccess').insertBefore(note, $('applySuccess').querySelector('.btn-row'));
      function upload(retry) {
        return post(payload).then(function (r) {
          if (!r || !r.ok) throw new Error('pdf save failed');
          note.textContent = '✔ পিডিএফ কপি সংগঠনের কাছে সংরক্ষিত হয়েছে।';
        }).catch(function () {
          if (retry) return upload(false);
          note.textContent = 'আপনার আবেদন গৃহীত হয়েছে। পিডিএফ কপি সংরক্ষণে সমস্যা হয়েছে; আপনার ডাউনলোড করা কপিটি সংগঠনের কার্যালয়ে জমা দিন।';
        });
      }
      return upload(true);
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
