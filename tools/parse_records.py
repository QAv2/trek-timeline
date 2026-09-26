"""Parse cached Memory Alpha episode/film pages into build/records.raw.json."""
import sys, os, json, re, datetime
sys.path.insert(0, os.path.dirname(__file__))
import ma

ROOT = ma.ROOT
MONTHS = {m: i for i, m in enumerate(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
                                      'September', 'October', 'November', 'December'], 1)}
FILM_IDS = {  # page -> (id, lane, short title)
    'Star Trek: The Motion Picture': ('flm-01', 'FILM', 'TMP'), 'Star Trek II: The Wrath of Khan': ('flm-02', 'FILM', 'TWOK'),
    'Star Trek III: The Search for Spock': ('flm-03', 'FILM', 'TSFS'), 'Star Trek IV: The Voyage Home': ('flm-04', 'FILM', 'TVH'),
    'Star Trek V: The Final Frontier': ('flm-05', 'FILM', 'TFF'), 'Star Trek VI: The Undiscovered Country': ('flm-06', 'FILM', 'TUC'),
    'Star Trek Generations': ('flm-07', 'FILM', 'GEN'), 'Star Trek: First Contact': ('flm-08', 'FILM', 'FC'),
    'Star Trek: Insurrection': ('flm-09', 'FILM', 'INS'), 'Star Trek Nemesis': ('flm-10', 'FILM', 'NEM'),
    'Star Trek (film)': ('flm-11', 'KELVIN', 'ST09'), 'Star Trek Into Darkness': ('flm-12', 'KELVIN', 'STID'),
    'Star Trek Beyond': ('flm-13', 'KELVIN', 'STB'), 'Star Trek: Section 31': ('flm-14', 'FILM', 'S31'),
}
SKIP_CAST_SECTIONS = re.compile(r'stunt|stand-in|double|references|external|see also|background|production|'
                                r'cast|crew|credits|bibliography|apocrypha', re.I)
GENERIC = re.compile(r'^(Unnamed|Unknown|Human \d|US |.* personnel$|.* Computer$|Computer voice)', re.I)


def find_template(text, name_re):
    m = re.search(r'\{\{\s*' + name_re, text)
    if not m:
        return None, None
    i, j, depth = m.start(), m.start(), 0
    while j < len(text):
        if text.startswith('{{', j):
            depth += 1; j += 2; continue
        if text.startswith('}}', j):
            depth -= 1; j += 2
            if depth == 0:
                break
            continue
        j += 1
    return text[i:j], j


def tparams(body):
    """Split a template body into params (top-level pipes only)."""
    inner = body[2:-2]
    parts, depth, cur, i = [], 0, '', 0
    while i < len(inner):
        two = inner[i:i + 2]
        if two in ('{{', '[['):
            depth += 1; cur += two; i += 2; continue
        if two in ('}}', ']]'):
            depth -= 1; cur += two; i += 2; continue
        if inner[i] == '|' and depth == 0:
            parts.append(cur); cur = ''; i += 1; continue
        cur += inner[i]; i += 1
    parts.append(cur)
    out = {}
    for p in parts[1:]:
        if '=' in p:
            k, v = p.split('=', 1)
            out[k.strip()] = re.sub(r'<!--.*?-->', '', v, flags=re.S).strip()
    return out


def plain(s):
    """Wikitext -> plain text (links, simple templates, entities)."""
    s = re.sub(r'<sup>.*?</sup>', '', s, flags=re.S)
    s = re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>', '', s, flags=re.S)
    s = re.sub(r'\{\{anchor\|[^}]*\}\}', '', s)
    s = re.sub(r'\{\{NIR\}\}:?', '', s)
    for _ in range(3):
        s = re.sub(r'\{\{(?:small|s)\|([^{}]*)\}\}', r'\1', s)
        s = re.sub(r'\{\{dis\|([^|{}]*)\|[^{}]*\}\}', lambda m: m.group(1), s)
        s = re.sub(r'\{\{dis\|[^|{}]*\|[^|{}]*\|([^{}]*)\}\}', r'\1', s)
        s = re.sub(r'\{\{(?:USS|ISS|IKS|RIS|USSr|class)\|([^|{}]*)(?:\|[^{}]*)?\}\}', r'\1', s)
        s = re.sub(r'\{\{[^{}]*\}\}', '', s)
    s = re.sub(r'\[\[(?:File|Image):[^\]]*\]\]', '', s)
    s = re.sub(r'\[\[[^\]|]*\|([^\]]*)\]\]', r'\1', s)
    s = re.sub(r'\[\[([^\]]*)\]\]', r'\1', s)
    s = re.sub(r"'''?", '', s)
    s = s.replace('&ndash;', '–').replace('&mdash;', '—').replace('&nbsp;', ' ').replace('&amp;', '&')
    s = re.sub(r'<br\s*/?>', ' / ', s)
    s = re.sub(r'<[^>]+>', '', s)
    return re.sub(r'\s+', ' ', s).strip()


