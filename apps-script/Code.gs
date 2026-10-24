/**
 * সৃজনশীল তরুণ সংঘ — ওয়েবসাইটের ব্যাকএন্ড (Google Apps Script)
 *
 * কাজ:
 *  1) action=submit   : আবেদনের তথ্য শিটে (ট্যাব "আবেদন") যোগ করে; ফরম নম্বর, সময় ও টোকেন ফেরত দেয়
 *  2) action=pdf      : ওয়েবসাইটে তৈরি পিডিএফ সদস্য ধরণ অনুযায়ী নির্দিষ্ট ড্রাইভ ফোল্ডারে রাখে
 *  2খ) action=photo   : আবেদনকারীর ছবি একই ড্রাইভ ফোল্ডারে রাখে এবং শিটে ছবি (থাম্বনেইল) ও লিংক বসায়

 *  0) অনুমতি-ব্যবস্থা: আবেদনের আগে নাম+ফোন দিয়ে অনুমতির অনুরোধ → অনুমোদনকারীদের ইমেইলে এক-ট্যাপ "অনুমোদন দিন/বাতিল করুন" লিংক
 *     (action=captcha, access_request, access_status; লিংক খুললে doGet?a=decide ...)। অনুমোদিত না হলে submit গ্রহণ হয় না।
 *  3) action=feedback : মতামত শিটে (ট্যাব "মতামত") যোগ করে
 *
 * ডিপ্লয়: Execute as = Me (srijonshil2011@gmail.com), Who has access = Anyone
 * প্রথমবার/ফোল্ডারে সমস্যা হলে: এডিটরে setup ফাংশন একবার Run করে অনুমতি (Drive ও Sheets) দিন; Execution log-এ ফোল্ডারগুলোর অবস্থা দেখা যাবে।
 * কোড বদলালে অবশ্যই Deploy > Manage deployments > Edit > New version করতে হবে (লিংক একই থাকবে)।
 */

var CONFIG = {
  SHEET_ID: '1uEdRCRK61ZWU7If9S-YSXMErZdBXpxQfnocQQtNR9PU',
  APPLY_TAB: 'আবেদন',
  FEEDBACK_TAB: 'মতামত',
  TZ: 'Asia/Dhaka',
  FOLDERS: {
    general: '1RcVjODbiFiGRNYTU1T8Q8rFUnyOIGAGl',   // সাধারণ সদস্য আবেদন
    expat:   '1I7Tj1BccscidBRAsv69MkWaICQAchIhy',   // প্রবাসী সদস্য আবেদন
    junior:  '1O20AEYseF31P-_p95xutPYJlWo5HKb7I',   // জুনিয়র সদস্য আবেদন
    donor:   '14a9y9wRFKKEAy8XgXDJtDUlAqh-fX0r2'    // দাতা সদস্য আবেদন
  },
  TYPE_LABEL: { general: 'সাধারণ সদস্য', expat: 'প্রবাসী সদস্য', junior: 'জুনিয়র সদস্য', donor: 'দাতা সদস্য' },
  FEES: { general: 1000, expat: 1200, junior: 100, donor: 2000 },
  REF_DISCOUNT: 0.2,                                   // রেফারেন্স থাকলে নিবন্ধন ফির ২০% কম
  REF_LABEL: { none: 'কোন সূত্র/সুপারিশ নেই', junior: 'জুনিয়র সদস্য ছিলাম', general: 'সাধারণ সদস্য ছিলাম', expat: 'প্রবাসী সদস্য ছিলাম', donor: 'দাতা সদস্য ছিলাম' },
  MAX_PHOTO_BYTES: 8 * 1024 * 1024,
  MAX_PDF_BYTES: 4 * 1024 * 1024,

  // অনুমতি-ব্যবস্থা
  PERMIT_TAB: 'অনুমতি',
  APPROVERS: ['srijonshil2011@gmail.com', 'noagaon161271@gmail.com'],
  WEBAPP_URL: 'https://script.google.com/macros/s/AKfycbzTWo1I6LaAeZos36cV8hz2d1YrePtvtdgpfjtkYEhZgkrgEB33i07LHnPonAgwSLM9ew/exec',
  PERMIT_VALID_HOURS: 24,          // অনুরোধের পর এত ঘণ্টার মধ্যে অনুমোদন ও জমা দিতে হবে
  PERMIT_MAX_PER_PHONE: 15,        // এক ফোনে ২৪ ঘণ্টায় সর্বোচ্চ অনুরোধ (একই ফোন থেকে একাধিক আবেদন চলে)
  PERMIT_MAX_PER_DAY: 40           // দিনে মোট অনুরোধ (ইমেইল কোটা বাঁচাতে)
};

