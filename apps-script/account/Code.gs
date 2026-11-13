/**
 * সৃজনশীল তরুণ সংঘ — সদস্য অ্যাকাউন্টের ব্যাকএন্ড (Google Apps Script)
 *
 *  • অ্যাকাউন্ট খোলা: সদস্য ধরণ + সদস্য নম্বর + নাম + এনআইডি → সদস্য তালিকা ও "আবেদন" শিটের সাথে মিললে সদস্য নিজের ইউজারনেম ও পাসওয়ার্ড দেন (কোনো OTP নেই)।
 *    ভুল তথ্য বারবার দিলে (৫ বার) ওই সদস্য নম্বরে ৩০ মিনিট তালা পড়ে।
 *  • লগইন: ইউজারনেম + পাসওয়ার্ড (পাসওয়ার্ড শিটে হ্যাশ করে থাকে)।
 *  • পাসওয়ার্ড ভুলে গেলে: রিকভারি ইমেইলে কোড → নতুন পাসওয়ার্ড (ইমেইল আবেদন ফরম থেকে নেওয়া হয়; ফরমে না থাকলে অ্যাকাউন্ট খোলার সময় সদস্য দেন)।
 *  • ভেতরে: প্রোফাইল, ছবি আপলোড, আইডি/ফটোকার্ড (ড্রাইভে সংরক্ষণ), নিজের রসিদ ও চাঁদার হিসাব।
 *
 * সেটআপ: ১) Apps Script প্রজেক্টে এই Code.gs ও appsscript.json বসান  ২) setup ফাংশন একবার Run করে অনুমতি দিন
 *        ৩) Deploy > Manage deployments > Edit > New version (লিংক একই থাকবে)।
 * দৈনিক ইমেইল কোটা: সাধারণ Gmail-এ প্রায় ১০০; রিকভারির কোড-মেইলে MAIL_PER_DAY সীমা দেওয়া আছে।
 */

var CONFIG = {
  MAIN_SHEET_ID: '1uEdRCRK61ZWU7If9S-YSXMErZdBXpxQfnocQQtNR9PU',     // আবেদন শিট
  APPLY_TAB: 'আবেদন',
  RECEIPT_SHEET_ID: '1J0qRZ_vPAQaFHWWQId1wVRtfH57t04-Pvle0xvgAyPI',  // রসিদ শিট
  RECEIPT_TAB: 'চাঁদা রসিদ',
  ACCOUNT_SHEET_ID: '1N5uMSXyxJyv2xY-MzvrbS54nXp7tL3mz3z7wd3NWHgI',  // অ্যাকাউন্টের তথ্য (ইউজারনেম, হ্যাশ পাসওয়ার্ড) এই শিটে থাকে
  ACCOUNT_TAB: 'অ্যাকাউন্ট',
  FEED_TAB: 'নিউজফিড',
  FEED_MAX_CHARS: 1000,
  FEED_PER_HOUR: 5,
  FEED_PER_DAY: 30,
  FEED_PAGE: 20,
  DRIVE_FOLDER_ID: '1BQVJvC8gabosUwd6T_Mx7i5AZGhZ8bMM',   // সদস্যের আপলোড করা ছবি ও সংরক্ষিত কার্ড (উপ-ফোল্ডার নিজে তৈরি হয়)
  MAX_PHOTO_BYTES: 2 * 1024 * 1024,
  MAX_CARD_BYTES: 6 * 1024 * 1024,
  UPLOADS_PER_HOUR: 10,
  OTP_MINUTES: 10,
  OTP_MAX_TRIES: 5,
  RECOVER_MINUTES: 15,
  OTP_PER_TARGET_PER_HOUR: 3,
  MAIL_PER_DAY: 80,            // দিনে মোট কোড-ইমেইল সীমা
  SENDER_NAME: 'সৃজনশীল তরুণ সংঘ',
  LOGIN_MAX_FAILS: 5,          // এত বার ভুল হলে ...
  LOCK_MINUTES: 30,            // ... এত মিনিট তালা
  SESSION_DAYS: 180,           // লগআউট না করলে এই ডিভাইসে লগইন এতদিন থাকে (ব্যবহার করলে মেয়াদ বাড়ে)
  MAX_PER_MIN: 60
};

var ACC_HEADERS = ['সদস্য নম্বর', 'নাম', 'ইউজারনেম', 'পাসওয়ার্ড (হ্যাশ)', 'সল্ট', 'রিকভারি ইমেইল', 'ফরম নম্বর', 'তৈরির সময়', 'সর্বশেষ লগইন', 'লগইন সংখ্যা', 'আপলোড ছবি (ফাইল আইডি)', 'ছবি আপলোডের সময়', 'আইডি কার্ড (ফাইল আইডি)', 'আইডি কার্ড সংরক্ষণের সময়', 'ফটোকার্ড (ফাইল আইডি)', 'ফটোকার্ড সংরক্ষণের সময়', 'স্বাক্ষর (ফাইল আইডি)', 'স্বাক্ষর আপলোডের সময়'];
var C = { NO: 0, NAME: 1, USER: 2, PW: 3, SALT: 4, MAIL: 5, FORM: 6, CREATED: 7, LAST: 8, COUNT: 9, PHOTO: 10, PHOTO_AT: 11, IDC: 12, IDC_AT: 13, PHC: 14, PHC_AT: 15, SIG: 16, SIG_AT: 17 };

