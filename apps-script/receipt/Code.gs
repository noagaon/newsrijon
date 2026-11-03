/**
 * সৃজনশীল তরুণ সংঘ — "চাঁদা আদায় রসিদ" সংরক্ষণের ব্যাকএন্ড (Google Apps Script)
 *
 * স্ক্রিপ্ট আইডি : 1D-IGi0X46tW32bYTsyb6n1PE3W0JUg7fukvUjm2OlTFrEnKdxvAuAXzW
 * স্প্রেডশিট     : 1J0qRZ_vPAQaFHWWQId1wVRtfH57t04-Pvle0xvgAyPI  (ট্যাব "চাঁদা রসিদ" না থাকলে নিজে তৈরি হয়)
 *
 * কাজ: action=receipt_save → রসিদের তথ্য শিটে নতুন সারি; রসিদ নম্বর সার্ভার নিজে SF-26/0001 ক্রমে দেয় (ব্রাউজারের নম্বর গ্রহণ করে না);
 *      action=receipt_next → পরের নম্বর দেখায় (বাড়ায় না)।
 * ডিপ্লয়: Deploy > New deployment > Web app > Execute as = Me, Who has access = Anyone → "Web app URL" টি
 *          ওয়েবসাইটের config.js এর RECEIPT_URL-এ বসাবে।
 * প্রথমবার: এডিটরে setup ফাংশন একবার Run করে অনুমতি (Sheets + Drive) দিন।
 * কোড বদলালে: Deploy > Manage deployments > Edit > New version > Deploy।
 *
 * নিরাপত্তা: সংরক্ষণের আগে "অনুমতি নিন" — অনুরোধ অনুমোদনকারীর ইমেইলে যায়; অনুমোদন (একবারের, ৬ ঘণ্টা বৈধ, তথ্য বদলালে অকার্যকর) ছাড়া সংরক্ষণ হয় না।
 * ডিপ্লয় করার পর "Manage deployments > Edit > New version" দিতে ভুলবেন না; ইমেইল পাঠানোর অনুমতি (MailApp) প্রথমবার setup Run করলে চাওয়া হবে।
 */

var CONFIG = {
  SHEET_ID: '1J0qRZ_vPAQaFHWWQId1wVRtfH57t04-Pvle0xvgAyPI',
  TAB: 'চাঁদা রসিদ',
  ROOT_FOLDER_ID: '18IvXNKUbO7oc0Uh6HbFtRRD8eoJEupWR',   // Subscription Fund (ভেতরে চাঁদার ধরণ অনুযায়ী সাব-ফোল্ডার)
  MAX_PDF_BYTES: 3 * 1024 * 1024,
  APPROVERS: ['srijonshil2011@gmail.com'],      // অনুমতির মেইল এখানে যায় (আরও যোগ করা যায়)
  WEBAPP_URL: 'https://script.google.com/macros/s/AKfycbxspg60NNRsKL3SZkWw6jFptRnjuUvmfH6KS25OpeXWfhiE5BaTHe4KnGo448qpQTHFqQ/exec',
  PERMIT_TAB: 'রসিদ অনুমতি',
  PERMIT_VALID_HOURS: 6,                         // অনুমোদনের পর এত ঘণ্টার মধ্যে সংরক্ষণ করতে হবে
  PERMIT_MAX_PER_DAY: 60,                        // দিনে মোট অনুমতি-অনুরোধ (মেইল কোটা বাঁচাতে)
  MAX_PER_MIN: 30                    // প্রতি মিনিটে সর্বোচ্চ সংরক্ষণ-অনুরোধ (অপব্যবহার ঠেকাতে)
};

var HEADERS = ['রসিদ নম্বর', 'সংরক্ষণের সময়', 'তারিখ', 'সদস্য ধরণ', 'সদস্য নম্বর', 'প্রদানকারীর নাম',
  'চাঁদার ধরণ', 'পরিমাণ (অঙ্কে)', 'পরিমাণ (কথায়)', 'প্রদানের মাধ্যম', 'অনুমোদনকারী', 'আদায়কারী', 'পিডিএফ লিংক'];
