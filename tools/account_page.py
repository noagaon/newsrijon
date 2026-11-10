# -*- coding: utf-8 -*-
"""সদস্য অ্যাকাউন্ট পাতা: খোলা / লগইন / পাসওয়ার্ড রিকভারি / ড্যাশবোর্ড"""
from site_lib import *


def _base():
    return '''<div id="acct" class="acct" data-mode="@MODE@">
<noscript><p class="status error">এই পাতা চালাতে জাভাস্ক্রিপ্ট চালু করুন।</p></noscript>

<div id="aStatus" class="status" role="status" aria-live="polite"></div>

<div id="aGuest">
  <div class="tabs-links" id="aGuestTabs" hidden>
    <a href="#" data-g="login">লগইন</a><a href="#" data-g="signup">অ্যাকাউন্ট খুলুন</a><a href="#" data-g="forgot">পাসওয়ার্ড ভুলে গেছেন?</a>
  </div>

  <form class="form-card" id="gLogin" data-pane="login" onsubmit="return false">
    <h2>লগইন</h2>
    <div class="grid-form">
      <div class="field"><label for="lUser">ইউজারনেম</label><input id="lUser" autocomplete="username" maxlength="30"></div>
      <div class="field"><label for="lPass">পাসওয়ার্ড</label><input id="lPass" type="password" autocomplete="current-password" maxlength="100"></div>
    </div>
    <button class="btn btn-primary" id="lGo" type="submit">লগইন করুন</button>
    <p class="forgot-link"><a href="#" data-go="forgot">পাসওয়ার্ড ভুলে গেছেন?</a></p>
  </form>

  <form class="form-card" id="gSignup" data-pane="signup" hidden onsubmit="return false">
    <h2>অ্যাকাউন্ট খুলুন</h2>
    <div id="sStep1">
      <p>অ্যাকাউন্ট শুধু সংগঠনের সদস্যদের জন্য। সদস্য ধরণ ও নম্বর বাছাই করুন, নাম নিজে থেকে বসবে; তারপর নিজের এনআইডি নম্বর দিয়ে যাচাই করুন।</p>
      <div class="grid-form">
        <div class="field"><label for="sType">১। সদস্য ধরণ</label><select id="sType"><option value="">— বাছাই করুন —</option><option value="general">সাধারণ সদস্য</option><option value="expat">প্রবাসী সদস্য</option><option value="donor">দাতা সদস্য</option><option value="junior">জুনিয়র সদস্য</option></select></div>
        <div class="field"><label for="sNo">২। সদস্য নম্বর</label><input id="sNo" list="sNoList" maxlength="30" placeholder="আগে সদস্য ধরণ বাছাই করুন" autocomplete="off" disabled><datalist id="sNoList"></datalist></div>
        <div class="field"><label for="sName">৩। নাম</label><input id="sName" readonly placeholder="সদস্য নম্বর বাছাই করলে নাম নিজে থেকে বসবে"><small>নামটি আপনার না হলে সঠিক সদস্য নম্বর আবার বাছাই করুন।</small></div>
        <div class="field"><label for="sNid">৪। এনআইডি নম্বর</label><input id="sNid" inputmode="numeric" maxlength="34" autocomplete="off" disabled><small>বাংলা অথবা ইংরেজি যেকোন ভাষায় লিখুন।</small></div>
      </div>
      <button class="btn btn-primary" id="sCheck" type="button" disabled>তথ্য যাচাই করুন</button>
    </div>
    <div id="sStep2" hidden>
      <p class="status ok">✅ তথ্য মিলেছে। এবার নিজের ইউজারনেম ও পাসওয়ার্ড দিন। <a href="#" id="sBack">তথ্য বদলাতে চাইলে এখানে চাপুন</a></p>
      <div class="grid-form">
        <div class="field"><label for="sUser">ইউজারনেম (আপনার পছন্দের)</label><input id="sUser" maxlength="30" autocomplete="username"><small>ইংরেজি ছোট হরফ, সংখ্যা, _ বা . — ৩ থেকে ৩০ অক্ষর।</small></div>
        <div class="field"><label for="sPass">৫। পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)</label><input id="sPass" type="password" maxlength="100" autocomplete="new-password"></div>
        <div class="field"><label for="sPass2">পাসওয়ার্ড আবার</label><input id="sPass2" type="password" maxlength="100" autocomplete="new-password"></div>
        <div class="field" id="sEmailWrap" hidden><label for="sEmail">ইমেইল (পাসওয়ার্ড ভুলে গেলে রিকভারির জন্য)</label><input id="sEmail" type="email" maxlength="120" autocomplete="email"></div>
      </div>
      <button class="btn btn-primary" id="sGo2" type="submit">সাবমিট করুন</button>
    </div>
    <div id="sDone" class="congrats" hidden>
      <h3>🎉 অভিনন্দন!</h3>
      <p id="sDoneMsg"></p>
      <button class="btn btn-primary" type="button" id="sToLogin">লগইন করুন</button>
    </div>
  </form>

  <form class="form-card" id="gForgot" data-pane="forgot" hidden onsubmit="return false">
    <h2>পাসওয়ার্ড রিকভারি</h2>
    <p><a href="#" data-go="login">← লগইনে ফিরুন</a></p>
    <div id="fStep1">
      <p>ইউজারনেম দিন — অ্যাকাউন্টের রিকভারি ইমেইলে একটি কোড যাবে।</p>
      <div class="field"><label for="fUser">ইউজারনেম</label><input id="fUser" maxlength="30" autocomplete="username"></div>
      <button class="btn btn-primary" id="fGo1" type="submit">কোড পাঠান</button>
    </div>
    <div id="fStep2" hidden>
      <p id="fInfo"></p>
      <div class="grid-form">
        <div class="field"><label for="fCode">ইমেইলে পাওয়া কোড</label><input id="fCode" inputmode="numeric" maxlength="8" autocomplete="one-time-code"></div>
        <div class="field"><label for="fPass">নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)</label><input id="fPass" type="password" maxlength="100" autocomplete="new-password"></div>
        <div class="field"><label for="fPass2">নতুন পাসওয়ার্ড আবার</label><input id="fPass2" type="password" maxlength="100" autocomplete="new-password"></div>
      </div>
      <button class="btn btn-primary" id="fGo2" type="submit">পাসওয়ার্ড বদলান</button>
    </div>
  </form>
</div>

<div id="aUser" hidden>
  <div class="acct-head"><div><strong id="uName"></strong><br><small id="uSub"></small></div><button class="btn btn-outline" id="uOut" type="button">লগআউট</button></div>
  <div class="tabs-links" id="aTabs">
    <a href="#" data-t="profile">প্রোফাইল</a><a href="#" data-t="idcard">আইডি কার্ড</a><a href="#" data-t="photocard">ফটোকার্ড</a><a href="#" data-t="receipts">আমার রসিদ</a><a href="#" data-t="fund">চাঁদার হিসাব</a><a href="#" data-t="feed">নিউজফিড</a>
  </div>

  <section data-tab="profile">
    <div class="form-card" id="photoBox">
      <h2>প্রোফাইল ছবি</h2>
      <div class="photo-up"><img id="aPhotoImg" alt="আপনার ছবি" width="120" height="150" hidden>
        <div><p class="lbl"><strong>ছবি পরিবর্তন করুন</strong></p>
        <input id="aPhotoFile" type="file" accept="image/jpeg,image/png,image/webp"> <button class="btn btn-primary" type="button" id="aPhotoGo" disabled>ছবি আপলোড করুন</button></div></div>
    </div>
    <div id="pBody" class="acct-profile"><p>লোড হচ্ছে…</p></div>
  </section>

  <div data-cardctl hidden class="form-card no-print">
    <h2>কার্ডের ছবি ঠিক করুন</h2>
    <div class="grid-form">
      <div class="field"><label for="cPhoto">ছবি পরিবর্তন করুন (ঐচ্ছিক)</label><input id="cPhoto" type="file" accept="image/*"></div>
      <div class="field"><label for="cZoom">ছবি বড়-ছোট</label><input id="cZoom" type="range" min="0.4" max="3" step="0.05" value="1"></div>
      <div class="field"><label for="cPx">ডানে-বামে</label><input id="cPx" type="range" min="-100" max="100" step="1" value="0"></div>
      <div class="field"><label for="cPy">উপরে-নিচে</label><input id="cPy" type="range" min="-100" max="100" step="1" value="0"></div>
    </div>
    <input id="cName" type="hidden"><input id="cNo" type="hidden"><input id="cTypeText" type="hidden"><input id="cDate" type="hidden"><input id="cBlood" type="hidden">
    <div id="cStatus" class="status" role="status" aria-live="polite"></div>
  </div>

  <section data-tab="idcard" hidden>
    <div class="card-tool"><div class="card-preview">
      <figure><canvas id="cvFront" width="827" height="1181"></canvas><figcaption>সামনে</figcaption></figure>
      <figure><canvas id="cvBack" width="827" height="1181"></canvas><figcaption>পেছনে</figcaption></figure>
    </div></div>
    <div class="sig-up" data-sigctl>
      <div class="field"><label for="cSigM">সদস্যের স্বাক্ষর (সাদা কাগজে সই করে ছবি তুলে দিন)</label><input id="cSigM" type="file" accept="image/*"><button type="button" class="btn btn-outline sig-clear" data-clear="m" hidden>মুছুন</button></div>
      <div class="field"><label for="cSigA">কর্তৃপক্ষের স্বাক্ষর</label><input id="cSigA" type="file" accept="image/*"><button type="button" class="btn btn-outline sig-clear" data-clear="a" hidden>মুছুন</button></div>
      <p class="muted">স্বাক্ষর আইডি কার্ডের পেছনে ছাপা হবে; ছবির সাদা পটভূমি নিজে থেকে বাদ যায়। স্বাক্ষর এই ডিভাইসেই সংরক্ষিত থাকে।</p>
    </div>
    <div class="rcpt-tools"><button class="btn btn-primary" type="button" id="cIdPdf">⬇️ আইডি কার্ড (PDF)</button>
    <button class="btn btn-outline" type="button" id="cFrontPng">সামনে (ছবি)</button><button class="btn btn-outline" type="button" id="cBackPng">পেছনে (ছবি)</button></div>
    <p class="muted saved-line" id="savedId">পিডিএফ ডাউনলোড করলে কার্ডটি আপনার অ্যাকাউন্টে নিজে থেকে সংরক্ষিত হয়।</p>
  </section>
  <section data-tab="photocard" hidden>
    <div class="card-tool"><div class="card-preview"><figure class="portrait"><canvas id="cvPhoto" width="1240" height="1748"></canvas><figcaption>ফটোকার্ড</figcaption></figure></div></div>
    <div class="rcpt-tools"><button class="btn btn-primary" type="button" id="cPhotoPdf">⬇️ ফটোকার্ড (PDF)</button><button class="btn btn-outline" type="button" id="cPhotoPng">ফটোকার্ড (ছবি)</button></div>
    <p class="muted saved-line" id="savedPhoto">পিডিএফ ডাউনলোড করলে কার্ডটি আপনার অ্যাকাউন্টে নিজে থেকে সংরক্ষিত হয়।</p>
  </section>

  <section data-tab="receipts" hidden><div id="rBody"><p>লোড হচ্ছে…</p></div></section>
  <section data-tab="fund" hidden><div id="fBody"><p>লোড হচ্ছে…</p></div></section>
  <section data-tab="feed" hidden>
    <div class="feed-new"><label for="feedText">আপনার লেখা</label><textarea id="feedText" rows="4" maxlength="1000" placeholder="সদস্যদের সাথে কিছু শেয়ার করুন…"></textarea>
      <div class="feed-act"><small id="feedCnt">০/১০০০</small><button class="btn btn-primary" type="button" id="feedGo">পোস্ট করুন</button></div></div>
    <div id="feedList"><p>লোড হচ্ছে…</p></div>
    <p class="center"><button class="btn btn-outline" type="button" id="feedMore" hidden>আরও দেখুন</button></p>
  </section>
</div>
</div>
<script>window.SRIJON_CARD=%s;</script>''' % (
        '{"address":"%s","phone":"%s","email":"%s","slogan":"%s"}' % (SITE['address_full'], SITE['phone'], SITE['email'], SITE['slogan']))



