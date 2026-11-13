/* ছোট কিউআর কোড জেনারেটর (বাইট মোড, ECC H, ভার্সন ১–১০, মাঝে লোগো, SVG আউটপুট; ইউআরএল-এর জন্য যথেষ্ট) — কোনো বাইরের লাইব্রেরি লাগে না */
(function () {
  'use strict';
  var DATA = [9, 16, 26, 36, 46, 60, 66, 86, 100, 122];           // ভার্সন ১–১০, ECC H (৩০%): ডেটা কোডওয়ার্ড
  var EPB = [17, 28, 22, 16, 22, 28, 26, 26, 24, 28];             // প্রতি ব্লকে ECC কোডওয়ার্ড
  var NB = [1, 1, 2, 4, 4, 4, 5, 6, 8, 8];                        // ব্লক সংখ্যা
  var ALIGN = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  var EXP = [], LOG = [];
  (function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  function gmul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }
  function rsGen(n) { var p = [1]; for (var i = 0; i < n; i++) { var q = new Array(p.length + 1).fill(0); for (var j = 0; j < p.length; j++) { q[j] ^= p[j]; q[j + 1] ^= gmul(p[j], EXP[i]); } p = q; } return p; }
  function rsRem(data, n) {
    var g = rsGen(n), r = new Array(n).fill(0);
    data.forEach(function (b) { var f = b ^ r.shift(); r.push(0); for (var i = 0; i < n; i++) r[i] ^= gmul(g[i + 1], f); });
    return r;
  }
  function utf8(s) { return unescape(encodeURIComponent(s)).split('').map(function (c) { return c.charCodeAt(0); }); }
  function bch(v, poly, deg) { var d = v << deg; var top = 31 - Math.clz32(poly); for (var i = 31 - Math.clz32(d); i >= top; i--) if ((d >> i) & 1) d ^= poly << (i - top); return d; }

  function build(text) {
    var bytes = utf8(text), ver = 0;
    for (var v = 0; v < 10; v++) if (bytes.length + 2 <= DATA[v]) { ver = v + 1; break; }
    if (!ver) return null;
    var n = 17 + 4 * ver, cap = DATA[ver - 1], bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); }
    put(4, 4); put(bytes.length, 8); bytes.forEach(function (b) { put(b, 8); });
    put(0, Math.min(4, cap * 8 - bits.length)); while (bits.length % 8) bits.push(0);
    var cw = []; for (var i = 0; i < bits.length; i += 8) { var b = 0; for (var k = 0; k < 8; k++) b = b << 1 | bits[i + k]; cw.push(b); }
    for (var pad = 0xEC; cw.length < cap; pad ^= 0xEC ^ 0x11) cw.push(pad);
    // ব্লকে ভাগ + ECC + ইন্টারলিভ
    var nb = NB[ver - 1], ecl = EPB[ver - 1], total = (DATA[ver - 1] + ecl * nb), nShort = nb - total % nb, shortLen = Math.floor(total / nb), blocks = [], pos = 0;
    for (var bi = 0; bi < nb; bi++) { var dl = shortLen - ecl + (bi < nShort ? 0 : 1), d = cw.slice(pos, pos + dl); pos += dl; blocks.push({ d: d, e: rsRem(d, ecl) }); }
    var seq = [], maxD = shortLen - ecl + 1;
    for (i = 0; i < maxD; i++) blocks.forEach(function (bl) { if (i < bl.d.length) seq.push(bl.d[i]); });
    for (i = 0; i < ecl; i++) blocks.forEach(function (bl) { seq.push(bl.e[i]); });
    var stream = []; seq.forEach(function (b) { for (var k = 7; k >= 0; k--) stream.push((b >> k) & 1); });

    var best = null, bestPen = 1e9;
    for (var mask = 0; mask < 8; mask++) {
      var m = [], fn = [];
      for (i = 0; i < n; i++) { m.push(new Array(n).fill(0)); fn.push(new Array(n).fill(false)); }
      var set = function (x, y, d) { if (x >= 0 && y >= 0 && x < n && y < n) { m[y][x] = d ? 1 : 0; fn[y][x] = true; } };
      for (i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
      [[3, 3], [n - 4, 3], [3, n - 4]].forEach(function (c) { for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var dist = Math.max(Math.abs(dx), Math.abs(dy)); set(c[0] + dx, c[1] + dy, dist !== 2 && dist !== 4); } });
      var al = ALIGN[ver - 1];
      al.forEach(function (ay, a) { al.forEach(function (ax, b) { if ((a === 0 && b === 0) || (a === 0 && b === al.length - 1) || (a === al.length - 1 && b === 0)) return; for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }); });
      // ফরম্যাট ও ভার্সন তথ্য (জায়গা সংরক্ষণ)
      var fmt = ((2 << 3 | mask) << 10 | bch(2 << 3 | mask, 0x537, 10)) ^ 0x5412;   // ECC H = ২
      for (i = 0; i <= 5; i++) set(8, i, (fmt >> i) & 1); set(8, 7, (fmt >> 6) & 1); set(8, 8, (fmt >> 7) & 1); set(7, 8, (fmt >> 8) & 1);
      for (i = 9; i < 15; i++) set(14 - i, 8, (fmt >> i) & 1);
      for (i = 0; i < 8; i++) set(n - 1 - i, 8, (fmt >> i) & 1);
      for (i = 8; i < 15; i++) set(8, n - 15 + i, (fmt >> i) & 1);
      set(8, n - 8, true);
      if (ver >= 7) { var vi = ver << 12 | bch(ver, 0x1F25, 12); for (i = 0; i < 18; i++) { var bit = (vi >> i) & 1, a = n - 11 + i % 3, bb = Math.floor(i / 3); set(a, bb, bit); set(bb, a, bit); } }
      // ডেটা বসানো
      var idx = 0;
      for (var right = n - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (var vert = 0; vert < n; vert++) for (var j = 0; j < 2; j++) {
          var x = right - j, up = ((right + 1) & 2) === 0, y = up ? n - 1 - vert : vert;
          if (!fn[y][x] && idx < stream.length) { m[y][x] = stream[idx++]; }
          if (!fn[y][x]) {
            var inv = [(x + y) % 2 === 0, y % 2 === 0, x % 3 === 0, (x + y) % 3 === 0, (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, x * y % 2 + x * y % 3 === 0, (x * y % 2 + x * y % 3) % 2 === 0, ((x + y) % 2 + x * y % 3) % 2 === 0][mask];
            if (inv) m[y][x] ^= 1;
          }
        }
      }
      var pen = penalty(m, n);
      if (pen < bestPen) { bestPen = pen; best = m; }
    }
    return best;
  }
  function penalty(m, n) {
    var p = 0, x, y, run, i, dark = 0;
    for (var pass = 0; pass < 2; pass++) for (y = 0; y < n; y++) {
      run = 1;
      for (x = 1; x < n; x++) { var a = pass ? m[x][y] : m[y][x], b = pass ? m[x - 1][y] : m[y][x - 1]; if (a === b) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; }
    }
    for (y = 0; y < n - 1; y++) for (x = 0; x < n - 1; x++) { var c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3; }
    var pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], pr = pat.slice().reverse();
    for (pass = 0; pass < 2; pass++) for (y = 0; y < n; y++) for (x = 0; x + 11 <= n; x++) {
      var f1 = true, f2 = true; for (i = 0; i < 11; i++) { var v = pass ? m[x + i][y] : m[y][x + i]; if (v !== pat[i]) f1 = false; if (v !== pr[i]) f2 = false; }
      if (f1) p += 40; if (f2) p += 40;
    }
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) dark += m[y][x];
    p += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
    return p;
  }
  var QUIET = 4;          // চারপাশের সাদা ফাঁকা জায়গা (Quiet Zone), মডিউল হিসেবে — স্ট্যান্ডার্ড ন্যূনতম ৪
  var LOGO = .34;         // লোগোর বক্সের পাশ = কোডের পাশের ৩৪% → ক্ষেত্রফল ≈ ১১.৬% (১০–১৫% এর মধ্যে)
  function logoBox(n) { var k = Math.round(n * LOGO); if ((n - k) % 2) k++; return { k: k, o: (n - k) / 2 }; }
  window.SrijonQR = {
    matrix: build, QUIET: QUIET,
    /* ক্যানভাসে আঁকে: (x,y) থেকে size×size বক্সে; চারপাশে সাদা Quiet Zone; মাঝে লোগো (img এলিমেন্ট) */
    verifyUrl: function (formNo, code) { return new URL('verify.html?f=' + encodeURIComponent(formNo) + '&k=' + encodeURIComponent(code), location.href).href; },
    draw: function (ctx, text, x, y, size, logo, unit) {      // unit: এক ডিভাইস-পিক্সেল = কত একক (পিডিএফে pt); মডিউল তার গুণিতক হয়
      var m = build(text); if (!m) return false; unit = unit || 1;
      var n = m.length, cell = Math.max(unit, Math.floor(size / (n + 2 * QUIET) / unit) * unit), off = Math.round((size - cell * (n + 2 * QUIET)) / 2 / unit) * unit, ox = x + off, oy = y + off;
      ctx.fillStyle = '#fff'; ctx.fillRect(x, y, size, size); ctx.fillStyle = '#000';     // মডিউল পূর্ণসংখ্যার পিক্সেলে — ঝাপসা হয় না
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (m[r][c]) ctx.fillRect(ox + (c + QUIET) * cell, oy + (r + QUIET) * cell, cell, cell);
      if (logo) {
        var b = logoBox(n), bw = b.k * cell, pad = bw * .08, iw = bw - 2 * pad, cx = ox + (n + 2 * QUIET) * cell / 2, cy = oy + (n + 2 * QUIET) * cell / 2;
        ctx.fillStyle = '#fff'; ctx.fillRect(cx - bw / 2, cy - bw / 2, bw, bw);
        var s = Math.min(iw / logo.width, iw / logo.height); ctx.drawImage(logo, cx - logo.width * s / 2, cy - logo.height * s / 2, logo.width * s, logo.height * s);
      }
      return true;
    },
    /* স্বয়ংসম্পূর্ণ SVG টেক্সট; logoHref = লোগোর data: ইউআরএল (না দিলে লোগো ছাড়া) */
    svg: function (text, logoHref, logoW, logoH) {
      var m = build(text); if (!m) return '';
      var n = m.length, T = n + 2 * QUIET, d = '';
      for (var r = 0; r < n; r++) { var c = 0; while (c < n) { if (m[r][c]) { var st = c; while (c < n && m[r][c]) c++; d += 'M' + (st + QUIET) + ' ' + (r + QUIET) + 'h' + (c - st) + 'v1h-' + (c - st) + 'z'; } else c++; } }
      var o = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + T + ' ' + T + '" width="1024" height="1024" shape-rendering="crispEdges">'
        + '<rect width="' + T + '" height="' + T + '" fill="#fff"/><path d="' + d + '" fill="#000"/>';
      if (logoHref) {
        var b = logoBox(n), bx = QUIET + b.o, pad = b.k * .08, iw = b.k - 2 * pad, sc = Math.min(iw / logoW, iw / logoH), w = logoW * sc, h = logoH * sc;
        o += '<rect x="' + bx + '" y="' + bx + '" width="' + b.k + '" height="' + b.k + '" fill="#fff"/><image x="' + (T / 2 - w / 2).toFixed(3) + '" y="' + (T / 2 - h / 2).toFixed(3) + '" width="' + w.toFixed(3) + '" height="' + h.toFixed(3) + '" xlink:href="' + logoHref + '" href="' + logoHref + '"/>';
      }
      return o + '</svg>';
    }
  };
})();
