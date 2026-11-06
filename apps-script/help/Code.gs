/**
 * সৃজনশীল তরুণ সংঘ — "সহযোগিতা চাই" ফরমের ব্যাকএন্ড (Google Apps Script)
 *
 * স্প্রেডশিট : 1ug7goIOB8lR8NWYlimZcHMVjrOW4wXHPzKO1OKhO5sU   (ট্যাব "সহযোগিতার আবেদন" না থাকলে নিজে তৈরি হয়)
 * ড্রাইভ ফোল্ডার : 11I5RCEjhnbK3I8cPGW2SURSv9y0f8S89          (ফরমের পিডিএফ + আবেদনকারীর সংযুক্ত পিডিএফ)
 * ইমেইল : CONFIG.MAIL_TO-তে পিডিএফসহ মেইল যায়
 *
 * ধাপ ১ action=help_submit → তথ্য যাচাই করে শিটে সারি + আবেদন নম্বর (HLP-26/0001) ফেরত
 * ধাপ ২ action=help_pdf    → ওয়েবসাইটে বানানো A4 পিডিএফ (ও সংযুক্ত পত্র) ড্রাইভে রাখে, শিটে লিংক বসায়, ইমেইল পাঠায়
 *
 * ডিপ্লয়: নতুন একটি Apps Script প্রজেক্ট বানিয়ে Code.gs ও appsscript.json বসান → setup একবার Run (অনুমতি দিন) →
 *          Deploy > New deployment > Web app > Execute as = Me, Who has access = Anyone →
 *          পাওয়া "Web app URL" ওয়েবসাইটের config.js এর HELP_URL-এ বসাবেন।
 * কোড বদলালে: Deploy > Manage deployments > Edit > New version > Deploy।
 */
var CONFIG = {
  SHEET_ID: '1ug7goIOB8lR8NWYlimZcHMVjrOW4wXHPzKO1OKhO5sU',
  TAB: 'সহযোগিতার আবেদন',
  FOLDER_ID: '11I5RCEjhnbK3I8cPGW2SURSv9y0f8S89',
  MAIL_TO: 'srijonshil2011@gmail.com',
  MAX_PER_MIN: 10,
  MAX_PER_DAY: 80,
  MAX_PDF_BYTES: 3 * 1024 * 1024,
  MAX_ATTACH_BYTES: 3 * 1024 * 1024
};
var HEADERS = ['আবেদন নম্বর', 'জমার সময়', 'নাম', 'পিতার নাম', 'জাতীয় পরিচয়পত্র নম্বর', 'ফোন নম্বর', 'সহযোগিতার বিষয়', 'বিস্তারিত', 'পরিচয় গোপন রাখার অনুরোধ', 'আবেদন পিডিএফ', 'সংযুক্ত পত্র (পিডিএফ)', 'ইমেইল অবস্থা'];
var SUBJECTS = [
  'ক। দরিদ্র ও অসহায় মানুষের আর্থিক সহায়তা', 'খ। অসুস্থ ব্যক্তির চিকিৎসার ব্যবস্থা', 'গ। দরিদ্র শিক্ষার্থীদের শিক্ষা উপকরণ ও বৃত্তি প্রদান',
  'ঘ। অসহায় পরিবারের খাদ্য ও বস্ত্রের ব্যবস্থা', 'ঙ। গৃহহীন মানুষের বাসস্থানের ব্যবস্থা', 'চ। প্রাকৃতিক দুর্যোগে ক্ষতিগ্রস্তদের ত্রাণ সহায়তা',
  'ছ। দরিদ্র মেয়েদের বিবাহে সহযোগিতা', 'জ। পারিবারিক ও সামাজিক বিরোধ নিষ্পত্তিতে মধ্যস্থতা', 'ঝ। আইনি সহায়তা', 'ঞ। রক্তের ব্যবস্থা',
  'ট। মৃত ব্যক্তির দাফন-কাফনে সহযোগিতা', 'ঠ। রাস্তা/সেতু মেরামত', 'ড। ধর্মীয় প্রতিষ্ঠান ও জনসেবামূলক অবকাঠামো উন্নয়ন'
];

