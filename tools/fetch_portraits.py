"""Personnel portraits: resolve each person's Memory Alpha lead image, then download,
square-crop and save small WebP thumbnails into docs/img/p/, in resumable batches.

  python3 tools/fetch_portraits.py resolve        # page images for every person (batches of 50)
  python3 tools/fetch_portraits.py download [N]   # fetch + crop the next N (default: all), 4 at a time
  python3 tools/fetch_portraits.py pin             # apply PINNED live-action images
  python3 tools/fetch_portraits.py status

Manifest: data/portraits.json  {ma_title: {"file": MA file name, "thumb": url, "id": short hash} | null}
"""
import sys, os, json, time, hashlib, io, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(__file__))
import ma
from PIL import Image, ImageOps

ROOT = ma.ROOT
MANIFEST = os.path.join(ROOT, 'data', 'portraits.json')
OUTDIR = os.path.join(ROOT, 'docs', 'img', 'p')
SIZE = 128          # square output, shown at 72 CSS px (retina-sharp)
THUMB_REQ = 256     # longest side requested from the MA image scaler


def pid(title):
    return hashlib.sha1(title.encode()).hexdigest()[:10]


def load_manifest():
    return json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}


def save_manifest(m):
    tmp = MANIFEST + '.tmp'
    json.dump(m, open(tmp, 'w'), indent=0, ensure_ascii=False, sort_keys=True)
    os.replace(tmp, MANIFEST)


def people():
    A = json.load(open(os.path.join(ROOT, 'docs', 'data', 'archive.json')))
    return [p['k'] for p in A['people']]


# pages with no lead image of their own: borrow one from a closely related page
OVERRIDES = {'Weyoun': 'Weyoun 4'}
# live-action leads whose Memory Alpha lead image is currently an animated cameo: pin a live-action file
PINNED = {
    'James T. Kirk': 'James Kirk, 2266.jpg',
    'Kathryn Janeway': 'Kathryn Janeway, 2375.jpg',
    'Tom Paris': 'Tom Paris, 2378.jpg',
}


def pin():
    m = load_manifest()
    auto = os.path.join(ROOT, 'data', 'portrait_pins.json')
    pins = dict(json.load(open(auto)) if os.path.exists(auto) else {}, **PINNED)
    for k, f in pins.items():
        if f is None and m.get(k):  # audit: no suitable image, use the placeholder
            out = os.path.join(OUTDIR, pid(k) + '.webp')
            if os.path.exists(out):
                os.remove(out)
            m[k] = None
            print('placeholder', k)
    files = [f for f in pins.values() if f]
    info = {}
    for i in range(0, len(files), 50):
        d = ma._get({'action': 'query', 'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': str(THUMB_REQ),
                     'titles': '|'.join('File:' + f for f in files[i:i + 50])})
        info.update({p['title'][5:]: (p.get('imageinfo') or [{}])[0] for p in d['query']['pages']})
    for k, f in pins.items():
        if not f:
            continue
        ii = info.get(f) or info.get(f.replace('_', ' '))
        if not ii or not ii.get('thumburl'):
            print('no such file', f)
            continue
        cur = m.get(k) or {}
        if cur.get('file') == f.replace(' ', '_') and os.path.exists(os.path.join(OUTDIR, pid(k) + '.webp')):
            continue
        m[k] = {'file': f.replace(' ', '_'), 'thumb': ii['thumburl'], 'id': pid(k)}
        out = os.path.join(OUTDIR, pid(k) + '.webp')
        if os.path.exists(out):
            os.remove(out)
        print('pinned', k, '->', f, fetch_one(k, m[k])[1])
    save_manifest(m)


