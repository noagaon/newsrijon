#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""সাইট তৈরি: index.html ও pages/*.html জেনারেট করে।  ব্যবহার: python3 tools/build.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from site_lib import *            # noqa
import pages_content as pc        # noqa
from form_page import membership_body, FORM_SCRIPTS  # noqa

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def write(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


def sec(title, inner, link=None, link_label='বিস্তারিত', cls='', id_=''):
    more = ('<p class="more-row">%s</p>' % more_link(link, link_label)) if link else ''
    return '<section class="card home-card %s"%s><h2>%s</h2>%s%s</section>' % (
        cls, ' id="%s"' % id_ if id_ else '', esc(title), inner, more)


def home_body():
    S = []
    S.append(sec('সামাজিক সংগঠনের প্রয়োজনীয়তা',
                 p('একটি সুস্থ, মানবিক ও সুশৃঙ্খল সমাজ গঠনে এবং অসহায় মানুষের পাশে দাঁড়াতে সমাজকল্যাণ বা সামাজিক সংগঠন অত্যন্ত জরুরি। একা একজন মানুষের পক্ষে সব সময় বড় কোনো পরিবর্তন আনা সম্ভব নয়, কিন্তু সম্মিলিত প্রচেষ্টায় যেকোনো সংকট মোকাবিলা করা সহজ হয়। আমরা ’সৃজনশীল তরুণ সংঘ’ গঠনের অনুপ্রেরণা পেয়েছি হিলফুল ফুজুল থেকে।'),
                 href('need'), id_='need'))
    about = (
        p('‘সৃজনশীল তরুণ সংঘ’ নোয়াগাঁও গ্রাম ভিত্তিক একটি স্বেচ্ছাসেবী ও সামাজিক সংগঠন। শিক্ষা, সামাজিক উন্নয়ন, মানবিক সহায়তা, রক্তদান, সাংস্কৃতিক কর্মকাণ্ড এবং তরুণদের দক্ষতা বিকাশে উদ্বুদ্ধ করার লক্ষ্যে এটি বিভিন্ন কার্যক্রম পরিচালনা করে।')
        + '<dl class="facts">'
        + '<dt>প্রতিষ্ঠাকাল</dt><dd>১৫ই সেপ্টেম্বর ২০১১, বৃহস্পতিবার</dd>'
        + '<dt>ইতিহাস</dt><dd>সামাজিক দায়বদ্ধতা ও তরুণদের সৃজনশীল কর্মকাণ্ডে সম্পৃক্ত করার উদ্দেশ্যে চার স্বপ্নবাজ কিশোরের উদ্যোগে ২০১১ সালের ১৫ই সেপ্টেম্বর সৃজনশীল তরুণ সংঘ প্রতিষ্ঠিত হয়। এই চার কিশোর হলেন মোজাহিদ আহমদ, তোফায়েল আহমদ, মোঃ জুনেদ আহমদ ও মোঃ শাহনুর হুসাইন। প্রধান উদ্যোক্তা এবং ঘোষণাপত্র স্বাক্ষরকারী (১৫ই সেপ্টেম্বর, ২০১১) হিসেবে এই চারজন স্থায়ী কমিটির সদস্য ও আজীবন সদস্য। ' + more_link(href('about', 'history')) + '</dd>'
        + '<dt>স্লোগান</dt><dd>সামাজিক উন্নয়ন ও ন্যায়বিচার, তারুণ্যের অঙ্গীকার।<br><span class="muted">(Social Development and Justice, A commitment of Youth.)</span></dd>'
        + '<dt>লক্ষ্য ও উদ্দেশ্য</dt><dd>সর্বস্তরের মানুষকে একতাবদ্ধ করার মাধ্যমে ন্যায় ও সততা প্রতিষ্ঠা করে সকল প্রকার সামাজিক সমস্যা সমাধানের মাধ্যমে নোয়াগাঁও গ্রামকে একটি আদর্শ ও শান্তিপূর্ণ গ্রামে রূপান্তর করা। সংগঠনটির প্রধান উদ্দেশ্যসমূহ হলো: ' + more_link(href('about', 'objectives')) + '</dd>'
        + '<dt>মূলনীতি</dt><dd>সৃজনশীল তরুণ সংঘ ছয়টি মূলনীতিকে অনুসরণ করে সমাজকল্যাণমূলক কার্যক্রম পরিচালনা করে। মূলনীতিগুলো হলো- শিক্ষা, ঐক্য, ন্যায্যতা, শান্তি, উন্নয়ন, সৃষ্টিশীলতা।</dd>'
        + '<dt>সদর দপ্তর/কার্যালয়</dt><dd>নয়াবাজার, নোয়াগাঁও, টুকেরবাজার, ৩৯নং ওয়ার্ড, সিলেট সিটি কর্পোরেশন, জালালাবাদ, সিলেট, বাংলাদেশ।</dd>'
        + '</dl>')
    S.append(sec('আমাদের পথচলা', about, href('about'), id_='about', cls='wide'))
    S.append(sec('আমাদের কার্যক্রম',
                 p('সৃজনশীল তরুণ সংঘ বিভিন্ন সময়ে নিম্নোক্ত কার্যক্রম পরিচালনা করে থাকে:'), href('activities'), id_='activities'))
    S.append(sec('কর্মসূচি',
                 p('সৃজনশীল তরুণ সংঘ এর ৮ টি কর্মসূচি: শিক্ষা, স্বাস্থ্য, পরিবেশ, ধর্ম, সংস্কৃতি, ক্রিড়া, সচেতনতা ও সামাজিক উন্নয়নমূলক কাজ।'), href('programs'), id_='programs'))
    S.append(sec('সাংগঠনিক কাঠামো',
                 p('সংগঠনটি একটি নির্বাহী/কার্যকরী কমিটির মাধ্যমে পরিচালিত হয়।')
                 + '<ul class="lead-list">'
                 + '<li><strong>কার্যকরী কমিটি</strong> — সংগঠনের দৈনন্দিন কার্যক্রম পরিচালনা ও সিদ্ধান্ত বাস্তবায়ন করবে। ' + more_link(href('structure', 'executive'), 'বর্তমান কার্যকরী কমিটি') + '</li>'
                 + '<li><strong>স্থায়ী কমিটি</strong> — নির্দিষ্ট বিষয় বা দায়িত্ব নিয়ে ধারাবাহিকভাবে কাজ করবে। ' + more_link(href('structure', 'standing'), 'বর্তমান স্থায়ী কমিটি') + '</li>'
                 + '<li><strong>উপদেষ্টা কমিটি</strong> — পরামর্শ, দিকনির্দেশনা ও অভিজ্ঞতাভিত্তিক সহায়তা দেবে। ' + more_link(href('structure', 'advisory'), 'বর্তমান উপদেষ্টা কমিটি') + '</li>'
                 + '<li><strong>সাধারণ পরিষদ</strong> — সংগঠনের বৃহত্তর সদস্যসমষ্টি; গুরুত্বপূর্ণ নীতিগত বিষয় অনুমোদন ও তদারকিতে ভূমিকা রাখবে।</li>'
                 + '</ul>', href('structure'), id_='structure', cls='wide'))
    S.append(sec('সদস্য তালিকা',
                 p('সৃজনশীল তরুণ সংঘ এর প্রতিষ্ঠাকালীন সময় থেকে বর্তমান সময় পর্যন্ত সকল শ্রেণির সকল সদস্যের তালিকা:')
                 + '<ul class="lead-list">'
                 + ''.join('<li><strong>%s:</strong> %s</li>' % (esc(t), more_link(href('members', k), '%s তালিকা দেখুন এখানে' % t)) for k, t in [
                     ('general', 'সাধারণ সদস্য'), ('expat', 'প্রবাসী সদস্য'), ('donor', 'দাতা সদস্য'), ('junior', 'জুনিয়র সদস্য')])
                 + '</ul>', None, id_='members'))
    S.append(sec('ইউনিট',
                 p('আমাদের কার্যক্রমকে সফল-সার্থক করার জন্য প্রয়োজন অনুযায়ী বিভিন্ন ইউনিট গঠন করা হয়, যাতে স্বেচ্ছাসেবীরা সহজে কাজ করতে পারে।')
                 + '<div class="chips">' + ''.join('<span class="chip">%s</span>' % esc(x) for x in ['ব্লাড ডোনার্স ইউনিট', 'মিডিয়া ইউনিট', 'কালচারাল ইউনিট', 'সোশ্যাল সার্ভিস ইউনিট', 'এডুকেশন অ্যান্ড ট্রেনিং ইউনিট']) + '</div>',
                 href('units'), id_='units'))
    S.append(sec('পাঠাগার',
                 p('পাঠাগার প্রতিষ্ঠার প্রধান উদ্দেশ্য: জ্ঞানার্জনের সুযোগ সৃষ্টি করা— বই, পত্রিকা, সাময়িকী ও অন্যান্য জ্ঞানমূলক উপকরণ সহজলভ্য করা।')
                 + p('পাঠাগারের দুটি শাখা রয়েছে।')
                 + '<ul class="lead-list"><li><strong>ইসলামিক শাখা:</strong> নোয়াগাঁও কেন্দ্রীয় জামে মসজিদ</li><li><strong>সাধারণ শাখা:</strong> সংগঠনের কার্যালয়।</li></ul>'
                 + '<p class="more-row">' + more_link(href('library')) + '</p>'
                 + '<p>বইয়ের তালিকা: ' + more_link(href('library', 'books')) + '</p>',
                 None, id_='library'))
    S.append(sec('ইভেন্ট',
                 p('আমাদের আয়োজন, উদ্যোগ, সভা, সমাবেশ, র‍্যালি, অনুষ্ঠান ইত্যাদি।')
                 + '<ul class="lead-list"><li>' + more_link(href('events', 'upcoming'), 'আপকামিং ইভেন্ট') + '</li><li>' + more_link(href('events', 'held'), 'আয়োজিত ইভেন্ট') + '</li><li>' + more_link(href('events', 'cancelled'), 'বাতিলকৃত ইভেন্ট') + '</li></ul>',
                 href('events'), id_='events'))
    S.append(sec('নোটিশ',
                 p('সংগঠনের গুরুত্বপূর্ণ ঘোষণা, নির্দেশনা, সময়সূচি, সভা, অনুষ্ঠান, কার্যক্রম এবং অন্যান্য প্রয়োজনীয় তথ্য সদস্য, স্বেচ্ছাসেবক ও সংশ্লিষ্টদের জানাতে নোটিশ প্রকাশ করা হয়।'), href('notices'), id_='notices'))
    S.append(sec('সংবাদ',
                 p('সংগঠনের সম্পন্ন হওয়া কার্যক্রম, অর্জন, উদ্যোগ ও গুরুত্বপূর্ণ ঘটনাবলি সাধারণ মানুষ, সদস্য ও শুভাকাঙ্ক্ষীদের কাছে তুলে ধরার জন্য সংবাদ প্রকাশ করা হয়।'), href('news'), id_='news'))
    S.append(sec('সদস্য আবেদন',
                 '<h3 class="mini">অংশগ্রহণ থেকে পরিবর্তনের পথে</h3>'
                 + p('একটি সংগঠনের শক্তি শুধু তার নিয়ম-কাঠামো বা কার্যক্রমে নয়; বরং তার সবচেয়ে বড় শক্তি হলো তার সদস্যরা। একজন সদস্য হওয়া মানে শুধু একটি তালিকায় নিজের নাম যুক্ত করা নয়—এটি একটি মূল্যবোধ, দায়িত্ব ও ইতিবাচক পরিবর্তনের সঙ্গে নিজেকে যুক্ত')
                 + '<p class="btn-row">' + btn('আবেদন ফরম', href('membership', 'apply'), 'primary') + '</p>',
                 href('membership'), id_='membership'))
    S.append(sec('প্রাক্তন সভাপতি',
                 p('একজন সভাপতির দায়িত্ব শুধু একটি পদ অলংকরণ নয়; বরং সংগঠনের পথচলায় নেতৃত্ব দেওয়া, সদস্যদের ঐক্যবদ্ধ রাখা এবং প্রতিকূল সময়ে সাহস ও প্রজ্ঞার সঙ্গে সিদ্ধান্ত নেওয়া। আমাদের প্রাক্তন সভাপতিগণ তাঁদের দায়িত্ব পালনের মাধ্যমে')
                 + '<p>' + more_link(href('past-presidents', 'list'), 'প্রাক্তন সভাপতি তালিকা') + '</p>',
                 href('past-presidents'), id_='past-presidents'))
    S.append(sec('সহযোগিতা করুন',
                 '<div class="chips">' + ''.join('<span class="chip">%s</span>' % esc(x) for x in ['স্বেচ্ছাসেবক হিসেবে', 'আর্থিক সহযোগিতা', 'শিক্ষা সহায়তা', 'মানবিক সহায়তা']) + '</div>',
                 href('support'), id_='support'))
    S.append(sec('প্রতিবেদন',
                 '<div class="chips">' + ''.join('<span class="chip">%s</span>' % esc(x) for x in ['বার্ষিক প্রতিবেদন', 'কার্যক্রম প্রতিবেদন', 'আর্থিক প্রতিবেদন', 'প্রকল্প প্রতিবেদন']) + '</div>',
                 href('reports'), id_='reports'))
    S.append(sec('প্রকাশনা',
                 p('আমাদের কার্যক্রম, অর্জন, অভিজ্ঞতা ও বিভিন্ন সামাজিক উদ্যোগ সম্পর্কে সদস্য, শুভাকাঙ্ক্ষী ও সাধারণ মানুষের কাছে তথ্য পৌঁছে দিতে নিয়মিত বিভিন্ন প্রকাশনা প্রকাশ করা হয়')
                 + '<div class="chips">' + ''.join('<span class="chip">%s</span>' % esc(x) for x in ['সংগঠনের প্রকাশনা', 'স্মরণিকা', 'ম্যাগাজিন', 'লিফলেট/প্রচারপত্র']) + '</div>',
                 href('publications'), id_='publications'))
    S.append(sec('স্বচ্ছতা ও জবাবদিহিতা',
                 p('একটি সংগঠনের প্রতি মানুষের আস্থা ও বিশ্বাসের সবচেয়ে গুরুত্বপূর্ণ ভিত্তিগুলোর মধ্যে রয়েছে স্বচ্ছতা ও জবাবদিহিতা। স্বচ্ছতা মানে হলো— সংগঠনের কার্যক্রম, সিদ্ধান্ত ও অর্থনৈতিক বিষয়গুলো সদস্যদের কাছে পরিষ্কার ও বোধগম্য রাখা। আর জবাবদিহিতা হলো—'),
                 href('transparency'), id_='transparency'))
    S.append(sec('সাধারণ জিজ্ঞাসা',
                 p('সংগঠন সম্পর্কে আগ্রহী সদস্য, শুভাকাঙ্ক্ষী ও সহযোগীদের সাধারণ প্রশ্নের উত্তর এক জায়গায় তুলে ধরা হলো।')
                 + '<div class="chips">' + ''.join('<span class="chip">%s</span>' % esc(x) for x in ['সংগঠন সম্পর্কে', 'সদস্যপদ', 'কার্যক্রম', 'দান ও সহযোগিতা', 'যোগাযোগ']) + '</div>',
                 href('faq'), id_='faq'))
    S.append(sec('সদস্য/স্বেচ্ছাসেবীদের গল্প',
                 p('একটি সংগঠনের সবচেয়ে বড় শক্তি তার সদস্যরা। তাঁদের সময়, শ্রম, ভালোবাসা ও দায়িত্ববোধের সম্মিলিত প্রচেষ্টাতেই ছোট ছোট উদ্যোগ হয়ে ওঠে বড় পরিবর্তনের গল্প। তাঁদের গল্প নিয়েই আমাদের এই বিভাগ।')
                 + '<div class="chips">' + ''.join('<span class="chip">%s</span>' % esc(x) for x in ['সদস্যদের গল্প', 'স্বেচ্ছাসেবকদের গল্প', 'সফলতার গল্প', 'অভিজ্ঞতা']) + '</div>',
                 href('stories'), id_='stories'))
    S.append(sec('আমাদের অর্জন',
                 p('আমাদের প্রতিটি অর্জনের পেছনে রয়েছে অসংখ্য মানুষের সময়, শ্রম, ভালোবাসা ও আন্তরিক সহযোগিতা। তাই আমাদের অর্জন শুধু কিছু সংখ্যা বা সফল কার্যক্রমের তালিকা নয়— এগুলো মানুষের পাশে দাঁড়ানোর, একসঙ্গে এগিয়ে চলার এবং ইতিবাচক পরিবর্তন তৈরির গল্প।')
                 + '<div class="chips">' + ''.join('<span class="chip">%s</span>' % esc(x) for x in ['উল্লেখযোগ্য অর্জন', 'সম্মাননা ও স্বীকৃতি', 'সফল কার্যক্রম', 'সামাজিক অবদান']) + '</div>',
                 href('achievements'), id_='achievements'))
    S.append(sec('গ্যালারি',
                 '<div class="chips">' + ''.join('<a class="chip" href="%s">%s</a>' % (href('gallery', k), esc(t)) for k, t in [('photos', 'ছবি'), ('videos', 'ভিডিও'), ('audios', 'অডিও'), ('files', 'ফাইল')]) + '</div>',
                 href('gallery'), id_='gallery'))
    S.append(sec('গঠনতন্ত্র',
                 p('একটি সংগঠনকে সুশৃঙ্খল, স্বচ্ছ ও কার্যকরভাবে পরিচালনার জন্য গঠনতন্ত্র অত্যন্ত গুরুত্বপূর্ণ। গঠনতন্ত্র শুধু কিছু নিয়মের সমষ্টি নয়; এটি একটি সংগঠনের লক্ষ্য, আদর্শ, কাঠামো, দায়িত্ব ও পরিচালনার সুস্পষ্ট নির্দেশনা।'),
                 href('constitution'), id_='constitution'))
    contact = (
        '<ul class="contact-list">'
        '<li><span>%s</span><div><strong>কার্যালয়</strong> নোয়াগাঁও, নয়াবাজার, ৩৯ নং ওয়ার্ড, সিলেট সিটি কর্পোরেশন <a href="%s" target="_blank" rel="noopener">মানচিত্রে দেখুন</a></div></li>'
        '<li><span>%s</span><div><strong>ফোন</strong> <a href="tel:%s">%s</a></div></li>'
        '<li><span>%s</span><div><strong>ওয়াটসঅ্যাপ</strong> <a href="%s" target="_blank" rel="noopener">%s</a></div></li>'
        '<li><span>%s</span><div><strong>ফেসবুক</strong> <a href="%s" target="_blank" rel="noopener">সৃজনশীল তরুণ সংঘ — ফেসবুক পেইজ</a></div></li>'
        '<li><span>%s</span><div><strong>ই-মেইল</strong> <a href="mailto:%s">%s</a></div></li>'
        '</ul>') % (ICONS['pin'], SITE['map'], ICONS['phone'], SITE['phone'], SITE['phone'], ICONS['whatsapp'], SITE['whatsapp_link'], SITE['whatsapp'],
                    ICONS['facebook'], SITE['facebook'], ICONS['mail'], SITE['email'], SITE['email'])
    S.append(sec('যোগাযোগ', contact, href('contact'), id_='contact', cls='wide'))
    S.append(sec('মতামত দিন',
                 p('আপনার মতামত আমাদের কাছে গুরুত্বপূর্ণ। একটি সংগঠন তখনই আরও সুন্দর ও কার্যকরভাবে এগিয়ে যেতে পারে, যখন সদস্য, স্বেচ্ছাসেবী ও শুভাকাঙ্ক্ষীদের পরামর্শ, অভিজ্ঞতা ও গঠনমূলক মতামতকে গুরুত্ব দেওয়া হয়। আপনার কোনো পরামর্শ, অভিযোগ, নতুন উদ্যোগের ধারণা কিংবা উন্নয়নের প্রস্তাব থাকলে আমাদের জানান।'),
                 href('feedback'), id_='feedback'))
    return '<div class="home-grid">%s</div>' % ''.join(S)


def hero():
    return '''<section class="hero">
  <div class="hero-logo"><img src="assets/img/hero-band.webp" width="673" height="232" alt="সৃজনশীল তরুণ সংঘ লোগো — স্থাপিত ২০১১ ই." fetchpriority="high"></div>
  <figure class="charter"><img src="assets/img/charter.jpg" width="1400" height="1120" alt="ঘোষণাপত্র হাতে সংগঠনের চার প্রতিষ্ঠাতা — Charter of Srijonshil Declaration"></figure>
  <div class="hero-block"><div class="hero-text">
    <h1>সৃজনশীল তরুণ সংঘ</h1>
    <p class="hero-slogan">সামাজিক উন্নয়ন ও ন্যায়বিচার,<br>তারুণ্যের অঙ্গীকার</p>
    <p class="hero-desc">শিক্ষা, স্বাস্থ্য, পরিবেশ, সংস্কৃতি, ক্রীড়া ও সচেতনতার মাধ্যমে সামাজিক ও মানবিক সমস্যার সমাধানে তরুণদের সম্মিলিত উদ্যোগ।</p>
    <div class="hero-btns"><a class="btn btn-light" href="pages/about.html">আমাদের পথচলা</a><a class="btn btn-ghost" href="pages/membership.html#apply">সদস্য হতে চাই</a></div>
  </div></div>
</section>
'''


def build_home():
    out = head('', '', is_home=True) + header('', '') + hero()
    out += '<div class="wrap home-wrap">%s</div>' % home_body()
    out += footer('') % {'extra': ''}
    write('index.html', out)


def build_pages():
    for slug, title in MENU:
        extra = ''
        if slug == 'membership':
            body = membership_body()
            extra = FORM_SCRIPTS
        elif slug == 'feedback':
            body = pc.BODY[slug]
            extra = '<script src="../config.js"></script>\n<script src="../assets/js/feedback.js" defer></script>'
        else:
            body = pc.BODY[slug]
        write('pages/%s.html' % slug, page(slug, body, extra))


if __name__ == '__main__':
    build_home()
    build_pages()
    print('OK: index.html +', len(MENU), 'pages')
