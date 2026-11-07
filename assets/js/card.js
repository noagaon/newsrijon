/* সদস্য আইডি কার্ড (সামনে-পেছনে) ও ফটোকার্ড — ব্রাউজারে ক্যানভাসে আঁকা; ছবি কোথাও পাঠানো হয় না */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('cvFront')) return;
  var CFG = window.SRIJON_CARD || {};
  var FIXF = '"Noto Serif Bengali","Noto Sans Bengali","Hind Siliguri","Kalpurush","Nikosh","SolaimanLipi","Siyam Rupali","Vrinda",serif';
  var SANS = '"Noto Sans Bengali","Hind Siliguri","Kalpurush","Nikosh","SolaimanLipi","Siyam Rupali","Vrinda",sans-serif';
  var G1 = '#0b3d24', G2 = '#14502f', OR = '#c4551a', SOFT = '#e2efda';
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(s) { return String(s).replace(/\d/g, function (d) { return BN[d]; }); }
  var KEY = { general: 'সাধারণ সদস্য', expat: 'প্রবাসী সদস্য', donor: 'দাতা সদস্য', junior: 'জুনিয়র সদস্য' };
  var logo = null, photo = null;

  function load(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
  function fonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var t = 'অআকখগঘ০১২৩৪৫৬৭৮৯ABC', l = [];
    ['400', '500', '700'].forEach(function (w) { l.push(document.fonts.load(w + ' 16px "Noto Serif Bengali"', t)); l.push(document.fonts.load(w + ' 16px "Noto Sans Bengali"', t)); });
    return Promise.all(l).catch(function () {});
  }
  function status(cls, m) { var s = $('cStatus'); s.className = 'status' + (cls ? ' ' + cls : ''); s.textContent = m || ''; }

  /* ---------- ছোট আঁকার সহায়ক ---------- */
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function font(ctx, w, sz, fam) { ctx.font = w + ' ' + sz + 'px ' + (fam || FIXF); }
  function text(ctx, t, x, y, w, sz, color, fam, align, maxW) {
    font(ctx, w, sz, fam); if (maxW) { while (ctx.measureText(t).width > maxW && sz > 14) { sz -= 1; font(ctx, w, sz, fam); } }
    ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
  }
  function wrapLines(ctx, t, maxW, w, sz, fam) {
    font(ctx, w, sz, fam); var words = String(t).split(/\s+/), out = [], line = '';
    words.forEach(function (wo) { var tr = line ? line + ' ' + wo : wo; if (ctx.measureText(tr).width > maxW && line) { out.push(line); line = wo; } else line = tr; });
    if (line) out.push(line); return out;
  }
  function drawPhoto(ctx, x, y, w, h, clip) {
    ctx.save(); clip(); ctx.clip();
    if (photo) {
      var zoom = parseFloat($('cZoom').value) || 1, px = parseFloat($('cPx').value) / 100, py = parseFloat($('cPy').value) / 100;
      var sc = Math.max(w / photo.width, h / photo.height) * zoom, dw = photo.width * sc, dh = photo.height * sc;
      var ox = x + (w - dw) / 2 + px * Math.abs(dw - w) / 2, oy = y + (h - dh) / 2 + py * Math.abs(dh - h) / 2;
      if (zoom < 1) { ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); }   // ছবি ফ্রেমের চেয়ে ছোট হলে চারপাশ সাদা
      ctx.drawImage(photo, ox, oy, dw, dh);
    } else {
      var g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#cfe6d8'); g.addColorStop(1, '#a9cdb8'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#7fae95'; ctx.beginPath(); ctx.arc(x + w / 2, y + h * .38, w * .17, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * .92, w * .34, h * .30, 0, Math.PI, 0); ctx.fill();
      text(ctx, 'ছবি দিন', x + w / 2, y + h * .56, 500, Math.round(w * .09), '#4d7a63', SANS, 'center');
    }
    ctx.restore();
  }
  function watermark(ctx, W, H, size, alpha) {
    if (!logo) return; var h = size * logo.height / logo.width;
    ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(logo, W / 2 - size / 2, H / 2 - h / 2, size, h); ctx.restore();
  }
  function info() {
    return { name: $('cName').value.trim() || 'সদস্যের নাম', no: $('cNo').value.trim() || 'STS/GM/0000', type: $('cTypeText').value.trim() || 'সদস্য', date: $('cDate').value.trim() };
  }

  /* ---------- আইডি কার্ড: সামনে (১০১২×৬৩৮ = ৮৫.৬×৫৪ মিমি, ৩০০ ডিপিআই) ---------- */
  function drawFront(cv) {
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, d = info();
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); watermark(ctx, W, H, 420, .06);
    var g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, G1); g.addColorStop(1, '#1b7048'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 150);
    ctx.fillStyle = OR; ctx.fillRect(0, 150, W, 8);
    if (logo) { var lw = 104, lh = lw * logo.height / logo.width; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(70, 76, 58, 0, 7); ctx.fill(); ctx.drawImage(logo, 70 - lw / 2 + 2, 76 - lh / 2 - 2, lw - 6, lh - 6); }
    text(ctx, 'সৃজনশীল তরুণ সংঘ', 150, 55, 700, 58, '#fff', FIXF, 'left', 600);
    text(ctx, 'SRIJONSHIL TARUN SANGHA', 152, 100, 700, 26, '#ffd9a8', '"Times New Roman",Times,serif', 'left', 600);
    text(ctx, 'নোয়াগাঁও, টুকেরবাজার, সিলেট • স্থাপিত ২০১১', 152, 130, 400, 22, '#d9efe2', SANS, 'left', 640);
    text(ctx, 'সদস্য পরিচয়পত্র', W - 36, 55, 700, 30, '#fff', FIXF, 'right');
    // ছবি
    var px = 40, py = 186, pw = 250, ph = 310;
    ctx.fillStyle = G2; rrect(ctx, px - 6, py - 6, pw + 12, ph + 12, 28); ctx.fill();
    drawPhoto(ctx, px, py, pw, ph, function () { rrect(ctx, px, py, pw, ph, 22); });
    // লেখা
    var tx = 326, tw = W - tx - 34, lines = wrapLines(ctx, d.name, tw, 700, 50, FIXF), y = 232;
    var nsz = lines.length > 1 ? 42 : 50;
    wrapLines(ctx, d.name, tw, 700, nsz, FIXF).slice(0, 2).forEach(function (ln) { text(ctx, ln, tx, y, 700, nsz, '#111', FIXF, 'left', tw); y += nsz + 10; });
    y += 8; text(ctx, d.type, tx, y, 700, 38, OR, FIXF, 'left', tw); y += 58;
    text(ctx, 'সদস্য নম্বর', tx, y, 400, 24, '#555', FIXF, 'left'); y += 36;
    text(ctx, d.no, tx, y, 700, 40, G1, SANS, 'left', tw); y += 52;
    if (d.date) { text(ctx, 'সদস্যপদ লাভের তারিখ: ' + bn(d.date), tx, y, 400, 24, '#333', FIXF, 'left', tw); }
    ctx.fillStyle = G2; ctx.fillRect(0, H - 58, W, 58);
    text(ctx, CFG.slogan || '', W / 2, H - 29, 500, 24, '#fff', FIXF, 'center', W - 60);
    ctx.fillStyle = OR; ctx.fillRect(0, H - 62, W, 4);
  }
  function drawBack(cv) {
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); watermark(ctx, W, H, 420, .07);
    var g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, G1); g.addColorStop(1, '#1b7048'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 96);
    ctx.fillStyle = OR; ctx.fillRect(0, 96, W, 6);
    text(ctx, 'সৃজনশীল তরুণ সংঘ', W / 2, 48, 700, 46, '#fff', FIXF, 'center', W - 80);
    var y = 150;
    function row(label, val) { text(ctx, label, 50, y, 700, 26, G1, FIXF, 'left'); text(ctx, val, 210, y, 400, 26, '#111', SANS, 'left', W - 250); y += 46; }
    row('ঠিকানা:', 'নোয়াগাঁও, টুকেরবাজার, ৩৯ নং ওয়ার্ড,'); y -= 12; text(ctx, 'সিলেট সিটি কর্পোরেশন, সিলেট।', 210, y, 400, 26, '#111', SANS, 'left'); y += 52;
    row('ফোন:', bn(CFG.phone || '')); row('ইমেইল:', CFG.email || '');
    y += 4; text(ctx, 'এই কার্ডটি সংগঠনের সম্পত্তি। কুড়িয়ে পেলে উপরের ঠিকানায় ফেরত দিন।', W / 2, y, 400, 22, '#555', FIXF, 'center', W - 70);
    // স্বাক্ষর
    var sy = H - 96; ctx.save(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.setLineDash([.1, 10]);
    ctx.beginPath(); ctx.moveTo(60, sy); ctx.lineTo(380, sy); ctx.moveTo(W - 380, sy); ctx.lineTo(W - 60, sy); ctx.stroke(); ctx.restore();
    text(ctx, 'কার্ডধারীর স্বাক্ষর', 220, sy + 30, 400, 24, '#1f4e9e', FIXF, 'center'); text(ctx, 'কর্তৃপক্ষের স্বাক্ষর', W - 220, sy + 30, 400, 24, '#1f4e9e', FIXF, 'center');
    ctx.fillStyle = G2; ctx.fillRect(0, H - 22, W, 22);
  }

  /* ---------- ফটোকার্ড (১২৪০×১৭৪৮ = A6 পোর্ট্রেট, ৩০০ ডিপিআই) ---------- */
  function en(t) { t = String(t || ''); return /প্রবাসী/.test(t) ? 'Expatriate Member' : /জুনিয়র/.test(t) ? 'Junior Member' : /দাতা/.test(t) ? 'Donor Member' : /সাধারণ/.test(t) ? 'General Member' : ''; }
  function drawPhotoCard(cv) {
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, d = info();
    var bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#ffffff'); bg.addColorStop(.62, '#f6f9e4'); bg.addColorStop(1, '#e6efb6'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // উপরের সবুজ বাঁকা আকার
    var tg = ctx.createLinearGradient(0, 0, W, H * .6); tg.addColorStop(0, '#0f6b46'); tg.addColorStop(.55, '#58b08a'); tg.addColorStop(1, '#d4ecde');
    ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 800); ctx.bezierCurveTo(700, 850, 60, 720, 0, 250); ctx.closePath(); ctx.fill();
    // লোগো ও নাম
    var LX = 300, TX = 490;   // লোগো ও নাম ডানে সরানো
    if (logo) { var lw = 230, lh = lw * logo.height / logo.width; ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.arc(LX, 190, 150, 0, 7); ctx.fill(); ctx.drawImage(logo, LX - lw / 2 + 3, 190 - lh / 2 - 4, lw - 8, lh - 8); }
    text(ctx, 'সৃজনশীল', TX, 130, 700, 112, '#fff', FIXF, 'left', W - TX - 120); text(ctx, 'তরুণ সংঘ', TX, 250, 700, 112, '#fff', FIXF, 'left', W - TX - 120);
    text(ctx, 'SRIJONSHIL TARUN SANGHA', TX + 4, 335, 700, 38, '#ffe2bd', '"Times New Roman",Times,serif', 'left', W - TX - 120);
    // ছবি
    var px = Math.round(W * .36), py = 440, pw = W - px, ph = 760;
    var tc = document.createElement('canvas'); tc.width = W; tc.height = H; var tx2 = tc.getContext('2d');
    drawPhoto(tx2, px, py, pw, ph, function () { tx2.beginPath(); tx2.moveTo(px + 170, py); tx2.lineTo(W, py); tx2.lineTo(W, py + ph); tx2.lineTo(px + 170, py + ph); tx2.arcTo(px, py + ph, px, py + ph - 170, 170); tx2.lineTo(px, py + 170); tx2.arcTo(px, py, px + 170, py, 170); tx2.closePath(); });
    // বাম দিকে হালকা গ্লো (মিলিয়ে যাওয়া), নিচের গ্লোর মতো
    tx2.globalCompositeOperation = 'destination-in'; var lg = tx2.createLinearGradient(px, 0, px + 150, 0); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,1)'); tx2.fillStyle = lg; tx2.fillRect(px, 0, pw, H);
    ctx.drawImage(tc, 0, 0);
    // নিচের দিকে হালকা মিলিয়ে যাওয়া
    var fg = ctx.createLinearGradient(0, py + ph - 130, 0, py + ph + 4); fg.addColorStop(0, 'rgba(246,249,228,0)'); fg.addColorStop(1, 'rgba(246,249,228,1)'); ctx.fillStyle = fg; ctx.fillRect(px, py + ph - 130, pw, 134);
    // খাড়া লেখা
    // খাড়া লেখা দুই লাইনে: GENERAL / MEMBER (আগের বড় Times স্টাইল), সব ধরণে একই আকার
    var WORD = (en(d.type).split(' ')[0] || '').toUpperCase(), SERIF = '"Times New Roman",Times,serif', fs = 120;
    font(ctx, 700, fs, SERIF); while (ctx.measureText('EXPATRIATE').width > 700 && fs > 30) { fs--; font(ctx, 700, fs, SERIF); }
    ctx.save(); ctx.translate(0, py + ph - 20); ctx.rotate(-Math.PI / 2);
    if (WORD) text(ctx, WORD, 0, 78, 700, fs, 'rgba(15,107,70,.28)', SERIF, 'left');     // উপরের (বাঁ) লাইন
    text(ctx, 'MEMBER', 0, 78 + Math.round(fs * 1.02), 700, fs, 'rgba(15,107,70,.28)', SERIF, 'left'); ctx.restore();
    ctx.save(); ctx.translate(262, py + ph - 20); ctx.rotate(-Math.PI / 2); text(ctx, d.type, 0, 0, 500, 46, 'rgba(60,60,60,.75)', FIXF, 'left'); ctx.restore();
    // নাম, নম্বর
    var tx = 96, tw = W - 2 * tx, y = 1307, nl = wrapLines(ctx, d.name, tw, 700, 104, FIXF), nsz = nl.length > 1 ? 88 : 104;
    wrapLines(ctx, d.name, tw, 700, nsz, FIXF).slice(0, 2).forEach(function (ln) { text(ctx, ln, tx, y, 700, nsz, '#111', FIXF, 'left', tw); y += nsz + 14; });
    y += 8; text(ctx, d.type, tx, y, 600, 62, OR, FIXF, 'left', tw); y += 66;
    text(ctx, 'সদস্য নম্বর # ' + d.no, tx, y, 500, 52, '#222', SANS, 'left', tw); y += 56;
    if (d.date) text(ctx, 'সদস্যপদ লাভের তারিখ: ' + bn(d.date), tx, y, 400, 40, '#444', FIXF, 'left', tw);
    // নিচের ঢেউ
    ctx.fillStyle = '#f2a516'; ctx.beginPath(); ctx.moveTo(0, H - 150); ctx.bezierCurveTo(W * .3, H - 210, W * .6, H - 70, W, H - 150); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = OR; ctx.beginPath(); ctx.moveTo(0, H - 118); ctx.bezierCurveTo(W * .3, H - 180, W * .62, H - 40, W, H - 122); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = G1; ctx.beginPath(); ctx.moveTo(0, H - 84); ctx.bezierCurveTo(W * .3, H - 146, W * .64, H - 16, W, H - 90); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    text(ctx, CFG.slogan || '', W / 2, H - 34, 500, 34, '#fff', FIXF, 'center', W - 120);
  }

  /* ---------- রেন্ডার ও ডাউনলোড ---------- */
  var timer = null;
  function render() { drawFront($('cvFront')); drawBack($('cvBack')); drawPhotoCard($('cvPhoto')); }
  function schedule() { clearTimeout(timer); timer = setTimeout(render, 60); }
  function download(href, name) { var a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 1500); }
  function slug() { return (info().no || 'card').replace(/[^A-Za-z0-9]+/g, '-'); }
  function png(cv, name) { cv.toBlob(function (b) { var u = URL.createObjectURL(b); download(u, name); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }, 'image/png'); }
  function pdf(canvas, pw, ph, name, kind) {
    return window.SrijonPDF.canvasToJpeg(canvas).then(function (j) {
      var bytes = window.SrijonPDF.jpegToPdf(j, canvas.width, canvas.height, 'Srijonshil Tarun Sangha - Member Card', pw, ph);
      var u = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })); download(u, name); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      if (kind && window.SRIJON_ONPDF) window.SRIJON_ONPDF(kind, bytes);
    });
  }
  var MM = 72 / 25.4;
  $('cIdPdf').addEventListener('click', function () {      // A4 পাতায় আসল মাপে সামনে ও পেছনে
    var S = 300 / 25.4, A4W = Math.round(210 * S), A4H = Math.round(297 * S), c = document.createElement('canvas'); c.width = A4W; c.height = A4H;
    var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, A4W, A4H);
    var cw = 85.6 * S, ch = 54 * S, x = (A4W - cw) / 2, y1 = 20 * S, y2 = y1 + ch + 14 * S;
    ctx.drawImage($('cvFront'), x, y1, cw, ch); ctx.drawImage($('cvBack'), x, y2, cw, ch);
    ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.strokeRect(x, y1, cw, ch); ctx.strokeRect(x, y2, cw, ch);
    text(ctx, 'আসল মাপ ৮৫.৬ × ৫৪ মিমি — কেটে নিন; সামনে-পেছনে জুড়ে লেমিনেট করুন।', A4W / 2, y2 + ch + 12 * S, 400, 34, '#666', FIXF, 'center');
    pdf(c, 595.28, 841.89, 'ID-' + slug() + '.pdf', 'id');
  });
  $('cPhotoPdf').addEventListener('click', function () { pdf($('cvPhoto'), 105 * MM, 148 * MM, 'PhotoCard-' + slug() + '.pdf', 'photo'); });
  $('cFrontPng').addEventListener('click', function () { png($('cvFront'), 'ID-front-' + slug() + '.png'); });
  $('cBackPng').addEventListener('click', function () { png($('cvBack'), 'ID-back-' + slug() + '.png'); });
  $('cPhotoPng').addEventListener('click', function () { png($('cvPhoto'), 'PhotoCard-' + slug() + '.png'); });

  /* ---------- ইনপুট ---------- */
  var ALL = window.SRIJON_MEMBERS || {};
  if ($('cType')) $('cType').addEventListener('change', function () {
    var k = this.value, list = ALL[k] || [], sel = $('cMember');
    $('cTypeText').value = KEY[k] || '';
    sel.disabled = !list.length;
    sel.innerHTML = '<option value="">' + (list.length ? '— বাছাই করুন —' : 'এই ধরণে এখনো সদস্য নেই') + '</option>' + list.map(function (m, i) { return '<option value="' + i + '">' + m.no + ' — ' + m.n + '</option>'; }).join('');
    schedule();
  });
  if ($('cMember')) $('cMember').addEventListener('change', function () {
    var list = ALL[$('cType').value] || [], m = list[parseInt(this.value, 10)];
    if (m) { $('cName').value = m.n; $('cNo').value = m.no; $('cDate').value = m.d || ''; }
    schedule();
  });
  ['cName', 'cNo', 'cTypeText', 'cDate', 'cZoom', 'cPx', 'cPy', 'cSize'].forEach(function (id) { if ($(id)) $(id).addEventListener('input', schedule); });
  window.SrijonCard = {   // অ্যাকাউন্ট পাতা থেকে ব্যবহারের জন্য
    set: function (o) { $('cName').value = o.name || ''; $('cNo').value = o.no || ''; $('cTypeText').value = o.type || ''; $('cDate').value = o.date || ''; schedule(); },
    photo: function (src) { var im = new Image(); im.onload = function () { photo = im; schedule(); }; im.src = src; },
    render: schedule
  };
  if ($('cPhoto')) $('cPhoto').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { status('error', 'শুধু ছবির ফাইল দিন।'); return; }
    var u = URL.createObjectURL(f), im = new Image();
    im.onload = function () { photo = im; status('', ''); schedule(); };
    im.onerror = function () { status('error', 'ছবিটি খোলা যায়নি।'); };
    im.src = u;
  });

  Promise.all([fonts(), load(new URL('../assets/img/logo.webp', location.href).href)]).then(function (r) { logo = r[1]; render(); });
  render();
})();