var PERMIT_HEADERS = ['অনুরোধ আইডি', 'অনুরোধের সময়', 'নাম', 'ফোন', 'অবস্থা', 'অনুমোদনকারী', 'সিদ্ধান্তের সময়', 'ফরম নম্বর', 'ইমেইল অবস্থা'];
var ST = { PENDING: 'অপেক্ষমাণ', APPROVED: 'অনুমোদিত', REJECTED: 'বাতিল', USED: 'ব্যবহৃত', EXPIRED: 'মেয়াদোত্তীর্ণ' };

var APPLY_HEADERS = [
  'ফরম নম্বর', 'জমার সময়', 'সদস্য ধরণ', 'নিবন্ধন ফি (টাকা)', 'সদস্য নম্বর',
  'নাম (বাংলা)', 'নাম (ইংরেজি)', 'পিতার নাম', 'মাতার নাম', 'জন্ম তারিখ', 'লিঙ্গ', 'রক্ত গ্রুপ',
  'শিক্ষাগত যোগ্যতা', 'পেশা', 'ধর্ম', 'এনআইডি', 'জন্মনিবন্ধন সনদ নম্বর', 'ফোন', 'ওয়াটসঅ্যাপ', 'ইমেইল',
  'স্থায়ী: বিভাগ', 'স্থায়ী: জেলা', 'স্থায়ী: উপজেলা/সিটি', 'স্থায়ী: থানা', 'স্থায়ী: ইউনিয়ন/পৌরসভা', 'স্থায়ী: ওয়ার্ড',
  'স্থায়ী: পোস্ট অফিস', 'স্থায়ী: গ্রাম', 'স্থায়ী: পাড়া',
  'বর্তমান ঠিকানা', 'বর্তমান বসবাসরত দেশের নাম', 'পিডিএফ লিংক', 'অবস্থা', 'সূত্র/সুপারিশ', 'ছবি', 'ছবির লিংক', 'সূত্র/সুপারিশ প্রমাণক', 'অনুমোদনকারী'
];
var FEEDBACK_HEADERS = ['সময়', 'নাম', 'যোগাযোগ', 'মতামত'];

