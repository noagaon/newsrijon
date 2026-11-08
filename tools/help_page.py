# -*- coding: utf-8 -*-
"""সহযোগিতা চাই — মেনু-পেইজের লেখা ও আবেদন ফরম"""
from site_lib import *

INTRO_HOME = 'সৃজনশীল তরুণ সংঘ এর কাছ থেকে আপনি কীরকম সহযোগিতা চান তা আমাদের জানাতে পারেন।'

SUBJECTS = [
    'ক। দরিদ্র ও অসহায় মানুষের আর্থিক সহায়তা', 'খ। অসুস্থ ব্যক্তির চিকিৎসার ব্যবস্থা', 'গ। দরিদ্র শিক্ষার্থীদের শিক্ষা উপকরণ ও বৃত্তি প্রদান',
    'ঘ। অসহায় পরিবারের খাদ্য ও বস্ত্রের ব্যবস্থা', 'ঙ। গৃহহীন মানুষের বাসস্থানের ব্যবস্থা', 'চ। প্রাকৃতিক দুর্যোগে ক্ষতিগ্রস্তদের ত্রাণ সহায়তা',
    'ছ। দরিদ্র মেয়েদের বিবাহে সহযোগিতা', 'জ। পারিবারিক ও সামাজিক বিরোধ নিষ্পত্তিতে মধ্যস্থতা', 'ঝ। আইনি সহায়তা', 'ঞ। রক্তের ব্যবস্থা',
    'ট। মৃত ব্যক্তির দাফন-কাফনে সহযোগিতা', 'ঠ। রাস্তা/সেতু মেরামত', 'ড। ধর্মীয় প্রতিষ্ঠান ও জনসেবামূলক অবকাঠামো উন্নয়ন',
]


def body():
    opts = '<option value="">— বাছাই করুন —</option>' + ''.join('<option>%s</option>' % esc(s) for s in SUBJECTS)
    return (
        p('সৃজনশীল তরুণ সংঘ এর কাছ থেকে আপনি কীরকম সহযোগিতা চান তা আমাদের জানাতে পারেন।', 'lead')
        + p('সংগঠনের অন্যতম প্রধান দায়িত্ব হলো সমাজের মানুষের পাশে দাঁড়ানো এবং মানুষের বিভিন্ন প্রয়োজনে সহযোগিতার হাত বাড়িয়ে দেওয়া। সমাজের একজন মানুষ ব্যক্তিগত, পারিবারিক, আর্থিক, সামাজিক কিংবা মানবিক নানা কারণে সংগঠনের কাছে সহযোগিতা চাইতে পারেন। সংগঠন তার সামর্থ্য, আর্থিক সক্ষমতা, জনবল ও বাস্তব পরিস্থিতি বিবেচনা করে এসব সহযোগিতা সরাসরি প্রদান করতে পারে অথবা সংশ্লিষ্ট ব্যক্তি, প্রতিষ্ঠান ও সংস্থার সঙ্গে যোগাযোগ করে সহযোগিতার ব্যবস্থা করতে পারে।')
        + p('সর্বোপরি, মানুষের বিপদে-আপদে পাশে দাঁড়ানো, অসহায় মানুষের অধিকার রক্ষা করা এবং একটি সুন্দর, মানবিক, বৈষম্যহীন ও শান্তিপূর্ণ সমাজ প্রতিষ্ঠায় ভূমিকা রাখাই আমাদের সংগঠনের মূল লক্ষ্য। আমরা আপনার চাওয়াকে পূরণ করার জন্য সর্বোচ্চ চেষ্টা করবো। আপনাদের সেবায় আমরা নিবেদিত। আপনি চাইলে আপনার পরিচয় গোপন রাখা হবে।')
        + '<div class="callout">' + p('আপনি কীরকম সহযোগিতা চান আমাদের জানাতে নিচের ফরমটি পূরণ করুন:') + '</div>'
        + '''<form id="helpForm" class="form-card" novalidate>
  <h2>সহযোগিতার আবেদন ফরম</h2>
  <div class="grid-form">
    <div class="field span2"><label for="hName">১। নাম <span class="req">*</span></label><input id="hName" type="text" maxlength="100" autocomplete="name"></div>
    <div class="field span2"><label for="hFather">২। পিতার নাম <span class="req">*</span></label><input id="hFather" type="text" maxlength="100" autocomplete="off"></div>
    <div class="field"><label for="hNid">৩। জাতীয় পরিচয়পত্র নম্বর <span class="req">*</span></label><input id="hNid" type="text" inputmode="numeric" maxlength="17" autocomplete="off" placeholder="১০, ১৩ বা ১৭ ডিজিট"></div>
    <div class="field"><label for="hPhone">৪। ফোন নম্বর <span class="req">*</span></label><input id="hPhone" type="tel" inputmode="numeric" maxlength="14" autocomplete="tel" placeholder="01XXXXXXXXX"></div>
    <div class="field span2"><label for="hSubject">৫। সহযোগিতার বিষয় <span class="req">*</span></label><select id="hSubject">%s</select></div>
    <div class="field span2"><label for="hDetails">৬। বিস্তারিত এখানে লিখুন (২০০ শব্দের মধ্যে)</label><textarea id="hDetails" rows="7" placeholder="আপনার প্রয়োজনের কথা এখানে লিখুন..."></textarea><small class="hint" id="hCount">০ / ২০০ শব্দ</small></div>
    <div class="field span2"><label for="hFile">অথবা আপনার লেখা পত্র এখানে পিডিএফ আকারে দিন <small>(সর্বোচ্চ ২ এমবি)</small></label><input id="hFile" type="file" accept="application/pdf,.pdf"><small class="hint" id="hFileInfo"></small></div>
    <div class="field span2"><label class="check"><input id="hHide" type="checkbox"> আমার পরিচয় গোপন রাখুন</label></div>
  </div>
  <input type="text" id="hWebsite" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
  <div id="hStatus" class="status" role="status" aria-live="polite"></div>
  <div class="rcpt-tools"><button class="btn btn-primary" type="submit" id="hSubmit">জমা দিন</button><button class="btn btn-yellow" type="button" id="hDownload" hidden>⬇️ আবেদনের পিডিএফ ডাউনলোড করুন</button><button class="btn btn-outline" type="button" id="hImg" hidden>🖼️ ছবি (JPG) ডাউনলোড</button></div>
</form>''' % opts
    )
