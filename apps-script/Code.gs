/**
 * সৃজনশীল তরুণ সংঘ — ওয়েবসাইটের ব্যাকএন্ড (Google Apps Script)
 *
 * কাজ:
 *  1) action=submit   : আবেদনের তথ্য শিটে (ট্যাব "আবেদন") যোগ করে; ফরম নম্বর, সময় ও টোকেন ফেরত দেয়
 *  2) action=pdf      : ওয়েবসাইটে তৈরি পিডিএফ সদস্য ধরণ অনুযায়ী নির্দিষ্ট ড্রাইভ ফোল্ডারে রাখে
 *  3) action=feedback : মতামত শিটে (ট্যাব "মতামত") যোগ করে
 *
 * ডিপ্লয়: Execute as = Me (srijonshil2011@gmail.com), Who has access = Anyone
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
  MAX_PDF_BYTES: 4 * 1024 * 1024
};

var APPLY_HEADERS = [
  'ফরম নম্বর', 'জমার সময়', 'সদস্য ধরণ', 'নিবন্ধন ফি (টাকা)', 'সদস্য নম্বর',
  'নাম (বাংলা)', 'নাম (ইংরেজি)', 'পিতার নাম', 'মাতার নাম', 'জন্ম তারিখ', 'লিঙ্গ', 'রক্ত গ্রুপ',
  'শিক্ষাগত যোগ্যতা', 'পেশা', 'ধর্ম', 'এনআইডি', 'ফোন', 'ওয়াটসঅ্যাপ', 'ইমেইল',
  'স্থায়ী: বিভাগ', 'স্থায়ী: জেলা', 'স্থায়ী: উপজেলা/সিটি', 'স্থায়ী: থানা', 'স্থায়ী: পোস্ট অফিস', 'স্থায়ী: গ্রাম', 'স্থায়ী: পাড়া',
  'বর্তমান ঠিকানা', 'বর্তমান দেশ', 'পিডিএফ লিংক', 'অবস্থা'
];
var FEEDBACK_HEADERS = ['সময়', 'নাম', 'যোগাযোগ', 'মতামত'];

// ---------------------------------------------------------------- প্রবেশদ্বার
function doGet() {
  return json_({ ok: true, service: 'srijonshil-website', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (req.action) {
      case 'submit':   return json_(submit_(req.data || {}));
      case 'pdf':      return json_(savePdf_(req));
      case 'feedback': return json_(saveFeedback_(req));
      default:         return json_({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, error: 'server error' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------- হেল্পার
function sheet_(name, headers) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#0b3d24').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
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

// ---------------------------------------------------------------- ১) আবেদন জমা
function submit_(d) {
  if (d.website) return { ok: false, error: 'rejected' };            // হানিপট
  var type = String(d.memberType || '');
  if (!CONFIG.FOLDERS[type]) return { ok: false, error: 'invalid member type' };

  var required = ['nameBn', 'nameEn', 'father', 'mother', 'dob', 'gender', 'blood', 'education', 'profession', 'religion', 'nid', 'phone', 'country'];
  for (var i = 0; i < required.length; i++) {
    if (!String(d[required[i]] || '').trim()) return { ok: false, error: 'missing ' + required[i] };
  }
  var p = d.perm || {};
  if (!p.div || !p.dist || !p.upa || !p.thana || !p.po || !p.village) return { ok: false, error: 'missing address' };
  if (!/^(\d{10}|\d{13}|\d{17})$/.test(String(d.nid))) return { ok: false, error: 'invalid nid' };

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = sheet_(CONFIG.APPLY_TAB, APPLY_HEADERS);
    var t = nowInfo_();

    // ক্রমিক ফরম নম্বর: STS-২০২৬-০০০১ (বছর অনুযায়ী নতুন করে শুরু)
    var props = PropertiesService.getScriptProperties();
    var key = 'seq_' + t.year;
    var seq = Number(props.getProperty(key) || 0) + 1;
    props.setProperty(key, String(seq));
    var formNo = 'STS-' + t.year + '-' + ('0000' + seq).slice(-4);

    var cur = d.addrSame ? 'স্থায়ী ঠিকানার অনুরূপ' : safe_(d.currentText, 400);
    sh.appendRow([
      formNo, t.sheet, CONFIG.TYPE_LABEL[type], CONFIG.FEES[type], '',
      safe_(d.nameBn, 100), safe_(d.nameEn, 100), safe_(d.father, 100), safe_(d.mother, 100),
      safe_(d.dob, 12), safe_(d.gender, 10), safe_(d.blood, 20),
      safe_(d.education, 80), safe_(d.profession, 80), safe_(d.religion, 20),
      "'" + safe_(d.nid, 20), "'" + safe_(d.phone, 20), d.whatsapp ? "'" + safe_(d.whatsapp, 20) : '', safe_(d.email, 120),
      safe_(p.div, 40), safe_(p.dist, 40), safe_(p.upa, 60), safe_(p.thana, 60), safe_(p.po, 80), safe_(p.village, 80), safe_(p.para, 80),
      cur, safe_(d.country, 60), '', 'পিডিএফ অপেক্ষমাণ'
    ]);
    var row = sh.getLastRow();

    // একবার-ব্যবহারযোগ্য টোকেন: শুধু এই আবেদনকারীই পিডিএফ আপলোড করতে পারবে
    var token = Utilities.getUuid();
    CacheService.getScriptCache().put('tok_' + formNo, token + '|' + row + '|' + type, 6 * 60 * 60);

    return { ok: true, formNo: formNo, token: token, timestamp: t.sheet, timestampBn: t.bn };
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------- ২) পিডিএফ সংরক্ষণ
function savePdf_(req) {
  var cache = CacheService.getScriptCache();
  var stored = cache.get('tok_' + req.formNo);
  if (!stored) return { ok: false, error: 'expired' };
  var parts = stored.split('|');
  if (parts[0] !== req.token) return { ok: false, error: 'bad token' };
  var row = Number(parts[1]);
  var type = parts[2];                       // ক্লায়েন্টের নয়, জমার সময়ের ধরণই চূড়ান্ত

  var bytes = Utilities.base64Decode(String(req.pdf || ''));
  if (bytes.length < 1000 || bytes.length > CONFIG.MAX_PDF_BYTES) return { ok: false, error: 'bad size' };
  if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== '%PDF') return { ok: false, error: 'not pdf' };

  var name = String(req.nameEn || 'APPLICANT').replace(/[^A-Za-z0-9 ]/g, '').trim().replace(/\s+/g, '_').substring(0, 40) || 'APPLICANT';
  var file = DriveApp.getFolderById(CONFIG.FOLDERS[type])
    .createFile(Utilities.newBlob(bytes, 'application/pdf', req.formNo + '_' + name + '.pdf'));

  var sh = sheet_(CONFIG.APPLY_TAB, APPLY_HEADERS);
  var linkCol = APPLY_HEADERS.indexOf('পিডিএফ লিংক') + 1;
  sh.getRange(row, linkCol).setValue(file.getUrl());
  sh.getRange(row, linkCol + 1).setValue('জমা সম্পন্ন');
  cache.remove('tok_' + req.formNo);         // একবারই ব্যবহার্য
  return { ok: true, url: file.getUrl() };
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