// ---------------------------------------------------------------- প্রবেশদ্বার
function doGet(e) {
  var q = (e && e.parameter) || {};
  if (q.a === 'decide') return decidePage_(q);
  return json_({ ok: true, service: 'srijonshil-website', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (req.action) {
      case 'captcha':        return json_(captcha_());
      case 'access_request': return json_(requestAccess_(req));
      case 'access_status':  return json_(accessStatus_(req));
      case 'submit':   return json_(submit_(req.data || {}));
      case 'pdf':      return json_(savePdf_(req));
      case 'photo':    return json_(savePhoto_(req));
      case 'feedback': return json_(saveFeedback_(req));
      default:         return json_({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, error: 'server error: ' + String(err && err.message || err).substring(0, 200) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------- হেল্পার
function sheet_(name, headers) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#0b3d24').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  } else {
    // আগের শিটে নতুন কলাম লাগলে শেষে যোগ হয়; পুরোনো কলাম নড়ে না
    var have = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    // নাম বদলানো কলাম: পুরোনো হেডার থাকলে জায়গায়ই নতুন নাম বসে (ডেটা নড়ে না)
    var RENAMES = { 'রেফারেন্স': 'সূত্র/সুপারিশ', 'রেফারেন্স প্রমাণক': 'সূত্র/সুপারিশ প্রমাণক', 'দেশ': 'বর্তমান বসবাসরত দেশের নাম' };
    have.forEach(function (h, i) {
      if (RENAMES[h] && headers.indexOf(RENAMES[h]) >= 0 && have.indexOf(RENAMES[h]) < 0) {
        sh.getRange(1, i + 1).setValue(RENAMES[h]);
        have[i] = RENAMES[h];
      }
    });
    var missing = headers.filter(function (h) { return have.indexOf(h) < 0; });
    if (missing.length) {
      sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold').setBackground('#0b3d24').setFontColor('#ffffff');
    }
  }
  return sh;
}

// হেডারের নাম ধরে সারি যোগ করে (কলামের ক্রম বদলালেও ঠিক থাকে)
function appendByHeader_(sh, obj) {
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var row = head.map(function (h) { return obj.hasOwnProperty(h) ? obj[h] : ''; });
  sh.appendRow(row);
  return sh.getLastRow();
}

function colOf_(sh, name) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String).indexOf(name) + 1;
}

// ফর্মুলা ইনজেকশন ঠেকাতে: = + - @ দিয়ে শুরু হলে আগে ' বসে
function safe_(v, max) {
  v = (v === null || v === undefined) ? '' : String(v);
  v = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (max && v.length > max) v = v.substring(0, max);
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  return v;
}

function bnDigits_(s) {
  var d = '০১২৩৪৫৬৭৮৯';
  return String(s).replace(/\d/g, function (c) { return d.charAt(Number(c)); });
}

function nowInfo_() {
  var now = new Date();
  return {
    sheet: Utilities.formatDate(now, CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss'),
    bn: bnDigits_(Utilities.formatDate(now, CONFIG.TZ, 'dd/MM/yyyy, hh:mm:ss a')).replace('AM', 'পূর্বাহ্ণ').replace('PM', 'অপরাহ্ণ'),
    year: Utilities.formatDate(now, CONFIG.TZ, 'yyyy')
  };
}

// ---------------------------------------------------------------- ০) অনুমতি-ব্যবস্থা
function enDigits_(s) {
  var d = '০১২৩৪৫৬৭৮৯';
  return String(s).replace(/[০-৯]/g, function (c) { return d.indexOf(c); });
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseTs_(str) {                       // "yyyy-MM-dd HH:mm:ss" (ঢাকা) → মিলিসেকেন্ড; শিট তারিখে বদলে ফেললেও চলে
  if (str instanceof Date) return str.getTime();
  var t = new Date(String(str).replace(' ', 'T') + '+06:00').getTime();
  return isNaN(t) ? 0 : t;
}

function secret_() {
  var props = PropertiesService.getScriptProperties();
  var sec = props.getProperty('hmac_secret');
  if (!sec) { sec = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('hmac_secret', sec); }
  return sec;
}

function sign_(rid, verdict, idx) {
  var raw = Utilities.computeHmacSha256Signature(rid + '|' + verdict + '|' + idx, secret_());
  return Utilities.base64EncodeWebSafe(raw).replace(/=+$/, '');
}

// সংখ্যাভিত্তিক ক্যাপচা: প্রশ্ন সার্ভারে তৈরি, উত্তর সার্ভারেই যাচাই, একবার ব্যবহার্য, ১০ মিনিট মেয়াদ
function captcha_() {
  var a = 1 + Math.floor(Math.random() * 9), b = 1 + Math.floor(Math.random() * 9);
  var plus = Math.random() < 0.5;
  if (!plus && b > a) { var t = a; a = b; b = t; }
  var cid = Utilities.getUuid();
  CacheService.getScriptCache().put('cap_' + cid, String(plus ? a + b : a - b), 600);
  return { ok: true, cid: cid, q: bnDigits_(a) + (plus ? ' + ' : ' − ') + bnDigits_(b) };
}

function checkCaptcha_(cid, ans) {
  var cache = CacheService.getScriptCache();
  var want = cache.get('cap_' + String(cid || ''));
  if (!want) return false;
  cache.remove('cap_' + cid);
  return enDigits_(String(ans || '')).replace(/\s/g, '') === want;
}

function findReq_(sh, rid) {
  var data = sh.getDataRange().getValues();
  var head = data[0].map(String);
  var ci = {};
  head.forEach(function (h, i) { ci[h] = i; });
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][ci['অনুরোধ আইডি']]) === rid) {
      var rec = {};
      head.forEach(function (h, j) { rec[h] = data[i][j]; });
      return { row: i + 1, rec: rec };
    }
  }
  return null;
}

// মেয়াদ পেরোলে অপেক্ষমাণ/অনুমোদিত অবস্থাকে মেয়াদোত্তীর্ণ ধরা হয়
function effectiveStatus_(rec) {
  var st = String(rec['অবস্থা']);
  if ((st === ST.PENDING || st === ST.APPROVED) &&
      Date.now() - parseTs_(rec['অনুরোধের সময়']) > CONFIG.PERMIT_VALID_HOURS * 3600 * 1000) return ST.EXPIRED;
  return st;
}

