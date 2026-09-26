"""Fetch every canon episode/film page from Memory Alpha into cache/ma (idempotent)."""
import sys, json, os
sys.path.insert(0, os.path.dirname(__file__))
import ma

SERIES = ['TOS', 'TAS', 'TNG', 'DS9', 'VOY', 'ENT', 'DIS', 'PIC', 'LD', 'PRO', 'SNW', 'SA', 'ST', 'VST']
FILMS = ['Star Trek: The Motion Picture', 'Star Trek II: The Wrath of Khan', 'Star Trek III: The Search for Spock',
         'Star Trek IV: The Voyage Home', 'Star Trek V: The Final Frontier', 'Star Trek VI: The Undiscovered Country',
         'Star Trek Generations', 'Star Trek: First Contact', 'Star Trek: Insurrection', 'Star Trek Nemesis',
         'Star Trek (film)', 'Star Trek Into Darkness', 'Star Trek Beyond', 'Star Trek: Section 31']

if __name__ == '__main__':
    catf = os.path.join(ma.CACHE, 'categories.json')
    cats = json.load(open(catf)) if os.path.exists(catf) else {}
    for s in SERIES:
        if s not in cats or '--refresh' in sys.argv:
            cats[s] = ma.category_members(f'Category:{s} episodes')
    json.dump(cats, open(catf, 'w'), indent=1)
    pages = []
    for s in SERIES:
        pages += [(s, t) for t in cats[s]]
    pages += [('FLM', t) for t in FILMS]
    titles = [t for _, t in pages]
    got = ma.wikitext_many(titles, refresh='--refresh' in sys.argv)
    miss = [t for t in titles if not got[t]['text']]
    json.dump(pages, open(os.path.join(ma.CACHE, 'pagelist.json'), 'w'), indent=1)
    print(len(pages), 'pages;', len(miss), 'missing:', miss[:10])
