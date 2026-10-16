# -*- coding: utf-8 -*-
"""১২. সদস্য আবেদন পেইজ (ওয়েব ফরমসহ)"""
from site_lib import *

FEES = [('সাধারণ সদস্য', '১,০০০'), ('প্রবাসী সদস্য', '১,২০০'), ('দাতা সদস্য', '২,০০০'), ('জুনিয়র সদস্য', '১০০')]

EDUCATION = ['প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ', 'পঞ্চম', 'পিইসি', 'ষষ্ঠ', 'সপ্তম', 'অষ্টম', 'জেএসসি', 'নবম', 'এসএসসি',
             'একাদশ', 'এইচএসসি', 'ডিপ্লোমা', 'ডিগ্রি পাস', 'অনার্স', 'মাস্টার্স']
PROFESSIONS = ['ছাত্র', 'বেকার', 'ব্যবসায়ী', 'দোকান/ সুপারশপ কর্মচারী', 'শিক্ষক', 'আইনজীবী', 'আইনজীবীর সহকারী', 'কৃষক',
               'গাড়ি চালক', 'সাংবাদিক', 'বাবুর্চি', 'চিকিৎসক', 'নার্স', 'ফ্রিল্যান্সার', 'শ্রমিক/ লেবার', 'দোকানদার', 'দর্জি',
               'অন্যান্য']
BLOOD = ['এ পজিটিভ (A+)', 'এ নেগেটিভ (A-)', 'বি পজিটিভ (B+)', 'বি নেগেটিভ (B-)', 'এবি পজিটিভ (AB+)', 'এবি নেগেটিভ (AB-)',
         'ও পজিটিভ (O+)', 'ও নেগেটিভ (O-)']
RELIGION = ['ইসলাম', 'হিন্দু', 'বৌদ্ধ', 'খ্রিষ্টান']


def opts(items, placeholder='— নির্বাচন করুন —'):
    return '<option value="">%s</option>' % esc(placeholder) + ''.join('<option>%s</option>' % esc(i) for i in items)


PARA = ['দক্ষিণপাড়া', 'উত্তরপাড়া', 'পূর্বপাড়া', 'পশ্চিমপাড়া', 'মাঝপাড়া', 'গাঙপাড়া']


def pick(prefix, key, label, options, required=True, other_hint='অন্য হলে এখানে লিখুন'):
    """ড্রপডাউন + 'অন্য' নির্বাচন করলে লেখার বক্স"""
    o = ''.join('<option>%s</option>' % esc(x) for x in options)
    req = ' <span class="req">*</span>' if required else ''
    return ('<div class="field"><label for="%(p)s%(k)s">%(l)s%(r)s</label>'
            '<select id="%(p)s%(k)s" name="%(p)s%(k)s"%(rq)s><option value="">— নির্বাচন করুন —</option>%(o)s<option value="__other">অন্য</option></select>'
            '<input id="%(p)s%(k)sOther" name="%(p)s%(k)sOther" type="text" maxlength="80" placeholder="%(h)s" hidden></div>') % {
        'p': prefix, 'k': key, 'l': esc(label), 'r': req, 'rq': ' required' if required else '', 'o': o, 'h': esc(other_hint)}