var KINDS = ['নিবন্ধন ফি', 'মাসিক চাঁদা', 'বার্ষিক চাঁদা', 'বিশেষ চাঁদা', 'অফিস সংস্কার চাঁদা', 'উন্নয়ন চাঁদা', 'মিলাদ মাহফিল চাঁদা',
  'উৎসব উদযাপন চাঁদা', 'বিবাহ শুভেচ্ছা/অভিনন্দন চাঁদা', 'অন্যান্য চাঁদা'];
var TYPES = ['সাধারণ সদস্য', 'প্রবাসী সদস্য', 'জুনিয়র সদস্য', 'দাতা সদস্য'];

function doGet(e) {
  if (e && e.parameter && e.parameter.a === 'decide') return decidePage_(e.parameter);
  return json_({ ok: true, service: 'srijonshil-receipt', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (req.action === 'receipt_save') return json_(save_(req));
    if (req.action === 'receipt_pdf') return json_(pdf_(req));
    if (req.action === 'receipt_access') return json_(requestAccess_(req));
    if (req.action === 'receipt_access_status') return json_(accessStatus_(req));
    if (req.action === 'receipt_next') return json_(next_());
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, error: 'server error: ' + String(err && err.message || err).substring(0, 200) });
  }
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ---------------------------------------------------------------- অনুমতি-ব্যবস্থা
var PERMIT_HEADERS = ['অনুরোধ আইডি', 'অনুরোধের সময়', 'নাম', 'সদস্য নম্বর', 'চাঁদার ধরণ', 'পরিমাণ', 'মাধ্যম', 'অবস্থা', 'অনুমোদনকারী', 'সিদ্ধান্তের সময়', 'রসিদ নম্বর', 'ইমেইল অবস্থা', 'টাইমস্ট্যাম্প'];
var ST = { PENDING: 'অপেক্ষমাণ', APPROVED: 'অনুমোদিত', REJECTED: 'বাতিল', USED: 'ব্যবহৃত', EXPIRED: 'মেয়াদোত্তীর্ণ' };

function secret_() {
  var props = PropertiesService.getScriptProperties(), k = props.getProperty('SECRET');
  if (!k) { k = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('SECRET', k); }
  return k;
}
function sign_(rid, verdict, idx) {
  var raw = Utilities.computeHmacSha256Signature(rid + '|' + verdict + '|' + idx, secret_());
  return raw.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('').substring(0, 32);
}
function esc_(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function nowStr_() { return Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyyy-MM-dd HH:mm:ss'); }

function permitSheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID), sh = ss.getSheetByName(CONFIG.PERMIT_TAB);
  if (!sh) sh = ss.insertSheet(CONFIG.PERMIT_TAB);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, PERMIT_HEADERS.length).setValues([PERMIT_HEADERS]).setFontWeight('bold').setBackground('#0b3d24').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}
function pcol_(name) { return PERMIT_HEADERS.indexOf(name) + 1; }
function findReq_(sh, rid) {
  var last = sh.getLastRow();
  if (last < 2) return null;
  var vals = sh.getRange(2, 1, last - 1, PERMIT_HEADERS.length).getValues();
  for (var i = vals.length - 1; i >= 0; i--) if (String(vals[i][0]) === rid) {
    var rec = {}; PERMIT_HEADERS.forEach(function (h, k) { rec[h] = vals[i][k]; });
    return { row: i + 2, rec: rec };
  }
  return null;
}
function effective_(rec) {
  var st = String(rec['অবস্থা']);
  if ((st === ST.PENDING || st === ST.APPROVED) && Date.now() - Number(rec['টাইমস্ট্যাম্প'] || 0) > CONFIG.PERMIT_VALID_HOURS * 3600 * 1000) return ST.EXPIRED;
  return st;
}
function amountOnly_(v) { return enDigits_(String(v || '')).replace(/[,\s]/g, '').replace(/টাকা/g, ''); }

