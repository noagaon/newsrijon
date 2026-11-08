/* "সহযোগিতা চাই" ফরম: যাচাই → আবেদন জমা (শিট) → A4 পিডিএফ বানিয়ে ড্রাইভ ও ইমেইলে পাঠানো */
(function () {
  'use strict';
  var form = document.getElementById('helpForm');
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(s) { return String(s).replace(/\d/g, function (d) { return BN[d]; }); }
  function en(s) { return String(s).replace(/[০-৯]/g, function (c) { return BN.indexOf(c); }); }
  var FIXF = '"Noto Serif Bengali","Noto Sans Bengali","Hind Siliguri","Kalpurush","Nikosh","SolaimanLipi","Siyam Rupali","Vrinda",serif';
  var VALF = '"Atma","Noto Sans Bengali","Hind Siliguri","Kalpurush","Nikosh","SolaimanLipi","Siyam Rupali","Vrinda",sans-serif';
  var MAXW = 200, MAXB = 2 * 1024 * 1024;
  var attach = null, lastPdf = null, busy = false;

  function status(cls, msg) { var s = $('hStatus'); s.className = 'status' + (cls ? ' ' + cls : ''); s.textContent = msg || ''; }
  function words(t) { t = t.trim(); return t ? t.split(/\s+/).length : 0; }
  function call(payload) {
    var url = (window.SRIJON_CONFIG || {}).HELP_URL;
    if (!url) return Promise.reject(new Error('nourl'));
    return fetch(url, { method: 'POST', body: JSON.stringify(payload) }).then(function (r) { return r.json(); });
  }
  function b64(bytes) { var p = [], C = 0x8000; for (var i = 0; i < bytes.length; i += C) p.push(String.fromCharCode.apply(null, bytes.subarray(i, i + C))); return btoa(p.join('')); }

  $('hNid').addEventListener('input', function () { this.value = en(this.value).replace(/\D/g, '').slice(0, 17); });
  $('hPhone').addEventListener('input', function () { this.value = en(this.value).replace(/[^\d+]/g, '').slice(0, 14); });
  $('hDetails').addEventListener('input', function () {
    var n = words(this.value); $('hCount').textContent = bn(n) + ' / ' + bn(MAXW) + ' শব্দ';
    $('hCount').className = 'hint' + (n > MAXW ? ' hint-warn' : '');
  });
  $('hFile').addEventListener('change', function () {
    var f = this.files[0]; attach = null; $('hFileInfo').textContent = '';
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { this.value = ''; status('error', 'শুধু পিডিএফ ফাইল দেওয়া যাবে।'); return; }
    if (f.size > MAXB) { this.value = ''; status('error', 'ফাইলটি ২ এমবির বেশি। ছোট ফাইল দিন।'); return; }
    var rd = new FileReader();
    rd.onload = function () {
      var u = new Uint8Array(rd.result);
      if (String.fromCharCode(u[0], u[1], u[2], u[3]) !== '%PDF') { $('hFile').value = ''; status('error', 'এটি সঠিক পিডিএফ ফাইল নয়।'); return; }
      attach = { name: f.name, bytes: u }; $('hFileInfo').textContent = '✔ ' + f.name; status('', '');
    };
    rd.readAsArrayBuffer(f);
  });

  function phoneNorm(v) { v = en(v).replace(/\D/g, ''); if (v.indexOf('880') === 0) v = '0' + v.slice(3); return v; }
  function data() {
    return { name: $('hName').value.trim(), father: $('hFather').value.trim(), nid: en($('hNid').value).replace(/\D/g, ''), phone: phoneNorm($('hPhone').value),
      subject: $('hSubject').value, details: $('hDetails').value.trim(), hide: $('hHide').checked, hasAttach: !!attach };
  }
  function validate(d) {
    function bad(id, m) { status('error', m); $(id).focus(); return false; }
    if (d.name.length < 2) return bad('hName', 'আপনার নাম লিখুন।');
    if (d.father.length < 2) return bad('hFather', 'পিতার নাম লিখুন।');
    if (!/^(\d{10}|\d{13}|\d{17})$/.test(d.nid)) return bad('hNid', 'জাতীয় পরিচয়পত্র নম্বর ১০, ১৩ বা ১৭ ডিজিটের হতে হবে।');
    if (!/^01\d{9}$/.test(d.phone)) return bad('hPhone', 'ফোন নম্বর ১১ ডিজিটের হতে হবে (যেমন 01XXXXXXXXX)।');
    if (!d.subject) return bad('hSubject', 'সহযোগিতার বিষয় বাছাই করুন।');
    if (words(d.details) > MAXW) return bad('hDetails', 'বিস্তারিত ২০০ শব্দের মধ্যে লিখুন।');
    if (!d.details && !attach) return bad('hDetails', 'বিস্তারিত লিখুন অথবা পত্র পিডিএফ আকারে দিন।');
    return true;
  }

  /* ---------------- পিডিএফ (A4, ক্যানভাসে আঁকা) ---------------- */
  var PW = 595.32, PH = 841.92, S = 3;
  function loadImage(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
  function fonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var t = 'অআকখগঘ০১২৩৪৫৬৭৮৯ABC', l = [];
    ['400', '500', '700'].forEach(function (w) { l.push(document.fonts.load(w + ' 16px "Noto Serif Bengali"', t)); });
    l.push(document.fonts.load('400 16px "Atma"', t));
    return Promise.all(l).catch(function () {});
  }
  function nowText() {
    var d = new Date(), z = function (n) { return ('0' + n).slice(-2); }, h = d.getHours(), ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
    return z(d.getDate()) + '.' + z(d.getMonth() + 1) + '.' + d.getFullYear() + ', ' + z(h) + ':' + z(d.getMinutes()) + ':' + z(d.getSeconds()) + ' ' + ap;
  }
  function buildPdf(d, no) {
    return fonts().then(function () { return loadImage(new URL('../assets/img/logo.webp', location.href).href); }).then(function (logo) {
      var c = document.createElement('canvas'); c.width = Math.round(PW * S); c.height = Math.round(PH * S);
      var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      var PUR = '#4a148c';
      function f(w, sz, fam) { ctx.font = w + ' ' + (sz * S) + 'px ' + fam; }
      function tx(t, x, y, w, sz, color, fam, align) { f(w, sz, fam || FIXF); ctx.fillStyle = color || '#000'; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, x * S, y * S); }
      function wd(t, w, sz, fam) { f(w, sz, fam || FIXF); return ctx.measureText(t).width / S; }
      function wrap(t, maxW, w, sz, fam) {
        var out = [];
        String(t).split(/\n/).forEach(function (para) {
          var line = '';
          para.split(/\s+/).forEach(function (wo) {
            var tryL = line ? line + ' ' + wo : wo;
            if (wd(tryL, w, sz, fam) > maxW && line) { out.push(line); line = wo; } else line = tryL;
          });
          out.push(line);
        });
        return out;
      }
      function dotted(x1, x2, y) { ctx.save(); ctx.strokeStyle = '#000'; ctx.lineWidth = .6 * S; ctx.lineCap = 'round'; ctx.setLineDash([.01, 2.4 * S]); ctx.beginPath(); ctx.moveTo(x1 * S, y * S); ctx.lineTo(x2 * S, y * S); ctx.stroke(); ctx.restore(); }
      function line(x1, y1, x2, y2, lw) { ctx.strokeStyle = '#000'; ctx.lineWidth = lw * S; ctx.beginPath(); ctx.moveTo(x1 * S, y1 * S); ctx.lineTo(x2 * S, y2 * S); ctx.stroke(); }
      function rr(x, y, w, h, r, fill, stroke) {
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x * S, y * S, w * S, h * S, r * S); else ctx.rect(x * S, y * S, w * S, h * S);
        if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = '#000'; ctx.lineWidth = .8 * S; ctx.stroke(); }
      }
      // বর্ডার
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2 * S; ctx.strokeRect(16 * S, 16 * S, (PW - 32) * S, (PH - 32) * S);
      ctx.lineWidth = .7 * S; ctx.strokeRect(21 * S, 21 * S, (PW - 42) * S, (PH - 42) * S);
      // জলছাপ
      if (logo) { var ww = 300, hh = ww * logo.height / logo.width; ctx.save(); ctx.globalAlpha = .06; ctx.drawImage(logo, (PW / 2 - ww / 2) * S, (PH / 2 - hh / 2) * S, ww * S, hh * S); ctx.restore(); }
      // হেডার
      ctx.fillStyle = '#e2efda'; ctx.fillRect(21 * S, 21 * S, (PW - 42) * S, 92 * S); line(21, 113, PW - 21, 113, 1);
      if (logo) { var lw = 62, lh = lw * logo.height / logo.width; ctx.drawImage(logo, 32 * S, 30 * S, lw * S, lh * S); }
      var tx0 = 108, k = 1, bw = wd('সৃজনশীল তরুণ সংঘ', 700, 30), ew = wd('SRIJONSHIL TARUN SANGHA', 700, 14, '"Times New Roman",Times,serif');
      if (bw + ew + 10 > PW - 30 - tx0) k = (PW - 30 - tx0 - 10) / (bw + ew);
      tx('সৃজনশীল তরুণ সংঘ', tx0, 52, 700, 30 * k, '#c4551a');
      tx('SRIJONSHIL TARUN SANGHA', tx0 + bw * k + 10, 54, 700, 14 * k, '#000', '"Times New Roman",Times,serif');
      tx('নোয়াগাঁও, টুকেরবাজার, ৩৯ নং ওয়ার্ড, সিলেট সিটি কর্পোরেশন, সিলেট।', tx0, 77, 400, 10.5);
      tx('ইমেইল– srijonshil2011@gmail.com', tx0, 92, 400, 10.5);
      // শিরোনাম-পিল
      var pt = 'সহযোগিতার আবেদন', pw = wd(pt, 700, 16) + 60;
      rr(PW / 2 - pw / 2, 126, pw, 28, 14, '#fbe5d6', true); tx(pt, PW / 2, 140, 700, 16, '#000', FIXF, 'center');
      // নম্বর ও তারিখ
      tx('আবেদন নম্বর:', 40, 176, 700, 11.5); tx(no, 40 + wd('আবেদন নম্বর:', 700, 11.5) + 6, 176, 400, 12, PUR, VALF);
      var tm = nowText(); tx(tm, PW - 40, 176, 400, 11, PUR, VALF, 'right'); tx('তারিখ ও সময়:', PW - 40 - wd(tm, 400, 11, VALF) - 6, 176, 700, 11.5, '#000', FIXF, 'right');
      // ঘর ১–৫
      var X0 = 40, X1 = PW - 40, y = 212;
      [['১। নাম:', d.name], ['২। পিতার নাম:', d.father], ['৩। জাতীয় পরিচয়পত্র নম্বর:', d.nid], ['৪। ফোন নম্বর:', d.phone]].forEach(function (r) {
        var lwd = wd(r[0], 500, 12) + 6; tx(r[0], X0, y, 500, 12);
        f(400, 12.5, VALF); var v = r[1], sz = 12.5; while (wd(v, 400, sz, VALF) > X1 - X0 - lwd - 4 && sz > 8) sz -= .5;
        tx(v, X0 + lwd, y - 1, 400, sz, PUR, VALF); dotted(X0 + lwd, X1, y + 9); y += 32;
      });
      // বিষয়
      var sl = '৫। সহযোগিতার বিষয়:', slw = wd(sl, 500, 12) + 6; tx(sl, X0, y, 500, 12);
      var sub = wrap(d.subject, X1 - X0 - slw - 4, 400, 12.5, VALF);
      sub.forEach(function (ln, i) { tx(ln, X0 + slw, y - 1 + i * 19, 400, 12.5, PUR, VALF); dotted(X0 + slw, X1, y + 9 + i * 19); });
      y += 32 + (sub.length - 1) * 19;
      // বিস্তারিত
      tx('৬। বিস্তারিত:', X0, y, 500, 12); y += 14;
      var boxH = 330, bx = X0, bw2 = X1 - X0;
      ctx.strokeStyle = '#000'; ctx.lineWidth = .8 * S; ctx.strokeRect(bx * S, y * S, bw2 * S, boxH * S);
      var yy = y + 20;
      if (d.details) {
        wrap(d.details, bw2 - 20, 400, 12.5, VALF).slice(0, 15).forEach(function (ln) { tx(ln, bx + 10, yy, 400, 12.5, PUR, VALF); yy += 20; });
      }
      if (attach) { tx('আবেদনকারী নিজের লেখা পত্র পিডিএফ আকারে সংযুক্ত করেছেন: ' + attach.name, bx + 10, y + boxH - 16, 400, 10.5, '#333'); }
      y += boxH + 26;
      // পরিচয় গোপন
      tx('পরিচয় গোপন রাখার অনুরোধ:', X0, y, 500, 12);
      var hx = X0 + wd('পরিচয় গোপন রাখার অনুরোধ:', 500, 12) + 10;
      ctx.strokeStyle = '#000'; ctx.lineWidth = .8 * S; ctx.strokeRect(hx * S, (y - 8) * S, 16 * S, 16 * S);
      if (d.hide) tx('X', hx + 8, y, 700, 13, PUR, VALF, 'center');
      tx(d.hide ? 'হ্যাঁ' : 'না', hx + 26, y, 400, 12.5, PUR, VALF);
      // ফুটার
      tx('এই আবেদনটি সৃজনশীল তরুণ সংঘের ওয়েবসাইট থেকে স্বয়ংক্রিয়ভাবে তৈরি করা হয়েছে।', PW / 2, PH - 38, 400, 9, '#444', FIXF, 'center');
      return window.SrijonPDF.canvasToJpeg(c).then(function (jpeg) {
        var bytes = window.SrijonPDF.jpegToPdf(jpeg, c.width, c.height, 'Srijonshil Tarun Sangha - Help Request ' + no);
        return { bytes: bytes, blob: new Blob([bytes], { type: 'application/pdf' }) };
      });
    });
  }

  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  var ERR = { name: 'নাম লিখুন।', father: 'পিতার নাম লিখুন।', nid: 'জাতীয় পরিচয়পত্র নম্বর সঠিক নয়।', phone: 'ফোন নম্বর সঠিক নয়।', subject: 'সহযোগিতার বিষয় বাছাই করুন।',
    'too long': 'বিস্তারিত ২০০ শব্দের মধ্যে লিখুন।', 'no details': 'বিস্তারিত লিখুন অথবা পত্র পিডিএফ আকারে দিন।',
    busy: 'অনেক অনুরোধ এসেছে, এক মিনিট পর আবার চেষ্টা করুন।', limit_day: 'আজকের জন্য আবেদনের সীমা শেষ। আগামীকাল চেষ্টা করুন বা ফোনে যোগাযোগ করুন।' };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy || $('hWebsite').value) return;
    if (!(window.SRIJON_CONFIG || {}).HELP_URL) { status('error', 'জমা দেওয়ার লিংক এখনো বসানো হয়নি (config.js এর HELP_URL)। প্রশাসককে জানান।'); return; }
    var d = data(); if (!validate(d)) return;
    busy = true; $('hSubmit').disabled = true; $('hDownload').hidden = true; $('hImg').hidden = true; status('info', 'আবেদন জমা হচ্ছে… অনুগ্রহ করে অপেক্ষা করুন।');
    var no = '', token = '';
    call({ action: 'help_submit', website: $('hWebsite').value, data: d }).then(function (r) {
      if (!r || !r.ok) { var er = new Error(r && r.error || 'failed'); er.server = true; throw er; }
      no = r.no; token = r.token; status('info', 'আবেদন জমা হয়েছে (নম্বর ' + no + ')। পিডিএফ তৈরি ও পাঠানো হচ্ছে…');
      return buildPdf(d, no);
    }).then(function (pdf) {
      lastPdf = { pdf: pdf, no: no };
      var payload = { action: 'help_pdf', website: '', no: no, token: token, pdf: b64(pdf.bytes) };
      if (attach) payload.attach = b64(attach.bytes);
      return call(payload).then(function (x) {
        if (!x || !x.ok) return call(payload);                   // একবার আবার চেষ্টা
        return x;
      });
    }).then(function (x) {
      $('hDownload').hidden = false; $('hImg').hidden = false; download(lastPdf.pdf.blob, 'Help-' + no.replace('/', '-') + '.pdf');
      status(x && x.ok ? 'ok-strong' : 'error', x && x.ok
        ? '✔ আপনার আবেদন জমা হয়েছে। আবেদন নম্বর: ' + no + '। আমরা যথাসময়ে যোগাযোগ করবো। আবেদনের পিডিএফ কপি আপনার ফোনে নামছে; না নামলে নিচের বোতাম চাপুন।'
        : 'আপনার আবেদন গ্রহণ করা হয়েছে (নম্বর ' + no + ')। তবে পিডিএফ পাঠানো যায়নি (' + ((x && x.error) || '?') + ')। আবেদনের পিডিএফ ডাউনলোড করে রাখুন ও প্রয়োজনে ফোনে যোগাযোগ করুন।');
      if (x && x.ok) { form.reset(); attach = null; $('hFileInfo').textContent = ''; $('hCount').textContent = '০ / ২০০ শব্দ'; }
    }).catch(function (err) {
      status('error', err && err.server ? (ERR[err.message] || 'আবেদন জমা দেওয়া যায়নি। আবার চেষ্টা করুন।') : (no ? 'আপনার আবেদন গ্রহণ করা হয়েছে (নম্বর ' + no + ') কিন্তু পিডিএফ তৈরি/পাঠানো যায়নি। অনুগ্রহ করে আমাদের ফোনে জানান।' : 'ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।'));
    }).then(function () { busy = false; $('hSubmit').disabled = false; });
  });
  $('hImg').addEventListener('click', function () { var j = lastPdf && window.SrijonPDF.pdfToJpegBlob(lastPdf.pdf.bytes); if (j) download(j, 'Help-' + lastPdf.no.replace('/', '-') + '.jpg'); });
  $('hDownload').addEventListener('click', function () { if (lastPdf) download(lastPdf.pdf.blob, 'Help-' + lastPdf.no.replace('/', '-') + '.pdf'); });
})();
