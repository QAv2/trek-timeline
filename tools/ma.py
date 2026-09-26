"""Tiny Memory Alpha API client with an on-disk cache (cache/ma/)."""
import json, os, re, time, hashlib, urllib.parse
import requests

API = "https://memory-alpha.fandom.com/api.php"
UA = "ChronometricArchive/0.1 (personal fan timeline; github.com/qav2)"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "cache", "ma")
S = requests.Session()
S.headers["User-Agent"] = UA


def _get(params, tries=4):
    params = dict(params, format="json", formatversion="2")
    for i in range(tries):
        try:
            r = S.get(API, params=params, timeout=60)
            if r.status_code == 200:
                return r.json()
        except requests.RequestException:
            pass
        time.sleep(2 * (i + 1))
    raise RuntimeError(f"MA API failed: {params}")


def _cpath(title):
    h = hashlib.sha1(title.encode()).hexdigest()[:10]
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", title)[:80]
    return os.path.join(CACHE, "pages", f"{safe}.{h}.json")


def wikitext_many(titles, refresh=False):
    """Return {requested_title: {"title": resolved, "text": wikitext|None}}."""
    os.makedirs(os.path.join(CACHE, "pages"), exist_ok=True)
    out, todo = {}, []
    for t in titles:
        p = _cpath(t)
        if not refresh and os.path.exists(p):
            out[t] = json.load(open(p))
        else:
            todo.append(t)
    for i in range(0, len(todo), 50):
        chunk = todo[i:i + 50]
        d = _get({"action": "query", "prop": "revisions", "rvprop": "content",
                  "rvslots": "main", "redirects": "1", "titles": "|".join(chunk)})
        q = d.get("query", {})
        norm = {n["from"]: n["to"] for n in q.get("normalized", [])}
        redir = {n["from"]: n["to"] for n in q.get("redirects", [])}
        pages = {p["title"]: p for p in q.get("pages", [])}
        for t in chunk:
            r = norm.get(t, t)
            r = redir.get(r, r)
            p = pages.get(r)
            text = None
            if p and not p.get("missing") and p.get("revisions"):
                text = p["revisions"][0]["slots"]["main"]["content"]
            rec = {"title": r, "text": text}
            json.dump(rec, open(_cpath(t), "w"))
            out[t] = rec
        time.sleep(0.5)
    return out


def category_members(cat):
    out, cont = [], {}
    while True:
        d = _get(dict({"action": "query", "list": "categorymembers", "cmtitle": cat,
                       "cmlimit": "500", "cmnamespace": "0"}, **cont))
        out += [m["title"] for m in d["query"]["categorymembers"]]
        if "continue" in d:
            cont = d["continue"]
        else:
            return out


def lua_table(module):
    """Parse a flat Lua `return { ["k"] = "v", ... }` data module."""
    text = wikitext_many([module])[module]["text"] or ""
    pat = re.compile(r'\[\s*"((?:[^"\\]|\\.)*)"\s*\]\s*=\s*"((?:[^"\\]|\\.)*)"')
    un = lambda s: s.replace('\\"', '"').replace("\\\\", "\\")
    return {un(k): un(v) for k, v in pat.findall(text)}