function doGet() { return json_({ ok: true, service: 'srijonshil-help', time: new Date().toISOString() }); }
function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (req.action === 'help_submit') return json_(submit_(req));
    if (req.action === 'help_pdf') return json_(pdf_(req));
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, error: 'server error: ' + String(err && err.message || err).substring(0, 200) });
  }
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function enDigits_(s) { return String(s || '').replace(/[০-৯]/g, function (c) { return '০১২৩৪৫৬৭৮৯'.indexOf(c); }); }
function safe_(v, max) {      // শিটে ফর্মুলা ইনজেকশন ঠেকাতে শুরুর বিপজ্জনক চিহ্নে ' বসে
  var s = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().substring(0, max || 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function esc_(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>'); }
function nowStr_() { return Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyyy-MM-dd HH:mm:ss'); }

function sheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID), sh = ss.getSheetByName(CONFIG.TAB);
  if (!sh) sh = ss.insertSheet(CONFIG.TAB);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#0b3d24').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}
function col_(name) { return HEADERS.indexOf(name) + 1; }

function limited_() {
  var cache = CacheService.getScriptCache(), now = new Date();
  var kMin = 'hm_' + Utilities.formatDate(now, 'Asia/Dhaka', 'yyyyMMddHHmm'), kDay = 'hd_' + Utilities.formatDate(now, 'Asia/Dhaka', 'yyyyMMdd');
  var m = Number(cache.get(kMin) || 0) + 1, d = Number(cache.get(kDay) || 0) + 1;
  if (m > CONFIG.MAX_PER_MIN) return 'busy';
  if (d > CONFIG.MAX_PER_DAY) return 'limit_day';
  cache.put(kMin, String(m), 120); cache.put(kDay, String(d), 21600);
  return '';
}

function submit_(r) {
  if (r.website) return { ok: false, error: 'rejected' };
  var d = r.data || {};
  var name = safe_(d.name, 100), father = safe_(d.father, 100), nid = enDigits_(d.nid).replace(/\D/g, ''), phone = enDigits_(d.phone).replace(/\D/g, '');
  var subject = String(d.subject || ''), details = safe_(d.details, 3000), hasAttach = !!d.hasAttach;
  if (name.length < 2) return { ok: false, error: 'name' };
  if (father.length < 2) return { ok: false, error: 'father' };
  if (!/^(\d{10}|\d{13}|\d{17})$/.test(nid)) return { ok: false, error: 'nid' };
  if (!/^01\d{9}$/.test(phone)) return { ok: false, error: 'phone' };
  if (SUBJECTS.indexOf(subject) < 0) return { ok: false, error: 'subject' };
  var words = details ? details.split(/\s+/).length : 0;
  if (words > 200) return { ok: false, error: 'too long' };
  if (!details && !hasAttach) return { ok: false, error: 'no details' };
  var lim = limited_();
  if (lim) return { ok: false, error: lim };

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var yy = Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yy'), props = PropertiesService.getScriptProperties();
    var seq = Number(props.getProperty('hp_' + yy) || 0) + 1;
    props.setProperty('hp_' + yy, String(seq));
    var no = 'HLP-' + yy + '/' + ('0000' + seq).slice(-4);
    var sh = sheet_();
    sh.appendRow([no, "'" + nowStr_(), name, father, "'" + nid, "'" + phone, subject, details, d.hide ? 'হ্যাঁ' : 'না', '', hasAttach ? 'আছে (পিডিএফ জমার অপেক্ষায়)' : '', 'অপেক্ষমাণ']);
    var token = Utilities.getUuid().replace(/-/g, '');
    CacheService.getScriptCache().put('hpt_' + no, token, 21600);
    return { ok: true, no: no, token: token };
  } finally {
    lock.releaseLock();
  }
}

function pdf_(r) {
  var no = String(r.no || ''), token = String(r.token || '');
  if (!/^HLP-\d{2}\/\d{4}$/.test(no)) return { ok: false, error: 'bad no' };
  var cache = CacheService.getScriptCache();
  if (!token || cache.get('hpt_' + no) !== token) return { ok: false, error: 'expired' };
  var bytes = Utilities.base64Decode(String(r.pdf || ''));
  if (bytes.length < 1000 || bytes.length > CONFIG.MAX_PDF_BYTES || !isPdf_(bytes)) return { ok: false, error: 'bad pdf' };
  var att = null;
  if (r.attach) {
    att = Utilities.base64Decode(String(r.attach));
    if (att.length < 100 || att.length > CONFIG.MAX_ATTACH_BYTES || !isPdf_(att)) return { ok: false, error: 'bad attachment' };
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = sheet_(), last = sh.getLastRow(), row = 0, rec = null;
    var vals = last > 1 ? sh.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];
    for (var i = vals.length - 1; i >= 0; i--) if (String(vals[i][0]) === no) { row = i + 2; rec = vals[i]; break; }
    if (!row) return { ok: false, error: 'unknown' };
    if (String(rec[col_('আবেদন পিডিএফ') - 1])) return { ok: false, error: 'already saved' };
    cache.remove('hpt_' + no);
    var base = no.replace('/', '-') + '_' + String(rec[col_('নাম') - 1]).replace(/^'/, '').replace(/[\\\/:*?"<>|\n\r]/g, '').replace(/\s+/g, '_').substring(0, 50);
    var folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    var mainBlob = Utilities.newBlob(bytes, 'application/pdf', base + '.pdf');
    var f1 = folder.createFile(mainBlob);
    sh.getRange(row, col_('আবেদন পিডিএফ')).setValue(f1.getUrl());
    var attBlob = null, f2 = null;
    if (att) {
      attBlob = Utilities.newBlob(att, 'application/pdf', base + '_সংযুক্ত-পত্র.pdf');
      f2 = folder.createFile(attBlob);
      sh.getRange(row, col_('সংযুক্ত পত্র (পিডিএফ)')).setValue(f2.getUrl());
    } else {
      sh.getRange(row, col_('সংযুক্ত পত্র (পিডিএফ)')).setValue('');
    }
    var mail = 'পাঠানো হয়নি';
    try {
      var hide = String(rec[col_('পরিচয় গোপন রাখার অনুরোধ') - 1]) === 'হ্যাঁ';
      var html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;max-width:560px">' +
        '<h2 style="color:#0b3d24;margin:0 0 10px">সহযোগিতার নতুন আবেদন — ' + esc_(no) + '</h2>' +
        (hide ? '<p style="background:#fff3cd;padding:8px 12px;border-radius:8px"><b>⚠ আবেদনকারী পরিচয় গোপন রাখার অনুরোধ করেছেন।</b></p>' : '') +
        '<p style="margin:0 0 4px"><b>বিষয়:</b> ' + esc_(rec[col_('সহযোগিতার বিষয়') - 1]) + '</p>' +
        '<p style="margin:0 0 4px"><b>নাম:</b> ' + esc_(String(rec[col_('নাম') - 1]).replace(/^\'/, '')) + '</p>' +
        '<p style="margin:0 0 12px"><b>ফোন:</b> ' + esc_(String(rec[col_('ফোন নম্বর') - 1]).replace(/^\'/, '')) + '</p>' +
        '<p style="margin:0 0 12px">পূর্ণ আবেদন সংযুক্ত পিডিএফ ফাইলে আছে' + (attBlob ? '; আবেদনকারীর নিজের লেখা পত্রটিও সংযুক্ত।' : '।') + '</p>' +
        '<p><a href="' + f1.getUrl() + '">ড্রাইভে আবেদনের পিডিএফ খুলুন</a></p></div>';
      MailApp.sendEmail({
        to: CONFIG.MAIL_TO, subject: 'সহযোগিতা চাই: ' + no + ' — ' + String(rec[col_('সহযোগিতার বিষয়') - 1]).substring(0, 60),
        htmlBody: html, body: 'সহযোগিতার নতুন আবেদন ' + no + '। পিডিএফ সংযুক্ত।', name: 'সৃজনশীল তরুণ সংঘ ওয়েবসাইট',
        attachments: attBlob ? [mainBlob, attBlob] : [mainBlob]
      });
      mail = 'পাঠানো হয়েছে';
    } catch (err) {
      console.error('mail failed: ' + (err && err.message));
      mail = 'ব্যর্থ — ' + String(err && err.message || err).substring(0, 120);
    }
    sh.getRange(row, col_('ইমেইল অবস্থা')).setValue(mail);
    return { ok: true, mail: mail === 'পাঠানো হয়েছে' };
  } catch (err) {
    console.error(err && err.stack || err);
    return { ok: false, error: 'drive: ' + String(err && err.message || err).substring(0, 150) };
  } finally {
    lock.releaseLock();
  }
}
function isPdf_(b) { return b.length > 4 && String.fromCharCode(b[0] & 255, b[1] & 255, b[2] & 255, b[3] & 255) === '%PDF'; }

// এডিটরে একবার Run করুন: শিট-ট্যাব তৈরি + শিট/ড্রাইভ/মেইলের অনুমতি
function setup() {
  var sh = sheet_();
  var f = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  console.log('শিট ট্যাব ঠিক আছে: ' + sh.getName() + ' | ড্রাইভ ফোল্ডার: ' + f.getName() + ' | আজকের মেইল কোটা বাকি: ' + MailApp.getRemainingDailyQuota());
}
