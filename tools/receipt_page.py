# -*- coding: utf-8 -*-
"""সাংগঠনিক চাঁদা: "চাঁদা জমাদানের রসিদ" ফরম (A5 আড়াআড়ি; বাঁয়ে সদস্য কপি, ডানে অফিস কপি)।"""
from site_lib import *

FIELDS = [
    # (id, লেবেল, ধরন, প্লেসহোল্ডার)
    ('rMemNo', 'সদস্য নম্বর', 'text', 'যেমন: STS/GM/0001'),
    ('rName', 'সদস্যের নাম', 'text', ''),
    ('rPhone', 'ফোন নম্বর', 'tel', ''),
    ('rPeriod', 'চাঁদার সময়কাল (মাস/বছর)', 'text', 'যেমন: জানুয়ারি–মার্চ ২০২৬'),
    ('rAmount', 'টাকার পরিমাণ (অঙ্কে)', 'text', ''),
    ('rWords', 'কথায়', 'text', ''),
    ('rMethod', 'পরিশোধের মাধ্যম', 'select', ''),
    ('rNote', 'মন্তব্য', 'text', ''),
]
METHODS = ['নগদ', 'বিকাশ', 'নগদ (মোবাইল ব্যাংকিং)', 'রকেট', 'ব্যাংক ট্রান্সফার', 'অন্যান্য']


def copy_block(kind, label):
    """kind: 'member' (ইনপুটসহ) বা 'office' (বাঁয়ের তথ্য প্রতিফলিত)"""
    rows = []
    for fid, lab, typ, ph in FIELDS:
        if kind == 'member':
            if typ == 'select':
                ctl = '<select id="%s">%s</select>' % (fid, ''.join('<option>%s</option>' % esc(m) for m in METHODS))
            else:
                ctl = '<input id="%s" type="%s" autocomplete="off"%s>' % (fid, typ, (' placeholder="%s"' % esc(ph)) if ph else '')
        else:
            ctl = '<span class="mir" data-for="%s"></span>' % fid
        rows.append('<div class="r-row"><label%s>%s:</label><div class="r-val">%s</div></div>' % (
            (' for="%s"' % fid) if kind == 'member' else '', esc(lab), ctl))
    top_no = ('<input id="rNo" type="text" autocomplete="off" aria-label="রসিদ নং">' if kind == 'member' else '<span class="mir" data-for="rNo"></span>')
    top_dt = ('<input id="rDate" type="date" aria-label="তারিখ"><span class="mir print-only" data-for="rDate"></span>' if kind == 'member' else '<span class="mir" data-for="rDate"></span>')
    return '''<section class="rcpt %s" aria-label="%s">
  <header class="r-head">
    <img src="../assets/img/logo-small.webp" width="52" height="60" alt="">
    <div class="r-org"><div class="r-bism">বিসমিল্লাহির রাহমানির রাহীম</div><h2>সৃজনশীল তরুণ সংঘ</h2>
      <div class="r-en">SRIJONSHIL TARUN SANGHA</div>
      <div class="r-addr">নোয়াগাঁও, টুকেরবাজার, ৩৯ নং ওয়ার্ড, সিলেট সিটি কর্পোরেশন, সিলেট।</div></div>
    <div class="r-tag">%s</div>
  </header>
  <div class="r-title"><span>চাঁদা জমাদানের রসিদ</span></div>
  <div class="r-meta"><div><label for="rNo">রসিদ নং:</label> <span class="r-val">%s</span></div><div><label for="rDate">তারিখ:</label> <span class="r-val">%s</span></div></div>
  <div class="r-body">%s</div>
  <footer class="r-sign"><div><span class="r-line"></span>সদস্যের স্বাক্ষর</div><div><span class="r-line"></span>গ্রহণকারীর স্বাক্ষর ও সিল</div></footer>
</section>''' % (kind, esc(label), esc(label), top_no, top_dt, ''.join(rows))


def body():
    return (
        '<p class="lead no-print">সাংগঠনিক চাঁদা জমা নেওয়ার পর সদস্যকে এই রসিদ দেওয়া হয়। নিচের ঘরগুলো পূরণ করুন; পূরণ করলে দুই কপিতেই একই তথ্য আসবে। তারপর "প্রিন্ট করুন" চেপে প্রিন্ট করুন বা "পিডিএফ সংরক্ষণ" দিয়ে সংরক্ষণ করুন।</p>'
        + '<div class="rcpt-tools no-print"><button type="button" class="btn btn-primary" id="rPrint">🖨️ প্রিন্ট করুন / পিডিএফ সংরক্ষণ</button>'
          '<button type="button" class="btn btn-outline" id="rClear">নতুন রসিদ (সব মুছুন)</button></div>'
        + '<div class="rcpt-sheet" id="rSheet">'
        + copy_block('member', 'সদস্য কপি') + '<div class="r-cut" aria-hidden="true"></div>' + copy_block('office', 'অফিস কপি')
        + '</div>'
        + '<p class="small muted no-print">প্রিন্টের সময় কাগজের আকার A5 (আড়াআড়ি) বা A4 বেছে নিন। পিডিএফ করতে প্রিন্ট জানালায় "Save as PDF" বেছে নিন।</p>'
    )