def years_in(raw):
    """Year-ish tokens from a raw date field, in order. Returns [(value, kind, label)]."""
    out = []
    # linked years / decades / centuries (with optional display)
    for m in re.finditer(r'\[\[([^\]|]*)(?:\|([^\]]*))?\]\]', raw):
        tgt, disp = m.group(1), m.group(2) or m.group(1)
        for cand in (disp, tgt):
            y = re.fullmatch(r'(?:ca\. )?(-?\d{3,4})', cand.strip())
            d = re.fullmatch(r'(?:[Ee]arly |[Ll]ate |[Mm]id-?)?(\d{3,4})s', cand.strip())
            c = re.fullmatch(r'(\d{1,2})(?:st|nd|rd|th) century', cand.strip())
            if y:
                out.append((int(y.group(1)), 'year', cand.strip(), m.start())); break
            if d:
                base = int(d.group(1)); pre = cand.strip().lower()
                off = 2 if pre.startswith('early') else 8 if pre.startswith('late') else 5
                out.append((base + off, 'decade', cand.strip(), m.start())); break
            if c:
                cen = int(c.group(1)); out.append(((cen - 1) * 100 + 50, 'century', cand.strip(), m.start())); break
    # bare 4-digit years not in links and not part of stardates (no decimal point, not 5+ digits)
    cleaned = re.sub(r'\[\[[^\]]*\]\]', lambda m: ' ' * len(m.group(0)), raw)
    for m in re.finditer(r'(?<![\d.])([12]\d{3}|3[0-2]\d{2})(?![\d.]|s\b)', cleaned):
        pre = cleaned[max(0, m.start() - 10):m.start()]
        if 'tardate' in pre:
            continue
        out.append((int(m.group(1)), 'year', m.group(1), m.start()))
    out.sort(key=lambda x: x[3])
    return [(v, k, l) for v, k, l, _ in out]


def month_day(raw, year_pos_hint=None):
    s = plain(raw)
    m = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{1,2})?(?:st|nd|rd|th)?', s)
    m2 = re.search(r'(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)', s)
    if m2:
        return MONTHS[m2.group(2)], int(m2.group(1))
    if m:
        return MONTHS[m.group(1)], int(m.group(2)) if m.group(2) else None
    return None, None


def stardate_of(raw):
    s = plain(raw)
    s = s.split('(')[0]
    m = re.search(r'(?<![\d])(\d{4,6}\.\d+|\d{5,6})(?![\d])', s)
    if m:
        return m.group(1)
    m = re.search(r'(?<![\d])(\d{1,4}\.\d+)(?![\d])', s)
    return m.group(1) if m else None


def logline(text, end):
    rest = text[end:]
    stop = re.search(r'^==', rest, re.M)
    lead = rest[:stop.start()] if stop else rest[:3000]
    lines = []
    for ln in lead.split('\n'):
        l = ln.strip()
        if not l or l.startswith('{{') or l.startswith('[[File') or l.startswith('[[Image') or l.startswith('__'):
            continue
        if l.startswith(':-') or l.startswith(': -'):
            continue
        lines.append(l)
    txt = plain(' '.join(lines))
    txt = re.sub(r'^:\s*', '', txt)
    txt = re.sub(r'\((?:Season|Series) (?:premiere|finale)\)', '', txt, flags=re.I).strip()
    return txt


