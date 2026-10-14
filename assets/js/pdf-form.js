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

  // মিশ্র স্টাইলের শব্দ-র‍্যাপ (অঙ্গীকারনামার জন্য)
  function drawWrapped(ctx, segments, x, y, maxW, lineH) {
    var tokens = [];
    segments.forEach(function (seg) {
      seg.text.split(/\s+/).forEach(function (w) { if (w) tokens.push({ t: w, style: seg.style }); });
    });
    var cx = x, cy = y;
    var space = 0;
    tokens.forEach(function (tk) {
      var isVal = tk.style === 'value';
      ctx.font = isVal ? font(700, 14) : font(500, 13.6);
      ctx.fillStyle = isVal ? INK : '#2e6b2e';
      var w = ctx.measureText(tk.t).width;
      space = ctx.measureText(' ').width + 1;
      if (cx + w > x + maxW) { cx = x; cy += lineH; }
      ctx.fillText(tk.t, cx, cy);
      cx += w + space;
    });
    return cy;
  }

  function sigLine(ctx, cx, y, label, color) {
    dotted(ctx, cx - 105, cx + 105, y);
    ctx.fillStyle = color || '#000';
    ctx.font = font(500, 15);
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, y + 21);
    ctx.textAlign = 'left';
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
      var wmW = 500, wmH = wmW * logo.height / logo.width;
      ctx.drawImage(logo, (W - wmW) / 2, 360, wmW, wmH);
      ctx.restore();
    }

    // হেডার
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.font = font(500, 14.5);
    ctx.fillText('বিসমিল্লাহির রাহমানির রাহীম', W / 2, 40);

    var title = 'সৃজনশীল তরুণ সংঘ';
    var ts = fitFont(ctx, title, 700, 78, 470, 40);
    ctx.font = font(700, ts);
    ctx.fillStyle = '#c4551a';
    ctx.fillText(title, W / 2 - 6, 118);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 31px Georgia, "Times New Roman", Times, serif';
    var en = 'SRIJONSHIL TARUN SANGHA';
    ctx.fillText(en, W / 2 - 6, 168);
    var enW = ctx.measureText(en).width;
    ctx.fillRect(W / 2 - 6 - enW / 2, 174, enW, 2.4);

    ctx.font = font(600, 15.5);
    ctx.fillText('নোয়াগাঁও, টুকের বাজার, ৩৯ নং ওয়ার্ড, সিলেট সিটি কর্পোরেশন, সিলেট।', W / 2 - 6, 204);

    var slogan = 'সামাজিক উন্নয়ন ও ন্যায়বিচার, তারুণ্যের অঙ্গীকার';
    ctx.font = font(600, 14.5);
    var sw = ctx.measureText(slogan).width + 26;
    ctx.fillStyle = '#3fe3ea';
    ctx.fillRect(W / 2 - 6 - sw / 2, 219, sw, 24);
    ctx.fillStyle = '#0a5a28';
    ctx.fillText(slogan, W / 2 - 6, 237);
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

    // ফরম নম্বর / ফি / সদস্য নম্বর
    var ry = 318;
    ctx.fillStyle = '#000';
    ctx.font = font(700, 14.5);
    ctx.fillText('ফরম নম্বর:', 32, ry);
    ctx.fillText('নিবন্ধন ফি:', 318, ry);
    ctx.fillText('সদস্য নম্বর:', 516, ry);
    [[93, 296, 189, 26, d.formNo], [391, 296, 78, 26, d.feeText], [594, 296, 176, 26, d.memberNo || '']].forEach(function (b) {
      ctx.fillStyle = '#fdeccf';
      ctx.fillRect(b[0], b[1], b[2], b[3]);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(b[0], b[1], b[2], b[3]);
      if (b[4]) {
        ctx.fillStyle = INK;
        var fs = fitFont(ctx, b[4], 600, 14.5, b[2] - 10, 9);
        ctx.font = font(600, fs);
        ctx.fillText(b[4], b[0] + 6, b[1] + 19);
      }
    });

    // সদস্য ধরণ
    var ty = 354;
    ctx.fillStyle = '#000';
    ctx.font = font(700, 14.5);
    ctx.fillText('সদস্য ধরণ:', 32, ty);
    var types = [['general', '(ক) সাধারণ সদস্য–'], ['expat', '(খ) প্রবাসী সদস্য–'], ['junior', '(গ) জুনিয়র সদস্য–'], ['donor', '(ঘ) দাতা সদস্য–']];
    var tx = 118;
    var totalW = 0;
    ctx.font = font(500, 14.5);
    types.forEach(function (t) { totalW += ctx.measureText(t[1]).width + 6 + 20; });
    var gap = (W - 30 - tx - totalW) / 3;
    types.forEach(function (t) {
      ctx.fillStyle = '#000';
      ctx.font = font(500, 14.5);
      ctx.fillText(t[1], tx, ty);
      var lw2 = ctx.measureText(t[1]).width;
      checkbox(ctx, tx + lw2 + 5, ty - 16, 20, d.memberType === t[0]);
      tx += lw2 + 6 + 20 + gap;
    });

    var L = 32, R = 772;
    var y = 398;
    field(ctx, L, y, '১। নাম (বাংলায়) এনআইডি অনুযায়ী:', d.nameBn, R); y += 35;
    field(ctx, L + 22, y, 'নাম (ইংরেজিতে) এনআইডি অনুযায়ী:', d.nameEn, R); y += 33;
    field(ctx, L, y, '২। পিতার নাম:', d.father, R); y += 34;
    field(ctx, L, y, '৩। মাতার নাম:', d.mother, R); y += 38;

    field(ctx, L, y, '৪। জন্ম তারিখ:', d.dobText, 318);
    // লিঙ্গ
    ctx.fillStyle = LABEL; ctx.font = font(600, 14.5);
    ctx.fillText('৫। লিঙ্গ: পুরুষ–', 364, y);
    var gx = 364 + ctx.measureText('৫। লিঙ্গ: পুরুষ–').width + 4;
    checkbox(ctx, gx, y - 16, 20, d.gender === 'পুরুষ');
    ctx.fillStyle = LABEL; ctx.font = font(600, 14.5);
    ctx.fillText('মহিলা–', gx + 28, y);
    var gx2 = gx + 28 + ctx.measureText('মহিলা–').width + 4;
    checkbox(ctx, gx2, y - 16, 20, d.gender === 'মহিলা');
    field(ctx, gx2 + 38, y, '৬। রক্ত গ্রুপ:', d.blood, R);
    y += 39;

    field(ctx, L, y, '৭। শিক্ষাগত যোগ্যতা:', d.education, 318);
    field(ctx, 364, y, '৮। পেশা:', d.profession, 560);
    field(ctx, 572, y, '৯। ধর্ম:', d.religion, R);
    y += 36;
    field(ctx, L, y, '১০। জাতীয় পরিচয় পত্র (এনআইডি) নম্বর:', d.nid, R); y += 35;
    field(ctx, L, y, '১১। ফোন নম্বর:', d.phone, 430);
    field(ctx, 440, y, '১২। ওয়াটসঅ্যাপ নম্বর:', d.whatsapp, R); y += 33;
    field(ctx, L, y, '১৩। ইমেইল আইডি:', d.email, R); y += 36;

    var p = d.perm;
    field(ctx, L, y, '১৪। স্থায়ী ঠিকানা: পাড়া-', p.para, 238);
    field(ctx, 244, y, 'গ্রাম-', p.village, 484 - 20);
    field(ctx, 470, y, 'পোস্ট অফিস-', p.po, R); y += 34;
    field(ctx, L + 22, y, 'থানা-', p.thana, 250);
    field(ctx, 256, y, 'উপজেলা/ সিটি কর্পোরেশন-', p.upa, 560);
    field(ctx, 566, y, 'জেলা-', p.dist, R); y += 36;

    field(ctx, L, y, '১৫। বর্তমান ঠিকানা:', d.currentText, R); y += 34;
    field(ctx, L, y, '১৬। প্রবাসী হলে দেশের নাম:', d.country, R);

    // অঙ্গীকারনামা
    var py = 836;
    ctx.fillStyle = '#f8cbad';
    roundRect(ctx, 312, py - 18, 172, 30, 15);
    ctx.fill();
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = font(700, 17);
    ctx.textAlign = 'center';
    ctx.fillText('অঙ্গীকারনামা', 398, py + 3);
    ctx.textAlign = 'left';

    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2;
    ctx.strokeRect(26, py + 6, W - 52, 142);
    var pledge = [
      { text: 'আমি', style: 'label' },
      { text: d.nameBn || '………………………………', style: 'value' },
      { text: 'এই মর্মে স্বেচ্ছায় ও স্বজ্ঞানে স্বীকার করছি যে, আমার দেওয়া উপরোল্লিখিত তথ্যসমূহ সত্য ও নির্ভুল। আমি অঙ্গীকার করছি যে, আমি "সৃজনশীল তরুণ সংঘ" -এর গঠনতন্ত্র ও কার্যকরী কমিটির সকল সিদ্ধান্ত মেনে চলবো, সংগঠন ও গঠনতন্ত্র বহির্ভূত কোন কাজ করবো না। গঠনতন্ত্র ও সংগঠন বিরোধী কোন কাজে লিপ্ত থাকলে বা প্রমাণিত হলে কর্তৃপক্ষ আমার বিরুদ্ধে যে ব্যবস্থা গ্রহণ করবেন তা মেনে নিতে বাধ্য থাকবো, এতে আমার কোন আপত্তি থাকবে না।', style: 'label' }
    ];
    var endY = drawWrapped(ctx, pledge, 36, py + 34, W - 72, 23);
    ctx.fillStyle = '#2e6b2e';
    ctx.font = font(500, 14);
    ctx.textAlign = 'right';
    ctx.fillText('আবেদনকারীর স্বাক্ষর–', 600, py + 128);
    ctx.textAlign = 'left';
    dotted(ctx, 604, 758, py + 130);

    // নিচের স্বাক্ষর
    sigLine(ctx, 150, 1042, 'সাধারণ সম্পাদক', '#1f4e9e');
    sigLine(ctx, 397, 1042, 'সদস্যপদ লাভের তারিখ', '#000');
    sigLine(ctx, 644, 1042, 'সভাপতি', '#1f4e9e');

    // ফুটার: ডাউনলোডের সময়
    ctx.fillStyle = '#444';
    ctx.font = font(500, 11.5);
    ctx.textAlign = 'center';
    ctx.fillText('ডাউনলোডের সময়: ' + d.timestampBn, W / 2, 1090);
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