/*ROSTER*/
var ROSTER = [["মোঃ শাহনুর হুসাইন","STS/GM/0001","15.09.2011","সাধারণ সদস্য"],["মোঃ জুনেদ আহমদ","STS/GM/0002","15.09.2011","সাধারণ সদস্য"],["তোফায়েল আহমদ","STS/GM/0003","15.09.2011","সাধারণ সদস্য"],["মোজাহিদ আহমদ","STS/GM/0004","15.09.2011","সাধারণ সদস্য"],["মোঃ ওবায়দুল্লাহ আফজল","STS/GM/0005","16.09.2011","সাধারণ সদস্য"],["মোঃ ইব্রাহীম আলী","STS/GM/0006","16.09.2011","সাধারণ সদস্য"],["তরিকুল ইসলাম","STS/GM/0007","16.09.2011","সাধারণ সদস্য"],["মোঃ শামীম আহমদ","STS/GM/0008","16.09.2011","সাধারণ সদস্য"],["মোঃ শাহিন আহমদ","STS/GM/0009","02.12.2011","সাধারণ সদস্য"],["আলমগীর কবির","STS/GM/0010","12.12.2011","সাধারণ সদস্য"],["মোঃ আনার মিয়া","STS/GM/0011","17.01.2012","সাধারণ সদস্য"],["রবিউল মান্না","STS/GM/0012","22.06.2012","সাধারণ সদস্য"],["মোঃ তাজুল ইসলাম রুবেল তালুকদার","STS/GM/0013","19.01.2013","সাধারণ সদস্য"],["মোঃ কবির আহমদ","STS/GM/0014","24.04.2026","সাধারণ সদস্য"],["জুবায়ের আহমদ জুবের","STS/GM/0015","24.04.2026","সাধারণ সদস্য"],["ইমরান হোসেন","STS/GM/0016","24.04.2026","সাধারণ সদস্য"],["মোঃ নজরুল ইসলাম","STS/GM/0017","24.04.2026","সাধারণ সদস্য"],["মোঃ সুহেল আহমদ","STS/GM/0018","24.04.2026","সাধারণ সদস্য"],["মোঃ ইকবাল হোসেন","STS/GM/0019","24.04.2026","সাধারণ সদস্য"],["মোঃ আব্দুল ওয়াদুদ","STS/GM/0020","24.04.2026","সাধারণ সদস্য"],["আলী আকবর","STS/GM/0021","25.04.2026","সাধারণ সদস্য"],["নাহিদ হোসেন তাম্বির","STS/GM/0022","25.04.2026","সাধারণ সদস্য"],["কামিল হোসেন","STS/GM/0023","25.04.2026","সাধারণ সদস্য"],["সাকিব আহমদ","STS/GM/0024","28.04.2026","সাধারণ সদস্য"],["আরিফুর রহমান","STS/GM/0025","28.04.2026","সাধারণ সদস্য"],["মোঃ নাহিদ আহমদ","STS/GM/0026","30.04.2026","সাধারণ সদস্য"],["মোঃ জামাল আহমদ","STS/GM/0027","30.04.2026","সাধারণ সদস্য"],["মোঃ রাসেল আহমদ","STS/GM/0028","30.04.2026","সাধারণ সদস্য"],["মোঃ জুয়েল রাজ","STS/GM/0029","30.04.2026","সাধারণ সদস্য"],["সুমন আহমদ","STS/GM/0030","30.04.2026","সাধারণ সদস্য"],["মোঃ মাহবুবুর রহমান","STS/GM/0031","30.04.2026","সাধারণ সদস্য"],["হাফিজুর রহমান ইমন","STS/GM/0032","30.04.2026","সাধারণ সদস্য"],["মোঃ সাঈদ মোহতাদী","STS/GM/0033","30.04.2026","সাধারণ সদস্য"],["মোঃ ইয়াসিন হোসেন জাহেদ","STS/GM/0034","30.04.2026","সাধারণ সদস্য"],["মোঃ জাহেদ আহমদ","STS/GM/0035","30.04.2026","সাধারণ সদস্য"],["মোঃ ছাবিল আহমদ","STS/GM/0036","05.05.2026","সাধারণ সদস্য"],["মোঃ হাসানুল হক শিবলু","STS/GM/0037","05.05.2026","সাধারণ সদস্য"],["হুসাইন আহমদ","STS/GM/0038","05.05.2026","সাধারণ সদস্য"],["মোঃ পাবেল আহমদ","STS/GM/0039","05.05.2026","সাধারণ সদস্য"],["মোঃ এহসানুল হক ইমন","STS/GM/0040","05.05.2026","সাধারণ সদস্য"],["মোঃ আবু বক্কর","STS/GM/0041","05.05.2026","সাধারণ সদস্য"],["মোঃ ইসলাম উদ্দিন","STS/GM/0042","05.05.2026","সাধারণ সদস্য"],["মোঃ হামিদুর রহমান মুন্না","STS/GM/0043","09.05.2026","সাধারণ সদস্য"],["মোঃ মিলাদ","STS/GM/0044","09.05.2026","সাধারণ সদস্য"],["মোঃ রাজু মিয়া","STS/GM/0045","09.05.2026","সাধারণ সদস্য"],["মোঃ রিপন","STS/GM/0046","09.05.2026","সাধারণ সদস্য"],["আব্দুর রহমান শাকিল","STS/GM/0047","09.05.2026","সাধারণ সদস্য"],["মোহাম্মদ আলী আসগর","STS/GM/0048","09.05.2026","সাধারণ সদস্য"],["মোহাম্মদ আলী জাবের","STS/GM/0049","09.05.2026","সাধারণ সদস্য"],["আলী আহসান","STS/GM/0050","09.05.2026","সাধারণ সদস্য"],["আতিকুর রহমান","STS/OM/0001","14.05.2026","প্রবাসী সদস্য"],["মোঃ কামাল হোসেন","STS/OM/0002","26.05.2026","প্রবাসী সদস্য"],["মোঃ হাসান সাঈদ খাঁন নাহিদ","STS/OM/0003","27.05.2026","প্রবাসী সদস্য"],["মোঃ মনছূর আহমদ","STS/JM/0001","07.10.2011","জুনিয়র সদস্য"],["কুকন","STS/JM/0002","07.10.2011","জুনিয়র সদস্য"],["মোঃ ইমাম উদ্দিন","STS/JM/0003","07.10.2011","জুনিয়র সদস্য"],["আসিক","STS/JM/0004","07.10.2011","জুনিয়র সদস্য"],["মোঃ আবু বক্কর","STS/JM/0005","07.10.2011","জুনিয়র সদস্য"],["মোঃ আজাদ আহমদ","STS/JM/0006","07.10.2011","জুনিয়র সদস্য"],["মোঃ আশরাফ আহমদ","STS/JM/0007","07.10.2011","জুনিয়র সদস্য"],["মোঃ আফজাল হোসেন সায়েম","STS/JM/0008","09.10.2011","জুনিয়র সদস্য"],["মোঃ অলিউর রহমান","STS/JM/0009","20.04.2026","জুনিয়র সদস্য"],["মোঃ আলহাজ আহমদ","STS/JM/0010","20.04.2026","জুনিয়র সদস্য"]];
/*END*/

// ---------------------------------------------------------------- প্রবেশদ্বার
function doGet() { return json_({ ok: true, service: 'srijonshil-account', time: new Date().toISOString() }); }