RANK = re.compile(r"^(Capt\.?|Captain|Cmdr\.?|Commander|Lt\.?( Cmdr\.?| Commander| j\.?g\.?)?|Lieutenant.*|Ensign|Doctor|Dr\.?|"
                  r".*Admiral|Commodore|Chief.*|.*Petty Officer|Crewman.*|Cadet|Yeoman|Counselor|Nurse|Mr\.?|Mrs\.?|Ms\.?|Major|"
                  r"Colonel|General|Gul|Legate|Glinn|Kai|Vedek|Grand Nagus|Nagus|Chancellor|Ambassador|President|Senator|Proconsul|"
                  r"Praetor|Subcommander|Commander \(rank\)|Centurion|Sergeant|Corporal|Private|Specialist|Professor|Emperor|Empress|"
                  r"Regent|Constable|Magistrate|Sister|Brother|Father|Mother|Minister|Governor|Mayor|Admiral|Dal|Seven|Rank)$", re.I)
ROLE_TOKEN = re.compile(r"\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]"
                        r"|\{\{[Dd]is\|([^|{}]*)\|([^|{}]*)(?:\|[^{}]*)?\}\}"
                        r"|\{\{(mu|MU|NIR|nir)\|([^|{}]*)(?:\|[^{}]*)?\}\}")
CAST_SECTION_OK = re.compile(r"star|featuring|cast|with|and|co-?star|guest|special|voice|appear|also", re.I)
CAST_SECTION_BAD = re.compile(r"stunt|stand-in|double|references|background characters|external|see also|production|"
                              r"crew|credits|bibliography|apocrypha|uncredited", re.I)


def role_targets(s):
    out = []
    for m in ROLE_TOKEN.finditer(s):
        if m.group(1) is not None:
            tgt = m.group(1).strip()
        elif m.group(2) is not None:
            tgt = f"{m.group(2).strip()} ({m.group(3).strip()})"
        else:
            kind = m.group(4).lower()
            tgt = f"{m.group(5).strip()} ({'mirror' if kind == 'mu' else 'alternate reality'})"
        if not tgt or GENERIC.search(tgt) or RANK.match(tgt):
            continue
        out.append(tgt)
    return out


_TCACHE = {}


def _fetch(title):
    if title not in _TCACHE:
        _TCACHE[title] = ma.wikitext_many([title])[title]["text"] or ""
    return _TCACHE[title]


def cast_area(text, title):
    m = re.search(r"^==\s*Links and references\s*==", text, re.M)
    if m:
        seg = text[m.start():]
        nxt = re.search(r"^==[^=]", seg[5:], re.M)
        if nxt:
            seg = seg[:nxt.start() + 5]
    else:
        seg = ""
    if not re.search(r"^\*.*\bas\b", seg, re.M) and not re.search(r"\{\{[^{}]*Cast|#lst:", seg):
        m2 = re.search(r"^===\s*Starring\s*===", text, re.M)
        if m2:
            seg = text[m2.start():]
            end = re.search(r"^===\s*References\s*===", seg, re.M)
            seg = seg[:end.start()] if end else seg[:6000]
    # expand cast templates, e.g. {{DS9 Cast (S1-S3)}}
    def tx(mt):
        body = _fetch("Template:" + re.sub(r"\s+", " ", mt.group(1)).strip())
        return re.sub(r"<noinclude>.*?</noinclude>", "", body, flags=re.S)
    seg = re.sub(r"\{\{((?:TOS|TAS|TNG|DS9|VOY|ENT|DIS|PIC|LD|PRO|SNW|SA) Cast[^{}|]*)\}\}", tx, seg)
    # transcluded film credits
    def lst(mt):
        body = _fetch(mt.group(1).strip())
        a, b = body.find("<section begin=credits />"), body.find("<section end=credits />")
        return body[a:b] if a >= 0 else body
    seg = re.sub(r"\{\{#lst:([^|{}]*)\|[^{}]*\}\}", lst, seg)
    return seg


def film_line(ln):
    s = ln.strip()
    if not s.startswith("*") or " as " in s:
        return None
    m = re.match(r"^\*+\s*(.*?)\s*(?:&ndash;|–)\s*(.*)$", s)
    if not m:
        return None
    tg = role_targets(m.group(1))
    am = re.search(r"\[\[([^\]|]*)", m.group(2))
    return (tg[0], am.group(1) if am else m.group(2)) if tg else None


