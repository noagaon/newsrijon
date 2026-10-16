# -*- coding: utf-8 -*-
"""সাইটের কমন অংশ: টেক্সট ক্লিনার, HTML হেল্পার, হেডার/ফুটার/শেল।"""
import html
import re

SITE = {
    'name': 'সৃজনশীল তরুণ সংঘ',
    'name_en': 'Srijonshil Tarun Sangha',
    'slogan': 'সামাজিক উন্নয়ন ও ন্যায়বিচার, তারুণ্যের অঙ্গীকার',
    'slogan_en': 'Social Development and Justice, A commitment of Youth.',
    'address_short': 'নোয়াগাঁও, টুকেরবাজার, ৩৯ নং ওয়ার্ড, সিসিক, সিলেট।',
    'address_full': 'নোয়াগাঁও, টুকেরবাজার, ৩৯ নং ওয়ার্ড, সিলেট সিটি কর্পোরেশন, সিলেট।',
    'phone': '01779998997',
    'whatsapp': '01779998997',
    'whatsapp_link': 'https://wa.me/8801779998997',
    'email': 'srijonshil2011@gmail.com',
    'facebook': 'https://www.facebook.com/share/1FHo731ZQX/',
    'map': 'https://maps.app.goo.gl/Z8q4JPZ3X7zvE3vT9',
    'description': 'সৃজনশীল তরুণ সংঘ — নোয়াগাঁও, টুকেরবাজার, সিলেট ভিত্তিক স্বেচ্ছাসেবী ও সামাজিক সংগঠন (স্থাপিত ২০১১)। শিক্ষা, স্বাস্থ্য, পরিবেশ, সংস্কৃতি, ক্রীড়া ও সচেতনতার মাধ্যমে সামাজিক ও মানবিক সমস্যার সমাধানে তরুণদের সম্মিলিত উদ্যোগ।',
}

# ২৪টি মেনু: (slug, নাম)
MENU = [
    ('need', 'সামাজিক সংগঠনের প্রয়োজনীয়তা'),
    ('about', 'আমাদের পথচলা'),
    ('activities', 'আমাদের কার্যক্রম'),
    ('programs', 'কর্মসূচি'),
    ('structure', 'সাংগঠনিক কাঠামো'),
    ('members', 'সদস্য তালিকা'),
    ('units', 'ইউনিট'),
    ('library', 'পাঠাগার'),
    ('events', 'ইভেন্ট'),
    ('notices', 'নোটিশ'),
    ('news', 'সংবাদ'),
    ('membership', 'সদস্য আবেদন'),
    ('past-presidents', 'প্রাক্তন সভাপতি'),
    ('support', 'সহযোগিতা করুন'),
    ('reports', 'প্রতিবেদন'),
    ('publications', 'প্রকাশনা'),
    ('transparency', 'স্বচ্ছতা ও জবাবদিহিতা'),
    ('faq', 'সাধারণ জিজ্ঞাসা'),
    ('stories', 'সদস্য/স্বেচ্ছাসেবীদের গল্প'),
    ('achievements', 'আমাদের অর্জন'),
    ('gallery', 'গ্যালারি'),
    ('constitution', 'গঠনতন্ত্র'),
    ('contact', 'যোগাযোগ'),
    ('feedback', 'মতামত দিন'),
]
MENU_TITLE = dict(MENU)


def clean(s):
    """টাইপিংয়ে ঢুকে যাওয়া অদৃশ্য ZWNJ সরায়; র‍্য-এর ZWJ ঠিক রাখে।"""
    s = s.replace('র‌্য', 'র‍্য')
    s = s.replace('‌', '')
    return s


def esc(s):
    return html.escape(clean(s), quote=True)


def href(slug, anchor=''):
    return 'pages/%s.html%s' % (slug, ('#' + anchor) if anchor else '')


# ---------- ছোট HTML হেল্পার ----------
def p(text, cls=''):
    return '<p%s>%s</p>' % (' class="%s"' % cls if cls else '', esc(text))


def h2(text, id_=''):
    return '<h2%s>%s</h2>' % (' id="%s"' % id_ if id_ else '', esc(text))