function requestAccess_(r) {
  if (r.website) return { ok: false, error: 'rejected' };
  var d = r.data || {};
  var name = safe_(d.name, 100), kind = safe_(d.kind, 40), method = safe_(d.method, 40), memberNo = safe_(d.memberNo, 30), amount = amountOnly_(d.amount);
  if (name.length < 2) return { ok: false, error: 'missing name' };
  if (!kind) return { ok: false, error: 'missing kind' };
  if (!/^\d{1,9}$/.test(amount)) return { ok: false, error: 'invalid amount' };
  var rid = Utilities.getUuid().replace(/-/g, ''), prow = 0;
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = permitSheet_(), last = sh.getLastRow(), since = Date.now() - 24 * 3600 * 1000, total = 0;
    if (last > 1) {
      var ts = sh.getRange(2, pcol_('টাইমস্ট্যাম্প'), last - 1, 1).getValues();
      for (var i = 0; i < ts.length; i++) if (Number(ts[i][0]) >= since) total++;
    }
    if (total >= CONFIG.PERMIT_MAX_PER_DAY) return { ok: false, error: 'limit_day' };
    sh.appendRow([rid, "'" + nowStr_(), name, memberNo, kind, Number(amount), method, ST.PENDING, '', '', '', '', Date.now()]);
    prow = sh.getLastRow();
  } finally {
    lock.releaseLock();
  }
  var res = mailApprovers_(rid, name, memberNo, kind, amount, method);
  try { permitSheet_().getRange(prow, pcol_('ইমেইল অবস্থা')).setValue(res); } catch (e) {}
  return { ok: true, rid: rid };
}

function mailApprovers_(rid, name, memberNo, kind, amount, method) {
  var results = [];
  CONFIG.APPROVERS.forEach(function (email, idx) {
    try {
      var ok = CONFIG.WEBAPP_URL + '?a=decide&rid=' + rid + '&v=approve&u=' + idx + '&sig=' + sign_(rid, 'approve', idx);
      var no = CONFIG.WEBAPP_URL + '?a=decide&rid=' + rid + '&v=reject&u=' + idx + '&sig=' + sign_(rid, 'reject', idx);
      var btn = 'display:inline-block;color:#fff;padding:14px 26px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;margin:6px 8px 6px 0;';
      var html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#111;max-width:520px">' +
        '<h2 style="color:#0b3d24;margin:0 0 10px">চাঁদা রসিদ সংরক্ষণের অনুমতির অনুরোধ</h2>' +
        '<p style="margin:0 0 4px"><b>চাঁদা প্রদানকারী:</b> ' + esc_(name) + '</p>' +
        (memberNo ? '<p style="margin:0 0 4px"><b>সদস্য নম্বর:</b> ' + esc_(memberNo) + '</p>' : '') +
        '<p style="margin:0 0 4px"><b>চাঁদার ধরণ:</b> ' + esc_(kind) + '</p>' +
        '<p style="margin:0 0 4px"><b>পরিমাণ:</b> ' + esc_(amount) + ' টাকা</p>' +
        '<p style="margin:0 0 16px"><b>মাধ্যম:</b> ' + esc_(method) + '</p>' +
        '<a href="' + ok + '" style="' + btn + 'background:#157347">✔ অনুমোদন দিন</a>' +
        '<a href="' + no + '" style="' + btn + 'background:#c0392b">✖ বাতিল করুন</a>' +
        '<p style="color:#555;font-size:13px;margin-top:16px">যিনি আগে সিদ্ধান্ত নেবেন সেটাই কার্যকর হবে। অনুমতি ' + CONFIG.PERMIT_VALID_HOURS + ' ঘণ্টা বৈধ এবং একটি রসিদের জন্যই। এই লিংক অন্য কাউকে পাঠাবেন না।</p></div>';
      MailApp.sendEmail({
        to: email, subject: 'রসিদের অনুমতি: ' + name + ' — ' + amount + ' টাকা #' + rid.substring(0, 4),
        htmlBody: html, body: 'রসিদের অনুমতির অনুরোধ — ' + name + ', ' + kind + ', ' + amount + ' টাকা\nঅনুমোদন: ' + ok + '\nবাতিল: ' + no,
        name: 'সৃজনশীল তরুণ সংঘ ওয়েবসাইট'
      });
      results.push('পাঠানো হয়েছে: ' + email);
    } catch (err) {
      console.error('mail failed for ' + email + ': ' + (err && err.message));
      results.push('ব্যর্থ ' + email + ' — ' + String(err && err.message || err).substring(0, 120));
    }
  });
  return results.join(' | ');
}

