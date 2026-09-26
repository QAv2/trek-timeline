"""Build docs/data/archive.json from parsed MA records + curated overlays."""
import sys, os, json, re, math, datetime, collections
sys.path.insert(0, os.path.dirname(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUR = os.path.join(ROOT, 'data', 'curated')
TODAY = datetime.date.today().isoformat()

LANES = [  # id, label, sub, color token
    ('HISTORY', 'HISTORY', 'CHRONICLE OF RECORD', 'hist'),
    ('ENT', 'ENT', 'ENTERPRISE NX-01', 'ent'),
    ('DIS', 'DIS', 'USS DISCOVERY', 'dis'),
    ('SNW', 'SNW', 'ENTERPRISE · PIKE', 'snw'),
    ('TOS', 'TOS', 'ENTERPRISE · KIRK', 'tos'),
    ('TAS', 'TAS', 'ANIMATED SERIES', 'tas'),
    ('FILM', 'FILMS', 'FEATURE RECORDS', 'film'),
    ('TNG', 'TNG', 'ENTERPRISE-D', 'tng'),
    ('DS9', 'DS9', 'DEEP SPACE 9', 'ds9'),
    ('VOY', 'VOY', 'USS VOYAGER', 'voy'),
    ('LD', 'LD', 'USS CERRITOS', 'ld'),
    ('PRO', 'PRO', 'PROTOSTAR', 'pro'),
    ('PIC', 'PIC', 'PICARD', 'pic'),
    ('SA', 'SFA', 'STARFLEET ACADEMY', 'sa'),
    ('ST', 'SHORTS', 'SHORT TREKS · VST', 'st'),
    ('KELVIN', 'KELVIN', 'ALTERNATE REALITY', 'kelvin'),
    ('MIRROR', 'MIRROR', 'PARALLEL UNIVERSE', 'mirror'),
    ('ALT', 'DIVERGENT', 'ALTERNATE TIMELINES', 'alt'),
]
SERIES_NAME = {
    'TOS': 'Star Trek: The Original Series', 'TAS': 'Star Trek: The Animated Series', 'TNG': 'Star Trek: The Next Generation',
    'DS9': 'Star Trek: Deep Space Nine', 'VOY': 'Star Trek: Voyager', 'ENT': 'Star Trek: Enterprise', 'DIS': 'Star Trek: Discovery',
    'PIC': 'Star Trek: Picard', 'LD': 'Star Trek: Lower Decks', 'PRO': 'Star Trek: Prodigy', 'SNW': 'Star Trek: Strange New Worlds',
    'SA': 'Star Trek: Starfleet Academy', 'ST': 'Star Trek: Short Treks', 'VST': 'Star Trek: Very Short Treks', 'FLM': 'Star Trek films',
}
TNG_ERA = {'TNG', 'DS9', 'VOY', 'LD', 'PRO', 'PIC'}
TOS_CREW = ['James T. Kirk', 'Spock', 'Leonard McCoy', 'Montgomery Scott', 'Hikaru Sulu', 'Pavel Chekov', 'Nyota Uhura']
MIRROR_EPS = {  # MA page titles of episodes set (substantially) in the mirror universe
    'In a Mirror, Darkly (episode)', 'In a Mirror, Darkly, Part II (episode)', 'Mirror, Mirror (episode)',
    'Crossover (episode)', 'Through the Looking Glass (episode)', 'Shattered Mirror (episode)',
    'Resurrection (episode)', 'The Emperor\'s New Cloak (episode)', 'Despite Yourself (episode)',
    'The Wolf Inside (episode)', 'Vaulting Ambition (episode)', "What's Past Is Prologue (episode)",
}
# date overrides: primary placement fixes where MA lists several years
OVR = {
    'tng-4x01': dict(year=2367), 'voy-6x01': dict(t=2376.02), 'ent-3x21': dict(t=2154.06, text='2153–2154'), 'ent-1x22': dict(t=2152.05, text='2151–2152'),
    'dis-5x10': dict(year=3191), 'dis-3x03': dict(year=3189), 'pic-3x07': dict(year=2401), 'pic-2x09': dict(year=2024),
    'pic-3x04': dict(year=2401), 'pic-3x03': dict(year=2401), 'ld-4x10': dict(year=2381), 'snw-4x10': dict(t=2262.97),
    'sa-1x01': dict(year=3196, prec='est'), 'st-2x04': dict(t=2266.5, text='c. 2266–2285', prec='range'),
    'voy-4x23': dict(t=3074.5, text='c. 3074 (far future)', prec='est'),
    'flm-01': dict(t=2273.6, text='2270s (c. 2273)', prec='est'),
    'flm-14': dict(t=2324.5, text='early 24th century', prec='est'),
    'vst-1x01': dict(t=2267.5, text='TOS era', prec='est'),
    'snw-1x01': dict(t=2259.11, prec='date'),
    'ent-4x22': dict(visits=[(2161.25, '2161 (holographic recreation)')]),
    'st-1x02': dict(t=4250.0, text='43rd century', prec='est'),
}


def load(name, default):
    p = os.path.join(CUR, name)
    if os.path.exists(p):
        return json.load(open(p))
    return default


def sd_float(sd):
    try:
        return float(sd)
    except (TypeError, ValueError):
        return None


def frac_from_md(mo, dy):
    if not mo:
        return None
    doy = datetime.date(2001, mo, dy or 15).timetuple().tm_yday
    return (doy - 0.5) / 365.0


def place_records(raw):
    by_series = collections.defaultdict(list)
    for r in raw:
        by_series[r['series']].append(r)
    for s, rs in by_series.items():
        rs.sort(key=lambda r: (r['airdate'] or '9999', r['season'] or 0, r['episode'] or 0))
    out = []
    for r in raw:
        o = OVR.get(r['id'], {})
        yrs = [y for y in r['years'] if 'flashback' not in y[2].lower()]
        prim = None
        if 'year' in o:
            prim = o['year']
        elif yrs:
            prim = yrs[0][0]
        prec = o.get('prec') or ('year' if yrs and yrs[0][1] == 'year' else (yrs[0][1] if yrs else None))
        if r['series'] == 'SA' and prec == 'decade' and 'year' not in o:
            prim, prec = 3196, 'est'
        t = o.get('t')
        sd = sd_float(r['stardate'])
        if t is None and prim is not None:
            f = frac_from_md(r['month'], r['day'])
            if f is not None:
                t, prec = prim + f, 'date'
            elif sd and sd >= 40000 and (r['series'] in TNG_ERA or r['id'] in ('flm-07', 'flm-08', 'flm-09', 'flm-10')):
                ft = 2323 + sd / 1000.0
                if abs(ft - (prim + 0.5)) <= 1.0:
                    t, prec = min(max(ft, prim), prim + 0.999), 'sd'
        r.update(_prim=prim, _t=t, _prec=prec, _sd=sd)
        out.append(r)
    # neighbour fill for undated
    for s, rs in by_series.items():
        for i, r in enumerate(rs):
            if r['_prim'] is None and r['_t'] is None:
                prev = next((x['_prim'] or (x['_t'] and int(x['_t'])) for x in reversed(rs[:i]) if (x['_prim'] or x['_t']) and x['season'] == r['season']), None)
                nxt = next((x['_prim'] or (x['_t'] and int(x['_t'])) for x in rs[i + 1:] if (x['_prim'] or x['_t']) and x['season'] == r['season']), None)
                y = prev or nxt
                if r['_sd'] and r['_sd'] >= 40000 and r['series'] in TNG_ERA:
                    r['_t'], r['_prec'] = 2323 + r['_sd'] / 1000.0, 'sd'
                elif y:
                    r['_prim'], r['_prec'] = int(y), 'est'
    # month-only dates: provisional mid-month, refined against neighbours below
    for r in out:
        if r['_prec'] == 'date' and r['month'] and not r['day']:
            r['_prec'] = 'month'
    # imprecise records that share a year with dated ones: slot them between their dated
    # neighbours in broadcast order (Picard S2's 2401 episodes land before S3's April 24)
    by_lane = collections.defaultdict(list)
    for r in out:
        by_lane[r['lane'] if r['series'] != 'FLM' else r['id']].append(r)
    # records sharing an exact date: nudge apart in broadcast order
    for lane, rs in by_lane.items():
        seen = collections.Counter()
        for r in sorted(rs, key=lambda r: (r['airdate'] or '', r['episode'] or 0)):
            if r['_t'] is None or r['_prec'] not in ('date', 'sd'):
                continue
            key = round(r['_t'], 4)
            if seen[key]:
                r['_t'] += 0.0016 * seen[key]
            seen[key] += 1
    for lane, rs in by_lane.items():
        rs.sort(key=lambda r: (r['airdate'] or '', r['episode'] or 0))
        precise = lambda r: r['_t'] is not None and r['_prec'] in ('date', 'sd')
        i = 0
        while i < len(rs):
            r = rs[i]
            y = r['_prim'] if r['_prim'] is not None else (int(r['_t']) if r['_t'] is not None else None)
            if y is None or precise(r) or r['_prec'] not in ('year', 'est', 'month'):
                i += 1
                continue
            j = i
            while j < len(rs) and not precise(rs[j]) and rs[j]['_prec'] in ('year', 'est', 'month') and (rs[j]['_prim'] == y or (rs[j]['_t'] is not None and int(rs[j]['_t']) == y)):
                j += 1
            prev = next((x for x in reversed(rs[:i]) if precise(x) and int(x['_t']) == y), None)
            nxt = next((x for x in rs[j:] if precise(x) and int(x['_t']) == y), None)
            if prev or nxt:
                run = rs[i:j]
                lo = prev['_t'] if prev else y + 0.02
                hi = nxt['_t'] if nxt else y + 0.98
                if run[0]['_prec'] == 'month' and run[0]['month']:
                    m0 = y + (run[0]['month'] - 1) / 12.0
                    lo, hi = max(lo, m0), min(hi, m0 + 1 / 12.0) if nxt is None or nxt['_t'] > m0 + 1 / 12.0 else hi
                    if hi <= lo:
                        hi = lo + 0.01
                for k, x in enumerate(run):
                    x['_t'] = lo + (hi - lo) * (k + 1) / (len(run) + 1)
                    x['_fixed'] = True
            i = j
    # spread remaining imprecise records within (lane, year)
    groups = collections.defaultdict(list)
    for r in out:
        if r['_t'] is None and r['_prim'] is not None and not r.get('_fixed'):
            groups[(r['lane'] if r['series'] != 'FLM' else r['id'], r['_prim'])].append(r)
    for (lane, y), rs in groups.items():
        tos_like = all(x['_sd'] and x['_sd'] < 10000 for x in rs) and rs[0]['series'] in ('TOS', 'TAS')
        rs.sort(key=(lambda x: x['_sd']) if tos_like else (lambda x: (x['airdate'] or '', x['episode'] or 0)))
        n = len(rs)
        for i, x in enumerate(rs):
            x['_t'] = y + 0.06 + 0.88 * (i + 0.5) / n if n > 1 else y + 0.5
    return out


def ttext(r):
    o = OVR.get(r['id'], {})
    if 'text' in o:
        return o['text']
    y = r['_prim'] if r['_prim'] is not None else int(r['_t'])
    if r['month']:
        mn = datetime.date(2001, r['month'], 1).strftime('%B')
        return f"{mn} {r['day']}, {y}" if r['day'] else f"{mn} {y}"
    if r['_prec'] == 'decade':
        return f"{int(y) // 10 * 10}s"
    if r['_prec'] == 'century':
        c = int(y) // 100 + 1
        return f"{c}{'th' if 10 <= c % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(c % 10, 'th')} century"
    if r['_prec'] == 'est':
        return f"c. {y}"
    return str(y)


def main():
    raw = json.load(open(os.path.join(ROOT, 'build', 'records.raw.json')))
    raw = [r for r in raw if (r['airdate'] or '0') <= TODAY or r['series'] == 'FLM' and r['airdate']]
    recs = place_records(raw)
    # own-words loglines replace Memory Alpha's lead blurbs where written
    lines = {}
    ldir = os.path.join(CUR, 'loglines')
    if os.path.isdir(ldir):
        for f in sorted(os.listdir(ldir)):
            if f.startswith('out-') and f.endswith('.json'):
                try:
                    lines.update(json.load(open(os.path.join(ldir, f))))
                except ValueError:
                    print('skipping unreadable', f)
    # characters: count appearances (excluding credit-only)
    cnt = collections.Counter()
    for r in recs:
        if r['id'] in ('flm-02',):
            have = {c['c'] for c in r['cast']}
            r['cast'] = [{'c': n, 'a': None, 'credit_only': False, 'archive': False, 'voice': False} for n in TOS_CREW if n not in have] + r['cast']
        for c in r['cast']:
            if not c['credit_only']:
                cnt[c['c']] += 1
    curated_people = load('personnel.json', [])
    actors = {c['a'] for r in recs for c in r['cast'] if c.get('a')}
    keep = {k for k, v in cnt.items() if v >= 1 and not GENERIC_NAME.search(k) and k[:1].isupper()
            and not (k in actors and v < 5)} | {p.get('ma') for p in curated_people}
    for th in load_threads():
        keep |= set(th.get('people', []))
    people = sorted(keep - {None}, key=lambda k: (-cnt.get(k, 0), k))
    pidx = {k: i for i, k in enumerate(people)}
    out_recs = []
    for r in sorted(recs, key=lambda r: r['_t'] if r['_t'] is not None else 9e9):
        if r['_t'] is None:
            print('UNPLACED', r['id'], r['title'], r['dateRaw'])
            continue
        tl = 'kelvin' if r['lane'] == 'KELVIN' else 'mirror' if r['ma'] in MIRROR_EPS else 'prime'
        if 'alternate' in (r['dateRaw'] or '').lower():
            tl = 'alt'
        visits = []
        for y, kind, label in r['other']:
            visits.append({'t': y + 0.5, 'x': label})
        for vt, vx in OVR.get(r['id'], {}).get('visits', []):
            visits.append({'t': vt, 'x': vx})
        if r['id'] == 'flm-14':
            visits = []
        out_recs.append({
            'id': r['id'], 's': r['series'], 'l': r['lane'], 'ti': r['title'], 'se': r['season'], 'ep': r['episode'],
            'n': r['num'], 'ad': r['airdate'], 'sd': r['stardate'], 't': round(r['_t'], 4), 'tt': ttext(r), 'pr': r['_prec'],
            'tl': tl, 'lg': (lines.get(r['id']) or r['logline']).strip(), 'lgs': 'tic' if lines.get(r['id']) else 'ma',
            'v': visits, 'ma': r['ma'], 'dr': r['dateRaw'], 'or': r['otherRaw'],
            'c': ordered_cast(r['cast'], pidx)[0], 'cu': ordered_cast(r['cast'], pidx)[1],
            'ca': sorted({pidx[c['c']] for c in r['cast'] if c.get('archive') and c['c'] in pidx and not c.get('credit_only')}),
            'sh': r.get('short'),
        })
    archive = {
        'meta': {'built': TODAY, 'records': len(out_recs), 'people': len(people),
                 'source': 'Memory Alpha (memory-alpha.fandom.com), CC BY-NC; curated overlays'},
        'lanes': [dict(id=a, label=b, sub=c, tok=d) for a, b, c, d in LANES],
        'series': SERIES_NAME,
        'records': out_recs,
        'people': [{'k': k, 'n': cnt.get(k, 0)} for k in people],
        'events': load('events-early.json', []) + load('events-late.json', []),
        'incursions': load('incursions.json', []),
        'divergences': load('divergences.json', {}).get('divergences', []),
        'crossings': load('divergences.json', {}).get('crossings', []),
        'threads': load_threads(),
        'personnel': curated_people,
    }
    os.makedirs(os.path.join(ROOT, 'docs', 'data'), exist_ok=True)
    p = os.path.join(ROOT, 'docs', 'data', 'archive.json')
    json.dump(archive, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
    print('loglines:', sum(1 for r in out_recs if r['lgs'] == 'tic'), 'own-words,', sum(1 for r in out_recs if r['lgs'] == 'ma'), 'Memory Alpha')
    print('wrote', p, os.path.getsize(p) // 1024, 'KB;', len(out_recs), 'records;', len(people), 'people;',
          len(archive['events']), 'events;', len(archive['incursions']), 'incursions;', len(archive['divergences']), 'divergences;',
          len(archive['threads']), 'threads')


GENERIC_NAME = re.compile(r'\b\d{3}\b|(?:^|\s)\d+$|^(Unnamed|Unknown|Human \d|Mirror universe |Kelpien mirror|MACO mirror)|'
                          r'(?:crew|personnel|officer|ensign|crewman|patron|citizens?|guard|pilgrim|passerby|nurse) \d', re.I)


def ordered_cast(cast, pidx):
    """Credited cast in billing order, then uncredited; returns (indices, n_credited)."""
    seen, cred, unc = set(), [], []
    for c in cast:
        k = c['c']
        if c.get('credit_only') or c.get('archive') or k not in pidx or k in seen:
            continue
        seen.add(k)
        (unc if c.get('unc') else cred).append(pidx[k])
    return cred + unc, len(cred)


def load_threads():
    th = []
    d = os.path.join(CUR, 'threads')
    if os.path.isdir(d):
        for f in sorted(os.listdir(d)):
            if f.endswith('.json'):
                x = json.load(open(os.path.join(d, f)))
                th += x if isinstance(x, list) else [x]
    for t in th:
        if os.path.exists(os.path.join(ROOT, 'docs', 'briefs', f"{t.get('id')}.html")):
            t['brief'] = f"briefs/{t['id']}.html"
    return th


if __name__ == '__main__':
    main()