def addr_block(prefix, title):
    """স্থায়ী/বর্তমান ঠিকানার ফিল্ডসমূহ"""
    return '''<fieldset class="addr" id="%(p)sBlock">
  <legend>%(t)s</legend>
  <div class="row-2">
    <div class="field"><label for="%(p)sDiv">বিভাগ <span class="req">*</span></label><select id="%(p)sDiv" name="%(p)sDiv" required><option value="">— নির্বাচন করুন —</option></select></div>
    <div class="field"><label for="%(p)sDist">জেলা <span class="req">*</span></label><select id="%(p)sDist" name="%(p)sDist" required disabled><option value="">— আগে বিভাগ নির্বাচন করুন —</option></select></div>
  </div>
  <div class="row-2 addr-loc" id="%(p)sLoc">
    <div class="field loc-upa"><label for="%(p)sUpa">উপজেলা/ সিটি কর্পোরেশন <span class="req">*</span></label><select id="%(p)sUpa" name="%(p)sUpa" required disabled><option value="">— আগে জেলা নির্বাচন করুন —</option></select></div>
    <div class="field loc-union" id="%(p)sUnionWrap" hidden><label for="%(p)sUnion">ইউনিয়ন/পৌরসভা <span class="req">*</span></label><input id="%(p)sUnion" name="%(p)sUnion" type="text" maxlength="80"></div>
    <div class="field loc-ward" id="%(p)sWardWrap" hidden><label for="%(p)sWard">ওয়ার্ড <span class="req">*</span></label><select id="%(p)sWard" name="%(p)sWard"><option value="">— নির্বাচন করুন —</option></select><input id="%(p)sWardText" name="%(p)sWardText" type="text" maxlength="40" placeholder="ওয়ার্ড নম্বর লিখুন" hidden></div>
    <div class="field loc-thana"><label for="%(p)sThana">থানা <span class="req">*</span></label><select id="%(p)sThana" name="%(p)sThana" required disabled><option value="">— আগে জেলা নির্বাচন করুন —</option></select></div>
  </div>
  <div class="row-3">
    %(po)s
    %(vil)s
    %(para)s
  </div>
</fieldset>''' % {'p': prefix, 't': title,
                  'po': pick(prefix, 'PO', 'পোস্ট অফিস', ['টুকেরবাজার, সিলেট-৩১০০']),
                  'vil': pick(prefix, 'Village', 'গ্রাম', ['নোয়াগাঁও']),
                  'para': pick(prefix, 'Para', 'পাড়া', PARA, required=False)}