function doPost(e) {
  try {
    var r = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (r.website) return json_({ ok: false, error: 'rejected' });                 // হানিপট
    if (r.action === 'verify') return json_(publicRate_() ? { ok: false, error: 'busy' } : verifyMember_(r));
    if (r.action === 'public_photos' || r.action === 'public_photo') return json_(publicRate_() ? { ok: false, error: 'busy' } : (r.action === 'public_photos' ? publicPhotos_(r) : publicPhotoBig_(r)));
    var cache = CacheService.getScriptCache(), k = 'am_' + Math.floor(Date.now() / 60000);
    var n = Number(cache.get(k) || 0) + 1; cache.put(k, String(n), 120);
    if (n > CONFIG.MAX_PER_MIN) return json_({ ok: false, error: 'busy' });
    switch (r.action) {
      case 'acct_signup_check': return json_(signupCheck_(r));
      case 'acct_signup_create': return json_(signupCreate_(r));
      case 'acct_login': return json_(login_(r));
      case 'acct_recover_start': return json_(recoverStart_(r));
      case 'acct_recover_verify': return json_(recoverVerify_(r));
      case 'acct_logout': endSession_(r.token); return json_({ ok: true });
      case 'acct_profile': return json_(withSession_(r, profile_));
      case 'acct_photo': return json_(withSession_(r, photo_));
      case 'acct_photo_upload': return json_(withSession_(r, photoUpload_));
      case 'acct_card_save': return json_(withSession_(r, cardSave_));
      case 'acct_card_get': return json_(withSession_(r, cardGet_));
      case 'acct_sig_upload': return json_(withSession_(r, sigUpload_));
      case 'acct_sig_get': return json_(withSession_(r, sigGet_));
      case 'acct_form_pdf': return json_(withSession_(r, formPdf_));
      case 'acct_feed_list': return json_(withSession_(r, feedList_));
      case 'acct_feed_post': return json_(withSession_(r, feedPost_));
      case 'acct_feed_delete': return json_(withSession_(r, feedDelete_));
      case 'acct_receipts': return json_(withSession_(r, receipts_));
      case 'acct_receipt_pdf': return json_(withSession_(r, receiptPdf_));
    }
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, error: 'server error' });
  }
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ---------------------------------------------------------------- সহায়ক
function enDigits_(s) { var d = '০১২৩৪৫৬৭৮৯'; return String(s == null ? '' : s).replace(/[০-৯]/g, function (c) { return d.indexOf(c); }); }
function normName_(s) { return String(s || '').replace(/[‌‍]/g, '').replace(/\s+/g, ' ').trim(); }
function normNid_(s) { return enDigits_(s).replace(/\D/g, ''); }
function normNo_(s) { return enDigits_(s).toUpperCase().replace(/\s+/g, '').replace(/[\\.\-_]/g, '/'); }
function noEq_(a, b) {
  a = normNo_(a); b = normNo_(b);
  if (!a || !b) return false;
  if (a === b) return true;
  var da = a.match(/(\d+)$/), db = b.match(/(\d+)$/);
  // একটিতে শুধু সংখ্যা (প্রিফিক্স ছাড়া) থাকলে সংখ্যা মিললেই চলবে
  if (da && db && (/^\d+$/.test(a) || /^\d+$/.test(b))) return Number(da[1]) === Number(db[1]);
  return false;
}
function now_() { return Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyyy-MM-dd HH:mm:ss'); }
function secret_() {
  var p = PropertiesService.getScriptProperties(), s = p.getProperty('acct_secret');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('acct_secret', s); }
  return s;
}
function hmac_(v) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(v), secret_()));
}
function mask_(v, keep) {
  v = String(v || ''); if (!v) return '';
  keep = keep || 4;
  return v.length <= keep ? v : new Array(v.length - keep + 1).join('•') + v.substring(v.length - keep);
}
function safeTok_(t) { return String(t || '').replace(/[^A-Za-z0-9_\-]/g, '').substring(0, 80); }

function readSheet_(ssId, tab) {
  var sh = SpreadsheetApp.openById(ssId).getSheetByName(tab);
  if (!sh || sh.getLastRow() < 2) return { sh: sh, head: sh && sh.getLastRow() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String) : [], rows: [] };
  var vals = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getDisplayValues();
  return { sh: sh, head: vals[0].map(String), rows: vals.slice(1) };
}
function cell_(t, row, name) { var i = t.head.indexOf(name); return i < 0 ? '' : String(row[i] == null ? '' : row[i]); }

function accSheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.ACCOUNT_SHEET_ID), sh = ss.getSheetByName(CONFIG.ACCOUNT_TAB);
  if (!sh) sh = ss.insertSheet(CONFIG.ACCOUNT_TAB);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, ACC_HEADERS.length).setValues([ACC_HEADERS]).setFontWeight('bold').setBackground('#0b3d24').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < ACC_HEADERS.length) {     // পুরনো শিটে নতুন কলাম যোগ
    sh.getRange(1, 1, 1, ACC_HEADERS.length).setValues([ACC_HEADERS]).setFontWeight('bold').setBackground('#0b3d24').setFontColor('#ffffff');
  }
  return sh;
}
function findAccount_(no) {
  var sh = accSheet_(); if (sh.getLastRow() < 2) return null;
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, ACC_HEADERS.length).getValues();
  for (var i = 0; i < vals.length; i++) if (noEq_(vals[i][0], no)) return { sh: sh, row: i + 2, v: vals[i] };
  return null;
}

// সদস্য ধরণ + সদস্য নম্বর + নাম + এনআইডি যাচাই: সদস্য তালিকা ও আবেদন শিট দুটোর সাথেই মিলতে হবে
var TYPE_LABEL = { general: 'সাধারণ সদস্য', expat: 'প্রবাসী সদস্য', donor: 'দাতা সদস্য', junior: 'জুনিয়র সদস্য' };
function matchMember_(type, no, name, nid) {
  var label = TYPE_LABEL[type]; if (!label) return null;
  var ro = rosterOf_(no);
  if (!ro || ro[3] !== label || normName_(ro[0]) !== normName_(name)) return null;
  var t = readSheet_(CONFIG.MAIN_SHEET_ID, CONFIG.APPLY_TAB);
  for (var i = t.rows.length - 1; i >= 0; i--) {
    var row = t.rows[i];
    if (/বাতিল/.test(cell_(t, row, 'অবস্থা'))) continue;
    if (normNid_(cell_(t, row, 'এনআইডি')) !== nid) continue;
    var rowNo = cell_(t, row, 'সদস্য নম্বর');
    var same = rowNo ? noEq_(rowNo, ro[1]) : normName_(cell_(t, row, 'নাম (বাংলা)')) === normName_(ro[0]);
    if (same) return { t: t, row: row, nameBn: normName_(cell_(t, row, 'নাম (বাংলা)')) || normName_(ro[0]), no: ro[1], type: ro[3], date: ro[2] };
  }
  return null;
}