function requestAccess_(r) {
  if (r.website) return { ok: false, error: 'rejected' };
  if (!checkCaptcha_(r.cid, r.captcha)) return { ok: false, error: 'captcha' };
  var name = String(r.name || '').replace(/\s+/g, ' ').trim();
  var phone = enDigits_(String(r.phone || '')).replace(/[\s-]/g, '');
  if (name.length < 2 || name.length > 100) return { ok: false, error: 'invalid name' };
  if (!/^\+?\d{7,16}$/.test(phone)) return { ok: false, error: 'invalid phone' };

  var rid = Utilities.getUuid().replace(/-/g, '');
  var tsStr = nowInfo_().sheet, prow = 0;
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = sheet_(CONFIG.PERMIT_TAB, PERMIT_HEADERS);
    var data = sh.getDataRange().getValues();
    var head = data[0].map(String), iT = head.indexOf('অনুরোধের সময়'), iP = head.indexOf('ফোন');
    var since = Date.now() - 24 * 3600 * 1000, total = 0, samePhone = 0;
    for (var i = 1; i < data.length; i++) {
      if (parseTs_(data[i][iT]) < since) continue;
      total++;
      if (String(data[i][iP]) === phone) samePhone++;
    }
    if (samePhone >= CONFIG.PERMIT_MAX_PER_PHONE) return { ok: false, error: 'limit_phone' };
    if (total >= CONFIG.PERMIT_MAX_PER_DAY) return { ok: false, error: 'limit_day' };
    prow = appendByHeader_(sh, {
      'অনুরোধ আইডি': rid, 'অনুরোধের সময়': "'" + tsStr, 'নাম': safe_(name, 100), 'ফোন': "'" + phone,
      'অবস্থা': ST.PENDING, 'অনুমোদনকারী': '', 'সিদ্ধান্তের সময়': '', 'ফরম নম্বর': ''
    });
  } finally {
    lock.releaseLock();
  }
  var mres = mailApprovers_(rid, name, phone, tsStr);
  try {
    var ish = sheet_(CONFIG.PERMIT_TAB, PERMIT_HEADERS);
    ish.getRange(prow, colOf_(ish, 'ইমেইল অবস্থা')).setValue(mres);   // ব্যর্থ হলে কারণসহ
  } catch (e) { console.error('mail status write failed: ' + (e && e.message)); }
  return { ok: true, rid: rid };
}

function mailApprovers_(rid, name, phone, tsStr) {
  var results = [];
  CONFIG.APPROVERS.forEach(function (email, idx) {
    try {
      var ok = CONFIG.WEBAPP_URL + '?a=decide&rid=' + rid + '&v=approve&u=' + idx + '&sig=' + sign_(rid, 'approve', idx);
      var no = CONFIG.WEBAPP_URL + '?a=decide&rid=' + rid + '&v=reject&u=' + idx + '&sig=' + sign_(rid, 'reject', idx);
      var btn = 'display:inline-block;color:#fff;padding:14px 26px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;margin:6px 8px 6px 0;';
      var html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#111;max-width:520px">' +
        '<h2 style="color:#0b3d24;margin:0 0 10px">সদস্য আবেদনের অনুমতির অনুরোধ</h2>' +
        '<p style="margin:0 0 4px"><b>নাম:</b> ' + esc_(name) + '</p>' +
        '<p style="margin:0 0 4px"><b>ফোন:</b> ' + esc_(phone) + '</p>' +
        '<p style="margin:0 0 16px"><b>সময়:</b> ' + esc_(tsStr) + '</p>' +
        '<a href="' + ok + '" style="' + btn + 'background:#157347">✔ অনুমোদন দিন</a>' +
        '<a href="' + no + '" style="' + btn + 'background:#c0392b">✖ বাতিল করুন</a>' +
        '<p style="color:#555;font-size:13px;margin-top:16px">যিনি আগে সিদ্ধান্ত নেবেন সেটাই কার্যকর হবে। অনুমতি ' + CONFIG.PERMIT_VALID_HOURS +
        ' ঘণ্টা বৈধ এবং একটি আবেদনের জন্যই। এই লিংক অন্য কাউকে পাঠাবেন না।</p></div>';
      MailApp.sendEmail({
        to: email,
        subject: 'অনুমতির অনুরোধ: ' + name + ' (' + phone + ') — ' + tsStr.substring(11, 16) + ' #' + rid.substring(0, 4),
        htmlBody: html,
        body: 'অনুমতির অনুরোধ — নাম: ' + name + ', ফোন: ' + phone + '\nঅনুমোদন: ' + ok + '\nবাতিল: ' + no,
        name: 'সৃজনশীল তরুণ সংঘ ওয়েবসাইট'
      });
      results.push('পাঠানো হয়েছে: ' + email);
    } catch (err) {
      console.error('mail failed for ' + email + ': ' + (err && err.message));
      results.push('ব্যর্থ ' + email + ' — ' + String(err && err.message || err).substring(0, 120));
    }
  });
  var left = '?';
  try { left = MailApp.getRemainingDailyQuota(); } catch (e) {}
  return results.join(' | ') + ' (আজকের মেইল কোটা বাকি: ' + left + ')';
}

