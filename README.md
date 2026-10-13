# সৃজনশীল তরুণ সংঘ — ওয়েবসাইট

স্ট্যাটিক ওয়েবসাইট (GitHub Pages)। হোম পেইজ + ২৪টি মেনু-পেইজ + অনলাইন সদস্য আবেদন ফরম।

## ফোল্ডার
| পথ | কাজ |
|---|---|
| `index.html`, `pages/*.html` | তৈরি করা পেইজ (এগুলো সরাসরি এডিট না করে `tools/` থেকে বিল্ড করুন) |
| `tools/` | পেইজ জেনারেটর (`python3 tools/build.py`) ও লেখা (`pages_content.py`) |
| `assets/` | CSS, JS (`apply.js` = ফরম, `pdf-form.js` = পিডিএফ), ছবি |
| `data/geo.json` | বিভাগ→জেলা→উপজেলা/থানা ও দেশের তালিকা |
| `apps-script/Code.gs` | গুগল শিট ও ড্রাইভে সংরক্ষণের ব্যাকএন্ড |
| `config.js` | Apps Script ওয়েব অ্যাপের লিংক |

## লেখা বদলাতে
`tools/pages_content.py` (মেনু-পেইজ) বা `tools/build.py` (হোম) এডিট করে `python3 tools/build.py` চালান, তারপর কমিট করুন।

## Apps Script সেটআপ (একবার)
1. srijonshil2011@gmail.com অ্যাকাউন্টে script.google.com-এ প্রজেক্ট খুলে `apps-script/Code.gs` পেস্ট করুন।
2. Deploy → New deployment → Web app → **Execute as: Me**, **Who has access: Anyone**।
3. প্রথমবার অনুমতি (Sheets, Drive) দিন। লিংক `config.js`-এ বসান।
4. কোড বদলালে Deploy → Manage deployments → Edit → **New version** (লিংক একই থাকে)।

## GitHub Pages
Settings → Pages → Source: `main` / root।
