#!/usr/bin/env python3
"""উপজেলা (TXT), থানা (MD) ও দেশের তালিকা (MD) থেকে data/geo.json তৈরি করে।
ব্যবহার: python3 tools/build_geo.py <upazila.txt> <thana.md> <countries.md> data/geo.json
"""
import json, re, sys, unicodedata

def nfc(s):
    return unicodedata.normalize('NFC', s)


CITY_CORPS = {
    'ঢাকা': ['ঢাকা উত্তর সিটি কর্পোরেশন', 'ঢাকা দক্ষিণ সিটি কর্পোরেশন'],
    'গাজীপুর': ['গাজীপুর সিটি কর্পোরেশন'], 'নারায়ণগঞ্জ': ['নারায়ণগঞ্জ সিটি কর্পোরেশন'],
    'চট্টগ্রাম': ['চট্টগ্রাম সিটি কর্পোরেশন'], 'কুমিল্লা': ['কুমিল্লা সিটি কর্পোরেশন'],
    'সিলেট': ['সিলেট সিটি কর্পোরেশন'], 'রাজশাহী': ['রাজশাহী সিটি কর্পোরেশন'],
    'খুলনা': ['খুলনা সিটি কর্পোরেশন'], 'বরিশাল': ['বরিশাল সিটি কর্পোরেশন'],
    'রংপুর': ['রংপুর সিটি কর্পোরেশন'], 'ময়মনসিংহ': ['ময়মনসিংহ সিটি কর্পোরেশন'],
}

def norm_district(s):
    s = nfc(s).strip()
    s = re.sub(r'\s*(পার্বত্য\s*)?জেলা\s*$', '', s)
    fix = {'বগুরা': 'বগুড়া', 'রাঙামাটি': 'রাঙ্গামাটি', 'রাঙ্গামাটি পার্বত্য': 'রাঙ্গামাটি',
           'মুন্সিগঞ্জ': 'মুন্সীগঞ্জ', 'নেত্রকোনা': 'নেত্রকোণা'}
    return fix.get(s, s)

def clean_upazila(s):
    s = nfc(s).strip().rstrip(',').strip()
    s = re.sub(r'^উপজেলা\s+', '', s)
    s = re.sub(r'\s*উপজেলা\s*,.*$', '', s)      # "শেরপুর উপজেলা, বগুড়া"
    s = re.sub(r',.*$', '', s)                   # "মতলব দক্ষিণ,চাঁদপুর"
    s = re.sub(r'\s*উপজেলা\s*$', '', s).strip()
    return s + ' উপজেলা'

def parse_upazila(path):
    divs, cur_div, cur_dist = [], None, None
    for raw in open(path, encoding='utf8'):
        line = raw.strip()
        if not line or re.fullmatch(r'জেলা\s+উপজেলা', line):
            continue
        m = re.match(r'^[০-৯]+[।.]\s*(.+?)\s*$', line)
        if m and 'বিভাগ' in m.group(1) and 'জেলা' not in m.group(1):
            line = m.group(1)
        if line.endswith('বিভাগ') and 'জেলা' not in line:
            cur_div = {'name': line.replace(' বিভাগ', ''), 'districts': []}
            divs.append(cur_div); cur_dist = None; continue
        head = re.match(r'^(?:[০-৯]+[.।]\s*)?(.+?জেলা)\s*(.*)$', line)
        if head and ('উপজেলা' not in head.group(1).replace('জেলা', '', 1) or True) and not line.startswith('উপজেলা') and 'উপজেলা' not in head.group(1):
            cur_dist = {'name': norm_district(head.group(1)), 'upazilas': [], 'thanas': []}
            cur_div['districts'].append(cur_dist)
            rest = head.group(2).strip()
            if rest:
                cur_dist['upazilas'].append(clean_upazila(rest))
            continue
        if cur_dist is not None:
            cur_dist['upazilas'].append(clean_upazila(line))
    return divs

def parse_thana(path):
    out, cur = {}, None
    for line in open(path, encoding='utf8'):
        line = line.strip()
        m = re.match(r'^###\s+(.+?)\s*$', line)
        if m:
            cur = norm_district(m.group(1)); out.setdefault(cur, []); continue
        if cur:
            m = re.match(r'^\[([^\]]+থানা[^\]]*)\]\(', line)
            if m:
                name = nfc(re.sub(r',\s*ঢাকা$', '', m.group(1).strip()))
                if name not in out[cur]:
                    out[cur].append(name)
    return out

def parse_countries(path):
    names = []
    for line in open(path, encoding='utf8'):
        line = line.strip()
        m = re.match(r'^\[([^\]\(]+)\]\((https?://[^)]+)', line)
        if m and 'thumb.wikimedia' not in m.group(1) and not m.group(1).startswith('http'):
            names.append(nfc(m.group(1).strip()))
    return names

if __name__ == '__main__':
    up, th, co, outp = sys.argv[1:5]
    divs = parse_upazila(up)
    thanas = parse_thana(th)
    used = set()
    for d in divs:
        for dist in d['districts']:
            dist['thanas'] = thanas.get(dist['name'], [])
            if not dist['thanas']:   # থানা তালিকায় নেই (যেমন লক্ষ্মীপুর): উপজেলা থেকে তৈরি
                dist['thanas'] = [re.sub(r'\s*উপজেলা$', ' থানা', u) for u in dist['upazilas']]
                dist['thanas_derived'] = True
            used.add(dist['name'])
            seen = list(CITY_CORPS.get(dist['name'], []))
            for u in dist['upazilas']:
                if u not in seen: seen.append(u)
            dist['upazilas'] = seen
    missing = set(thanas) - used
    countries = parse_countries(co)
    json.dump({'divisions': divs, 'countries': countries}, open(outp, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print('divisions', len(divs), 'districts', sum(len(d['districts']) for d in divs))
    print('thana districts unmatched:', missing)
    print('thanas derived from upazilas:', [x['name'] for d in divs for x in d['districts'] if x.get('thanas_derived')])
    print('countries', len(countries))