def h3(text, id_=''):
    return '<h3%s>%s</h3>' % (' id="%s"' % id_ if id_ else '', esc(text))


def ul(items, cls=''):
    return '<ul%s>%s</ul>' % (' class="%s"' % cls if cls else '', ''.join('<li>%s</li>' % esc(i) for i in items))


def ol(items):
    return '<ol>%s</ol>' % ''.join('<li>%s</li>' % esc(i) for i in items)


def dl_pairs(pairs):
    """[(শিরোনাম, উত্তর)] তালিকা: 'বোল্ড লিড-ইন + টেক্সট' ধরনের তালিকা"""
    return '<ul class="lead-list">%s</ul>' % ''.join(
        '<li><strong>%s</strong> %s</li>' % (esc(a), esc(b)) for a, b in pairs)


def table(headers, rows, empty_msg='তালিকা শীঘ্রই হালনাগাদ করা হবে।', id_=''):
    th = ''.join('<th>%s</th>' % esc(h) for h in headers)
    if rows:
        body = ''.join('<tr>%s</tr>' % ''.join('<td data-label="%s">%s</td>' % (esc(headers[i]), esc(c)) for i, c in enumerate(r)) for r in rows)
    else:
        body = '<tr><td colspan="%d" class="empty">%s</td></tr>' % (len(headers), esc(empty_msg))
    return '<div class="table-wrap"><table%s><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (
        ' id="%s"' % id_ if id_ else '', th, body)


def card(title, inner, icon='', cls='', id_=''):
    ic = '<span class="ico" aria-hidden="true">%s</span>' % icon if icon else ''
    return '<section class="card %s"%s><h3>%s%s</h3>%s</section>' % (
        cls, ' id="%s"' % id_ if id_ else '', ic, esc(title), inner)


def info_card(icon, title, why, how, why_label='কেন করবেন', how_label='কীভাবে করবেন'):
    return ('<article class="info-card"><div class="info-ico" aria-hidden="true">%s</div><div><h3>%s</h3>'
            '<p><strong>%s:</strong> %s</p><p><strong>%s:</strong> %s</p></div></article>') % (
        icon, esc(title), esc(why_label), esc(why), esc(how_label), esc(how))


def empty_state(msg, icon='🕊️'):
    return '<div class="empty-state"><div aria-hidden="true">%s</div><p>%s</p></div>' % (icon, esc(msg))


def btn(label, link, kind='primary', extra=''):
    return '<a class="btn btn-%s" href="%s"%s>%s</a>' % (kind, link, extra, esc(label))


# ---------- আইকন (ইনলাইন SVG) ----------
ICONS = {
    'menu': '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    'close': '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    'pin': '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
    'phone': '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
    'whatsapp': '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.4.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.6-.3.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.8.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4z"/></svg>',
    'mail': '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.2L4.5 7.5v1.2L12 13.4l7.5-4.7V7.5L12 12.2z"/></svg>',
    'facebook': '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M13.5 22v-8.2h2.8l.5-3.3h-3.3V8.4c0-1 .4-1.7 1.8-1.7h1.6V3.8c-.3 0-1.3-.1-2.4-.1-2.5 0-4.1 1.5-4.1 4.2v2.6H7.6v3.3h2.8V22h3.1z"/></svg>',
    'arrow': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
}


def more_link(link, label='বিস্তারিত'):
    cls = 'more more-btn' if label == 'বিস্তারিত' else 'more'
    return '<a class="%s" href="%s">%s %s</a>' % (cls, link, esc(label), ICONS['arrow'])


# ---------- পেইজ শেল ----------
def head(title, root, desc=None, is_home=False):
    full_title = SITE['name'] if is_home else '%s — %s' % (clean(title), SITE['name'])
    d = esc(desc or SITE['description'])
    return '''<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>%(title)s</title>
<meta name="description" content="%(desc)s">
<meta name="theme-color" content="#0b3d24">
<meta property="og:type" content="website">
<meta property="og:title" content="%(title)s">
<meta property="og:description" content="%(desc)s">
<meta property="og:image" content="%(root)sassets/img/charter.jpg">
<link rel="icon" type="image/png" href="%(root)sassets/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="%(root)sassets/css/style.css">
</head>
''' % {'title': esc(full_title), 'desc': d, 'root': root}


