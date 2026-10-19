/**
 * সৃজনশীল তরুণ সংঘ — ওয়েবসাইটের ব্যাকএন্ড (Google Apps Script)
 *
 * কাজ:
 *  1) action=submit   : আবেদনের তথ্য শিটে (ট্যাব "আবেদন") যোগ করে; ফরম নম্বর, সময় ও টোকেন ফেরত দেয়
 *  2) action=pdf      : ওয়েবসাইটে তৈরি পিডিএফ সদস্য ধরণ অনুযায়ী নির্দিষ্ট ড্রাইভ ফোল্ডারে রাখে
 *  2খ) action=photo   : আবেদনকারীর ছবি একই ড্রাইভ ফোল্ডারে রাখে এবং শিটে ছবি (থাম্বনেইল) ও লিংক বসায়
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
  REF_LABEL: { none: 'কোন রেফারেন্স নেই', junior: 'জুনিয়র সদস্য ছিলাম', general: 'সাধারণ সদস্য ছিলাম', expat: 'প্রবাসী সদস্য ছিলাম', donor: 'দাতা সদস্য ছিলাম' },
  MAX_PHOTO_BYTES: 8 * 1024 * 1024,
  MAX_PDF_BYTES: 4 * 1024 * 1024
};

var APPLY_HEADERS = [
  'ফরম নম্বর', 'জমার সময়', 'সদস্য ধরণ', 'নিবন্ধন ফি (টাকা)', 'সদস্য নম্বর',
  'নাম (বাংলা)', 'নাম (ইংরেজি)', 'পিতার নাম', 'মাতার নাম', 'জন্ম তারিখ', 'লিঙ্গ', 'রক্ত গ্রুপ',
  'শিক্ষাগত যোগ্যতা', 'পেশা', 'ধর্ম', 'এনআইডি', 'জন্মনিবন্ধন সনদ নম্বর', 'ফোন', 'ওয়াটসঅ্যাপ', 'ইমেইল',
  'স্থায়ী: বিভাগ', 'স্থায়ী: জেলা', 'স্থায়ী: উপজেলা/সিটি', 'স্থায়ী: থানা', 'স্থায়ী: ইউনিয়ন/পৌরসভা', 'স্থায়ী: ওয়ার্ড',
  'স্থায়ী: পোস্ট অফিস', 'স্থায়ী: গ্রাম', 'স্থায়ী: পাড়া',
  'বর্তমান ঠিকানা', 'দেশ', 'পিডিএফ লিংক', 'অবস্থা', 'রেফারেন্স', 'ছবি', 'ছবির লিংক', 'রেফারেন্স প্রমাণক'
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
      'বর্তমান ঠিকানা': cur, 'দেশ': safe_(d.country, 60), 'পিডিএফ লিংক': '', 'অবস্থা': 'পিডিএফ অপেক্ষমাণ', 'রেফারেন্স': CONFIG.REF_LABEL[ref], 'রেফারেন্স প্রমাণক': ref === 'none' ? '' : proof, 'ছবি': '', 'ছবির লিংক': ''
    };
    var row = appendByHeader_(sh, rec);

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
