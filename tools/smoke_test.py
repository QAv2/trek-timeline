"""Smoke test for the built site in docs/. Catches a broken build or an empty output.

  python3 tools/smoke_test.py              # static checks (stdlib only)
  python3 tools/smoke_test.py --browser    # also load the site in headless Chromium (needs `pip install playwright`)

Static checks: archive.json has its records, people and curated layers, cast indices are in range,
every portrait and brief it points to exists, and every local href/src/url()/import in docs/ resolves.
Browser check: serves docs/ locally, waits for the gate to finish loading, engages, opens a brief,
and fails on any console error, page error or failed request.
Set CHROMIUM_PATH to use an already-installed Chromium instead of Playwright's own download.
"""
import sys, os, re, json, glob, threading, functools, http.server, socketserver

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs')
MIN = dict(records=900, people=4000, events=300, incursions=80, divergences=50, threads=10)
errors = []


def check(ok, msg):
    if not ok:
        errors.append(msg)


def static_checks():
    A = json.load(open(os.path.join(DOCS, 'data', 'archive.json')))
    counts = dict(records=len(A['records']), people=len(A['people']), events=len(A['events']),
                  incursions=len(A['incursions']), divergences=len(A['divergences']), threads=len(A['threads']))
    print('archive.json:', ', '.join(f'{v} {k}' for k, v in counts.items()), '· built', A['meta']['built'])
    for k, n in MIN.items():
        check(counts[k] >= n, f'archive.json: only {counts[k]} {k} (expected at least {n})')
    check(A['meta']['records'] == counts['records'], 'archive.json: meta.records does not match records')
    lanes = {l['id'] for l in A['lanes']}
    np = len(A['people'])
    for r in A['records']:
        check(isinstance(r['t'], (int, float)), f"record {r['id']}: no time")
        check(r['l'] in lanes, f"record {r['id']}: unknown lane {r['l']}")
        check(all(0 <= i < np for i in r['c'] + r.get('ca', [])), f"record {r['id']}: cast index out of range")
    ims = [p['im'] for p in A['people'] if p.get('im')]
    missing = [i for i in ims if not os.path.exists(os.path.join(DOCS, 'img', 'p', i + '.webp'))]
    check(not missing, f'{len(missing)} portraits missing from docs/img/p, e.g. {missing[:3]}')
    for t in A['threads']:
        if t.get('brief'):
            check(os.path.exists(os.path.join(DOCS, t['brief'])), f"thread {t['id']}: brief {t['brief']} missing")
    print(f'portraits: {len(ims)} referenced, {len(ims) - len(missing)} on disk')

    # local references in HTML, CSS and JS modules
    refs = 0
    pats = {'.html': r'(?:href|src)="([^"#?]+)', '.css': r'url\(([^)#?]+)\)', '.js': r'''^\s*import\b[^'"]*['"]([^'"]+)['"]'''}
    for path in glob.glob(os.path.join(DOCS, '**', '*.*'), recursive=True):
        ext = os.path.splitext(path)[1]
        if ext not in pats or '/vendor/' in path:
            continue
        for ref in re.findall(pats[ext], open(path, encoding='utf-8').read(), re.M):
            ref = ref.strip('\'" ')
            if re.match(r'^(?:[a-z]+:|//|\$\{)', ref) or '${' in ref or not ref:
                continue
            refs += 1
            target = os.path.normpath(os.path.join(os.path.dirname(path), ref))
            check(os.path.exists(target), f'{os.path.relpath(path, ROOT)}: broken local reference {ref}')
    print(f'local references checked: {refs}')


def browser_checks():
    from playwright.sync_api import sync_playwright
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=DOCS)
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{httpd.server_address[1]}/'
    problems = []
    with sync_playwright() as pw:
        exe = os.environ.get('CHROMIUM_PATH')
        browser = pw.chromium.launch(**({'executable_path': exe} if exe else {}))
        page = browser.new_page()
        page.on('console', lambda m: m.type == 'error' and problems.append(f'console: {m.text}'))
        page.on('pageerror', lambda e: problems.append(f'page error: {e}'))
        page.on('requestfailed', lambda r: problems.append(f'request failed: {r.url}'))
        page.on('response', lambda r: r.status >= 400 and problems.append(f'HTTP {r.status}: {r.url}'))
        page.goto(base)
        try:
            page.wait_for_selector('#gate-go:not([disabled])', timeout=30000)
        except Exception:
            errors.extend('browser ' + p for p in problems)
            raise
        status = page.inner_text('#gate-status')
        page.click('#gate-go')
        page.wait_for_function('!document.body.classList.contains("gating")', timeout=15000)
        page.wait_for_timeout(1500)
        print('index: gate said', repr(status))
        page.goto(base + 'briefs/uhura-scott.html')
        page.wait_for_load_state('networkidle')
        print('brief: title', repr(page.title()))
        browser.close()
    httpd.shutdown()
    for p in problems:
        errors.append('browser ' + p)


if __name__ == '__main__':
    static_checks()
    if '--browser' in sys.argv:
        try:
            browser_checks()
        except Exception as e:  # a page that never finishes loading times out here
            errors.append(f'browser: {type(e).__name__}: {str(e).splitlines()[0]}')
    if errors:
        print(f'\nFAIL: {len(errors)} problem(s)')
        for e in errors[:50]:
            print(' -', e)
        sys.exit(1)
    print('\nOK')
