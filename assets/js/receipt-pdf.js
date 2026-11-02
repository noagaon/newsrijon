/* রসিদের পিডিএফ: A4 পেইজে দুই কপি (সদস্য কপি + অফিস কপি), ক্যানভাসে এঁকে pdf-form.js এর রাইটার দিয়ে পিডিএফ */
(function () {
  'use strict';
  var FIXF = '"Noto Serif Bengali","Noto Sans Bengali","Hind Siliguri","Kalpurush","Nikosh","SolaimanLipi","Siyam Rupali","Vrinda",serif';
  var VALF = '"Atma","Noto Sans Bengali","Hind Siliguri","Kalpurush","Nikosh","SolaimanLipi","Siyam Rupali","Vrinda",sans-serif';
  var PW = 595.32, PH = 841.92, S = 3;           // পেইজ (pt) ও রেজল্যুশন গুণক
  var MM = 72 / 25.4;
  var CW = 202 * MM, CH = CW * 0.45;             // কপির প্রস্থ ও উচ্চতা (pt): ৮ × ৩.৬ অনুপাত

  function loadImage(src) {
    return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; });
  }
  function ensureFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var t = 'অআকখগঘ০১২৩৪৫৬৭৮৯ABC', l = [];
    ['400', '500', '700'].forEach(function (w) { l.push(document.fonts.load(w + ' 16px "Noto Serif Bengali"', t)); });
    l.push(document.fonts.load('400 16px "Atma"', t));
    return Promise.all(l).catch(function () {});
  }

  function drawCopy(ctx, x0, y0, label, d, logo) {
    var u = CW / 100 * S;                        // ১ cqw (পিক্সেল)
    function X(v) { return x0 * S + v * u; }
    function Y(v) { return y0 * S + v * u; }
    function fnt(w, sz, fam) { return w + ' ' + (sz * u) + 'px ' + fam; }
    function fit(text, maxW, w, sz, fam) {            // জায়গায় না ধরলে ফন্ট ছোট করে
      var s = sz; ctx.font = fnt(w, s, fam);
      while (ctx.measureText(text).width > maxW && s > sz * 0.5) { s -= 0.05; ctx.font = fnt(w, s, fam); }
    }
    function text(t, x, yMid, w, sz, color, fam, align, maxW) {
      ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
      if (maxW) fit(t, maxW * u, w, sz, fam); else ctx.font = fnt(w, sz, fam);
      ctx.fillText(t, X(x), Y(yMid));
    }
    function wid(t, w, sz, fam) { ctx.font = fnt(w, sz, fam); return ctx.measureText(t).width / u; }
    function dotted(xa, xb, y, lw) {
      ctx.save(); ctx.strokeStyle = '#000'; ctx.lineWidth = lw * u; ctx.lineCap = 'round'; ctx.setLineDash([0.01, lw * 2.2 * u]);
      ctx.beginPath(); ctx.moveTo(X(xa), Y(y)); ctx.lineTo(X(xb), Y(y)); ctx.stroke(); ctx.restore();
    }
    var W = 100, H = 45;
    ctx.fillStyle = '#fff'; ctx.fillRect(X(0), Y(0), W * u, H * u);
    ctx.strokeStyle = '#000'; ctx.lineWidth = .45 * u; ctx.strokeRect(X(.225), Y(.225), (W - .45) * u, (H - .45) * u);
    ctx.lineWidth = .2 * u; ctx.strokeRect(X(1.5 + .45), Y(1.5 + .45), (W - 3 - .9) * u, (H - 3 - .9) * u);
    if (logo) {                                   // জলছাপ
      var ww = 36, hh = ww * logo.height / logo.width;
      ctx.save(); ctx.globalAlpha = .07; ctx.drawImage(logo, X(50 - ww / 2), Y(25.2 - hh / 2), ww * u, hh * u); ctx.restore();
    }
    ctx.fillStyle = '#e2efda'; ctx.fillRect(X(1.5), Y(1.5), 97 * u, 11.6 * u);
    ctx.fillStyle = '#000'; ctx.fillRect(X(1.5), Y(1.5 + 11.6 - .15), 97 * u, .15 * u);
    text('বিসমিল্লাহির রাহমানির রাহীম', 50, 1.5 + .55 + 1.0, 500, 1.6, '#000', FIXF, 'center');
    if (logo) { var lw = 10.2, lh = lw * logo.height / logo.width; ctx.drawImage(logo, X(1.5 + 5.4), Y(1.5 + .9), lw * u, lh * u); }
    var tx = 1.5 + 20;
    text('সৃজনশীল তরুণ সংঘ', tx, 1.5 + 1.7 + 2.9, 700, 4.5, '#c4551a', FIXF, 'left');
    var bw = wid('সৃজনশীল তরুণ সংঘ', 700, 4.5, FIXF);
    text('SRIJONSHIL TARUN SANGHA', tx + bw + 1.2, 1.5 + 1.7 + 3.1, 700, 2.5, '#000', '"Times New Roman",Times,serif', 'left');
    text('নোয়াগাঁও, টুকেরবাজার, ৩৯ নং ওয়ার্ড, সিলেট সিটি কর্পোরেশন, সিলেট।   ইমেইল– srijonshil2011@gmail.com', 1.5 + 19, 1.5 + 7.6 + 1.1, 400, 1.7, '#000', FIXF, 'left', 77);
    var sl = 'সামাজিক উন্নয়ন ও ন্যায়বিচার, তারুণ্যের অঙ্গীকার', sw = wid(sl, 500, 1.55, FIXF) + .8;
    ctx.fillStyle = '#1aff1a'; ctx.fillRect(X(50 - sw / 2), Y(1.5 + 9.6), sw * u, 1.95 * u);
    text(sl, 50, 1.5 + 9.6 + 1.0, 500, 1.55, '#000', FIXF, 'center');
    var tw = wid(label, 700, 1.25, FIXF) + 2;
    ctx.fillStyle = '#14502f'; ctx.beginPath();
    var rx = 100 - 1.5 - .8 - tw, ry = 1.5 + .6, rh = 1.8;
    ctx.roundRect ? ctx.roundRect(X(rx), Y(ry), tw * u, rh * u, rh * u / 2) : ctx.rect(X(rx), Y(ry), tw * u, rh * u); ctx.fill();
    text(label, rx + tw / 2, ry + rh / 2, 700, 1.25, '#fff', FIXF, 'center');
    // শিরোনাম-পিল
    var pt = 'চাঁদা আদায় রসিদ', pw = wid(pt, 700, 2.45, FIXF) + 9.2, ph = 3.6;
    ctx.fillStyle = '#fbe5d6'; ctx.strokeStyle = '#000'; ctx.lineWidth = .2 * u; ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(X(50 - pw / 2), Y(15), pw * u, ph * u, ph * u / 2) : ctx.rect(X(50 - pw / 2), Y(15), pw * u, ph * u); ctx.fill(); ctx.stroke();
    text(pt, 50, 15 + ph / 2, 700, 2.45, '#000', FIXF, 'center');
    // চারটি বাক্স
    var bx = [['রসিদ নম্বর:', d.no], ['তারিখ:', d.date], ['সদস্য ধরণ:', d.type], ['সদস্য নম্বর:', d.memberNo]], cw = (95.2 - 3 * 2.4) / 4, by = 19.7;
    bx.forEach(function (b, i) {
      var x = 2.4 + i * (cw + 2.4), lw2 = wid(b[0], 700, 1.5, FIXF) + .2;
      text(b[0], x, by + 1.1, 700, 1.5, '#000', FIXF, 'left');
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = .12 * u;
      ctx.fillRect(X(x + lw2), Y(by), (cw - lw2) * u, 2.2 * u); ctx.strokeRect(X(x + lw2), Y(by), (cw - lw2) * u, 2.2 * u);
      text(b[1] || '', x + lw2 + .5, by + 1.1, 400, 1.5, '#1b2b8c', VALF, 'left', cw - lw2 - 1);
    });
    // সারি
    var rows = [[['১। প্রদানকারীর নাম:', d.name], ['২। চাঁদার ধরণ:', d.kind]], [['৩। চাঁদার পরিমাণ (অঙ্কে):', d.amount], ['৪। চাঁদার পরিমাণ (কথায়):', d.words]], [['৫। চাঁদা প্রদানের মাধ্যম:', d.method]]];
    rows.forEach(function (r, ri) {
      var y = 23.4 + ri * 3.3, fw = r.length === 1 ? 95.2 : (95.2 - 2.4) / 2;
      r.forEach(function (f, i) {
        var x = 2.4 + i * (fw + 2.4), l2 = wid(f[0], 400, 1.6, FIXF) + .4;
        text(f[0], x, y + 1.0, 400, 1.6, '#000', FIXF, 'left');
        text(f[1] || '', x + l2 + .3, y + .9, 400, 1.6, '#1b2b8c', VALF, 'left', fw - l2 - .6);
        dotted(x + l2, x + fw, y + 2.15, .18);
      });
    });
    // স্বাক্ষর
    var sy = H - 4.6 - 2;
    [['প্রদানকারীর স্বাক্ষর', 2.4], ['আদায়কারীর স্বাক্ষর', 100 - 2.4 - 22]].forEach(function (g) {
      dotted(g[1] + 2.4, g[1] + 22 - 2.4, sy - .35, .22);
      text(g[0], g[1] + 11, sy + 1.0, 400, 1.6, '#1f4e9e', FIXF, 'center');
    });
    text('ডাউনলোডের সময়: ' + (d.time || d.now || ''), 50, H - 2 - .7, 400, 1.15, '#333', FIXF, 'center');
  }

  function build(d) {
    return ensureFonts().then(function () {
      return loadImage(new URL('../assets/img/logo.webp', location.href).href).catch(function () { return null; });
    }).then(function (logo) {
      var c = document.createElement('canvas'); c.width = Math.round(PW * S); c.height = Math.round(PH * S);
      var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      var m = 4 * MM, left = (PW - CW) / 2, y1 = m, y2 = m + CH + 7 * MM + 0;
      drawCopy(ctx, left, y1, 'সদস্য কপি', d, logo);
      drawCopy(ctx, left, y2 + 0, 'অফিস কপি', d, logo);
      // কাটার দাগ
      var cy = (y1 + CH + y2) / 2 * S;
      ctx.save(); ctx.strokeStyle = '#555'; ctx.lineWidth = 1.2; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(left * S, cy); ctx.lineTo((left + CW) * S, cy); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = '400 ' + (8 * S) + 'px ' + FIXF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var tw = ctx.measureText('✂ কেটে আলাদা করুন').width + 16; ctx.fillRect(PW / 2 * S - tw / 2, cy - 7 * S, tw, 14 * S);
      ctx.fillStyle = '#555'; ctx.fillText('✂ কেটে আলাদা করুন', PW / 2 * S, cy);
      return window.SrijonPDF.canvasToJpeg(c).then(function (jpeg) {
        var bytes = window.SrijonPDF.jpegToPdf(jpeg, c.width, c.height, 'Srijonshil Tarun Sangha - Subscription Receipt');
        return { bytes: bytes, blob: new Blob([bytes], { type: 'application/pdf' }) };
      });
    });
  }
  window.ReceiptPDF = { build: build };
})();