// ---------------------------------------------------------------- ইমেইলে কোড (শুধু পাসওয়ার্ড রিকভারির জন্য)
function validEmail_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120; }
function normUser_(s) { return String(s || '').trim().toLowerCase(); }
function validUser_(u) { return /^[a-z0-9][a-z0-9_.]{2,29}$/.test(u); }
function maskEmail_(e) { var p = String(e).split('@'); return (p[0].substring(0, 2) + '••••') + '@' + (p[1] || ''); }
function pwHash_(pw, salt) {
  var h = salt + '|' + pw;
  for (var i = 0; i < 100; i++) h = hmac_(h + '|' + salt);
  return h;
}
function dayCount_(prefix, max) {
  var c = CacheService.getScriptCache(), k = prefix + Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyyyMMdd'), n = Number(c.get(k) || 0) + 1;
  if (n > max) throw new Error('daily limit');
  c.put(k, String(n), 6 * 3600);
}
function sendMail_(email, subject, text) {
  dayCount_('md_', CONFIG.MAIL_PER_DAY);
  MailApp.sendEmail({ to: email, subject: subject, body: text, name: CONFIG.SENDER_NAME });
}
// channel: 'sms' (phone) বা 'mail' (email); লক্ষ্য = ফোন/ইমেইল; key = কোডটির মালিক (সদস্য নম্বর/ইউজারনেম)
function otpStart_(purpose, key, channel, target, minutes) {
  var c = CacheService.getScriptCache(), hk = 'oh_' + hmac_(target), cnt = Number(c.get(hk) || 0) + 1;
  if (cnt > CONFIG.OTP_PER_TARGET_PER_HOUR) return { ok: false, error: 'too_many_otp' };
  c.put(hk, String(cnt), 3600);
  var code = '' + (100000 + Math.floor(Math.random() * 900000));
  try {
    sendMail_(target, CONFIG.SENDER_NAME + ' — যাচাইয়ের কোড', 'আপনার অ্যাকাউন্টের পাসওয়ার্ড বদলানোর কোড' + ': ' + code +
      '\n(' + minutes + ' মিনিট পর্যন্ত বৈধ। কাউকে জানাবেন না।)\n\nআপনি না চেয়ে থাকলে এই ইমেইল উপেক্ষা করুন।\n— ' + CONFIG.SENDER_NAME);
  } catch (e) { console.error('otp send', e && e.message); return { ok: false, error: 'mail_failed' }; }
  c.put('ot_' + purpose + '_' + hmac_(key), JSON.stringify({ h: hmac_(code), n: 0 }), minutes * 60);
  return { ok: true };
}
function otpCheck_(purpose, key, code) {
  var c = CacheService.getScriptCache(), k = 'ot_' + purpose + '_' + hmac_(key), raw = c.get(k);
  if (!raw) return { ok: false, error: 'otp_expired' };
  var o = JSON.parse(raw);
  if (o.n >= CONFIG.OTP_MAX_TRIES) { c.remove(k); return { ok: false, error: 'otp_expired' }; }
  if (o.h !== hmac_(enDigits_(code).replace(/\D/g, ''))) { o.n++; c.put(k, JSON.stringify(o), 15 * 60); return { ok: false, error: 'otp_wrong' }; }
  c.remove(k); return { ok: true };
}

// ---------------------------------------------------------------- অ্যাকাউন্ট খোলা
function findByUser_(u) {
  u = normUser_(u); if (!u) return null;
  var sh = accSheet_(); if (sh.getLastRow() < 2) return null;
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, ACC_HEADERS.length).getValues();
  for (var i = 0; i < vals.length; i++) if (normUser_(vals[i][C.USER]) === u) return { sh: sh, row: i + 2, v: vals[i] };
  return null;
}
// ধাপ ১: সদস্য ধরণ + নম্বর + নাম + এনআইডি যাচাই (OTP নেই)। মিললে পাসওয়ার্ড দেওয়ার টিকিট মেলে।
// ভুল এনআইডি বারবার দিলে ওই সদস্য নম্বরে সাময়িক তালা পড়ে।
function signupCheck_(r) {
  var type = String(r.type || ''), no = normNo_(r.memberNo).substring(0, 30), name = normName_(r.name).substring(0, 80), nid = normNid_(r.nid);
  if (!TYPE_LABEL[type] || !no || !name || !/^\d{10,17}$/.test(nid)) return { ok: false, error: 'invalid' };
  var c = CacheService.getScriptCache(), fk = 'sf_' + hmac_(no), fails = Number(c.get(fk) || 0);
  if (fails >= CONFIG.LOGIN_MAX_FAILS) return { ok: false, error: 'locked', minutes: CONFIG.LOCK_MINUTES };
  if (findAccount_(no)) return { ok: false, error: 'exists' };
  var m = matchMember_(type, no, name, nid);
  if (!m) { c.put(fk, String(fails + 1), CONFIG.LOCK_MINUTES * 60); return { ok: false, error: 'nomatch' }; }   // কোন তথ্যটি ভুল তা বলা হয় না
  c.remove(fk);
  var formMail = cell_(m.t, m.row, 'ইমেইল').trim().toLowerCase(); if (!validEmail_(formMail)) formMail = '';
  var ticket = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  c.put('st_' + ticket, JSON.stringify({ type: type, no: no, name: name, nid: nid }), 15 * 60);
  return { ok: true, ticket: ticket, memberNo: m.no, needEmail: !formMail, emailMasked: formMail ? maskEmail_(formMail) : '' };
}
// ধাপ ২: টিকিট + নিজের বেছে নেওয়া ইউজারনেম/পাসওয়ার্ড (+ ফরমে ইমেইল না থাকলে রিকভারি ইমেইল) → অ্যাকাউন্ট তৈরি
function signupCreate_(r) {
  var user = normUser_(r.username), pw = String(r.password || ''), c = CacheService.getScriptCache(), tk = 'st_' + safeTok_(r.ticket), raw = c.get(tk);
  if (!raw) return { ok: false, error: 'ticket_expired' };
  if (!validUser_(user)) return { ok: false, error: 'bad_username' };
  if (pw.length < 8 || pw.length > 100 || pw.toLowerCase() === user) return { ok: false, error: 'bad_password' };
  var d = JSON.parse(raw), lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (findAccount_(d.no)) return { ok: false, error: 'exists' };
    if (findByUser_(user)) return { ok: false, error: 'user_taken' };
    var m = matchMember_(d.type, d.no, d.name, d.nid);
    if (!m) return { ok: false, error: 'nomatch' };
    var email = cell_(m.t, m.row, 'ইমেইল').trim().toLowerCase();
    if (!validEmail_(email)) { email = String(r.email || '').trim().toLowerCase(); if (!validEmail_(email)) return { ok: false, error: 'need_email' }; }
    var salt = Utilities.getUuid();
    accSheet_().appendRow([m.no, m.nameBn, user, pwHash_(pw, salt), salt, email, cell_(m.t, m.row, 'ফরম নম্বর'), now_(), '', 0, '', '', '', '', '', '']);
    c.remove(tk);
    return { ok: true, name: m.nameBn, memberNo: m.no };
  } finally { lock.releaseLock(); }
}

