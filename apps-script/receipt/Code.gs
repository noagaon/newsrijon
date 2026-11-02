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
 * প্রথমবার: এডিটরে setup ফাংশন একবার Run করে অনুমতি (Sheets) দিন।
 * কোড বদলালে: Deploy > Manage deployments > Edit > New version > Deploy।
 *
 * নিরাপত্তা: authorized_() ফাংশনে অনুমোদনকারীর ইমেইল-যাচাই বসানো হবে (পরবর্তী ধাপ)। এখন শুধু হানিপট ও হারসীমা আছে।
 */

var CONFIG = {
  SHEET_ID: '1J0qRZ_vPAQaFHWWQId1wVRtfH57t04-Pvle0xvgAyPI',
  TAB: 'চাঁদা রসিদ',
  MAX_PER_MIN: 30                    // প্রতি মিনিটে সর্বোচ্চ সংরক্ষণ-অনুরোধ (অপব্যবহার ঠেকাতে)
};

var HEADERS = ['রসিদ নম্বর', 'সংরক্ষণের সময়', 'তারিখ', 'সদস্য ধরণ', 'সদস্য নম্বর', 'প্রদানকারীর নাম',
  'চাঁদার ধরণ', 'পরিমাণ (অঙ্কে)', 'পরিমাণ (কথায়)', 'প্রদানের মাধ্যম', 'অনুমোদনকারী'];
var TYPES = ['সাধারণ সদস্য', 'প্রবাসী সদস্য', 'জুনিয়র সদস্য', 'দাতা সদস্য'];

function doGet() { return json_({ ok: true, service: 'srijonshil-receipt', time: new Date().toISOString() }); }

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (req.action === 'receipt_save') return json_(save_(req));
    if (req.action === 'receipt_next') return json_(next_());
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, error: 'server error: ' + String(err && err.message || err).substring(0, 200) });
  }
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// পরে এখানে অনুমোদনকারীর ইমেইল-যাচাই বসবে; এখন সবাইকে অনুমতি
function authorized_(req) { return { ok: true, approver: '' }; }

function sheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID), sh = ss.getSheetByName(CONFIG.TAB);
  if (!sh) sh = ss.insertSheet(CONFIG.TAB);
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
  var auth = authorized_(r);
  if (!auth.ok) return { ok: false, error: 'permission' };

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
      'প্রদানের মাধ্যম': safe_(d.method, 40), 'অনুমোদনকারী': auth.approver || ''
    };
    sh.appendRow(head.map(function (h) { return rec.hasOwnProperty(h) ? rec[h] : ''; }));
    return { ok: true, no: no };
  } finally {
    lock.releaseLock();
  }
}

function next_() {
  var yy = Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yy');
  var seq = Number(PropertiesService.getScriptProperties().getProperty('sf_' + yy) || 0) + 1;
  return { ok: true, no: 'SF-' + yy + '/' + ('0000' + seq).slice(-4) };
}

// এডিটরে একবার Run করুন: ট্যাব তৈরি + শিট-অনুমতি
function setup() {
  var sh = sheet_();
  console.log('ট্যাব প্রস্তুত: ' + sh.getName() + ' (' + SpreadsheetApp.openById(CONFIG.SHEET_ID).getName() + ')');
}
