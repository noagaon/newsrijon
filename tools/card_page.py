# -*- coding: utf-8 -*-
"""সদস্য আইডি কার্ড ও ফটোকার্ড তৈরির টুল (প্রশাসক/কমিটির জন্য; সবকিছু ব্রাউজারেই হয়, ছবি কোথাও পাঠানো হয় না)"""
from site_lib import *

TYPES = [('general', 'সাধারণ সদস্য'), ('expat', 'প্রবাসী সদস্য'), ('donor', 'দাতা সদস্য'), ('junior', 'জুনিয়র সদস্য')]


def body():
    return (
        p('সদস্যের তথ্য ও ছবি দিয়ে সদস্য আইডি কার্ড (সামনে-পেছনে) এবং স্মারক ফটোকার্ড তৈরি করুন। ছবি আপনার ফোন/কম্পিউটারেই থাকে, কোথাও জমা হয় না।', 'lead')
        + '''<div class="card-tool">
<form class="form-card no-print" id="cardForm" onsubmit="return false">
  <h2>কার্ডের তথ্য</h2>
  <div class="grid-form">
    <div class="field"><label for="cType">সদস্য ধরণ</label><select id="cType"><option value="">— বাছাই করুন —</option>%s</select></div>
    <div class="field"><label for="cMember">সদস্য বাছাই করুন</label><select id="cMember" disabled><option value="">প্রথমে সদস্য ধরণ বাছাই করুন</option></select></div>
    <div class="field span2"><label for="cName">নাম</label><input id="cName" type="text" maxlength="60" autocomplete="off"></div>
    <div class="field"><label for="cNo">সদস্য নম্বর</label><input id="cNo" type="text" maxlength="20" autocomplete="off"></div>
    <div class="field"><label for="cTypeText">সদস্য ধরণ (কার্ডে যা লেখা থাকবে)</label><input id="cTypeText" type="text" maxlength="30" autocomplete="off"></div>
    <div class="field"><label for="cDate">সদস্যপদ লাভের তারিখ</label><input id="cDate" type="text" maxlength="20" autocomplete="off"></div>
    <div class="field"><label for="cPhoto">সদস্যের ছবি</label><input id="cPhoto" type="file" accept="image/*"></div>
    <div class="field"><label for="cZoom">ছবি বড়-ছোট</label><input id="cZoom" type="range" min="1" max="3" step="0.05" value="1"></div>
    <div class="field"><label for="cSize">ছবির ফ্রেম ছোট করুন (১০০%% → ৭০%%)</label><input id="cSize" type="range" min="70" max="100" step="1" value="100"><small>আইডি কার্ড ও ফটোকার্ড দুটোতেই কাজ করে।</small></div>
    <div class="field"><label for="cPx">ছবি ডানে-বামে</label><input id="cPx" type="range" min="-100" max="100" step="1" value="0"></div>
    <div class="field"><label for="cPy">ছবি উপরে-নিচে</label><input id="cPy" type="range" min="-100" max="100" step="1" value="0"></div>
  </div>
  <div id="cStatus" class="status" role="status" aria-live="polite"></div>
  <div class="rcpt-tools">
    <button class="btn btn-primary" type="button" id="cIdPdf">⬇️ আইডি কার্ড (PDF)</button>
    <button class="btn btn-primary" type="button" id="cPhotoPdf">⬇️ ফটোকার্ড (PDF)</button>
  </div>
  <div class="rcpt-tools">
    <button class="btn btn-outline" type="button" id="cFrontPng">আইডি — সামনে (ছবি)</button>
    <button class="btn btn-outline" type="button" id="cBackPng">আইডি — পেছনে (ছবি)</button>
    <button class="btn btn-outline" type="button" id="cPhotoPng">ফটোকার্ড (ছবি)</button>
  </div>
</form>
<div class="card-preview">
  <figure><canvas id="cvFront" width="1012" height="638"></canvas><figcaption>আইডি কার্ড — সামনে</figcaption></figure>
  <figure><canvas id="cvBack" width="1012" height="638"></canvas><figcaption>আইডি কার্ড — পেছনে</figcaption></figure>
  <figure class="portrait"><canvas id="cvPhoto" width="1240" height="1748"></canvas><figcaption>ফটোকার্ড</figcaption></figure>
</div></div>''' % ''.join('<option value="%s">%s</option>' % (k, esc(t)) for k, t in TYPES)
        + '<script>window.SRIJON_CARD=%s;</script>' % (
            '{"address":"%s","phone":"%s","email":"%s","slogan":"%s"}' % (SITE['address_full'], SITE['phone'], SITE['email'], SITE['slogan']))
    )