// ---------------------------------------------------------------- লগইন ও পাসওয়ার্ড রিকভারি (ইমেইলে)
function login_(r) {
  var user = normUser_(r.username), pw = String(r.password || ''), c = CacheService.getScriptCache();
  if (!user || user.length > 40 || !pw || pw.length > 100) return { ok: false, error: 'badlogin' };
  var lk = 'lk_' + hmac_(user), fails = Number(c.get(lk) || 0);
  if (fails >= CONFIG.LOGIN_MAX_FAILS) return { ok: false, error: 'locked', minutes: CONFIG.LOCK_MINUTES };
  var acc = findByUser_(user);
  if (!acc || acc.v[C.PW] !== pwHash_(pw, String(acc.v[C.SALT]))) {
    c.put(lk, String(fails + 1), CONFIG.LOCK_MINUTES * 60);
    return { ok: false, error: 'badlogin' };
  }
  c.remove(lk);
  var tok = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  newSession_(tok, String(acc.v[C.NO]));
  acc.sh.getRange(acc.row, C.LAST + 1, 1, 2).setValues([[now_(), Number(acc.v[C.COUNT] || 0) + 1]]);
  return { ok: true, token: tok, memberNo: String(acc.v[C.NO]), name: String(acc.v[C.NAME]), username: String(acc.v[C.USER]) };
}
function recoverStart_(r) {
  var user = normUser_(r.username), res = { ok: true };                  // ইউজারনেম আছে কি নেই তা বোঝানো হয় না
  if (!user || user.length > 40) return res;
  var acc = findByUser_(user); if (!acc) return res;
  var o = otpStart_('fp', user, 'mail', String(acc.v[C.MAIL]), CONFIG.RECOVER_MINUTES);
  if (!o.ok && o.error === 'too_many_otp') return o;
  res.emailMasked = maskEmail_(String(acc.v[C.MAIL]));
  return res;
}
function recoverVerify_(r) {
  var user = normUser_(r.username), pw = String(r.password || '');
  if (pw.length < 8 || pw.length > 100 || pw.toLowerCase() === user) return { ok: false, error: 'bad_password' };
  var chk = otpCheck_('fp', user, r.code); if (!chk.ok) return chk;
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var acc = findByUser_(user); if (!acc) return { ok: false, error: 'otp_expired' };
    var salt = Utilities.getUuid();
    acc.sh.getRange(acc.row, C.PW + 1, 1, 2).setValues([[pwHash_(pw, salt), salt]]);
    CacheService.getScriptCache().remove('lk_' + hmac_(user));
    endAllSessions_(String(acc.v[C.NO]));
    return { ok: true };
  } finally { lock.releaseLock(); }
}
// লম্বা মেয়াদের সেশন: ক্যাশে (দ্রুত, ৬ ঘণ্টা) + Script properties-এ (দীর্ঘস্থায়ী, হ্যাশ করা টোকেন)।
// ক্যাশ/প্রপার্টির মান: "সদস্য নম্বর|মেয়াদ|তৈরির সময়"। পাসওয়ার্ড বদলালে "rev_" চিহ্ন দিয়ে আগের সব সেশন বাতিল হয়।
function revAt_(props, no) { return Number(props.getProperty('rev_' + hmac_(normNo_(no))) || 0); }
function newSession_(tok, no) {
  var props = PropertiesService.getScriptProperties(), now = Date.now(), all = props.getProperties();
  Object.keys(all).forEach(function (k) {                                   // মেয়াদ-শেষ সেশন সাফ
    if (k.indexOf('ses_') === 0 && Number(String(all[k]).split('|')[1]) < now) props.deleteProperty(k);
  });
  var v = no + '|' + (now + CONFIG.SESSION_DAYS * 86400000) + '|' + now;
  props.setProperty('ses_' + hmac_(tok), v);
  CacheService.getScriptCache().put('tk_' + tok, v, 6 * 3600);
}
function endSession_(tok) {
  tok = safeTok_(tok); if (!tok) return;
  CacheService.getScriptCache().remove('tk_' + tok);
  PropertiesService.getScriptProperties().deleteProperty('ses_' + hmac_(tok));
}
function endAllSessions_(no) {                                                // পাসওয়ার্ড বদলালে সব ডিভাইস লগআউট
  var props = PropertiesService.getScriptProperties();
  props.setProperty('rev_' + hmac_(normNo_(no)), String(Date.now() + 1));
  var all = props.getProperties();
  Object.keys(all).forEach(function (k) { if (k.indexOf('ses_') === 0 && noEq_(String(all[k]).split('|')[0], no)) props.deleteProperty(k); });
}
function withSession_(r, fn) {
  var tok = safeTok_(r.token); if (!tok) return { ok: false, error: 'session' };
  var c = CacheService.getScriptCache(), props = PropertiesService.getScriptProperties(), v = c.get('tk_' + tok), k = 'ses_' + hmac_(tok);
  if (!v) {
    v = props.getProperty(k);
    if (v && Number(v.split('|')[1]) <= Date.now()) { props.deleteProperty(k); v = null; }
  }
  if (!v) return { ok: false, error: 'session' };
  var p = v.split('|'), no = p[0];
  if (Number(p[2] || 0) < revAt_(props, no)) { endSession_(tok); return { ok: false, error: 'session' }; }
  if (!c.get('tk_' + tok)) {                                                // ক্যাশ হারালে ফিরিয়ে আনা + ব্যবহারে মেয়াদ বাড়ানো
    v = no + '|' + (Date.now() + CONFIG.SESSION_DAYS * 86400000) + '|' + p[2];
    props.setProperty(k, v); c.put('tk_' + tok, v, 6 * 3600);
  }
  return fn(no, r);
}

// ---------------------------------------------------------------- প্রোফাইল ও ছবি
var PROFILE_GROUPS = [
  ['সদস্যপদ', ['ফরম নম্বর', 'জমার সময়', 'সদস্য ধরণ', 'সদস্য নম্বর', 'নিবন্ধন ফি (টাকা)', 'অবস্থা', 'সূত্র/সুপারিশ']],
  ['ব্যক্তিগত তথ্য', ['নাম (বাংলা)', 'নাম (ইংরেজি)', 'পিতার নাম', 'মাতার নাম', 'জন্ম তারিখ', 'লিঙ্গ', 'রক্ত গ্রুপ', 'শিক্ষাগত যোগ্যতা', 'পেশা', 'ধর্ম', 'এনআইডি', 'জন্মনিবন্ধন সনদ নম্বর']],
  ['যোগাযোগ', ['ফোন', 'ওয়াটসঅ্যাপ', 'ইমেইল']],
  ['স্থায়ী ঠিকানা', ['স্থায়ী: বিভাগ', 'স্থায়ী: জেলা', 'স্থায়ী: উপজেলা/সিটি', 'স্থায়ী: থানা', 'স্থায়ী: ইউনিয়ন/পৌরসভা', 'স্থায়ী: ওয়ার্ড', 'স্থায়ী: পোস্ট অফিস', 'স্থায়ী: গ্রাম', 'স্থায়ী: পাড়া']],
  ['বর্তমান ঠিকানা', ['বর্তমান ঠিকানা', 'বর্তমান বসবাসরত দেশের নাম']]
];
var MASKED = { 'এনআইডি': 4, 'জন্মনিবন্ধন সনদ নম্বর': 4 };

function applicationRow_(no) {
  var acc = findAccount_(no);
  var t = readSheet_(CONFIG.MAIN_SHEET_ID, CONFIG.APPLY_TAB), fn = acc ? String(acc.v[C.FORM] || '') : '';
  for (var i = t.rows.length - 1; i >= 0; i--) {
    var row = t.rows[i];
    if (fn ? cell_(t, row, 'ফরম নম্বর') === fn : noEq_(cell_(t, row, 'সদস্য নম্বর'), no)) return { t: t, row: row };
  }
  return null;
}
function rosterOf_(no) { for (var j = 0; j < ROSTER.length; j++) if (noEq_(ROSTER[j][1], no)) return ROSTER[j]; return null; }