def resolve():
    m = load_manifest()
    todo = [k for k in people() if k not in m or (m.get(k) is None and k in OVERRIDES)]
    print(f'resolving {len(todo)} of {len(m) + len(todo)}')
    for i in range(0, len(todo), 50):
        chunk = todo[i:i + 50]
        ask = [OVERRIDES.get(k, k) for k in chunk]
        d = ma._get({'action': 'query', 'prop': 'pageimages', 'piprop': 'thumbnail|name', 'pithumbsize': str(THUMB_REQ),
                     'redirects': '1', 'titles': '|'.join(ask)})
        q = d.get('query', {})
        norm = {n['from']: n['to'] for n in q.get('normalized', [])}
        redir = {n['from']: n['to'] for n in q.get('redirects', [])}
        pages = {p['title']: p for p in q.get('pages', [])}
        for k, a in zip(chunk, ask):
            t = redir.get(norm.get(a, a), norm.get(a, a))
            p = pages.get(t) or {}
            th = p.get('thumbnail')
            m[k] = {'file': p.get('pageimage'), 'thumb': th['source'], 'id': pid(k)} if th and p.get('pageimage') else None
        if (i // 50) % 10 == 0:
            save_manifest(m)
            print(f'  {min(i + 50, len(todo))}/{len(todo)}')
        time.sleep(0.4)
    save_manifest(m)
    print('with image:', sum(1 for v in m.values() if v), 'without:', sum(1 for v in m.values() if not v))


def square(img):
    """Square crop biased upward: character images are framed on the face, usually above centre."""
    img = ImageOps.exif_transpose(img).convert('RGB')
    w, h = img.size
    if h > w:
        top = int((h - w) * 0.22)
        img = img.crop((0, top, w, top + w))
    elif w > h:
        left = (w - h) // 2
        img = img.crop((left, 0, left + h, h))
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def fetch_one(k, v):
    out = os.path.join(OUTDIR, v['id'] + '.webp')
    if os.path.exists(out):
        return k, 'have'
    for attempt in range(3):
        try:
            r = ma.S.get(v['thumb'], timeout=40)
            if r.status_code == 200 and r.content:
                img = square(Image.open(io.BytesIO(r.content)))
                img.save(out, 'WEBP', quality=74, method=6)
                return k, 'ok'
            if r.status_code == 404:
                return k, 'missing'
        except Exception as e:  # network or decode error
            err = str(e)
        time.sleep(1.5 * (attempt + 1))
    return k, 'fail'


def download(limit=None):
    os.makedirs(OUTDIR, exist_ok=True)
    m = load_manifest()
    todo = [(k, v) for k, v in m.items() if v and not os.path.exists(os.path.join(OUTDIR, v['id'] + '.webp'))]
    if limit:
        todo = todo[:limit]
    print(f'downloading {len(todo)}')
    stats = {'ok': 0, 'have': 0, 'missing': 0, 'fail': 0}
    with cf.ThreadPoolExecutor(max_workers=4) as ex:
        for n, (k, st) in enumerate(ex.map(lambda kv: fetch_one(*kv), todo), 1):
            stats[st] += 1
            if st in ('missing', 'fail'):
                m[k] = None if st == 'missing' else m[k]
            if n % 100 == 0:
                print(f'  {n}/{len(todo)} {stats}', flush=True)
    save_manifest(m)
    print('done', stats)


def status():
    m = load_manifest()
    have = sum(1 for v in m.values() if v and os.path.exists(os.path.join(OUTDIR, v['id'] + '.webp')))
    total_bytes = sum(os.path.getsize(os.path.join(OUTDIR, f)) for f in os.listdir(OUTDIR)) if os.path.isdir(OUTDIR) else 0
    print(f'people {len(people())} · resolved {len(m)} · with image {sum(1 for v in m.values() if v)} · downloaded {have} · {total_bytes / 1e6:.1f} MB')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'status'
    if cmd == 'resolve':
        resolve()
    elif cmd == 'pin':
        pin()
    elif cmd == 'download':
        download(int(sys.argv[2]) if len(sys.argv) > 2 else None)
    else:
        status()
