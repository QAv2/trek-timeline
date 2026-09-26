"""Audit portraits against the medium of each person's appearances.

Memory Alpha tags every image "Memory Alpha files by production (SERIES: Episode)". A person seen
mostly in live action should not wear an animated image (Kira's lead image is her Lower Decks
cameo), and a mostly-animated person should wear their animated look (Mariner's lead image is
the live-action SNW crossover). For each mismatch, pick a replacement from the images on that
person's own page, matched on medium and main series, and write data/portrait_pins.json.

  python3 tools/audit_portraits.py            # audit + choose replacements
  python3 tools/fetch_portraits.py pin        # then apply them
"""
import sys, os, re, json, statistics, collections
sys.path.insert(0, os.path.dirname(__file__))
import ma

ROOT = ma.ROOT
ANIMATED_SERIES = {'LD', 'PRO', 'TAS', 'VST', 'SCO'}
ANIMATED_RECORDS = {'st-2x04', 'st-2x05'}  # Short Treks' two animated shorts
ANIMATED_EPISODES = {'Ephraim and Dot', 'The Girl Who Made the Stars'}


def image_animated(prods):
    return all(s in ANIMATED_SERIES or ep in ANIMATED_EPISODES for s, ep in prods)
PROD = re.compile(r'files by production \((\w+):\s*(.*)\)$')


def animated(rec):
    return rec['s'] in ANIMATED_SERIES or rec['id'] in ANIMATED_RECORDS


def categories(files):
    """File name -> list of (series, episode) productions."""
    out = {}
    files = sorted(set(files))
    for i in range(0, len(files), 50):
        chunk = files[i:i + 50]
        cont = {}
        while True:
            d = ma._get(dict({'action': 'query', 'prop': 'categories', 'cllimit': 'max',
                              'titles': '|'.join('File:' + f.replace('_', ' ') for f in chunk)}, **cont))
            for p in d['query']['pages']:
                f = p['title'][5:].replace(' ', '_')
                for c in p.get('categories', []):
                    m = PROD.search(c['title'])
                    if m:
                        out.setdefault(f, []).append((m.group(1), m.group(2)))
                out.setdefault(f, out.get(f, []))
            if 'continue' in d:
                cont = d['continue']
            else:
                break
    return out


def main():
    A = json.load(open(os.path.join(ROOT, 'docs', 'data', 'archive.json')))
    man = json.load(open(os.path.join(ROOT, 'data', 'portraits.json')))
    people = A['people']
    recs = A['records']
    by_person = collections.defaultdict(list)
    for r in recs:
        for i in r['c']:
            by_person[people[i]['k']].append(r)
    have = {k: v for k, v in man.items() if v}
    print('portraits to audit:', len(have))
    cats = categories([v['file'] for v in have.values()])
    flagged = []
    for k, v in have.items():
        rs = by_person.get(k, [])
        if not rs:
            continue
        n_anim = sum(1 for r in rs if animated(r))
        n_live = len(rs) - n_anim
        prods = cats.get(v['file'], [])
        img_series = {s for s, _ in prods}
        if not img_series:
            continue
        img_anim = image_animated(prods)
        want_anim = n_anim > n_live
        if img_anim != want_anim:
            main_series = collections.Counter(r['s'] for r in rs if animated(r) == want_anim).most_common(1)[0][0]
            years = [r['t'] for r in rs if animated(r) == want_anim]
            flagged.append({'k': k, 'file': v['file'], 'img': sorted(img_series), 'live': n_live, 'anim': n_anim,
                            'want': 'animated' if want_anim else 'live-action', 'series': main_series,
                            'year': statistics.median(years)})
    print('mismatches:', len(flagged))
    for f in sorted(flagged, key=lambda x: -(x['live'] + x['anim'])):
        print(f"  {f['k']:32} image {','.join(f['img']):8} live {f['live']:3} anim {f['anim']:3} -> want {f['want']} ({f['series']})")

    # replacements: images on the person's own page, right medium, main series first, era nearest their appearances
    pins = {}
    for f in flagged:
        d = ma._get({'action': 'query', 'prop': 'images', 'imlimit': 'max', 'titles': f['k']})
        imgs = [i['title'][5:].replace(' ', '_') for p in d['query']['pages'] for i in p.get('images', [])]
        name_bits = [w for w in re.split(r'[\s_]+', re.sub(r'\(.*?\)', '', f['k'])) if len(w) > 2]
        cands = [x for x in imgs if re.search(r'\.(jpe?g|png|webp)$', x, re.I) and any(b.lower() in x.lower() for b in name_bits)
                 and not re.search(r'_and_|_with_|_&_|montage|comparison|poster|logo', x, re.I)]
        if not cands:
            continue
        cc = categories(cands)
        best, score = None, -1e9
        for x in cands:
            ser = {s for s, _ in cc.get(x, [])}
            if not ser:
                continue
            is_anim = image_animated(cc.get(x, []))
            if is_anim != (f['want'] == 'animated'):
                continue
            ym = re.search(r'(\d{4})', x)
            s = (10 if f['series'] in ser else 0) - (abs(int(ym.group(1)) - f['year']) / 10 if ym else 3)
            s -= 2 if re.search(r'hologram|mirror|alternate|young|old|child|kid', x, re.I) and not re.search(r'hologram|mirror|alternate', f['k'], re.I) else 0
            if s > score:
                best, score = x, s
        if best:
            pins[f['k']] = best.replace('_', ' ')
    # a live-action person with no live-action image on file: better the placeholder than a cartoon
    for f in flagged:
        if f['k'] not in pins and f['want'] == 'live-action':
            pins[f['k']] = None
    out = os.path.join(ROOT, 'data', 'portrait_pins.json')
    json.dump(pins, open(out, 'w'), indent=1, ensure_ascii=False, sort_keys=True)
    print(f'replacements: {sum(1 for v in pins.values() if v)}, set to placeholder: {sum(1 for v in pins.values() if v is None)}, of {len(flagged)} -> {out}')
    for k in sorted(pins):
        print(f'  {k:40} -> {pins[k]}')
    left = [f['k'] for f in flagged if f['k'] not in pins]
    if left:
        print('kept as is (animated-series person with a live-action image and no animated one on file):', left)


if __name__ == '__main__':
    main()
