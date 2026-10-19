/* সদস্য নিবন্ধন ফরমের পিডিএফ তৈরি (কোনো বাইরের লাইব্রেরি ছাড়া)
 * ক্যানভাসে ফরম এঁকে JPEG করে একটি A4 পিডিএফ পেইজে বসানো হয়।
 * ব্যবহার: SrijonPDF.build(data) -> Promise<{ blob, bytes }>
 */
(function () {
  'use strict';

  var W = 794, H = 1123;            // A4 @96dpi
  var SCALE = 2;                    // আউটপুট রেজোলিউশন গুণক
  var FONT = '"Noto Sans Bengali","Hind Siliguri","Kalpurush","Nikosh","SolaimanLipi","Siyam Rupali","Vrinda",sans-serif';
  var INK = '#10205a';              // পূরণ করা তথ্যের রং
  var LABEL = '#111';

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('image load failed: ' + src)); };
      img.src = src;
    });
  }

  function ensureFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var sample = 'সৃজনশীল তরুণ সংঘ অআকখ ০১২৩৪৫৬৭৮৯';
    return Promise.all([
      document.fonts.load('400 16px "Noto Sans Bengali"', sample),
      document.fonts.load('500 16px "Noto Sans Bengali"', sample),
      document.fonts.load('600 16px "Noto Sans Bengali"', sample),
      document.fonts.load('700 16px "Noto Sans Bengali"', sample)
    ]).catch(function () {});
  }

  function font(weight, size) { return weight + ' ' + size + 'px ' + FONT; }

  // টেক্সটকে প্রস্থের মধ্যে ধরাতে ফন্ট ছোট করে
  function fitFont(ctx, text, weight, size, maxW, minSize) {
    var s = size;
    ctx.font = font(weight, s);
    while (ctx.measureText(text).width > maxW && s > (minSize || 8)) {
      s -= 0.5;
      ctx.font = font(weight, s);
    }
    return s;
  }

  function dotted(ctx, x1, x2, y) {
    ctx.save();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([1.4, 3.2]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.restore();
  }

  // "লেবেল: ........ মান" — মান ডটেড লাইনের উপরে বসে
  function field(ctx, x, y, label, value, xEnd) {
    ctx.fillStyle = LABEL;
    ctx.font = font(600, 14.5);
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, x, y);
    var lw = ctx.measureText(label).width;
    var vx = x + lw + 6;
    dotted(ctx, vx, xEnd, y + 3);
    if (value) {
      var maxW = xEnd - vx - 2;
      ctx.fillStyle = INK;
      var s = fitFont(ctx, value, 500, 14.5, maxW, 8.5);
      ctx.font = font(500, s);
      ctx.fillText(value, vx + 2, y - 1);
    }
    return vx;
  }

  function checkbox(ctx, x, y, size, checked) {
    ctx.save();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(x, y, size, size);
    if (checked) {
      ctx.strokeStyle = '#0a7d2c';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x + size * .2, y + size * .55);
      ctx.lineTo(x + size * .43, y + size * .78);
      ctx.lineTo(x + size * .85, y + size * .2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCover(ctx, img, x, y, w, h) {
    var r = Math.max(w / img.width, h / img.height);
    var dw = img.width * r, dh = img.height * r;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  // মিশ্র স্টাইলের শব্দ-র‍্যাপ (অঙ্গীকারনামার জন্য); {gap: px} = হাতে লেখার ডটেড ফাঁকা জায়গা
  function drawWrapped(ctx, segments, x, y, maxW, lineH) {
    var tokens = [];
    segments.forEach(function (seg) {
      if (seg.gap) { tokens.push({ gap: seg.gap }); return; }
      seg.text.split(/\s+/).forEach(function (w) { if (w) tokens.push({ t: w, style: seg.style }); });
    });
    var cx = x, cy = y, space = 0;
    tokens.forEach(function (tk) {
      if (tk.gap) {
        if (cx + tk.gap > x + maxW) { cx = x; cy += lineH; }
        dotted(ctx, cx, cx + tk.gap, cy + 3);
        cx += tk.gap + space;
        return;
      }
      var isVal = tk.style === 'value';
      ctx.font = isVal ? font(700, 14) : font(500, 13.6 - 96 / 72);   // অঙ্গীকারনামার লেখা ১ পয়েন্ট ছোট
      ctx.fillStyle = isVal ? INK : '#2e6b2e';
      var w = ctx.measureText(tk.t).width;
      space = ctx.measureText(' ').width + 1;
      if (cx + w > x + maxW) { cx = x; cy += lineH; }
      ctx.fillText(tk.t, cx, cy);
      cx += w + space;
    });
    return cy;
  }

  // লম্বা মান দুই লাইনে ভাঙে; কত লাইন লাগল ফেরত দেয়
  function fieldMulti(ctx, x, y, label, value, xEnd) {
    ctx.font = font(600, 14.5);
    var vx = x + ctx.measureText(label).width + 6, maxW = xEnd - vx - 2;
    ctx.font = font(500, 14.5);
    if (!value || ctx.measureText(value).width <= maxW) { field(ctx, x, y, label, value, xEnd); return 1; }
    var words = value.split(' '), l1 = '', i = 0;
    while (i < words.length) {
      var t = l1 ? l1 + ' ' + words[i] : words[i];
      if (ctx.measureText(t).width > maxW) break;
      l1 = t; i++;
    }
    field(ctx, x, y, label, l1, xEnd);
    field(ctx, x + 22, y + 26, '', words.slice(i).join(' '), xEnd);
    return 2;
  }

  function sigLine(ctx, cx, y, label, color, labelY) {
    dotted(ctx, cx - 105, cx + 105, y);
    ctx.fillStyle = color || '#000';
    ctx.font = font(500, 15);
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, labelY || (y + 21));
    ctx.textAlign = 'left';
  }

  // লেখা হালকা বাঁকা (আর্চ) করে আঁকে: আগে সোজা লেখা অফস্ক্রিন ক্যানভাসে, তারপর ১ px-এর ফালিতে কেটে উপরে-নিচে সরিয়ে বসায়
  // (যুক্তাক্ষর ভাঙে না); bend = মাঝখান প্রান্তের চেয়ে যত px উঁচু
  function archText(ctx, text, cx, baseY, bend) {
    var tw = Math.ceil(ctx.measureText(text).width) + 8;
    var asc = Math.ceil(parseFloat(ctx.font.match(/([\d.]+)px/)[1]) * 1.25), desc = Math.ceil(asc * 0.5);
    var off = document.createElement('canvas');
    var S = SCALE;
    off.width = tw * S; off.height = (asc + desc) * S;
    var o = off.getContext('2d');
    o.scale(S, S);
    o.font = ctx.font; o.fillStyle = ctx.fillStyle; o.textBaseline = 'alphabetic';
    o.fillText(text, 4, asc);
    var x0 = cx - tw / 2, half = tw / 2, step = 1 / S;
    for (var i = 0; i < off.width; i++) {
      var xr = (i / S) - half;                         // মাঝখান থেকে দূরত্ব
      var dy = -bend * (1 - (xr * xr) / (half * half));
      ctx.drawImage(off, i, 0, 1, off.height, x0 + i / S, baseY - asc + dy, step + 0.02, asc + desc);
    }
  }

  function draw(canvas, d, logo, photo) {
    var ctx = canvas.getContext('2d');
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    // বর্ডার
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.2;
    ctx.strokeRect(12, 12, W - 24, H - 24);
    ctx.lineWidth = 1;
    ctx.strokeRect(19, 19, W - 38, H - 38);

    // ওয়াটারমার্ক
    if (logo) {
      ctx.save();
      ctx.globalAlpha = 0.11;
      var wmW = 620, wmH = wmW * logo.height / logo.width;
      ctx.drawImage(logo, (W - wmW) / 2, 647 - wmH / 2, wmW, wmH);
      ctx.restore();
    }

    // হেডার
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.font = font(500, 14.5);
    ctx.fillText('বিসমিল্লাহির রাহমানির রাহীম', W / 2, 41);

    var title = 'সৃজনশীল তরুণ সংঘ';
    var ts = fitFont(ctx, title, 700, 78, 470, 40);
    ctx.font = font(700, ts - 1.333);              // ১ pt ছোট
    ctx.fillStyle = '#c4551a';
    archText(ctx, title, W / 2 - 6, 110, 7);        // আরেকটু উপরে + হালকা বাঁক (মাঝখান ৭ px উঁচু)

    ctx.fillStyle = '#000';
    ctx.font = 'bold 31px Georgia, "Times New Roman", Times, serif';
    var en = 'SRIJONSHIL TARUN SANGHA';
    ctx.fillText(en, W / 2 - 6, 159);
    var enW = ctx.measureText(en).width;
    ctx.fillRect(W / 2 - 6 - enW / 2, 165, enW, 2.4);

    ctx.font = font(600, 15.5);
    ctx.fillText('নোয়াগাঁও, টুকের বাজার, ৩৯ নং ওয়ার্ড, সিলেট সিটি কর্পোরেশন, সিলেট।', W / 2 - 6, 195);

    var slogan = 'সামাজিক উন্নয়ন ও ন্যায়বিচার, তারুণ্যের অঙ্গীকার';
    ctx.font = font(600, 14.5);
    var sw = ctx.measureText(slogan).width + 26;
    ctx.fillStyle = '#3fe3ea';
    ctx.fillRect(W / 2 - 6 - sw / 2, 210, sw, 24);
    ctx.fillStyle = '#0a5a28';
    ctx.fillText(slogan, W / 2 - 6, 228);
    ctx.textAlign = 'left';

    // লোগো
    if (logo) {
      var lh = 150, lw = lh * logo.width / logo.height;
      ctx.drawImage(logo, 30, 100, lw, lh);
    }

    // ছবির বক্স
    ctx.save();
    roundRect(ctx, 652, 106, 118, 136, 12);
    ctx.fillStyle = '#e8ebf6';
    ctx.fill();
    ctx.clip();
    if (photo) drawCover(ctx, photo, 652, 106, 118, 136);
    ctx.restore();
    ctx.strokeStyle = '#3a4a9a';
    ctx.lineWidth = 2;
    roundRect(ctx, 652, 106, 118, 136, 12);
    ctx.stroke();

    // শিরোনাম পিল
    ctx.fillStyle = '#f8cbad';
    roundRect(ctx, 282, 256, 232, 32, 16);
    ctx.fill();
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = font(700, 19);
    ctx.textAlign = 'center';
    ctx.fillText('সদস্য নিবন্ধন ফরম', 398, 280);
    ctx.textAlign = 'left';

    // উপরের দুই সারি: [ফরম | সদস্য ধরণ | সদস্য নম্বর] এবং [রেফারেন্স | রেফারেন্স প্রমাণক | নিবন্ধন ফি]
    var TYPE_BN = { general: '(ক) সাধারণ সদস্য', expat: '(খ) প্রবাসী সদস্য', junior: '(গ) জুনিয়র সদস্য', donor: '(ঘ) দাতা সদস্য' };
    function boxField(x, y, label, value, xEnd, vSize, vWeight) {
      ctx.fillStyle = '#000';
      ctx.font = font(700, 14.5);
      ctx.fillText(label, x, y);
      var bx = x + ctx.measureText(label).width + 7;
      ctx.fillStyle = '#fdeccf';
      ctx.fillRect(bx, y - 22, xEnd - bx, 26);
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
      ctx.strokeRect(bx, y - 22, xEnd - bx, 26);
      if (value) {
        ctx.fillStyle = INK;
        var fs = fitFont(ctx, value, vWeight || 600, vSize || 14.5, xEnd - bx - 10, 8.5);
        ctx.font = font(vWeight || 600, fs);
        ctx.fillText(value, bx + 6, y - 3);
      }
    }
    var C1 = 32, C2 = 280, C3 = 540;
    var ry = 318;
    boxField(C1, ry, 'ফরম:', d.formNo, C2 - 14);
    boxField(C2, ry, 'সদস্য ধরণ:', TYPE_BN[d.memberType] || '', C3 - 14, 16.5, 700);   // শুধু বাছাইকৃতটি, একটু বড় হরফে
    boxField(C3, ry, 'সদস্য নম্বর:', d.memberNo || '', 772);
    var ry2 = ry + 38;
    boxField(C1, ry2, 'রেফারেন্স:', d.referenceLabel || '', C2 - 14);
    boxField(C2, ry2, 'রেফারেন্স প্রমাণক:', d.referenceProof || '', C3 - 14);
    boxField(C3, ry2, 'নিবন্ধন ফি:', d.feeText, 772);

    var L = 32, R = 772, X2 = 404;                  // X2: ৩, ৫, ৮, ১১, ১৩ নম্বর ফিল্ডের একই উল্লম্ব রেখা
    var LE = X2 - 12;                               // বাম ফিল্ডের ডান সীমা
    var junior = d.memberType === 'junior';
    var p = d.perm;
    // উল্লম্ব ব্যবধান: লাইন বাড়লে সমানুপাতে চেপে মেলানো হয়
    var steps = [35, 33, 38, 39, 36, junior ? 34 : 0, 35, 36, 34, 34, 34, 34];
    var sum = steps.reduce(function (a, b) { return a + b; }, 0);
    var k = Math.min(1.1, 440 / sum);
    var y = 398;
    function nx(g) { y += g * k; }

    field(ctx, L, y, '১। নাম (বাংলায়) এনআইডি অনুযায়ী:', d.nameBn, R); nx(35);
    field(ctx, L + 22, y, 'নাম (ইংরেজিতে) এনআইডি অনুযায়ী:', d.nameEn, R); nx(33);
    field(ctx, L, y, '২। পিতার নাম:', d.father, LE);
    field(ctx, X2, y, '৩। মাতার নাম:', d.mother, R); nx(38);

    field(ctx, L, y, '৪। জন্ম তারিখ:', d.dobText, LE);
    field(ctx, X2, y, '৫। লিঙ্গ:', d.gender, 556);          // শুধু বাছাইকৃত লিঙ্গ
    field(ctx, 568, y, '৬। রক্ত গ্রুপ:', d.blood, R);
    nx(39);

    field(ctx, L, y, '৭। শিক্ষাগত যোগ্যতা:', d.education, LE);
    field(ctx, X2, y, '৮। পেশা:', d.profession, 588);
    field(ctx, 600, y, '৯। ধর্ম:', d.religion, R);
    nx(36);
    field(ctx, L, y, '১০। জাতীয় পরিচয় পত্র নম্বর:', d.nid, LE);
    field(ctx, X2, y, '১১। ফোন নম্বর:', d.phone, R); nx(junior ? 34 : 35);
    if (junior) { field(ctx, L + 22, y, 'জন্মনিবন্ধন সনদ নম্বর:', d.birthReg, R); nx(35); }
    field(ctx, L, y, '১২। ইমেইল আইডি:', d.email, LE);
    field(ctx, X2, y, '১৩। ওয়াটসঅ্যাপ নম্বর:', d.whatsapp, R); nx(36);

    field(ctx, L, y, '১৪। স্থায়ী ঠিকানা: পাড়া-', p.para, 238);
    field(ctx, 244, y, 'গ্রাম-', p.village, 484 - 20);
    field(ctx, 470, y, 'পোস্ট অফিস-', p.po, R); nx(34);
    field(ctx, L + 22, y, 'ইউনিয়ন/ পৌরসভা-', p.union, 430);
    field(ctx, 440, y, 'ওয়ার্ড-', p.ward, R); nx(34);
    field(ctx, L + 22, y, 'থানা-', p.thana, 250);
    field(ctx, 256, y, 'উপজেলা/ সিটি কর্পোরেশন-', p.upa, 560);
    field(ctx, 566, y, 'জেলা-', p.dist, R); nx(34);

    var lines = fieldMulti(ctx, L, y, '১৫। বর্তমান ঠিকানা:', d.currentText, R);
    nx(34); if (lines > 1) y += 26 * k;
    field(ctx, L, y, '১৬। দেশের নাম:', d.country, R);

    // অঙ্গীকারনামা (উপরের লাইন থেকে আলাদা রেখে, ছোট শেইপ)
    var pillTop = y + 24, pillH = 26, pillW = 148;
    var boxTop = pillTop + 19;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2;
    ctx.fillStyle = '#f8cbad';
    roundRect(ctx, 398 - pillW / 2, pillTop, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = font(700, 15.5);
    ctx.textAlign = 'center';
    ctx.fillText('অঙ্গীকারনামা', 398, pillTop + 18.5);
    ctx.textAlign = 'left';

    var CM7 = 7 / 2.54 * 96;                       // ৭ সে.মি. ফাঁকা (হাতে নাম লেখার জায়গা)
    var pledge = [
      { text: 'আমি', style: 'label' },
      { gap: CM7 },
      { text: 'এই মর্মে স্বেচ্ছায় ও স্বজ্ঞানে স্বীকার করছি যে, আমার দেওয়া উপরোল্লিখিত তথ্যসমূহ সত্য ও নির্ভুল। আমি অঙ্গীকার করছি যে, আমি "সৃজনশীল তরুণ সংঘ" -এর গঠনতন্ত্র ও কার্যকরী কমিটির সকল সিদ্ধান্ত মেনে চলবো, সংগঠন ও গঠনতন্ত্র বহির্ভূত কোন কাজ করবো না। গঠনতন্ত্র ও সংগঠন বিরোধী কোন কাজে লিপ্ত থাকলে বা প্রমাণিত হলে কর্তৃপক্ষ আমার বিরুদ্ধে যে ব্যবস্থা গ্রহণ করবেন তা মেনে নিতে বাধ্য থাকবো, এতে আমার কোন আপত্তি থাকবে না।', style: 'label' }
    ];
    var lastY = drawWrapped(ctx, pledge, 36, boxTop + 30, W - 72, 23);
    var sigY = lastY + 46;                         // শেষ লাইনের পর ঠিক ১ লাইন ফাঁকা
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2;
    ctx.strokeRect(26, boxTop, W - 52, sigY - boxTop + 16);
    ctx.fillStyle = '#2e6b2e';
    ctx.font = font(500, 14);
    ctx.textAlign = 'right';
    ctx.fillText('আবেদনকারীর স্বাক্ষর–', 600, sigY);
    ctx.textAlign = 'left';
    dotted(ctx, 604, 758, sigY + 2);

    // নিচের স্বাক্ষর
    sigLine(ctx, 150, 1062, 'সাধারণ সম্পাদক', '#1f4e9e', 1097);   // 'ডাউনলোডের সময়' লাইনে
    sigLine(ctx, 397, 1062, 'সদস্যপদ লাভের তারিখ', '#000');
    sigLine(ctx, 644, 1062, 'সভাপতি', '#1f4e9e', 1097);

    // ফুটার: ডাউনলোডের সময় (বাম কোণে, ইংরেজি হরফে)
    ctx.fillStyle = '#444';
    ctx.font = font(500, 11.5);
    ctx.textAlign = 'center';
    ctx.fillText('ডাউনলোডের সময়: ' + (d.timestampEn || d.timestampBn || ''), W / 2, 1097);
    ctx.textAlign = 'left';
  }

  function canvasToJpeg(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) return reject(new Error('canvas export failed'));
        var fr = new FileReader();
        fr.onload = function () { resolve(new Uint8Array(fr.result)); };
        fr.onerror = reject;
        fr.readAsArrayBuffer(blob);
      }, 'image/jpeg', 0.9);
    });
  }

  // ন্যূনতম পিডিএফ রাইটার: একটি A4 পেইজে একটি JPEG ছবি
  function jpegToPdf(jpeg, w, h, title) {
    var chunks = [], offsets = [], pos = 0;
    function str(s) {
      var a = new Uint8Array(s.length);
      for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255;
      return a;
    }
    function push(x) { var a = typeof x === 'string' ? str(x) : x; chunks.push(a); pos += a.length; }
    function obj(n, body) { offsets[n] = pos; push(n + ' 0 obj\n' + body + '\nendobj\n'); }
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    offsets[4] = pos;
    push('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>\nstream\n');
    push(jpeg);
    push('\nendstream\nendobj\n');
    var content = 'q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n';
    obj(5, '<< /Length ' + content.length + ' >>\nstream\n' + content + 'endstream');
    obj(6, '<< /Title (' + String(title).replace(/[()\\]/g, '') + ') /Producer (srijonshil website) >>');
    var xref = pos;
    var x = 'xref\n0 7\n0000000000 65535 f \n';
    for (var i = 1; i <= 6; i++) x += ('0000000000' + offsets[i]).slice(-10) + ' 00000 n \n';
    push(x + 'trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    var total = 0; chunks.forEach(function (c) { total += c.length; });
    var out = new Uint8Array(total), o = 0;
    chunks.forEach(function (c) { out.set(c, o); o += c.length; });
    return out;
  }

  function build(data, opts) {
    opts = opts || {};
    var logoUrl = opts.logoUrl || new URL('../assets/img/logo.webp', location.href).href;
    return ensureFonts().then(function () {
      return Promise.all([
        loadImage(logoUrl).catch(function () { return null; }),
        data.photoDataUrl ? loadImage(data.photoDataUrl).catch(function () { return null; }) : Promise.resolve(null)
      ]);
    }).then(function (imgs) {
      var canvas = document.createElement('canvas');
      canvas.width = W * SCALE;
      canvas.height = H * SCALE;
      draw(canvas, data, imgs[0], imgs[1]);
      return canvasToJpeg(canvas).then(function (jpeg) {
        var bytes = jpegToPdf(jpeg, canvas.width, canvas.height, 'Srijonshil Tarun Sangha - Membership Form');
        return { bytes: bytes, blob: new Blob([bytes], { type: 'application/pdf' }) };
      });
    });
  }

  function toBase64(bytes) {
    var CH = 0x8000, parts = [];
    for (var i = 0; i < bytes.length; i += CH) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CH)));
    }
    return btoa(parts.join(''));
  }

  window.SrijonPDF = { build: build, toBase64: toBase64 };
})();