function profile_(no) {
  var a = applicationRow_(no); if (!a) return { ok: false, error: 'notfound' };
  var ro = rosterOf_(no), groups = PROFILE_GROUPS.map(function (g) {
    return { title: g[0], items: g[1].map(function (h) {
      var v = cell_(a.t, a.row, h);
      if (h === 'সদস্য নম্বর' && !v && ro) v = ro[1];
      if (MASKED[h] && v) v = mask_(enDigits_(v).replace(/\D/g, ''), MASKED[h]);
      return { k: h, v: v };
    }).filter(function (x) { return x.v !== ''; }) };
  });
  var type = (ro && ro[3]) || cell_(a.t, a.row, 'সদস্য ধরণ');
  return { ok: true, groups: groups, card: { name: normName_(cell_(a.t, a.row, 'নাম (বাংলা)')), no: (ro && ro[1]) || cell_(a.t, a.row, 'সদস্য নম্বর') || no, type: type, date: (ro && ro[2]) || '', blood: String(cell_(a.t, a.row, 'রক্ত গ্রুপ') || '').slice(0, 10), vcode: vcodeOf_(a), formNo: cell_(a.t, a.row, 'ফরম নম্বর') },
    hasSig: !!String(acc0_(no, C.SIG) || ''),
    hasFormPdf: !!driveId_(cell_(a.t, a.row, 'পিডিএফ লিংক')),
    hasRegPdf: !!driveId_(cell_(a.t, a.row, 'নিবন্ধন ফরম লিংক')),
    hasPhoto: !!(String(acc0_(no, C.PHOTO)) || driveId_(cell_(a.t, a.row, 'ছবির লিংক'))),
    saved: { id: String(acc0_(no, C.IDC_AT)), photo: String(acc0_(no, C.PHC_AT)) } };
}
function acc0_(no, col) { var a = findAccount_(no); return a ? (a.v[col] || '') : ''; }
function driveId_(url) { var m = String(url || '').match(/[-\w]{25,}/); return m ? m[0] : ''; }
function photo_(no) {
  var a = applicationRow_(no); if (!a) return { ok: false, error: 'notfound' };
  var acc = findAccount_(no), id = (acc && String(acc.v[C.PHOTO] || '')) || driveId_(cell_(a.t, a.row, 'ছবির লিংক')); if (!id) return { ok: false, error: 'nophoto' };
  var b = DriveApp.getFileById(id).getBlob();
  if (b.getBytes().length > 9 * 1024 * 1024) return { ok: false, error: 'toolarge' };
  return { ok: true, mime: b.getContentType() || 'image/jpeg', data: Utilities.base64Encode(b.getBytes()) };
}