def membership_body():
    fee_cards = ''.join('<div class="fee"><span>%s</span><strong>%s টাকা</strong></div>' % (esc(a), esc(b)) for a, b in FEES)
    tips = ul([
        'সংগঠনের লক্ষ্য, উদ্দেশ্য ও নীতিমালা ভালোভাবে জানুন।',
        'নিজের আগ্রহ, দক্ষতা ও সময়ের সঙ্গে সামঞ্জস্য রেখে দায়িত্ব নেওয়ার মানসিকতা তৈরি করুন।',
        'আবেদনপত্রে সঠিক ও প্রয়োজনীয় তথ্য প্রদান করুন।',
        'সদস্য হওয়ার পর নিয়মিত অংশগ্রহণ ও দায়িত্বশীলতার মাধ্যমে নিজের ভূমিকা পালন করুন।',
        'মতের ভিন্নতাকে সম্মান করে দলগতভাবে কাজ করার মানসিকতা রাখুন।'])
    intro = (
        '<h2 class="sub-title">অংশগ্রহণ থেকে পরিবর্তনের পথে</h2>'
        + p('একটি সংগঠনের শক্তি শুধু তার নিয়ম-কাঠামো বা কার্যক্রমে নয়; বরং তার সবচেয়ে বড় শক্তি হলো তার সদস্যরা। একজন সদস্য হওয়া মানে শুধু একটি তালিকায় নিজের নাম যুক্ত করা নয়—এটি একটি মূল্যবোধ, দায়িত্ব ও ইতিবাচক পরিবর্তনের সঙ্গে নিজেকে যুক্ত করার অঙ্গীকার।', 'lead')
        + p('আপনি যদি মনে করেন, আপনার সময়, মেধা, অভিজ্ঞতা ও সামর্থ্য কোনো ভালো কাজে অবদান রাখতে পারে, তাহলে সদস্য হওয়ার আবেদন হতে পারে সেই পথচলার প্রথম ধাপ।')
        + card('সদস্য হওয়ার আগে কিছু বিষয় মনে রাখা জরুরি—', tips, icon='📝')
        + p('আপনার অংশগ্রহণ হয়তো আজ ছোট মনে হতে পারে, কিন্তু সম্মিলিতভাবে সেই ছোট ছোট অবদানই গড়ে তুলতে পারে একটি শক্তিশালী, মানবিক ও কার্যকর সংগঠন।')
        + '<div class="callout">' + p('তাই শুধু সদস্য হওয়ার জন্য নয়—একটি সুন্দর উদ্দেশ্যের অংশ হওয়ার জন্য আবেদন করুন। আপনার সততা, সময় ও সামর্থ্যই হোক আগামীর ইতিবাচক পরিবর্তনের শক্তি।') + '</div>'
        + '<h2 class="sub-title" id="apply">আবেদন ফরম</h2>'
        + p('সদস্য হতে নির্ধারিত আবেদন ফরম পূরণ করুন।')
        + '<h3>সদস্যপদের আবেদন ফি</h3><div class="fees">%s</div>' % fee_cards
    )

    form = '''
<form id="applyForm" class="form-card apply" novalidate autocomplete="on">
  <div class="form-head">
    <img src="../assets/img/logo-small.webp" width="64" height="74" alt="">
    <div>
      <p class="bismillah">বিসমিল্লাহির রাহমানির রাহীম</p>
      <h2>সৃজনশীল তরুণ সংঘ</h2>
      <p class="en">SRIJONSHIL TARUN SANGHA</p>
      <p class="small">নোয়াগাঁও, টুকের বাজার, ৩৯ নং ওয়ার্ড, সিলেট সিটি কর্পোরেশন, সিলেট।</p>
      <p class="small"><strong>স্থাপিত: ২০১১ ই.</strong></p>
    </div>
  </div>
  <div class="pill">সদস্য নিবন্ধন ফরম</div>

  <p class="warn" role="note">সতর্কতা: অনুগ্রহ করে ছবির ব্যাকগ্রাউন্ড একক কালারে রাখবেন।</p>

  <div class="row-2">
    <div class="field"><label for="formNo">ফরম নম্বর</label><input id="formNo" type="text" readonly value="স্বয়ংক্রিয়" aria-describedby="formNoHelp"><small id="formNoHelp">জমা দেওয়ার সময় স্বয়ংক্রিয়ভাবে তৈরি হবে</small></div>
    <div class="field"><label for="memberNo">সদস্য নম্বর</label><input id="memberNo" type="text" readonly placeholder="অফিস কর্তৃক পূরণীয়" tabindex="-1"></div>
  </div>

  <div class="row-3">
    <div class="field"><label for="memberType">১। সদস্য ধরণ <span class="req">*</span></label>
      <select id="memberType" name="memberType" required>
        <option value="">— নির্বাচন করুন —</option>
        <option value="general">(ক) সাধারণ সদস্য</option>
        <option value="expat">(খ) প্রবাসী সদস্য</option>
        <option value="junior">(গ) জুনিয়র সদস্য</option>
        <option value="donor">(ঘ) দাতা সদস্য</option>
      </select></div>
    <div class="field"><label for="reference">রেফারেন্স <span class="req">*</span></label>
      <select id="reference" name="reference" required>
        <option value="none">কোন রেফারেন্স নেই</option>
        <option value="junior">জুনিয়র সদস্য ছিলাম</option>
        <option value="general">সাধারণ সদস্য ছিলাম</option>
        <option value="expat">প্রবাসী সদস্য ছিলাম</option>
        <option value="donor">দাতা সদস্য ছিলাম</option>
      </select></div>
    <div class="field"><label for="fee">২। নিবন্ধন ফি</label><input id="fee" type="text" readonly placeholder="সদস্য ধরণ নির্বাচন করুন"><small id="feeNote" hidden>রেফারেন্সের জন্য ২০%% ছাড় প্রযোজ্য</small></div>
  </div>

  <div class="field"><label for="nameBn">৩। নাম (বাংলায়) এনআইডি অনুযায়ী <span class="req">*</span></label><input id="nameBn" name="nameBn" type="text" maxlength="100" required autocomplete="name"></div>
  <div class="field"><label for="nameEn">৪। নাম (ইংরেজিতে) এনআইডি অনুযায়ী <span class="req">*</span></label><input id="nameEn" name="nameEn" type="text" maxlength="100" required style="text-transform:uppercase"></div>
  <div class="row-2">
    <div class="field"><label for="father">৫। পিতার নাম <span class="req">*</span></label><input id="father" name="father" type="text" maxlength="100" required></div>
    <div class="field"><label for="mother">৬। মাতার নাম <span class="req">*</span></label><input id="mother" name="mother" type="text" maxlength="100" required></div>
  </div>
  <div class="row-3">
    <div class="field"><label for="dob">৭। জন্ম তারিখ <span class="req">*</span></label><input id="dob" name="dob" type="date" required></div>
    <div class="field"><label for="gender">৮। লিঙ্গ <span class="req">*</span></label><select id="gender" name="gender" required>%(gender)s</select></div>
    <div class="field"><label for="blood">৯। রক্ত গ্রুপ</label><select id="blood" name="blood">%(blood)s</select></div>
  </div>
  <div class="row-2">
    <div class="field"><label for="education">১০। শিক্ষাগত যোগ্যতা (সর্বশেষ পাশকৃত শ্রেণি) <span class="req">*</span></label>
      <select id="education" name="education" required>%(edu)s<option value="__other">অন্য</option></select>
      <input id="educationOther" name="educationOther" type="text" maxlength="80" placeholder="অন্য হলে এখানে লিখুন" hidden></div>
    <div class="field"><label for="profession">১১। পেশা <span class="req">*</span></label>
      <select id="profession" name="profession" required>%(prof)s<option value="__other">অন্য</option></select>
      <input id="professionOther" name="professionOther" type="text" maxlength="80" placeholder="অন্য হলে এখানে লিখুন" hidden></div>
  </div>
  <div class="row-2">
    <div class="field"><label for="religion">১২। ধর্ম <span class="req">*</span></label><select id="religion" name="religion" required>%(rel)s<option value="__other">অন্য</option></select>
      <input id="religionOther" name="religionOther" type="text" maxlength="40" placeholder="অন্য হলে এখানে লিখুন" hidden></div>
    <div class="field"><label for="nid">১৩। জাতীয় পরিচয় পত্র (এনআইডি) নম্বর <span class="req" id="nidReq">*</span></label><input id="nid" name="nid" type="text" inputmode="numeric" maxlength="20"><small id="nidHelp">সাধারণ সদস্যের জন্য বাধ্যতামূলক</small></div>
  </div>
  <div class="field" id="birthRegWrap" hidden><label for="birthReg">জন্মনিবন্ধন সনদ নম্বর</label><input id="birthReg" name="birthReg" type="text" inputmode="numeric" maxlength="25"><small>জুনিয়র সদস্যের জন্য এনআইডি অথবা জন্মনিবন্ধন সনদ নম্বর — যেকোনো একটি দেওয়া বাধ্যতামূলক</small></div>
  <div class="row-3">
    <div class="field"><label for="phone">১৪। ফোন নম্বর</label><input id="phone" name="phone" type="tel" inputmode="tel" maxlength="20" autocomplete="tel"></div>
    <div class="field"><label for="whatsapp">১৫। ওয়াটসঅ্যাপ নম্বর</label><input id="whatsapp" name="whatsapp" type="tel" inputmode="tel" maxlength="20"></div>
    <div class="field"><label for="email">১৬। ইমেইল ঠিকানা</label><input id="email" name="email" type="email" maxlength="120" autocomplete="email"></div>
  </div>

  <h3 class="addr-title">১৭। স্থায়ী ঠিকানা</h3>
  %(perm)s

  <h3 class="addr-title">১৮। বর্তমান ঠিকানা</h3>
  <div class="radio-row" role="radiogroup" aria-label="বর্তমান ঠিকানা">
    <label class="radio"><input type="radio" name="addrSame" value="same" checked> স্থায়ী ও বর্তমান ঠিকানা একই</label>
    <label class="radio"><input type="radio" name="addrSame" value="diff"> বর্তমান ঠিকানা ভিন্ন</label>
  </div>
  <div id="curWrap" hidden>%(cur)s</div>

  <div class="row-2">
    <div class="field"><label for="countryType">১৯। দেশের নাম <span class="req">*</span></label><select id="countryType" name="countryType" required><option value="">— নির্বাচন করুন —</option><option value="bd">বাংলাদেশ</option><option value="abroad">প্রবাসী</option></select></div>
    <div class="field" id="countryWrap" hidden><label for="country">প্রবাসের দেশ <span class="req">*</span></label><select id="country" name="country"><option value="">— নির্বাচন করুন —</option></select></div>
  </div>

  <div class="field"><label for="photo">২০। ছবি দিন <span class="req">*</span> <small>(JPG/PNG)</small></label>
    <input id="photo" name="photo" type="file" accept="image/*" required>
    <div class="photo-preview" id="photoPreview" hidden><img alt="আপনার ছবির প্রিভিউ" id="photoImg"><span id="photoInfo"></span></div></div>

  <div class="pledge">
    <h3>অঙ্গীকারনামা</h3>
    <p>আমি <span class="pledge-blank" aria-hidden="true"></span> এই মর্মে স্বেচ্ছায় ও স্বজ্ঞানে স্বীকার করছি যে, আমার দেওয়া উপরোল্লিখিত তথ্যসমূহ সত্য ও নির্ভুল। আমি অঙ্গীকার করছি যে, আমি "সৃজনশীল তরুণ সংঘ" -এর গঠনতন্ত্র ও কার্যকরী কমিটির সকল সিদ্ধান্ত মেনে চলবো, সংগঠন ও গঠনতন্ত্র বহির্ভূত কোন কাজ করবো না। গঠনতন্ত্র ও সংগঠন বিরোধী কোন কাজে লিপ্ত থাকলে বা প্রমাণিত হলে কর্তৃপক্ষ আমার বিরুদ্ধে যে ব্যবস্থা গ্রহণ করবেন তা মেনে নিতে বাধ্য থাকবো, এতে আমার কোন আপত্তি থাকবে না।</p>
    <label class="check"><input type="checkbox" id="agree" name="agree" required> আমি উপরের অঙ্গীকারনামার সাথে একমত <span class="req">*</span></label>
  </div>

  <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
  <div id="applyStatus" class="status" role="status" aria-live="polite"></div>
  <button class="btn btn-primary btn-lg" type="submit" id="applySubmit">জমা দিন</button>
  <p class="small muted">জমা দিলে আপনার আবেদনের একটি পিডিএফ কপি তৈরি হয়ে আপনার ডিভাইসে ডাউনলোড হবে এবং সংগঠনের কাছে সংরক্ষিত হবে।</p>
</form>

<section class="success" id="applySuccess" hidden>
  <div class="success-ico" aria-hidden="true">✅</div>
  <h2>আপনার আবেদন সফলভাবে জমা হয়েছে</h2>
  <p>ফরম নম্বর: <strong id="successFormNo"></strong></p>
  <p>আপনার আবেদন ফরমের পিডিএফ কপি স্বয়ংক্রিয়ভাবে ডাউনলোড না হলে নিচের বাটনে চাপ দিন। ফরমটি প্রিন্ট করে স্বাক্ষর করে সংগঠনের কার্যালয়ে জমা দিন।</p>
  <div class="btn-row"><a class="btn btn-primary" id="downloadPdf" href="#" download>পিডিএফ ডাউনলোড করুন</a><a class="btn btn-outline" href="../index.html">হোম পেইজে ফিরুন</a></div>
</section>
''' % {
        'gender': opts(['পুরুষ', 'মহিলা']),
        'blood': opts(BLOOD),
        'edu': opts(EDUCATION),
        'prof': opts(PROFESSIONS),
        'rel': opts(RELIGION),
        'perm': addr_block('perm', 'স্থায়ী ঠিকানা'),
        'cur': addr_block('cur', 'বর্তমান ঠিকানা'),
    }
    return intro + '<div id="formArea">' + form + '</div>'


FORM_SCRIPTS = '''<script src="../config.js"></script>
<script src="../assets/js/pdf-form.js" defer></script>
<script src="../assets/js/apply.js" defer></script>'''
