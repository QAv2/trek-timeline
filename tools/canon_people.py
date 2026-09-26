"""Map every character title seen in the cast lists to its canonical Memory Alpha article
(following redirects), so "Nick Locarno" and "Nicholas Locarno" are one person.
Writes data/person_redirects.json {title: canonical} for titles that redirect."""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(__file__))
import ma

ROOT = ma.ROOT
OUT = os.path.join(ROOT, 'data', 'person_redirects.json')

if __name__ == '__main__':
    raw = json.load(open(os.path.join(ROOT, 'build', 'records.raw.json')))
    titles = sorted({c['c'] for r in raw for c in r['cast']})
    red = json.load(open(OUT)) if os.path.exists(OUT) and '--refresh' not in sys.argv else {}
    done = set(json.load(open(OUT + '.checked'))) if os.path.exists(OUT + '.checked') and '--refresh' not in sys.argv else set()
    todo = [t for t in titles if t not in done]
    print('checking', len(todo), 'of', len(titles))
    for i in range(0, len(todo), 50):
        chunk = todo[i:i + 50]
        d = ma._get({'action': 'query', 'redirects': '1', 'titles': '|'.join(chunk)})
        q = d.get('query', {})
        norm = {n['from']: n['to'] for n in q.get('normalized', [])}
        rd = {n['from']: n['to'] for n in q.get('redirects', [])}
        for t in chunk:
            n = norm.get(t, t)
            if n in rd and rd[n] != t:
                red[t] = rd[n].split('#')[0]
            done.add(t)
        time.sleep(0.3)
    json.dump(red, open(OUT, 'w'), indent=0, ensure_ascii=False, sort_keys=True)
    json.dump(sorted(done), open(OUT + '.checked', 'w'))
    print('redirects:', len(red))