// ---------------------------------------------------------------- সদস্য তালিকার ছোট ছবি (ওয়েবসাইটে সবার জন্য খোলা)
// শুধু ROSTER-এর সদস্যদের ছবি যায়। আবেদন শিটের "ছবি প্রকাশ" কলামে "না" লিখলে ওই সদস্যের ছবি দেখানো হয় না (কলাম না থাকলে সবার দেখায়)।
function publicRate_() {
  var c = CacheService.getScriptCache(), k = 'pm_' + Math.floor(Date.now() / 60000), n = Number(c.get(k) || 0) + 1;
  c.put(k, String(n), 120); return n > 240;
}
function publicPhotoId_(no) {
  if (!rosterOf_(no)) return '';
  var a = applicationRow_(no); if (!a) return '';
  if (/^\s*(না|no)\s*$/i.test(cell_(a.t, a.row, 'ছবি প্রকাশ'))) return '';
  var acc = findAccount_(no);
  return (acc && String(acc.v[C.PHOTO] || '')) || driveId_(cell_(a.t, a.row, 'ছবির লিংক'));
}
function publicPhotos_(r) {
  var list = (r.nos || []).slice(0, 10), c = CacheService.getScriptCache(), out = {};
  list.forEach(function (no) {
    no = String(no || '').slice(0, 30); if (!no) return;
    var key = 'pt_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, normNo_(no))).slice(0, 20), v = c.get(key);
    if (v === null) {
      v = '-';
      try {
        var id = publicPhotoId_(no);
        if (id) { var b = DriveApp.getFileById(id).getThumbnail(); if (b) v = 'data:' + (b.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(b.getBytes()); }
      } catch (e) { v = '-'; }
      if (v.length < 95000) c.put(key, v, v === '-' ? 3600 : 21600);
    }
    if (v !== '-') out[no] = v;
  });
  return { ok: true, photos: out };
}
function publicPhotoBig_(r) {      // জুম: বড় ছবি (৭০০ কিলোবাইটের বেশি হলে থাম্বনেইল)
  var no = String(r.no || '').slice(0, 30), id = publicPhotoId_(no); if (!id) return { ok: false, error: 'nophoto' };
  var f = DriveApp.getFileById(id), b = f.getBlob(), bytes = b.getBytes();
  if (bytes.length > 700 * 1024) { var t = f.getThumbnail(); if (t) { b = t; bytes = t.getBytes(); } }
  return { ok: true, photo: 'data:' + (b.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(bytes) };
}

// ---------------------------------------------------------------- কিউআর যাচাই (সবার জন্য খোলা)
// একই কিউআর আবেদন ফরমে ও আইডি কার্ডে বসে: লিংকে থাকে ফরম নম্বর (f) ও আবেদন-শিটের "যাচাই কোড" (k)। তথ্য সবসময় শিট থেকে আসে।
function vcodeOf_(a) {      // কোড-ছাড়া পুরোনো আবেদনের জন্য প্রথমবার চাইলে তৈরি করে শিটে লিখে রাখে
  var cur = cell_(a.t, a.row, 'যাচাই কোড').trim();
  if (cur) return cur;
  var sh = a.t.sh, col = a.t.head.indexOf('যাচাই কোড') + 1, r = a.t.rows.indexOf(a.row) + 2;
  if (!col) { col = sh.getLastColumn() + 1; sh.getRange(1, col).setValue('যাচাই কোড').setFontWeight('bold'); }
  cur = 'v' + Utilities.getUuid().replace(/-/g, '').slice(0, 9);
  sh.getRange(r, col).setNumberFormat('@').setValue(cur);
  return cur;
}
function verifyMember_(r) {
  var f = String(r.f || '').trim().slice(0, 20), k = String(r.k || '').trim().toLowerCase().slice(0, 16);
  if (!f || !k) return { ok: false, error: 'invalid' };
  var t = readSheet_(CONFIG.MAIN_SHEET_ID, CONFIG.APPLY_TAB), a = null;
  for (var i = t.rows.length - 1; i >= 0; i--) if (cell_(t, t.rows[i], 'ফরম নম্বর') === f) { a = { t: t, row: t.rows[i] }; break; }
  var code = a ? cell_(a.t, a.row, 'যাচাই কোড').trim().toLowerCase() : '';
  if (!a || !code || code !== k) return { ok: false, error: 'invalid' };
  var no = cell_(a.t, a.row, 'সদস্য নম্বর').trim(), ro = no && rosterOf_(no), st = cell_(a.t, a.row, 'অবস্থা'), ov = cell_(a.t, a.row, 'সদস্যপদের অবস্থা').trim();
  var out = { ok: true, formNo: f, name: normName_(cell_(a.t, a.row, 'নাম (বাংলা)')), type: cell_(a.t, a.row, 'সদস্য ধরণ'), no: '', date: '', photo: '', kind: 'applicant', status: /বাতিল/.test(st) ? 'বাতিল' : 'আবেদন জমা হয়েছে — অনুমোদনের অপেক্ষায়' };
  if (ro && !/বাতিল/.test(st)) {      // অনুমোদিত সদস্য: নম্বর, তারিখ ও ছবি দেখায়
    out.kind = 'member'; out.no = ro[1]; out.date = ro[2]; out.type = ro[3] || out.type; out.name = ro[0] || out.name; out.status = 'সক্রিয়';
    try { var id = publicPhotoId_(ro[1]); if (id) { var b = DriveApp.getFileById(id).getThumbnail(); if (b) out.photo = 'data:' + (b.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(b.getBytes()); } } catch (e) {}
  }
  if (ov) out.status = ov;      // ঐচ্ছিক কলাম "সদস্যপদের অবস্থা": স্থগিত / বাতিল ইত্যাদি লিখলে সেটাই দেখায়
  return out;
}

// ---------------------------------------------------------------- আবেদন ফরমের মূল পিডিএফ (শুধু ডাউনলোড; বদলানোর কোনো ব্যবস্থা নেই)
function formPdf_(no, r) {
  var a = applicationRow_(no); if (!a) return { ok: false, error: 'notfound' };
  var reg = r && r.kind === 'reg', col = reg ? 'নিবন্ধন ফরম লিংক' : 'পিডিএফ লিংক';     // নিবন্ধন ফরম: কর্তৃপক্ষ স্বাক্ষরসহ আপলোড করে লিংক বসায়
  var id = driveId_(cell_(a.t, a.row, col)); if (!id) return { ok: false, error: reg ? 'noreg' : 'nopdf' };
  return { ok: true, name: (reg ? 'Registration-' : 'Application-') + slug_(cell_(a.t, a.row, 'ফরম নম্বর') || no) + '.pdf', data: Utilities.base64Encode(DriveApp.getFileById(id).getBlob().getBytes()) };
}
function addRegColumn_() {   // আবেদন শিটে "নিবন্ধন ফরম লিংক" কলাম না থাকলে শেষে যোগ করে
  var sh = SpreadsheetApp.openById(CONFIG.MAIN_SHEET_ID).getSheetByName(CONFIG.APPLY_TAB); if (!sh) return;
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  if (head.indexOf('নিবন্ধন ফরম লিংক') < 0) sh.getRange(1, head.length + 1).setValue('নিবন্ধন ফরম লিংক').setFontWeight('bold');
}

// ---------------------------------------------------------------- নিউজফিড (সব সদস্য লিখতে ও দেখতে পারে)
var FEED_HEADERS = ['পোস্ট আইডি', 'সময়', 'সদস্য নম্বর', 'নাম', 'লেখা', 'অবস্থা'];   // অবস্থা: প্রকাশিত / মুছে ফেলা / লুকানো (প্রশাসক হাতে "লুকানো" লিখে সরাতে পারেন)
function feedSheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.ACCOUNT_SHEET_ID), sh = ss.getSheetByName(CONFIG.FEED_TAB);
  if (!sh) sh = ss.insertSheet(CONFIG.FEED_TAB);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, FEED_HEADERS.length).setValues([FEED_HEADERS]).setFontWeight('bold').setBackground('#0b3d24').setFontColor('#ffffff');
    sh.setFrozenRows(1); sh.getRange('E:E').setWrap(true).setNumberFormat('@');
  }
  return sh;
}
function feedList_(no, r) {
  var sh = feedSheet_(), n = sh.getLastRow() - 1, before = Number(r.before) || 0, out = [], more = false;
  if (n < 1) return { ok: true, posts: [], more: false };
  var vals = sh.getRange(2, 1, n, FEED_HEADERS.length).getDisplayValues();
  for (var i = vals.length - 1; i >= 0; i--) {
    var id = i + 2;
    if (before && id >= before) continue;
    if (vals[i][5] !== 'প্রকাশিত') continue;
    if (out.length >= CONFIG.FEED_PAGE) { more = true; break; }
    out.push({ id: id, time: vals[i][1], no: vals[i][2], name: vals[i][3], text: vals[i][4], mine: noEq_(vals[i][2], no) });
  }
  return { ok: true, posts: out, more: more };
}
function feedPost_(no, r) {
  var acc = findAccount_(no); if (!acc) return { ok: false, error: 'notfound' };
  var text = String(r.text || '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) return { ok: false, error: 'empty' };
  if (text.length > CONFIG.FEED_MAX_CHARS) return { ok: false, error: 'too_long' };
  var c = CacheService.getScriptCache(), hk = 'fh_' + hmac_(no) + '_' + Math.floor(Date.now() / 3600000), dk = 'fd_' + hmac_(no) + '_' + Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyyyMMdd');
  var h = Number(c.get(hk) || 0) + 1, d = Number(c.get(dk) || 0) + 1;
  if (h > CONFIG.FEED_PER_HOUR || d > CONFIG.FEED_PER_DAY) return { ok: false, error: 'too_many_posts' };
  c.put(hk, String(h), 3700); c.put(dk, String(d), 86400);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = feedSheet_(), row = sh.getLastRow() + 1, t = now_();
    sh.getRange(row, 5).setNumberFormat('@');   // '=' দিয়ে শুরু হলেও সূত্র নয়, সাধারণ লেখা
    sh.getRange(row, 1, 1, FEED_HEADERS.length).setValues([[row, t, String(acc.v[C.NO]), String(acc.v[C.NAME]), text, 'প্রকাশিত']]);
    return { ok: true, post: { id: row, time: t, no: String(acc.v[C.NO]), name: String(acc.v[C.NAME]), text: text, mine: true } };
  } finally { lock.releaseLock(); }
}
function feedDelete_(no, r) {
  var id = Number(r.id) || 0, sh = feedSheet_();
  if (id < 2 || id > sh.getLastRow()) return { ok: false, error: 'notfound' };
  var v = sh.getRange(id, 1, 1, FEED_HEADERS.length).getDisplayValues()[0];
  if (!noEq_(v[2], no) || v[5] !== 'প্রকাশিত') return { ok: false, error: 'notfound' };       // শুধু নিজের পোস্ট
  sh.getRange(id, 6).setValue('মুছে ফেলা');
  return { ok: true };
}

// ---------------------------------------------------------------- ছবি আপলোড ও কার্ড সংরক্ষণ (ড্রাইভ)
function subFolder_(name) {
  var root = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID), it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}