def cast_of(text, title=""):
    seg = cast_area(text, title)
    if not seg:
        return []
    film_extra = []
    for ln in seg.split("\n"):
        fm = film_line(ln)
        if fm:
            film_extra.append({"c": fm[0], "a": fm[1], "credit_only": False,
                               "archive": False, "voice": False, "unc": False, "sec": "credits"})
    out, section, actor, pending = [], "", None, None
    for ln in seg.split("\n"):
        h = re.match(r"^===+\s*(.*?)\s*===+", ln)
        if h:
            section = h.group(1); actor = None; continue
        uncredited = bool(re.search(r"uncredited", section, re.I))
        if CAST_SECTION_BAD.search(section) and not uncredited:
            continue
        if section and not CAST_SECTION_OK.search(section) and not uncredited:
            continue
        s = ln.strip()
        if s.startswith("**") and actor:
            role_part, flags_src = s.lstrip("*"), s.lower()
        elif s.startswith("*"):
            am = re.match(r"^\*+\s*\[\[([^\]|]*)", s)
            actor = am.group(1) if am else None
            if " as" not in s:
                continue
            role_part = s.split(" as", 1)[1]
            flags_src = s.lower()
            if not role_part.strip():
                continue  # roles follow on ** lines
        else:
            continue
        credit_only = "credit only" in flags_src or "does not appear" in flags_src
        archive = "archive" in flags_src or "recording" in flags_src or bool(re.search(r"archive|footage|appearing in the original|stock", section, re.I))
        voice = "(voice" in flags_src
        tg = role_targets(role_part)
        if tg:
            out.append({"c": tg[0], "a": actor, "credit_only": credit_only, "archive": archive, "voice": voice,
                        "unc": uncredited, "sec": section})
    out = film_extra + out
    seen = {}
    for c in out:
        k = c["c"]
        if k not in seen or (seen[k]["credit_only"] and not c["credit_only"]):
            seen[k] = c
    return list(seen.values())


def main():
    pages = json.load(open(os.path.join(ma.CACHE, 'pagelist.json')))
    got = ma.wikitext_many([t for _, t in pages])
    N, Sx, A, P = (ma.lua_table(f'Module:EpisodeData/{x}') for x in 'NSAP')
    Y, M, D = (ma.lua_table(f'Module:EpisodeData/{x}') for x in 'YMD')
    recs = []
    for series, title in pages:
        text = got[title]['text']
        body, end = find_template(text, r'[Ss]idebar (?:episode|film)')
        if not body:
            continue
        prm = tparams(body)
        key = re.sub(r' \((?:episode|film)\)$', '', title)
        if key not in N and key not in A:
            low = {k.lower(): k for k in A}
            key = low.get(key.lower(), key)
        if title == 'Star Trek (film)':
            key = 'Star Trek'
        raw_date, raw_other = prm.get('date', ''), prm.get('other date', '')
        yrs = years_in(raw_date)
        oth = years_in(raw_other)
        sd = stardate_of(raw_date)
        mo, dy = month_day(raw_date)
        # airdate
        ad = None
        try:
            ad = datetime.date(int(Y[key]), MONTHS[M[key]], int(D[key])).isoformat()
        except Exception:
            pass
        if series == 'FLM':
            fid, lane, short = FILM_IDS[title]
            rid, season, epn = fid, None, int(fid.split('-')[1])
        else:
            lane = 'ST' if series == 'VST' else series
            n = N.get(key, '')
            mm = re.match(r'(\d+)x(\d+)', n)
            season, epn = (int(mm.group(1)), int(mm.group(2))) if mm else (int(Sx.get(key, 0) or 0), None)
            rid = f"{series.lower()}-{n.replace('/', '-')}" if n else f"{series.lower()}-{re.sub(r'[^a-z0-9]+', '-', key.lower())}"
            short = None
        recs.append({
            'id': rid, 'series': series, 'lane': lane, 'ma': title, 'title': key if series != 'FLM' else title,
            'season': season, 'episode': epn, 'num': N.get(key), 'prod': P.get(key), 'airdate': ad,
            'dateRaw': plain(raw_date), 'otherRaw': plain(raw_other),
            'years': yrs, 'other': oth, 'stardate': sd, 'month': mo, 'day': dy,
            'logline': logline(text, end), 'cast': cast_of(text, title) or (cast_of('== Links and references ==\n' + re.sub(r'^==+[^=\n]*==+\s*$', '', _fetch('Credits for ' + title), flags=re.M), title) if series == 'FLM' else []), 'short': short,
        })
    ids = [r['id'] for r in recs]
    dup = {i for i in ids if ids.count(i) > 1}
    json.dump(recs, open(os.path.join(ROOT, 'build', 'records.raw.json'), 'w'), indent=1, ensure_ascii=False)
    print(len(recs), 'records; dup ids:', dup)


if __name__ == '__main__':
    main()