function accessStatus_(r) {
  var rid = String(r.rid || '');
  if (!/^[0-9a-f]{32}$/.test(rid)) return { ok: false, error: 'bad id' };
  var f = findReq_(permitSheet_(), rid);
  if (!f) return { ok: false, error: 'not found' };
  var st = effective_(f.rec);
  return { ok: true, status: st === ST.APPROVED ? 'approved' : st === ST.REJECTED ? 'rejected' : st === ST.USED ? 'used' : st === ST.EXPIRED ? 'expired' : 'pending' };
}

function decidePage_(q) {
  var rid = String(q.rid || ''), verdict = String(q.v || ''), idx = Number(q.u), msg, good = false;
  try {
    if (!/^[0-9a-f]{32}$/.test(rid) || (verdict !== 'approve' && verdict !== 'reject') || !(idx >= 0 && idx < CONFIG.APPROVERS.length) || String(q.sig || '') !== sign_(rid, verdict, idx)) {
      msg = 'লিংকটি সঠিক নয়।';
    } else {
      var lock = LockService.getScriptLock();
      lock.waitLock(30000);
      try {
        var sh = permitSheet_(), f = findReq_(sh, rid);
        if (!f) msg = 'অনুরোধটি পাওয়া যায়নি।';
        else {
          var st = effective_(f.rec);
          if (st === ST.EXPIRED) msg = 'অনুরোধের মেয়াদ শেষ হয়ে গেছে।';
          else if (st !== ST.PENDING) msg = 'এই অনুরোধে ইতোমধ্যে সিদ্ধান্ত নেওয়া হয়েছে: ' + st + (f.rec['অনুমোদনকারী'] ? ' (' + f.rec['অনুমোদনকারী'] + ')' : '') + '।';
          else {
            sh.getRange(f.row, pcol_('অবস্থা')).setValue(verdict === 'approve' ? ST.APPROVED : ST.REJECTED);
            sh.getRange(f.row, pcol_('অনুমোদনকারী')).setValue(CONFIG.APPROVERS[idx]);
            sh.getRange(f.row, pcol_('সিদ্ধান্তের সময়')).setValue("'" + nowStr_());
            good = true;
            msg = (verdict === 'approve' ? '✔ অনুমোদন দেওয়া হয়েছে' : '✖ অনুরোধ বাতিল করা হয়েছে') + ' — ' + esc_(f.rec['নাম']) + ' (' + esc_(f.rec['পরিমাণ']) + ' টাকা)।';
          }
        }
      } finally {
        lock.releaseLock();
      }
    }
  } catch (err) {
    console.error(err && err.stack || err);
    msg = 'সমস্যা হয়েছে, আবার চেষ্টা করুন।';
  }
  var color = good ? '#157347' : '#8a5a00';
  return HtmlService.createHtmlOutput('<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:40px auto;padding:24px;border:2px solid ' + color + ';border-radius:14px;text-align:center"><h2 style="color:' + color + ';line-height:1.5">' + msg + '</h2><p style="color:#555">সৃজনশীল তরুণ সংঘ</p></div>')
    .setTitle('অনুমতি').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// সংরক্ষণের অনুমতি: অনুমোদিত, মেয়াদের ভেতরে, এবং অনুরোধের তথ্যের সাথে হুবহু মিল থাকতে হবে
function authorized_(r, d) {
  var rid = String(r.rid || '');
  if (!/^[0-9a-f]{32}$/.test(rid)) return { ok: false, error: 'permission' };
  var f = findReq_(permitSheet_(), rid);
  if (!f) return { ok: false, error: 'permission' };
  var st = effective_(f.rec);
  if (st !== ST.APPROVED) return { ok: false, error: st === ST.USED ? 'used' : st === ST.EXPIRED ? 'expired' : 'permission' };
  var q = f.rec;
  if (safe_(d.name, 100) !== String(q['নাম']) || safe_(d.kind, 40) !== String(q['চাঁদার ধরণ']) || safe_(d.method, 40) !== String(q['মাধ্যম']) ||
      amountOnly_(d.amount) !== String(q['পরিমাণ']) || safe_(d.memberNo, 30) !== String(q['সদস্য নম্বর'])) return { ok: false, error: 'changed' };
  return { ok: true, approver: String(q['অনুমোদনকারী']), row: f.row };
}

function sheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID), sh = ss.getSheetByName(CONFIG.TAB);
  if (!sh) sh = ss.insertSheet(CONFIG.TAB);
  if (sh.getLastRow() > 0) {   // আগের শিটে নতুন কলাম থাকলে শেষে যোগ
    var have = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    HEADERS.forEach(function (h) { if (have.indexOf(h) < 0) { sh.getRange(1, sh.getLastColumn() + 1).setValue(h).setFontWeight('bold').setBackground('#0b3d24').setFontColor('#ffffff'); have.push(h); } });
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#0b3d24').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}
function safe_(v, max) {
  var s = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\s+/g, ' ').trim().substring(0, max || 100);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function enDigits_(s) {
  var d = '০১২৩৪৫৬৭৮৯';
  return String(s).replace(/[০-৯]/g, function (c) { return d.indexOf(c); });
}

function save_(r) {
  if (r.website) return { ok: false, error: 'rejected' };               // হানিপট
  var cache = CacheService.getScriptCache(), key = 'rc_' + Math.floor(Date.now() / 60000);
  var cnt = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(cnt), 120);
  if (cnt > CONFIG.MAX_PER_MIN) return { ok: false, error: 'busy' };

  var d = r.data || {};
  var name = safe_(d.name, 100), amount = enDigits_(String(d.amount || '')).replace(/[,\s]/g, '').replace(/টাকা/g, '');
  if (name.length < 2) return { ok: false, error: 'missing name' };
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(amount)) return { ok: false, error: 'invalid amount' };
  var type = String(d.type || '');
  if (type && TYPES.indexOf(type) < 0) return { ok: false, error: 'invalid type' };
  var date = String(d.date || '');
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'invalid date' };
  var auth = authorized_(r, d);
  if (!auth.ok) return { ok: false, error: auth.error };

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = sheet_();
    var yy = Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yy'), props = PropertiesService.getScriptProperties();
    var seq = Number(props.getProperty('sf_' + yy) || 0) + 1;
    props.setProperty('sf_' + yy, String(seq));
    var no = 'SF-' + yy + '/' + ('0000' + seq).slice(-4);
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    var rec = {
      'রসিদ নম্বর': "'" + no, 'সংরক্ষণের সময়': "'" + Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyyy-MM-dd HH:mm:ss'),
      'তারিখ': "'" + date, 'সদস্য ধরণ': type, 'সদস্য নম্বর': safe_(d.memberNo, 30), 'প্রদানকারীর নাম': name,
      'চাঁদার ধরণ': safe_(d.kind, 40), 'পরিমাণ (অঙ্কে)': Number(amount), 'পরিমাণ (কথায়)': safe_(d.words, 120),
      'প্রদানের মাধ্যম': safe_(d.method, 40), 'অনুমোদনকারী': auth.approver || '', 'আদায়কারী': safe_(d.collector, 40)
    };
    sh.appendRow(head.map(function (h) { return rec.hasOwnProperty(h) ? rec[h] : ''; }));
    var ps = permitSheet_();
    ps.getRange(auth.row, pcol_('অবস্থা')).setValue(ST.USED);
    ps.getRange(auth.row, pcol_('রসিদ নম্বর')).setValue("'" + no);
    return { ok: true, no: no };
  } finally {
    lock.releaseLock();
  }
}

