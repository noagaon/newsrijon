# -*- coding: utf-8 -*-
"""সদস্য অ্যাকাউন্ট পাতা: খোলা / লগইন / পাসওয়ার্ড রিকভারি / ড্যাশবোর্ড"""
from site_lib import *


def body():
    return '''<div id="acct" class="acct">
<noscript><p class="status error">এই পাতা চালাতে জাভাস্ক্রিপ্ট চালু করুন।</p></noscript>
<p class="lead">সদস্য আবেদন ফরমে যাঁরা আবেদন করেছেন, কেবল তাঁরাই অ্যাকাউন্ট খুলতে পারবেন। অ্যাকাউন্টে নিজের প্রোফাইল, আইডি কার্ড, ফটোকার্ড, রসিদ ও চাঁদার হিসাব পাবেন।</p>
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
      <p>আবেদন ফরমে যে তথ্য দিয়েছিলেন, ঠিক সেটি লিখুন। তথ্য মিললে একটি OTP যাবে (ফোনে, SMS চালু না থাকলে আবেদনের ইমেইলে)।</p>
      <div class="grid-form">
        <div class="field"><label for="sName">১। নাম (বাংলায়, ফরমে যেভাবে)</label><input id="sName" maxlength="80" autocomplete="name"></div>
        <div class="field"><label for="sNo">২। সদস্য নম্বর</label><input id="sNo" maxlength="30" placeholder="STS/GM/0000" autocomplete="off"></div>
        <div class="field"><label for="sNid">৩। এনআইডি নম্বর</label><input id="sNid" inputmode="numeric" maxlength="20" autocomplete="off"></div>
        <div class="field"><label for="sPhone">৪। ফোন নম্বর</label><input id="sPhone" type="tel" inputmode="numeric" maxlength="16" autocomplete="tel"></div>
      </div>
      <button class="btn btn-primary" id="sGo1" type="submit">OTP পাঠান</button>
    </div>
    <div id="sStep2" hidden>
      <p id="sOtpInfo"></p>
      <div class="grid-form">
        <div class="field"><label for="sOtp">পাওয়া OTP</label><input id="sOtp" inputmode="numeric" maxlength="8" autocomplete="one-time-code"></div>
        <div class="field"><label for="sUser">আপনার পছন্দের ইউজারনেম</label><input id="sUser" maxlength="30" autocomplete="username"><small>ইংরেজি ছোট হরফ, সংখ্যা, _ বা . — ৩ থেকে ৩০ অক্ষর।</small></div>
        <div class="field"><label for="sPass">পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)</label><input id="sPass" type="password" maxlength="100" autocomplete="new-password"></div>
        <div class="field"><label for="sPass2">পাসওয়ার্ড আবার</label><input id="sPass2" type="password" maxlength="100" autocomplete="new-password"></div>
        <div class="field" id="sEmailWrap" hidden><label for="sEmail">ইমেইল (পাসওয়ার্ড রিকভারির জন্য)</label><input id="sEmail" type="email" maxlength="120" autocomplete="email"></div>
      </div>
      <button class="btn btn-primary" id="sGo2" type="submit">অ্যাকাউন্ট তৈরি করুন</button>
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

  <section data-tab="profile"><div id="pBody" class="acct-profile"><p>লোড হচ্ছে…</p></div></section>

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
  </section>
  <section data-tab="photocard" hidden>
    <div class="card-tool"><div class="card-preview"><figure class="portrait"><canvas id="cvPhoto" width="1240" height="1748"></canvas><figcaption>ফটোকার্ড</figcaption></figure></div></div>
    <div class="rcpt-tools"><button class="btn btn-primary" type="button" id="cPhotoPdf">⬇️ ফটোকার্ড (PDF)</button><button class="btn btn-outline" type="button" id="cPhotoPng">ফটোকার্ড (ছবি)</button></div>
  </section>

  <section data-tab="receipts" hidden><div id="rBody"><p>লোড হচ্ছে…</p></div></section>
  <section data-tab="fund" hidden><div id="fBody"><p>লোড হচ্ছে…</p></div></section>
</div>
</div>
<script>window.SRIJON_CARD=%s;</script>''' % (
        '{"address":"%s","phone":"%s","email":"%s","slogan":"%s"}' % (SITE['address_full'], SITE['phone'], SITE['email'], SITE['slogan']))
