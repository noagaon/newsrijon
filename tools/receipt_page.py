# -*- coding: utf-8 -*-
"""সাংগঠনিক চাঁদা: "চাঁদা আদায় রসিদ" — প্রদত্ত নমুনা ডিজাইন অনুযায়ী (প্রতি কপি ৮ × ৩.৬ ইঞ্চি, দুই কপি: সদস্য কপি ও অফিস কপি)।"""
from site_lib import *

TYPES = ['সাধারণ সদস্য', 'প্রবাসী সদস্য', 'জুনিয়র সদস্য', 'দাতা সদস্য']
KINDS = ['নিবন্ধন ফি', 'মাসিক চাঁদা', 'বার্ষিক চাঁদা', 'বিশেষ চাঁদা', 'অফিস সংস্কার চাঁদা', 'উন্নয়ন চাঁদা', 'মিলাদ মাহফিল চাঁদা',
         'উৎসব উদযাপন চাঁদা', 'বিবাহ শুভেচ্ছা/অভিনন্দন চাঁদা', 'অন্যান্য চাঁদা']
METHODS = ['নগদ প্রদান করুন', 'মোবাইল ব্যাংকিং এ প্রদান করুন', 'ব্যাংক একাউন্টে প্রদান করুন']
COLLECTORS = ['জুনেদ আহমদ', 'কবির আহমদ', 'অন্য']
MOBILE = ['বিকাশ করুন', 'নগদ করুন', 'রকেট করুন', 'অন্যান্য']


def mir(i):
    return '<span class="v mir" data-for="%s"></span>' % i


def box(i):
    return '<span class="rc-box mir" data-for="%s"></span>' % i


def copy(label):
    return '''<div class="rc-wrap"><section class="rcpt" aria-label="%(l)s">
  <div class="rc-head">
    <div class="rc-bism">বিসমিল্লাহির রাহমানির রাহীম</div>
    <img class="rc-logo" src="../assets/img/logo.webp" alt="">
    <div class="rc-title"><b>সৃজনশীল তরুণ সংঘ</b><i>SRIJONSHIL TARUN SANGHA</i></div>
    <div class="rc-addr">নোয়াগাঁও, টুকেরবাজার, ৩৯ নং ওয়ার্ড, সিলেট সিটি কর্পোরেশন, সিলেট। &nbsp;ইমেইল– srijonshil2011@gmail.com</div>
    <div class="rc-slogan"><span>সামাজিক উন্নয়ন ও ন্যায়বিচার, তারুণ্যের অঙ্গীকার</span></div>
    <div class="rc-tag">%(l)s</div>
  </div>
  <div class="rc-pill">চাঁদা আদায় রসিদ</div>
  <div class="rc-boxes">
    <div><label>রসিদ নম্বর:</label>%(no)s</div><div><label>তারিখ:</label>%(dt)s</div>
    <div><label>সদস্য ধরণ:</label>%(ty)s</div><div><label>সদস্য নম্বর:</label>%(mn)s</div>
  </div>
  <div class="rc-rows">
    <div class="rc-r"><div class="rc-f"><label>১। প্রদানকারীর নাম:</label>%(nm)s</div><div class="rc-f"><label>২। চাঁদার ধরণ:</label>%(kd)s</div></div>
    <div class="rc-r"><div class="rc-f"><label>৩। চাঁদার পরিমাণ (অঙ্কে):</label>%(am)s</div><div class="rc-f"><label>৪। চাঁদার পরিমাণ (কথায়):</label>%(wd)s</div></div>
    <div class="rc-r"><div class="rc-f"><label>৫। চাঁদা প্রদানের মাধ্যম:</label>%(me)s</div></div>
  </div>
  <div class="rc-sign"><div>প্রদানকারীর স্বাক্ষর</div><div class="rc-coll">আদায়কারীর স্বাক্ষর<img class="rc-sig" alt="" hidden src="../assets/img/sign-juned.png"><span class="rc-cname mir" data-for="rCollName"></span></div></div>
  <div class="rc-foot">ডাউনলোডের সময়: <span class="r-now"></span></div>
</section></div>''' % {'l': esc(label), 'no': box('rNo'), 'dt': box('rDate'), 'ty': box('rType'), 'mn': box('rMemNo'),
                      'nm': mir('rName'), 'kd': mir('rKind'), 'am': mir('rAmount'), 'wd': mir('rWords'), 'me': mir('rMethod')}


def sel(i, label, opts, blank=True, cls=''):
    o = ('<option value="">— নির্বাচন করুন —</option>' if blank else '') + ''.join('<option>%s</option>' % esc(x) for x in opts)
    return '<div class="field %s"><label for="%s">%s</label><select id="%s">%s</select></div>' % (cls, i, esc(label), i, o)