// রসিদের পিডিএফ: Subscription Fund/<চাঁদার ধরণ>/ ফোল্ডারে রাখে; সাব-ফোল্ডার না থাকলে বানায়
function pdf_(r) {
  var no = String(r.no || '');
  var rq = findReq_(permitSheet_(), String(r.rid || ''));       // এই রসিদের (ব্যবহৃত) অনুমতি থাকলেই পিডিএফ নেওয়া হবে
  if (!rq || String(rq.rec['অবস্থা']) !== ST.USED || String(rq.rec['রসিদ নম্বর']).replace(/^'/, '') !== no) return { ok: false, error: 'permission' };
  if (!/^SF-\d{2}\/\d{4}$/.test(no)) return { ok: false, error: 'bad number' };
  var bytes = Utilities.base64Decode(String(r.pdf || ''));
  if (bytes.length < 1000 || bytes.length > CONFIG.MAX_PDF_BYTES) return { ok: false, error: 'bad size' };
  if (String.fromCharCode(bytes[0] & 255, bytes[1] & 255, bytes[2] & 255, bytes[3] & 255) !== '%PDF') return { ok: false, error: 'not pdf' };
  var kind = KINDS.indexOf(String(r.kind || '')) >= 0 ? String(r.kind) : 'অন্যান্য চাঁদা';

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = sheet_(), last = sh.getLastRow();
    if (last < 2) return { ok: false, error: 'not found' };
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    var cNo = head.indexOf('রসিদ নম্বর') + 1, cLink = head.indexOf('পিডিএফ লিংক') + 1;
    var nos = sh.getRange(2, cNo, last - 1, 1).getValues(), row = 0;
    for (var i = 0; i < nos.length; i++) if (String(nos[i][0]).replace(/^'/, '').trim() === no) { row = i + 2; break; }
    if (!row) return { ok: false, error: 'not found' };
    if (sh.getRange(row, cLink).getValue()) return { ok: false, error: 'already saved' };   // একবারই

    var root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID), it = root.getFoldersByName(kind);
    var folder = it.hasNext() ? it.next() : root.createFolder(kind);
    var nm = String(r.name || '').replace(/[\\\/:*?"<>|\u0000-\u001F]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 40);
    var file = folder.createFile(Utilities.newBlob(bytes, 'application/pdf', no.replace('/', '-') + (nm ? '_' + nm : '') + '.pdf'));
    sh.getRange(row, cLink).setValue(file.getUrl());
    return { ok: true, url: file.getUrl() };
  } finally {
    lock.releaseLock();
  }
}

function next_() {
  var yy = Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yy');
  var seq = Number(PropertiesService.getScriptProperties().getProperty('sf_' + yy) || 0) + 1;
  return { ok: true, no: 'SF-' + yy + '/' + ('0000' + seq).slice(-4) };
}

// রসিদ নম্বর আবার ১ (SF-26/0001) থেকে শুরু করতে: আগে শিটের পরীক্ষামূলক সারিগুলো মুছে এডিটরে resetNumber Run করুন
function resetNumber() {
  var yy = Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yy');
  PropertiesService.getScriptProperties().setProperty('sf_' + yy, '0');
  console.log('এবার পরের রসিদ: ' + next_().no);
}

// Drive ঠিক আছে কি না পরীক্ষা: এডিটরে testDrive Run করুন; নিচের "Execution log"-এ ফল দেখাবে
function testDrive() {
  var root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  console.log('মেইন ফোল্ডার পাওয়া গেছে: ' + root.getName());
  var t = root.createFile('test.txt', 'ok'); console.log('ফাইল লেখা সফল (পূর্ণ Drive অনুমতি ঠিক আছে)'); t.setTrashed(true);
  KINDS.forEach(function (k) { console.log((root.getFoldersByName(k).hasNext() ? '✔ আছে: ' : '✖ নেই (নিজে তৈরি হবে): ') + k); });
}

// এডিটরে একবার Run করুন: ট্যাব তৈরি + শিট/মেইল-অনুমতি
function setup() {
  permitSheet_(); secret_(); MailApp.getRemainingDailyQuota();
  console.log('Drive ফোল্ডার: ' + DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID).getName());   // Drive অনুমতি + ফোল্ডার-অ্যাক্সেস যাচাই
  var sh = sheet_();
  console.log('ট্যাব প্রস্তুত: ' + sh.getName() + ' (' + SpreadsheetApp.openById(CONFIG.SHEET_ID).getName() + ')');
}
