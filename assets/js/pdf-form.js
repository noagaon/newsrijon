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
    var S = SCALE * K;
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

  // ======== নতুন ডিজাইন: প্রদত্ত নমুনা পিডিএফ (A4, ৫৯৫.৩২ × ৮৪১.৯২ pt) অনুযায়ী; সব মাপ pt-এ ========
  var K = 96 / 72;                                // pt → px
  var PW = 595.32, PH = 841.92;
  var G = '#2e6b2e';                              // অঙ্গীকারনামার সবুজ

  // লেবেল + ডটেড লাইন + মান (মান লাইনের উপরে)
  function fld(ctx, x, y, label, value, xEnd, size) {
    size = size || 12.4;
    ctx.fillStyle = LABEL;
    ctx.font = font(500, size);
    ctx.fillText(label, x, y);
    var vx = x + ctx.measureText(label).width + 3;
    dotted(ctx, vx, xEnd, y + 2);
    if (value) {
      ctx.fillStyle = INK;
      var fs = fitFont(ctx, value, 500, size, xEnd - vx - 1.5, 7);
      ctx.font = font(500, fs);
      ctx.fillText(value, vx + 1, y - 1);
    }
  }

  // হলদে ঘর (উপরের দুই সারি): লেবেল বাঁয়ে, ঘর নির্দিষ্ট জায়গায়
  function yBox(ctx, lx, ly, label, bx, by, bw, bh, value, vSize, vWeight) {
    ctx.fillStyle = '#000';
    ctx.font = font(700, 11.4);
    ctx.fillText(label, lx, ly);
    var lend = lx + ctx.measureText(label).width + 4;     // ঘর লেখার উপর না পড়ে
    if (lend > bx) { bw -= lend - bx; bx = lend; }
    ctx.fillStyle = '#fff2cc';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 0.6;
    ctx.strokeRect(bx, by, bw, bh);
    if (value) {
      ctx.fillStyle = INK;
      var fs = fitFont(ctx, value, vWeight || 600, vSize || 12.4, bw - 6, 7);
      ctx.font = font(vWeight || 600, fs);
      ctx.fillText(value, bx + 3, by + bh - 4.2);
    }
  }

  // অঙ্গীকারনামা: সারি বেঁধে (ডান-বাম সমান, শেষ সারি বাদে) আঁকে; ফেরত দেয় লাইন সংখ্যা
  function pledgeLayout(ctx, words, x, maxW, size, gapW) {
    ctx.font = font(500, size);
    var sp = ctx.measureText(' ').width + 0.6;
    var lines = [[{ t: 'আমি', w: ctx.measureText('আমি').width }, { gap: gapW }]], cw = lines[0][0].w + 5 + gapW + 5;
    words.forEach(function (wd) {
      var w = ctx.measureText(wd).width, ln = lines[lines.length - 1];
      if (cw + w > maxW && !(ln.length === 2 && ln[1].gap)) { lines.push([]); ln = lines[lines.length - 1]; cw = 0; }
      if (cw + w > maxW) { lines.push([]); ln = lines[lines.length - 1]; cw = 0; }
      ln.push({ t: wd, w: w }); cw += w + sp;
    });
    return { lines: lines, sp: sp };
  }

  function draw(canvas, d, logo, photo) {
    var ctx = canvas.getContext('2d');
    ctx.setTransform(SCALE * K, 0, 0, SCALE * K, 0, 0);   // এখন থেকে সব মাপ pt
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, PW, PH);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    // বর্ডার: বাইরে মোটা, ভেতরে চিকন
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.2;
    ctx.strokeRect(14.8, 14.8, PW - 29.6, PH - 29.6);
    ctx.lineWidth = 0.7;
    ctx.strokeRect(18.6, 18.6, PW - 37.2, PH - 37.2);

    // ওয়াটারমার্ক
    if (logo) {
      ctx.save();
      ctx.globalAlpha = 0.11;
      var wmW = 520, wmH = wmW * logo.height / logo.width;     // পেইজ বর্ডারের ভেতরে
      ctx.drawImage(logo, PW / 2 - wmW / 2, 421 - wmH / 2, wmW, wmH);
      ctx.restore();
    }

    var CX = 297.5;
    // হেডার
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.font = font(500, 12.4);
    ctx.fillText('বিসমিল্লাহির রাহমানির রাহীম', CX, 33);

    var title = 'সৃজনশীল তরুণ সংঘ';
    var ts = fitFont(ctx, title, 700, 62, 372, 30);
    ctx.font = font(700, ts);
    ctx.fillStyle = '#c4551a';
    archText(ctx, title, CX + 2, 83, 5);

    ctx.fillStyle = '#000';
    var en = 'SRIJONSHIL TARUN SANGHA', es = 28;
    ctx.font = 'bold ' + es + 'px "Times New Roman", Times, Georgia, serif';
    var enW0 = ctx.measureText(en).width;
    es = es * 333 / enW0 - 1;                          // নমুনার প্রস্থ থেকে ১ pt ছোট
    ctx.font = 'bold ' + es + 'px "Times New Roman", Times, Georgia, serif';
    var enW = ctx.measureText(en).width;
    ctx.fillText(en, CX, 127);
    ctx.fillRect(CX - enW / 2, 130.4, enW, 1.6);

    var addrLine = 'নোয়াগাঁও, টুকের বাজার, ৩৯ নং ওয়ার্ড, সিলেট সিটি কর্পোরেশন, সিলেট।';
    var as = fitFont(ctx, addrLine, 700, 12.6, 296, 8);    // লোগো (ডানে ~১৩০) ও ছবির (বাঁয়ে ~৪৮০) মাঝে ধরে
    ctx.font = font(700, as);
    ctx.fillText(addrLine, CX, 153);

    var slogan = 'সামাজিক উন্নয়ন ও ন্যায়বিচার, তারুণ্যের অঙ্গীকার';
    ctx.font = font(700, 13.4);
    var sw = ctx.measureText(slogan).width + 3;
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(CX - sw / 2, 164, sw, 14.5);
    ctx.fillStyle = '#000';
    ctx.fillText(slogan, CX, 175.5);
    ctx.textAlign = 'left';

    // লোগো
    if (logo) {
      var dd = 0.5 * 72 / 25.4;                       // ০.৫ মিমি = ১.৪২ pt (দৈর্ঘ্য ও প্রস্থ দুটোই)
      var lh0 = 109, lw0 = lh0 * logo.width / logo.height, lh = lh0 + dd, lw = lw0 + dd;
      ctx.drawImage(logo, 18 + (108 - lw) / 2, 75 - dd / 2, lw, lh);
    }

    // ছবির বক্স
    ctx.save();
    roundRect(ctx, 487, 80, 87, 101, 9);
    ctx.fillStyle = '#dae3f3';
    ctx.fill();
    ctx.clip();
    if (photo) drawCover(ctx, photo, 487, 80, 87, 101);
    ctx.restore();
    ctx.strokeStyle = '#3a4a9a';
    ctx.lineWidth = 1.2;
    roundRect(ctx, 487, 80, 87, 101, 9);
    ctx.stroke();

    // শিরোনাম পিল
    ctx.fillStyle = '#f8cbad';
    roundRect(ctx, 211, 191, 173, 23, 11.5);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = font(700, 17);
    ctx.textAlign = 'center';
    ctx.fillText('সদস্য নিবন্ধন ফরম', CX, 208.6);
    ctx.textAlign = 'left';

    // উপরের দুই সারি
    var TYPE_BN = { general: '(ক) সাধারণ সদস্য', expat: '(খ) প্রবাসী সদস্য', junior: '(গ) জুনিয়র সদস্য', donor: '(ঘ) দাতা সদস্য' };
    yBox(ctx, 27, 246.3, 'ফরম নম্বর:', 70, 235, 126, 17, d.formNo);
    yBox(ctx, 220, 246.3, 'সদস্য ধরণ:', 268, 235, 141, 17, TYPE_BN[d.memberType] || '', 13.4, 700);
    yBox(ctx, 420, 246.3, 'সদস্য নম্বর:', 467, 235, 105, 17, d.memberNo || '');
    yBox(ctx, 25, 271.3, 'সূত্র/সুপারিশ:', 78, 260, 119, 17, d.referenceLabel || '');
    yBox(ctx, 220, 271.3, 'সূত্র/সুপারিশ প্রমাণক:', 305, 260, 105, 17, d.referenceProof || '');
    yBox(ctx, 422, 271.3, 'নিবন্ধন ফি:', 467, 259, 106, 18, d.feeText || '');

    // মূল ফিল্ড (বাম কলাম x=25, ডান কলাম x=304.5, তৃতীয় কলাম x=455)
    var L = 25, LE = 288, RX = 304.5, R = 568, T3 = 455;
    var junior = d.memberType === 'junior';
    var p = d.perm || {}, c = d.cur || p;
    var y = 296, P1 = 18.4, P2 = 15.6;

    fld(ctx, L, y, '১। নাম (বাংলায়) এনআইডি অনুযায়ী:', d.nameBn, R + 1); y += P1;
    fld(ctx, 39, y, 'নাম (ইংরেজিতে) এনআইডি অনুযায়ী:', d.nameEn, R + 1); y += P1;
    fld(ctx, L, y, '২। পিতা:', d.father, LE);
    fld(ctx, RX, y, '৩। মাতা:', d.mother, R); y += P1;
    // ৪: জুনিয়র সদস্যের এনআইডি না থাকলে জন্মনিবন্ধন সনদ নম্বর
    var idLabel = '৪। জাতীয় পরিচয় পত্র:', idVal = d.nid;
    if (junior && d.birthReg) {
      if (!d.nid) { idLabel = '৪। জন্মনিবন্ধন সনদ নম্বর:'; idVal = d.birthReg; }
      else idVal = d.nid + ' / জ.নি. ' + d.birthReg;
    }
    fld(ctx, L, y, idLabel, idVal, LE);
    fld(ctx, RX, y, '৫। জন্ম তারিখ:', d.dobText, T3 - 6);
    fld(ctx, T3, y, '৬। লিঙ্গ:', d.gender, R); y += P1;
    fld(ctx, L, y, '৭। শিক্ষাগত যোগ্যতা:', d.education, LE);
    fld(ctx, RX, y, '৮। ধর্ম:', d.religion, T3 - 6);
    fld(ctx, T3, y, '৯। রক্ত গ্রুপ:', d.blood, R); y += P1;
    fld(ctx, L, y, '১০। পেশা:', d.profession, LE);
    fld(ctx, RX, y, '১১। ইমেইল:', d.email, R); y += P1;
    fld(ctx, L, y, '১২। ফোন নম্বর:', d.phone, LE);
    fld(ctx, RX, y, '১৩। ওয়াটসঅ্যাপ নম্বর:', d.whatsapp, R); y += P1;

    // ঠিকানা: উপজেলা হলে ইউনিয়ন + ওয়ার্ড লাইন; সিটি কর্পোরেশন হলে সিটি কর্পোরেশন + ওয়ার্ড লাইন
    function addrBlock(y0, title, a) {
      var yy = y0, city = /সিটি কর্পোরেশন$/.test(a.upa || '');
      fld(ctx, L, yy, title + ' পাড়া-', a.para, 278);
      fld(ctx, 292, yy, 'গ্রাম-', a.village, R); yy += P2;
      fld(ctx, 46, yy, 'পোস্ট অফিস-', a.po, 360); yy += P2;
      if (city) {
        fld(ctx, 46, yy, 'সিটি কর্পোরেশন:', a.upa, 360); yy += P2;
        fld(ctx, 46, yy, 'ওয়ার্ড:', a.ward, 360); yy += P2;
        fld(ctx, 46, yy, 'থানা-', a.thana, 300);
        fld(ctx, 312, yy, 'জেলা-', a.dist, R);
      } else {
        fld(ctx, 46, yy, 'ইউনিয়ন:', a.union, 360); yy += P2;
        fld(ctx, 46, yy, 'ওয়ার্ড:', a.ward, 360); yy += P2;
        fld(ctx, 46, yy, 'থানা-', a.thana, 200);
        fld(ctx, 212, yy, 'উপজেলা:', a.upa, 400);
        fld(ctx, 412, yy, 'জেলা-', a.dist, R);
      }
      return yy;
    }
    y = addrBlock(y, '১৪। স্থায়ী ঠিকানা:', p) + P1;
    y = addrBlock(y, '১৫। বর্তমান ঠিকানা:', c) + P1;
    fld(ctx, L, y, '১৬। বর্তমান বসবাসরত দেশের নাম:', d.country, R);

    // অঙ্গীকারনামা
    ctx.strokeStyle = '#000'; ctx.lineWidth = 0.9;
    ctx.strokeRect(20, 620, 553, 115);
    ctx.fillStyle = '#f8cbad';
    roundRect(ctx, 233, 598, 130, 22, 11);
    ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = font(700, 16.5);
    ctx.textAlign = 'center';
    ctx.fillText('অঙ্গীকারনামা', 298, 614.3);
    ctx.textAlign = 'left';

    var CM7 = 7 / 2.54 * 72;                        // ৭ সে.মি. ফাঁকা (হাতে নাম লেখার জায়গা)
    var body = 'এই মর্মে স্বেচ্ছায় ও স্বজ্ঞানে স্বীকার করছি যে, আমার দেওয়া উপরোল্লিখিত তথ্যসমূহ সত্য ও নির্ভুল। আমি অঙ্গীকার করছি যে, আমি "সৃজনশীল তরুণ সংঘ" -এর গঠনতন্ত্র ও কার্যকরী কমিটির সকল সিদ্ধান্ত মেনে চলবো, সংগঠন ও গঠনতন্ত্র বহির্ভূত কোন কাজ করবো না। গঠনতন্ত্র ও সংগঠন বিরোধী কোন কাজে লিপ্ত থাকলে বা প্রমাণিত হলে কর্তৃপক্ষ আমার বিরুদ্ধে যে ব্যবস্থা গ্রহণ করবেন তা মেনে নিতে বাধ্য থাকবো, এতে আমার কোন আপত্তি থাকবে না।';
    var words = body.split(/\s+/);
    var psize = 12.4, lay;
    for (;;) {                                       // ৪ লাইনে না ধরলে লেখা একটু ছোট করে
      lay = pledgeLayout(ctx, words, 27, 539, psize, CM7);
      if (lay.lines.length <= 4 || psize <= 10.2) break;
      psize -= 0.2;
    }
    ctx.font = font(500, psize);
    ctx.fillStyle = G;
    lay.lines.forEach(function (ln, i) {
      var by = 638 + i * 16.5, cx = 27, last = i === lay.lines.length - 1;
      var ww = 0, nsp = 0;
      ln.forEach(function (it, j) { if (it.t) { ww += it.w; if (j > 0 && ln[j - 1].t) nsp++; } });
      var gapTot = ln.some(function (it) { return it.gap; }) ? CM7 + 10 : 0;
      var extra = last || nsp === 0 ? 0 : (539 - ww - gapTot - nsp * lay.sp - (ln[0].gap ? 0 : 0)) / nsp;
      ln.forEach(function (it, j) {
        if (it.gap) { dotted(ctx, cx + 5, cx + 5 + it.gap, by + 2); cx += it.gap + 10; return; }
        ctx.fillText(it.t, cx, by);
        cx += it.w + (j < ln.length - 1 ? lay.sp + (ln[j + 1].t && ln[j].t ? Math.max(0, extra) : 0) : 0);
      });
    });
    ctx.fillStyle = G;
    ctx.font = font(500, 12.4);
    ctx.fillText('আবেদনকারীর স্বাক্ষর–', 303, 719);
    dotted(ctx, 394, 564, 722);

    // সদস্যপদ লাভের তারিখ (ঘর), সাধারণ সম্পাদক ও সভাপতি
    ctx.fillStyle = '#fff';
    ctx.fillRect(230, 743, 132, 31);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 0.7;
    ctx.strokeRect(230, 743, 132, 31);
    dotted(ctx, 233, 359, 770);
    ctx.fillStyle = '#000';
    ctx.font = font(500, 13.4);
    ctx.textAlign = 'center';
    ctx.fillText('সদস্যপদ লাভের তারিখ', CX, 789);
    dotted(ctx, 40, 172, 797.5);
    dotted(ctx, 421, 555, 797);
    ctx.fillStyle = '#1f4e9e';
    ctx.fillText('সাধারণ সম্পাদক', 107.5, 813.5);
    ctx.fillText('সভাপতি', 490, 813.5);

    // ফুটার: ডাউনলোডের সময় (মধ্যখানে, ইংরেজি হরফে)
    ctx.fillStyle = '#222';
    ctx.font = font(500, 9.6);
    ctx.fillText('ডাউনলোডের সময়: ' + (d.timestampEn || d.timestampBn || ''), CX, 820.4);
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