TOP = {
    'signup': '<a class="btn btn-outline" href="mysrijon-login.html">লগইন করুন</a>',
    'login': '<a class="btn btn-outline" href="mysrijon.html">ব্যাক করুন</a>',
    'account': '<a class="btn btn-outline" href="mysrijon.html">ব্যাক করুন</a>',
}


def intro():
    """আমার সৃজন মূল পাতা (শুধু পরিচিতি ও দুটি বোতাম)"""
    return '''<div class="mys-intro">
  <p class="btn-row"><a class="btn btn-primary" href="mysrijon-signup.html">অ্যাকাউন্ট খুলুন</a><a class="btn btn-outline" href="mysrijon-login.html">লগইন করুন</a></p>
  <h2>অংশগ্রহণ থেকে পরিবর্তনের পথে</h2>
  <p>একটি সংগঠনের শক্তি শুধু তার নিয়ম-কাঠামো বা কার্যক্রমে নয়; বরং তার সবচেয়ে বড় শক্তি হলো তার সদস্যরা। একজন সদস্য হওয়া মানে শুধু একটি তালিকায় নিজের নাম যুক্ত করা নয়—এটি একটি মূল্যবোধ, দায়িত্ব ও ইতিবাচক পরিবর্তনের সঙ্গে নিজেকে যুক্ত করার অঙ্গীকার।</p>
  <p>আপনি যদি মনে করেন, আপনার সময়, মেধা, অভিজ্ঞতা ও সামর্থ্য কোনো ভালো কাজে অবদান রাখতে পারে, তাহলে সদস্য হওয়ার আবেদন হতে পারে সেই পথচলার প্রথম ধাপ।</p>
  <p class="muted">সংগঠনের সদস্যরাই অ্যাকাউন্ট খুলতে পারবেন। অ্যাকাউন্টে নিজের প্রোফাইল, আইডি কার্ড, ফটোকার্ড, রসিদ ও চাঁদার হিসাব পাবেন।</p>
</div>
<script>(function(){var m={'#signup':'mysrijon-signup.html','#login':'mysrijon-login.html','#forgot':'mysrijon-login.html#forgot'}[location.hash];if(m)location.replace(m);})();</script>'''


def body(mode='account'):
    """mode: signup | login | account"""
    h = _base().replace('@MODE@', mode)
    if mode == 'account':
        h = h.replace('<div id="aGuest">', '<div id="aGuest" hidden>', 1)
    return '<div class="acct-top">%s</div>' % TOP[mode] + h