function uploadGuard_(no) {
  var c = CacheService.getScriptCache(), k = 'up_' + hmac_(no) + '_' + Math.floor(Date.now() / 3600000), n = Number(c.get(k) || 0) + 1;
  c.put(k, String(n), 3700);
  return n <= CONFIG.UPLOADS_PER_HOUR;
}
function slug_(no) { return String(no).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function bytesOf_(b64, max) {
  var s = String(b64 || '').replace(/^data:[^,]*,/, '');
  if (!s || s.length > max * 1.4) return null;
  var b = Utilities.base64Decode(s);
  return b.length > max ? null : b;
}
function saveFile_(acc, folderName, fileName, blob, idCol, atCol) {
  var folder = subFolder_(folderName), old = String(acc.v[idCol] || '');
  var f = folder.createFile(blob.setName(fileName));
  acc.sh.getRange(acc.row, idCol + 1, 1, 1).setValue(f.getId());
  acc.sh.getRange(acc.row, atCol + 1, 1, 1).setValue(now_());
  if (old) { try { DriveApp.getFileById(old).setTrashed(true); } catch (e) {} }   // আগেরটি ট্র্যাশে
  return f;
}
function photoUpload_(no, r) {
  var acc = findAccount_(no); if (!acc) return { ok: false, error: 'notfound' };
  if (!uploadGuard_(no)) return { ok: false, error: 'too_many' };
  var b = bytesOf_(r.data, CONFIG.MAX_PHOTO_BYTES);
  if (!b || b.length < 4 || (b[0] & 255) !== 0xFF || (b[1] & 255) !== 0xD8) return { ok: false, error: 'bad_image' };   // শুধু JPEG (সাইট ছোট করে JPEG বানিয়ে পাঠায়)
  saveFile_(acc, 'সদস্যের ছবি', 'Photo-' + slug_(no) + '-' + now_().replace(/\D/g, '') + '.jpg', Utilities.newBlob(b, 'image/jpeg'), C.PHOTO, C.PHOTO_AT);
  return { ok: true };
}
function sigUpload_(no, r) {      // সদস্যের স্বাক্ষর (স্বচ্ছ পটভূমির PNG; সাইট ছোট করে পাঠায়)
  var acc = findAccount_(no); if (!acc) return { ok: false, error: 'notfound' };
  if (!uploadGuard_(no)) return { ok: false, error: 'too_many' };
  var b = bytesOf_(r.data, 400 * 1024);
  if (!b || b.length < 8 || (b[0] & 255) !== 0x89 || (b[1] & 255) !== 0x50 || (b[2] & 255) !== 0x4E || (b[3] & 255) !== 0x47) return { ok: false, error: 'bad_image' };
  saveFile_(acc, 'সদস্যের স্বাক্ষর', 'Signature-' + slug_(no) + '-' + now_().replace(/\D/g, '') + '.png', Utilities.newBlob(b, 'image/png'), C.SIG, C.SIG_AT);
  return { ok: true };
}
function sigGet_(no, r) {
  var id = String(acc0_(no, C.SIG) || ''); if (!id) return { ok: false, error: 'nosig' };
  return { ok: true, mime: 'image/png', data: Utilities.base64Encode(DriveApp.getFileById(id).getBlob().getBytes()) };
}
function cardSave_(no, r) {
  var acc = findAccount_(no); if (!acc) return { ok: false, error: 'notfound' };
  var kind = r.kind === 'photo' ? 'photo' : (r.kind === 'id' ? 'id' : '');
  if (!kind) return { ok: false, error: 'invalid' };
  if (!uploadGuard_(no)) return { ok: false, error: 'too_many' };
  var b = bytesOf_(r.data, CONFIG.MAX_CARD_BYTES);
  if (!b || String.fromCharCode(b[0] & 255, b[1] & 255, b[2] & 255, b[3] & 255) !== '%PDF') return { ok: false, error: 'bad_pdf' };
  var name = (kind === 'id' ? 'ID-' : 'PhotoCard-') + slug_(no) + '.pdf';
  saveFile_(acc, 'সংরক্ষিত কার্ড', name, Utilities.newBlob(b, 'application/pdf'), kind === 'id' ? C.IDC : C.PHC, kind === 'id' ? C.IDC_AT : C.PHC_AT);
  return { ok: true, at: now_() };
}
function cardGet_(no, r) {
  var acc = findAccount_(no); if (!acc) return { ok: false, error: 'notfound' };
  var kind = r.kind === 'photo' ? 'photo' : 'id', id = String(acc.v[kind === 'id' ? C.IDC : C.PHC] || '');
  if (!id) return { ok: false, error: 'nocard' };
  return { ok: true, name: (kind === 'id' ? 'ID-' : 'PhotoCard-') + slug_(no) + '.pdf', data: Utilities.base64Encode(DriveApp.getFileById(id).getBlob().getBytes()) };
}

// ---------------------------------------------------------------- রসিদ ও চাঁদার হিসাব
function myReceipts_(no) {
  var t = readSheet_(CONFIG.RECEIPT_SHEET_ID, CONFIG.RECEIPT_TAB), out = [];
  t.rows.forEach(function (row, i) {
    if (!noEq_(cell_(t, row, 'সদস্য নম্বর'), no)) return;
    var amt = Number(enDigits_(cell_(t, row, 'পরিমাণ (অঙ্কে)')).replace(/[^\d.]/g, '')) || 0;
    out.push({ no: cell_(t, row, 'রসিদ নম্বর'), date: cell_(t, row, 'তারিখ'), kind: cell_(t, row, 'চাঁদার ধরণ'), amount: amt,
      words: cell_(t, row, 'পরিমাণ (কথায়)'), method: cell_(t, row, 'প্রদানের মাধ্যম'), collector: cell_(t, row, 'আদায়কারী'),
      hasPdf: !!driveId_(cell_(t, row, 'পিডিএফ লিংক')), _i: i });
  });
  return { t: t, list: out };
}
function receipts_(no) {
  var m = myReceipts_(no), total = 0, by = {};
  m.list.forEach(function (x) { total += x.amount; by[x.kind || 'অন্যান্য'] = (by[x.kind || 'অন্যান্য'] || 0) + x.amount; delete x._i; });
  var kinds = Object.keys(by).map(function (k) { return { kind: k, amount: by[k] }; });
  return { ok: true, list: m.list.reverse(), total: total, kinds: kinds, count: m.list.length };
}
function receiptPdf_(no, r) {
  var m = myReceipts_(no), want = String(r.rno || '');
  for (var i = m.list.length - 1; i >= 0; i--) {      // শুধু নিজের রসিদ; সবচেয়ে নতুন মিল আগে
    if (m.list[i].no !== want) continue;
    var id = driveId_(cell_(m.t, m.t.rows[m.list[i]._i], 'পিডিএফ লিংক'));
    if (!id) return { ok: false, error: 'nopdf' };
    var b = DriveApp.getFileById(id).getBlob();
    return { ok: true, name: 'Receipt-' + want.replace(/[^A-Za-z0-9]+/g, '-') + '.pdf', data: Utilities.base64Encode(b.getBytes()) };
  }
  return { ok: false, error: 'notfound' };
}

// ---------------------------------------------------------------- সেটআপ / পরীক্ষা (এডিটর থেকে Run)
function setup() {
  accSheet_(); addRegColumn_(); readSheet_(CONFIG.MAIN_SHEET_ID, CONFIG.APPLY_TAB); readSheet_(CONFIG.RECEIPT_SHEET_ID, CONFIG.RECEIPT_TAB);
  DriveApp.getRootFolder(); secret_();
  MailApp.getRemainingDailyQuota();
  Logger.log('অনুমতি ঠিক আছে। আজকের বাকি ইমেইল কোটা: ' + MailApp.getRemainingDailyQuota());
}
