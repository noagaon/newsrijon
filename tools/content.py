# -*- coding: utf-8 -*-
"""CMS কনটেন্ট (content/*/*.json) → নোটিশ, সংবাদ, প্রতিবেদন, গ্যালারি অংশ ও আলাদা পোস্ট-পেইজ"""
import json
import os
import re
from site_lib import esc, p, empty_state

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BN = '০১২৩৪৫৬৭৮৯'
MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']


def bn(s):
    return re.sub(r'\d', lambda m: BN[int(m.group())], str(s))


def bn_date(d):
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', str(d or ''))
    return '%s %s %s' % (bn(int(m.group(3))), MONTHS[int(m.group(2)) - 1], bn(m.group(1))) if m else esc(d or '')


def load(coll):
    """নতুন তারিখ আগে"""
    folder = os.path.join(ROOT, 'content', coll)
    items = []
    if os.path.isdir(folder):
        for f in sorted(os.listdir(folder)):
            if not f.endswith('.json'):
                continue
            try:
                d = json.load(open(os.path.join(folder, f), encoding='utf-8'))
            except Exception:
                continue
            d['id'] = f[:-5]
            d['date'] = str(d.get('date') or '')[:10]
            items.append(d)
    items.sort(key=lambda d: (d['date'], d['id']), reverse=True)
    return items


def media(path, root):
    """CMS-এর '/assets/uploads/x.jpg' → পেইজ অনুযায়ী আপেক্ষিক লিংক"""
    path = str(path or '').strip()
    if not path:
        return ''
    if re.match(r'https?://', path):
        return path
    return root + path.lstrip('/')


def paras(text):
    return ''.join('<p>%s</p>' % esc(x.strip()).replace('\n', '<br>') for x in re.split(r'\n\s*\n', str(text or '').strip()) if x.strip())


def excerpt(text, n=140):
    t = re.sub(r'\s+', ' ', str(text or '')).strip()
    return t if len(t) <= n else t[:n].rsplit(' ', 1)[0] + '…'


def post_list(coll, items, home=False, limit=None, empty='এখনো কিছু প্রকাশিত হয়নি।'):
    """home=True: হোম পেইজ থেকে (লিংকে pages/ উপসর্গ, ছবির উপসর্গ নেই); নইলে pages/ ভেতরের পেইজ থেকে"""
    if not items:
        return empty_state(empty)
    pre, mroot = ('pages/', '') if home else ('', '../')
    out = []
    for d in (items[:limit] if limit else items):
        link = '%s%s-%s.html' % (pre, coll, d['id'])
        thumb = media(d.get('image'), mroot)
        out.append('<article class="post">%s<div class="post-txt"><time>%s</time>%s<h3><a href="%s">%s</a></h3><p>%s</p></div></article>' % (
            ('<a class="post-thumb" href="%s"><img src="%s" alt="" loading="lazy"></a>' % (link, esc(thumb))) if thumb else '',
            bn_date(d['date']), (' <span class="post-cat">%s</span>' % esc(d['category'])) if d.get('category') else '',
            link, esc(d.get('title', '')), esc(excerpt(d.get('body')))))
    return '<div class="posts">%s</div>' % ''.join(out)


def post_body(d):
    """আলাদা পোস্ট-পেইজের ভেতরের অংশ (pages/ এর ভেতরে, root='../')"""
    h = '<article class="post-full"><p class="post-meta"><time>%s</time>%s</p>' % (
        bn_date(d['date']), (' <span class="post-cat">%s</span>' % esc(d['category'])) if d.get('category') else '')
    if d.get('image'):
        h += '<figure class="post-fig"><img src="%s" alt="%s"></figure>' % (esc(media(d['image'], '../')), esc(d.get('title', '')))
    h += '<div class="post-body">%s</div>' % paras(d.get('body'))
    if d.get('file'):
        h += '<p class="btn-row"><a class="btn btn-primary" href="%s" download>⬇️ সংযুক্ত ফাইল ডাউনলোড / দেখুন</a></p>' % esc(media(d['file'], '../'))
    return h + '</article>'


def _yt(url):
    m = re.search(r'(?:youtu\.be/|youtube\.com/(?:watch\?v=|embed/|shorts/))([\w-]{11})', url or '')
    return m.group(1) if m else ''


def gallery_cards():
    """গ্যালারির চার ধরণের আইটেম: {'photos': html, ...} (pages/ ভেতর থেকে)"""
    items = load('gallery')
    out = {'photos': '', 'videos': '', 'audios': '', 'files': ''}
    for d in items:
        t, title, cap = d.get('type'), esc(d.get('title', '')), (('<p>%s</p>' % esc(d.get('body'))) if d.get('body') else '')
        head = '<h4>%s</h4><time>%s</time>%s' % (title, bn_date(d['date']), cap)
        if t == 'ছবি':
            imgs = ''.join('<a href="%s" target="_blank" rel="noopener"><img src="%s" alt="%s" loading="lazy"></a>' % (esc(media(i, '../')), esc(media(i, '../')), title) for i in (d.get('images') or []))
            if imgs:
                out['photos'] += '<div class="gal-item">%s<div class="gal-imgs">%s</div></div>' % (head, imgs)
        elif t == 'ভিডিও':
            y = _yt(d.get('video_url'))
            body = ('<div class="gal-video"><iframe src="https://www.youtube-nocookie.com/embed/%s" title="%s" loading="lazy" allowfullscreen></iframe></div>' % (y, title)) if y else (('<p><a class="btn btn-outline" href="%s" target="_blank" rel="noopener">ভিডিও দেখুন</a></p>' % esc(d['video_url'])) if d.get('video_url') else '')
            if body:
                out['videos'] += '<div class="gal-item">%s%s</div>' % (head, body)
        elif t == 'অডিও' and d.get('file'):
            out['audios'] += '<div class="gal-item">%s<audio controls preload="none" src="%s"></audio></div>' % (head, esc(media(d['file'], '../')))
        elif t == 'ফাইল' and d.get('file'):
            out['files'] += '<div class="gal-item">%s<p><a class="btn btn-outline" href="%s" download>⬇️ ডাউনলোড</a></p></div>' % (head, esc(media(d['file'], '../')))
    return out