def inp(i, label, typ='text', ph='', cls='', extra=''):
    return '<div class="field %s"><label for="%s">%s</label><input id="%s" type="%s" autocomplete="off"%s%s></div>' % (
        cls, i, esc(label), i, typ, (' placeholder="%s"' % esc(ph)) if ph else '', extra)


def body():
    form = ('<div class="form-card rc-form no-print"><div class="grid-form">'
            + inp('rNo', 'রসিদ নম্বর', extra=' readonly placeholder="স্বয়ংক্রিয়"') + inp('rDate', 'তারিখ', 'date')
            + sel('rType', 'সদস্য ধরণ', TYPES, cls='span2')
            + '<div class="field span2 sug-wrap"><label for="rName">চাঁদা প্রদানকারীর নাম</label><input id="rName" type="text" autocomplete="off" placeholder="লিখতে শুরু করুন, তালিকা থেকে বাছাই করতে পারবেন"><div class="sug" id="rSug" role="listbox" hidden></div></div>'
            + '<div class="field span2 sug-wrap"><label for="rMemNo">সদস্য নম্বর</label><input id="rMemNo" type="text" autocomplete="off" placeholder="প্রথমে সদস্য ধরণ বাছাই করুন"><div class="sug" id="rSugNo" role="listbox" hidden></div></div>'
            + sel('rKind', 'চাঁদার ধরণ', KINDS)
            + '<div class="field" id="rKindOtherW" hidden><label for="rKindOther">অন্যান্য চাঁদা — কী চাঁদা?</label><input id="rKindOther" type="text" maxlength="40" autocomplete="off"></div>'
            + inp('rAmount', 'চাঁদার পরিমাণ (অঙ্কে)', 'text', 'যেমন: 300', extra=' inputmode="numeric"')
            + inp('rWords', 'চাঁদার পরিমাণ (কথায়)', 'text', 'অঙ্ক লিখলে নিজে বসবে', extra=' readonly')
            + sel('rMethod', 'চাঁদা প্রদানের মাধ্যম', METHODS, cls='span2')
            + '<div class="field" id="rMobW" hidden><label for="rMob">মোবাইল ব্যাংকিং</label><div class="mob-row"><select id="rMob"><option value="">— নির্বাচন করুন —</option>'
              + ''.join('<option>%s</option>' % esc(m) for m in MOBILE) + '</select><input id="rAcc" type="text" inputmode="numeric" maxlength="11" placeholder="অ্যাকাউন্ট নম্বর" autocomplete="off" hidden></div><small class="hint-warn" id="rAccHint" hidden>অ্যাকাউন্ট নম্বর ১১ ডিজিটের হতে হবে।</small></div>'
            + sel('rColl', 'আদায়কারীর নাম', COLLECTORS, cls='span2')
            + '<div class="field span2" id="rCollOtherW" hidden><label for="rCollOther">আদায়কারীর নাম লিখুন</label><input id="rCollOther" type="text" maxlength="40" autocomplete="off"></div>'
            + '</div><div class="rcpt-tools"><button type="button" class="btn btn-outline" id="rPermit">🔑 অনুমতি নিন</button>'
              '<button type="button" class="btn btn-primary" id="rSave" disabled>💾 সংরক্ষণ করুন</button>'
              '<button type="button" class="btn btn-outline" id="rPrint" disabled>⬇️ পিডিএফ ডাউনলোড করুন</button>'
              '<button type="button" class="btn btn-outline" id="rClear">নতুন রসিদ (সব মুছুন)</button></div>'
              '<input type="text" id="rWebsite" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">'
              '<div id="rStatus" class="status" role="status" aria-live="polite"></div>'
              '<p class="rc-wa" id="rWaBox" hidden>অনুমতি দ্রুত পেতে <a id="rWa" href="#" target="_blank" rel="noopener">WhatsApp-এ জানান (01779998997)</a></p></div>')
    return (
        '<p class="lead no-print">সাংগঠনিক চাঁদা জমা দিয়ে রসিদ সংগ্রহ করুন। চাঁদা প্রদানের জন্য সদস্যকে এই রসিদটি পূরণ করতে হবে। এটি পূরণ করে সংরক্ষণ করুন বোতামে চাপ দিন এবং সেটি ডাউনলোড করে রাখুন।</p>'
        + form
        + '<div class="rcpt-sheet" id="rSheet">' + copy('সদস্য কপি') + '<div class="rc-cut" aria-hidden="true"><span>✂ কেটে আলাদা করুন</span></div>' + copy('অফিস কপি') + '</div>'
    )
