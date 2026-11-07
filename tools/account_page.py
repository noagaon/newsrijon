# -*- coding: utf-8 -*-
"""সদস্য অ্যাকাউন্ট পাতা: খোলা / লগইন / পাসওয়ার্ড রিকভারি / ড্যাশবোর্ড"""
from site_lib import *


def body():
    return '''<div id="acct" class="acct">
<noscript><p class="status error">এই পাতা চালাতে জাভাস্ক্রিপ্ট চালু করুন।</p></noscript>
<p class="lead">সংগঠনের সদস্যরাই অ্যাকাউন্ট খুলতে পারবেন। অ্যাকাউন্টে নিজের প্রোফাইল, আইডি কার্ড, ফটোকার্ড, রসিদ ও চাঁদার হিসাব পাবেন।</p>
<div id="aStatus" class="status" role="status" aria-live="polite"></div>

<div id="aGuest">
  <div class="tabs-links" id="aGuestTabs">
    <a href="#" data-g="login">লগইন</a><a href="#" data-g="signup">অ্যাকাউন্ট খুলুন</a><a href="#" data-g="forgot">পাসওয়ার্ড ভুলে গেছেন?</a>
  </div>

  <form class="form-card" id="gLogin" data-pane="login" onsubmit="return false">
    <h2>লগইন</h2>
    <div class="grid-form">
      <div class="field"><label for="lUser">ইউজারনেম</label><input id="lUser" autocomplete="username" maxlength="30"></div>
      <div class="field"><label for="lPass">পাসওয়ার্ড</label><input id="lPass" type="password" autocomplete="current-password" maxlength="100"></div>
    </div>
    <button class="btn btn-primary" id="lGo" type="submit">লগইন করুন</button>
  </form>

  <form class="form-card" id="gSignup" data-pane="signup" hidden onsubmit="return false">
    <h2>অ্যাকাউন্ট খুলুন</h2>
    <div id="sStep1">
      <p>অ্যাকাউন্ট শুধু সংগঠনের সদস্যদের জন্য। সদস্য ধরণ ও নম্বর বাছাই করুন, নাম নিজে থেকে বসবে; তারপর নিজের এনআইডি নম্বর দিয়ে যাচাই করুন।</p>
      <div class="grid-form">
        <div class="field"><label for="sType">১। সদস্য ধরণ</label><select id="sType"><option value="">— বাছাই করুন —</option><option value="general">সাধারণ সদস্য</option><option value="expat">প্রবাসী সদস্য</option><option value="donor">দাতা সদস্য</option><option value="junior">জুনিয়র সদস্য</option></select></div>
        <div class="field"><label for="sNo">২। সদস্য নম্বর</label><input id="sNo" list="sNoList" maxlength="30" placeholder="আগে সদস্য ধরণ বাছাই করুন" autocomplete="off" disabled><datalist id="sNoList"></datalist><small>লিখতে শুরু করলে নম্বর সাজেস্ট করবে — তালিকা থেকে বাছাই করুন।</small></div>
        <div class="field"><label for="sName">৩। নাম</label><input id="sName" readonly placeholder="সদস্য নম্বর বাছাই করলে নাম নিজে থেকে বসবে"><small>নামটি আপনার না হলে সঠিক সদস্য নম্বর আবার বাছাই করুন।</small></div>
        <div class="field"><label for="sNid">৪। এনআইডি নম্বর</label><input id="sNid" inputmode="numeric" maxlength="20" autocomplete="off" disabled></div>
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
    <a href="#" data-t="profile">প্রোফাইল</a><a href="#" data-t="idcard">আইডি কার্ড</a><a href="#" data-t="photocard">ফটোকার্ড</a><a href="#" data-t="receipts">আমার রসিদ</a><a href="#" data-t="fund">চাঁদার হিসাব</a>
  </div>

  <section data-tab="profile">
    <div class="form-card" id="photoBox">
      <h2>প্রোফাইল ছবি</h2>
      <div class="photo-up"><img id="aPhotoImg" alt="আপনার ছবি" width="120" height="150" hidden>
        <div><p>নতুন ছবি দিলে সেটি অ্যাকাউন্টে সংরক্ষিত হবে এবং আইডি কার্ড ও ফটোকার্ডে ব্যবহার হবে। পরিষ্কার, সামনে থেকে তোলা ছবি দিন (ছবি নিজে থেকে ছোট করে পাঠানো হয়)।</p>
        <input id="aPhotoFile" type="file" accept="image/jpeg,image/png,image/webp"> <button class="btn btn-primary" type="button" id="aPhotoGo" disabled>ছবি আপলোড করুন</button></div></div>
    </div>
    <div id="pBody" class="acct-profile"><p>লোড হচ্ছে…</p></div>
  </section>

  <div data-cardctl hidden class="form-card no-print">
    <h2>কার্ডের ছবি ঠিক করুন</h2>
    <div class="grid-form">
      <div class="field"><label for="cPhoto">অন্য ছবি দিতে চাইলে (ঐচ্ছিক)</label><input id="cPhoto" type="file" accept="image/*"></div>
      <div class="field"><label for="cZoom">ছবি বড়-ছোট</label><input id="cZoom" type="range" min="1" max="3" step="0.05" value="1"></div>
      <div class="field"><label for="cPx">ডানে-বামে</label><input id="cPx" type="range" min="-100" max="100" step="1" value="0"></div>
      <div class="field"><label for="cPy">উপরে-নিচে</label><input id="cPy" type="range" min="-100" max="100" step="1" value="0"></div>
    </div>
    <input id="cName" type="hidden"><input id="cNo" type="hidden"><input id="cTypeText" type="hidden"><input id="cDate" type="hidden">
    <div id="cStatus" class="status" role="status" aria-live="polite"></div>
  </div>

  <section data-tab="idcard" hidden>
    <div class="card-tool"><div class="card-preview">
      <figure><canvas id="cvFront" width="1012" height="638"></canvas><figcaption>সামনে</figcaption></figure>
      <figure><canvas id="cvBack" width="1012" height="638"></canvas><figcaption>পেছনে</figcaption></figure>
    </div></div>
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
</div>
</div>
<script>window.SRIJON_CARD=%s;</script>''' % (
        '{"address":"%s","phone":"%s","email":"%s","slogan":"%s"}' % (SITE['address_full'], SITE['phone'], SITE['email'], SITE['slogan']))