// ইমেইল ঠিকমতো যায় কি না পরীক্ষা: এডিটরে testMail Run করুন; দুই অনুমোদনকারীর ইনবক্সে (বা স্প্যামে) একটি পরীক্ষামূলক মেইল যাবে
function testMail() {
  console.log('বাকি দৈনিক কোটা: ' + MailApp.getRemainingDailyQuota());
  console.log(mailApprovers_('0'.repeat(32), 'পরীক্ষা', '01700000000', nowInfo_().sheet));
}

function accessStatus_(r) {
  var rid = String(r.rid || '');
  if (!/^[0-9a-f]{32}$/.test(rid)) return { ok: false, error: 'bad id' };
  var sh = sheet_(CONFIG.PERMIT_TAB, PERMIT_HEADERS);
  var f = findReq_(sh, rid);
  if (!f) return { ok: false, error: 'not found' };
  var st = effectiveStatus_(f.rec);
  var code = st === ST.APPROVED ? 'approved' : st === ST.REJECTED ? 'rejected' : st === ST.USED ? 'used' : st === ST.EXPIRED ? 'expired' : 'pending';
  return { ok: true, status: code };
}

// অনুমোদনকারীর ইমেইলের লিংক খুললে
function decidePage_(q) {
  var rid = String(q.rid || ''), verdict = String(q.v || ''), idx = Number(q.u);
  var msg, good = false;
  try {
    if (!/^[0-9a-f]{32}$/.test(rid) || (verdict !== 'approve' && verdict !== 'reject') || !(idx >= 0 && idx < CONFIG.APPROVERS.length) ||
        String(q.sig || '') !== sign_(rid, verdict, idx)) {
      msg = 'লিংকটি সঠিক নয়।';
    } else {
      var lock = LockService.getScriptLock();
      lock.waitLock(30000);
      try {
        var sh = sheet_(CONFIG.PERMIT_TAB, PERMIT_HEADERS);
        var f = findReq_(sh, rid);
        if (!f) msg = 'অনুরোধটি পাওয়া যায়নি।';
        else {
          var st = effectiveStatus_(f.rec);
          if (st === ST.EXPIRED) msg = 'অনুরোধের মেয়াদ শেষ হয়ে গেছে।';
          else if (st !== ST.PENDING) {
            msg = 'এই অনুরোধে ইতোমধ্যে সিদ্ধান্ত নেওয়া হয়েছে: ' + st + (f.rec['অনুমোদনকারী'] ? ' (' + f.rec['অনুমোদনকারী'] + ')' : '') + '।';
          } else {
            var nowS = nowInfo_().sheet;
            sh.getRange(f.row, colOf_(sh, 'অবস্থা')).setValue(verdict === 'approve' ? ST.APPROVED : ST.REJECTED);
            sh.getRange(f.row, colOf_(sh, 'অনুমোদনকারী')).setValue(CONFIG.APPROVERS[idx]);
            sh.getRange(f.row, colOf_(sh, 'সিদ্ধান্তের সময়')).setValue("'" + nowS);
            good = true;
            msg = (verdict === 'approve' ? '✔ অনুমোদন দেওয়া হয়েছে' : '✖ অনুরোধ বাতিল করা হয়েছে') + ' — ' + esc_(f.rec['নাম']) + ' (' + esc_(f.rec['ফোন']) + ')।';
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
  var html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:40px auto;padding:24px;border:2px solid ' + color + ';border-radius:14px;text-align:center">' +
    '<h2 style="color:' + color + ';line-height:1.5">' + msg + '</h2><p style="color:#555">সৃজনশীল তরুণ সংঘ</p></div>';
  return HtmlService.createHtmlOutput(html).setTitle('অনুমতি').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------------------------------------------------------------- ১) আবেদন জমা
function submit_(d) {
  if (d.website) return { ok: false, error: 'rejected' };            // হানিপট
  var type = String(d.memberType || '');
  if (!CONFIG.FOLDERS[type]) return { ok: false, error: 'invalid member type' };

  var required = ['nameBn', 'nameEn', 'father', 'mother', 'dob', 'gender', 'education', 'profession', 'religion', 'country'];
  for (var i = 0; i < required.length; i++) {
    if (!String(d[required[i]] || '').trim()) return { ok: false, error: 'missing ' + required[i] };
  }
  var p = d.perm || {};
  if (!p.div || !p.dist || !p.upa || !p.thana || !p.po || !p.village) return { ok: false, error: 'missing address' };

  // এনআইডি/জন্মনিবন্ধন: সাধারণ = এনআইডি আবশ্যক; জুনিয়র = দুটির একটি আবশ্যক; অন্যরা ঐচ্ছিক
  var nid = String(d.nid || '').trim(), reg = String(d.birthReg || '').trim();
  if (nid && !/^(\d{10}|\d{13}|\d{17})$/.test(nid)) return { ok: false, error: 'invalid nid' };
  if (reg && !/^\d{10,20}$/.test(reg)) return { ok: false, error: 'invalid birth reg' };
  if (type === 'general' && !nid) return { ok: false, error: 'nid required' };
  if (type === 'junior' && !nid && !reg) return { ok: false, error: 'nid or birth reg required' };

  // রেফারেন্স: নিজের সদস্য ধরণের রেফারেন্স চলবে না; অন্য ৪টির যেকোনো একটি হলে ২০% ছাড়
  var ref = String(d.reference || 'none');
  if (!CONFIG.REF_LABEL[ref]) return { ok: false, error: 'invalid reference' };
  if (ref === type) return { ok: false, error: 'reference not allowed for this type' };
  var proof = safe_(d.referenceProof, 120);
  if (ref !== 'none' && !proof) return { ok: false, error: 'reference proof required' };
  var fee = Math.round(CONFIG.FEES[type] * (ref === 'none' ? 1 : 1 - CONFIG.REF_DISCOUNT));

  var accessId = String(d.accessId || '');
  if (!/^[0-9a-f]{32}$/.test(accessId)) return { ok: false, error: 'permission' };

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // অনুমতি: অনুমোদিত, মেয়াদের মধ্যে ও অব্যবহৃত হতে হবে
    var psh = sheet_(CONFIG.PERMIT_TAB, PERMIT_HEADERS);
    var preq = findReq_(psh, accessId);
    if (!preq || effectiveStatus_(preq.rec) !== ST.APPROVED) return { ok: false, error: 'permission' };

    var sh = sheet_(CONFIG.APPLY_TAB, APPLY_HEADERS);

    // একই এনআইডি/জন্মনিবন্ধন নম্বরে দ্বিতীয় আবেদন নয় (বাতিল করা সারি বাদে)
    var last = sh.getLastRow();
    if (last > 1) {
      var stCol = colOf_(sh, 'অবস্থা'), tyCol = colOf_(sh, 'সদস্য ধরণ');
      var stV = stCol ? sh.getRange(2, stCol, last - 1, 1).getValues() : [];
      var tyV = tyCol ? sh.getRange(2, tyCol, last - 1, 1).getValues() : [];
      var myType = CONFIG.TYPE_LABEL[type];
      // একই সদস্য ধরণে একই এনআইডি/জন্মনিবন্ধন দিয়ে দ্বিতীয় আবেদন নয়; ভিন্ন ধরণে চলবে
      var dupCheck = function (colName, val) {
        var c = colOf_(sh, colName);
        if (!c || !val) return false;
        var vals = sh.getRange(2, c, last - 1, 1).getValues();
        for (var i = 0; i < vals.length; i++) {
          if (String(vals[i][0]).replace(/^'/, '').trim() === val &&
              String(tyV[i] ? tyV[i][0] : '') === myType &&
              String(stV[i] ? stV[i][0] : '').indexOf('বাতিল') < 0) return true;
        }
        return false;
      };
      if (dupCheck('এনআইডি', nid) || dupCheck('জন্মনিবন্ধন সনদ নম্বর', reg)) return { ok: false, error: 'duplicate' };
    }
    var t = nowInfo_();

    // ক্রমিক ফরম নম্বর: STS-২০২৬-০০০১ (বছর অনুযায়ী নতুন করে শুরু)
    var props = PropertiesService.getScriptProperties();
    var key = 'seq_' + t.year;
    var seq = Number(props.getProperty(key) || 0) + 1;
    props.setProperty(key, String(seq));
    var formNo = 'STS-' + t.year + '-' + ('0000' + seq).slice(-4);

    var cur = d.addrSame ? 'স্থায়ী ঠিকানার অনুরূপ' : safe_(d.currentText, 500);
    var rec = {
      'ফরম নম্বর': formNo, 'জমার সময়': t.sheet, 'সদস্য ধরণ': CONFIG.TYPE_LABEL[type], 'নিবন্ধন ফি (টাকা)': fee, 'সদস্য নম্বর': '',
      'নাম (বাংলা)': safe_(d.nameBn, 100), 'নাম (ইংরেজি)': safe_(d.nameEn, 100), 'পিতার নাম': safe_(d.father, 100), 'মাতার নাম': safe_(d.mother, 100),
      'জন্ম তারিখ': safe_(d.dob, 12), 'লিঙ্গ': safe_(d.gender, 10), 'রক্ত গ্রুপ': safe_(d.blood, 20),
      'শিক্ষাগত যোগ্যতা': safe_(d.education, 80), 'পেশা': safe_(d.profession, 80), 'ধর্ম': safe_(d.religion, 40),
      'এনআইডি': nid ? "'" + nid : '', 'জন্মনিবন্ধন সনদ নম্বর': reg ? "'" + reg : '',
      'ফোন': d.phone ? "'" + safe_(d.phone, 20) : '', 'ওয়াটসঅ্যাপ': d.whatsapp ? "'" + safe_(d.whatsapp, 20) : '', 'ইমেইল': safe_(d.email, 120),
      'স্থায়ী: বিভাগ': safe_(p.div, 40), 'স্থায়ী: জেলা': safe_(p.dist, 40), 'স্থায়ী: উপজেলা/সিটি': safe_(p.upa, 60), 'স্থায়ী: থানা': safe_(p.thana, 60),
      'স্থায়ী: ইউনিয়ন/পৌরসভা': safe_(p.union, 80), 'স্থায়ী: ওয়ার্ড': safe_(p.ward, 40),
      'স্থায়ী: পোস্ট অফিস': safe_(p.po, 80), 'স্থায়ী: গ্রাম': safe_(p.village, 80), 'স্থায়ী: পাড়া': safe_(p.para, 80),
      'বর্তমান ঠিকানা': cur, 'বর্তমান বসবাসরত দেশের নাম': safe_(d.country, 60), 'পিডিএফ লিংক': '', 'অবস্থা': 'পিডিএফ অপেক্ষমাণ', 'সূত্র/সুপারিশ': CONFIG.REF_LABEL[ref], 'সূত্র/সুপারিশ প্রমাণক': ref === 'none' ? '' : proof, 'অনুমোদনকারী': preq.rec['অনুমোদনকারী'], 'ছবি': '', 'ছবির লিংক': ''
    };
    var row = appendByHeader_(sh, rec);
    psh.getRange(preq.row, colOf_(psh, 'অবস্থা')).setValue(ST.USED);
    psh.getRange(preq.row, colOf_(psh, 'ফরম নম্বর')).setValue(formNo);

    // একবার-ব্যবহারযোগ্য টোকেন: শুধু এই আবেদনকারীই পিডিএফ আপলোড করতে পারবে
    var token = Utilities.getUuid();
    CacheService.getScriptCache().put('tok_' + formNo, token + '|' + row + '|' + type, 6 * 60 * 60);

    return { ok: true, formNo: formNo, token: token, timestamp: t.sheet, timestampBn: t.bn };
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------- ২) পিডিএফ ও ছবি সংরক্ষণ
// টোকেন যাচাই: ফরম নম্বর + টোকেন মিললে (সারি, ধরণ) ফেরত দেয়
function auth_(req) {
  var stored = CacheService.getScriptCache().get('tok_' + req.formNo);
  if (!stored) return { error: 'expired' };
  var parts = stored.split('|');
  if (parts[0] !== req.token) return { error: 'bad token' };
  return { row: Number(parts[1]), type: parts[2] };   // ক্লায়েন্টের নয়, জমার সময়ের ধরণই চূড়ান্ত
}

function safeName_(nameEn) {
  return String(nameEn || 'APPLICANT').replace(/[^A-Za-z0-9 ]/g, '').trim().replace(/\s+/g, '_').substring(0, 40) || 'APPLICANT';
}

function setStatus_(sh, row, text) {
  sh.getRange(row, colOf_(sh, 'অবস্থা')).setValue(text);
}

function savePdf_(req) {
  var a = auth_(req);
  if (a.error) return { ok: false, error: a.error };
  var cache = CacheService.getScriptCache();
  if (cache.get('pdf_' + req.formNo)) return { ok: false, error: 'already saved' };

  var bytes = Utilities.base64Decode(String(req.pdf || ''));
  if (bytes.length < 1000 || bytes.length > CONFIG.MAX_PDF_BYTES) return { ok: false, error: 'bad size' };
  if (String.fromCharCode(bytes[0] & 255, bytes[1] & 255, bytes[2] & 255, bytes[3] & 255) !== '%PDF') return { ok: false, error: 'not pdf' };

  var sh = sheet_(CONFIG.APPLY_TAB, APPLY_HEADERS);
  try {
    var file = DriveApp.getFolderById(CONFIG.FOLDERS[a.type])
      .createFile(Utilities.newBlob(bytes, 'application/pdf', req.formNo + '_' + safeName_(req.nameEn) + '.pdf'));
    sh.getRange(a.row, colOf_(sh, 'পিডিএফ লিংক')).setValue(file.getUrl());
    setStatus_(sh, a.row, 'জমা সম্পন্ন');
    cache.put('pdf_' + req.formNo, '1', 6 * 60 * 60);
    return { ok: true, url: file.getUrl() };
  } catch (err) {
    console.error('pdf save failed', err && err.stack || err);
    setStatus_(sh, a.row, 'পিডিএফ সংরক্ষণ ব্যর্থ: ' + String(err && err.message || err).substring(0, 150));
    return { ok: false, error: 'drive: ' + String(err && err.message || err).substring(0, 150) };
  }
}

function savePhoto_(req) {
  var a = auth_(req);
  if (a.error) return { ok: false, error: a.error };
  var cache = CacheService.getScriptCache();
  if (cache.get('photo_' + req.formNo)) return { ok: false, error: 'already saved' };

  var bytes = Utilities.base64Decode(String(req.photo || ''));
  if (bytes.length < 200 || bytes.length > CONFIG.MAX_PHOTO_BYTES) return { ok: false, error: 'bad size' };
  if ((bytes[0] & 255) !== 0xFF || (bytes[1] & 255) !== 0xD8) return { ok: false, error: 'not jpeg' };

  var sh = sheet_(CONFIG.APPLY_TAB, APPLY_HEADERS);
  try {
    var file = DriveApp.getFolderById(CONFIG.FOLDERS[a.type])
      .createFile(Utilities.newBlob(bytes, 'image/jpeg', req.formNo + '_' + safeName_(req.nameEn) + '.jpg'));
    sh.getRange(a.row, colOf_(sh, 'ছবির লিংক')).setValue(file.getUrl());

    // শিটের ঘরে ছোট ছবি (ডেটা-ইউআরআই, তাই ছবি পাবলিক করতে হয় না)
    try {
      var thumb = String(req.thumb || '');
      if (thumb && thumb.length < 200000) {
        var img = SpreadsheetApp.newCellImage().setSourceUrl('data:image/jpeg;base64,' + thumb).setAltTextTitle(req.formNo).build();
        sh.getRange(a.row, colOf_(sh, 'ছবি')).setValue(img);
        sh.setRowHeight(a.row, 100);
        sh.setColumnWidth(colOf_(sh, 'ছবি'), 90);
      }
    } catch (e2) { console.error('cell image failed', e2 && e2.message); }

    cache.put('photo_' + req.formNo, '1', 6 * 60 * 60);
    return { ok: true, url: file.getUrl() };
  } catch (err) {
    console.error('photo save failed', err && err.stack || err);
    return { ok: false, error: 'drive: ' + String(err && err.message || err).substring(0, 150) };
  }
}

// ---------------------------------------------------------------- অনুমতি ও ফোল্ডার পরীক্ষা (এডিটরে একবার Run করুন)
function setup() {
  SpreadsheetApp.openById(CONFIG.SHEET_ID).getName();
  sheet_(CONFIG.APPLY_TAB, APPLY_HEADERS);
  sheet_(CONFIG.PERMIT_TAB, PERMIT_HEADERS);
  console.log('ইমেইল পাঠানোর বাকি কোটা আজ: ' + MailApp.getRemainingDailyQuota());
  secret_();
  Object.keys(CONFIG.FOLDERS).forEach(function (k) {
    try {
      var f = DriveApp.getFolderById(CONFIG.FOLDERS[k]);
      console.log(k + ': OK — ' + f.getName() + ' (মালিক: ' + (f.getOwner() ? f.getOwner().getEmail() : '?') + ')');
    } catch (e) {
      console.error(k + ': ব্যর্থ — ' + e.message + ' → এই অ্যাকাউন্টে ফোল্ডারটি নেই বা অনুমতি নেই');
    }
  });
}

// ---------------------------------------------------------------- ৩) মতামত
function saveFeedback_(r) {
  if (r.website) return { ok: false, error: 'rejected' };
  var msg = safe_(r.message, 3000);
  if (msg.length < 5) return { ok: false, error: 'empty' };
  var sh = sheet_(CONFIG.FEEDBACK_TAB, FEEDBACK_HEADERS);
  sh.appendRow([nowInfo_().sheet, safe_(r.name, 100), safe_(r.contact, 100), msg]);
  return { ok: true };
}