def header(root, current=''):
    links = ''.join(
        '<li><a href="%spages/%s.html"%s>%s</a></li>' % (
            root, s, ' aria-current="page"' if s == current else '', esc(t)) for s, t in MENU)
    home = root + 'index.html' if root else 'index.html'
    links = '<li><a href="%s"%s>হোম</a></li>' % (home, ' aria-current="page"' if current == '' else '') + links
    return '''<body>
<a class="skip" href="#main">মূল অংশে যান</a>
<div class="topbar"><div class="wrap">%(slogan)s</div></div>
<header class="site-header">
  <div class="wrap header-row">
    <a class="brand" href="%(home)s" aria-label="হোম পেইজ">
      <img src="%(root)sassets/img/logo-small.webp" width="52" height="60" alt="%(name)s লোগো">
      <span class="brand-text"><strong>%(name)s</strong><small>%(addr)s</small></span>
    </a>
    <button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="siteNav" aria-label="মেনু খুলুন">
      <span class="i-open">%(open)s</span><span class="i-close">%(close)s</span>
    </button>
  </div>
  <nav class="site-nav" id="siteNav" aria-label="প্রধান মেনু" hidden>
    <div class="wrap">
      <ul>%(links)s</ul>
    </div>
  </nav>
</header>
<main id="main">
''' % {'slogan': esc(SITE['slogan']), 'home': home, 'root': root, 'name': esc(SITE['name']),
       'addr': esc(SITE['address_short']), 'open': ICONS['menu'], 'close': ICONS['close'], 'links': links}


def footer(root):
    return '''</main>
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="f-brand">
      <img src="%(root)sassets/img/logo-small.webp" width="84" height="97" alt="" loading="lazy">
      <div>
        <strong>%(name)s</strong>
        <p>%(slogan)s</p>
        <p class="small">স্থাপিত: ১৫ই সেপ্টেম্বর ২০১১ ই.</p>
      </div>
    </div>
    <ul class="f-contact">
      <li>%(pin)s <a href="%(map)s" target="_blank" rel="noopener">%(addr)s</a></li>
      <li>%(wa)s <a href="%(wal)s" target="_blank" rel="noopener">ওয়াটসঅ্যাপ: %(phone)s</a></li>
      <li>%(mail)s <a href="mailto:%(email)s">%(email)s</a></li>
      <li>%(fb)s <a href="%(fbl)s" target="_blank" rel="noopener">ফেসবুক পেইজ</a></li>
    </ul>
  </div>
  <div class="copy"><div class="wrap">© %(name)s। সর্বস্বত্ব সংরক্ষিত।</div></div>
  <div class="credit"><div class="wrap">Design and Developed By Juned Ahmed (JA080)</div></div>
</footer>
<script src="%(root)sassets/js/app.js" defer></script>
%%(extra)s
</body>
</html>
''' % {'root': root, 'name': esc(SITE['name']), 'slogan': esc(SITE['slogan']), 'addr': esc(SITE['address_full']),
       'map': SITE['map'], 'wa': ICONS['whatsapp'], 'wal': SITE['whatsapp_link'], 'phone': SITE['whatsapp'],
       'mail': ICONS['mail'], 'email': SITE['email'], 'fb': ICONS['facebook'], 'fbl': SITE['facebook'], 'pin': ICONS['pin']}


def page(slug, body, extra_scripts=''):
    title = MENU_TITLE[slug]
    root = '../'
    out = head(title, root) + header(root, slug)
    out += '''<section class="page-hero"><div class="wrap">
  <nav class="crumbs" aria-label="ব্রেডক্রাম্ব"><a href="../index.html">হোম</a> <span>›</span> <span>%s</span></nav>
  <h1>%s</h1>
</div></section>
<div class="wrap page-body">
%s
</div>
''' % (esc(title), esc(title), body)
    out += footer(root) % {'extra': extra_scripts}
    return out
