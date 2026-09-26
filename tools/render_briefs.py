"""Render thread research briefs (research/<thread-id>.md) into docs/briefs/<thread-id>.html."""
import os, re, json, html
import markdown

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'briefs')

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · Briefing</title>
<meta name="description" content="{desc}">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../css/fonts.css">
<style>
:root {{ --f1:#8c9cff; --f2:#c8a6f2; --f3:#9fd3ff; --f4:#5a5fa8; --gold:#ffb347; --text:#f1ead8; --dim:#a9a5c4; --panel:#07080f;
  --lcars:'Antonio','Arial Narrow',sans-serif; --body:'Saira Semi Condensed','Arial Narrow',sans-serif; }}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; background: #000; color: var(--text); }}
body {{ font-family: var(--body); font-size: 17px; line-height: 1.6; }}
.top {{ display: grid; grid-template-columns: 120px 1fr; gap: 0; padding: 10px 12px 0 10px; }}
.top .elbow {{ background: var(--f1); border-radius: 40px 0 0 0; height: 70px; display: flex; align-items: flex-end; justify-content: flex-end;
  padding: 0 12px 10px; font-family: var(--lcars); font-weight: 700; color: #000; letter-spacing: .06em; }}
.top .bar {{ display: flex; gap: 5px; align-items: flex-start; }}
.top .bar span {{ height: 16px; background: var(--f4); display: block; }}
.top .bar .a {{ width: 60px; background: var(--f1); }} .top .bar .g {{ flex: 1; }} .top .bar .b {{ width: 90px; background: var(--f2); }}
.top .bar .c {{ width: 36px; background: var(--f3); border-radius: 0 16px 16px 0; }}
.rail {{ position: fixed; left: 10px; top: 80px; bottom: 10px; width: 120px; display: flex; flex-direction: column; gap: 5px; }}
.rail a, .rail span {{ display: flex; align-items: flex-end; justify-content: flex-end; padding: 0 10px 6px; height: 46px; background: var(--f4); color: #000;
  font-family: var(--lcars); font-weight: 600; letter-spacing: .05em; text-decoration: none; text-transform: uppercase; font-size: 15px; }}
.rail a.go {{ background: var(--gold); }} .rail .fill {{ flex: 1; background: var(--f2); }}
main {{ margin: -40px 0 60px 150px; max-width: 760px; padding: 0 20px 0 10px; }}
.kick {{ font-family: var(--lcars); color: var(--f2); letter-spacing: .08em; text-transform: uppercase; font-size: 14px; }}
h1 {{ font-family: var(--body); font-weight: 600; font-size: 36px; line-height: 1.12; margin: 6px 0 18px; text-wrap: balance; }}
h2 {{ font-family: var(--lcars); font-weight: 600; font-size: 22px; letter-spacing: .05em; text-transform: uppercase; color: var(--f1); margin: 40px 0 10px;
  display: flex; gap: 12px; align-items: center; }}
h2::after {{ content: ''; flex: 1; height: 7px; background: #1c1f3a; border-radius: 999px; }}
h3 {{ font-family: var(--lcars); font-weight: 600; font-size: 18px; letter-spacing: .05em; color: var(--f3); margin: 26px 0 6px; }}
p, li {{ max-width: 68ch; }}
strong {{ color: #fff; }}
em {{ color: #e8dcc4; }}
a {{ color: var(--f3); }}
hr {{ border: 0; height: 4px; background: #1c1f3a; margin: 34px 0; border-radius: 4px; }}
blockquote {{ margin: 0; padding: 4px 16px; border-left: 5px solid var(--gold); background: #17120a; }}
table {{ border-collapse: collapse; width: 100%; font-size: 15.5px; margin: 12px 0 20px; }}
th, td {{ text-align: left; padding: 7px 10px; border-bottom: 1px solid #1c1f3a; vertical-align: top; }}
th {{ font-family: var(--lcars); font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--dim); font-size: 13px; }}
tr:first-child td {{ border-top: 1px solid #1c1f3a; }}
td:first-child {{ font-family: var(--lcars); font-size: 17px; color: var(--gold); white-space: nowrap; }}
code {{ font-family: var(--lcars); color: var(--f3); }}
.lead-box {{ background: var(--panel); border-left: 6px solid var(--gold); padding: 14px 18px 6px; border-radius: 0 14px 14px 0; margin: 18px 0 8px; }}
.foot {{ color: var(--dim); font-size: 14px; margin-top: 50px; }}
@media (max-width: 760px) {{ .rail {{ display: none; }} main {{ margin: 18px 0 40px; padding: 0 16px; }} .top {{ grid-template-columns: 60px 1fr; }} .top .elbow {{ font-size: 0; height: 40px; border-radius: 22px 0 0 0; }} h1 {{ font-size: 28px; }} }}
</style>
</head>
<body>
<div class="top"><div class="elbow">TIC</div><div class="bar"><span class="a"></span><span class="g"></span><span class="b"></span><span class="c"></span></div></div>
<nav class="rail" aria-label="Briefing"><a class="go" href="../#/th/{tid}">Open thread</a><a href="../#/continuum">Continuum</a><span class="fill"></span></nav>
<main>
<div class="kick">Briefing · Thread</div>
{body}
<p class="foot">Chronometric Archive briefing. An unofficial fan reference; Star Trek belongs to CBS Studios and Paramount. Quotations are brief and cited; interviews are behind-the-scenes material, not canon.</p>
</main>
</body>
</html>
"""


def render(tid, md_path):
    src = open(md_path, encoding='utf-8').read()
    title = re.search(r'^#\s+(.+)$', src, re.M).group(1).strip()
    body = markdown.markdown(src, extensions=['tables', 'sane_lists'])
    # wrap the short answer in a callout
    body = re.sub(r'(<p><strong>Short answer</strong></p>\s*<ul>.*?</ul>)', r'<div class="lead-box">\1</div>', body, count=1, flags=re.S)
    desc = 'Research briefing from the Chronometric Archive: ' + re.sub('<[^>]+>', '', title)
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, f'{tid}.html')
    open(out, 'w', encoding='utf-8').write(PAGE.format(title=html.escape(re.sub(r'[*_]', '', title)), desc=html.escape(desc), tid=tid, body=body))
    return out


if __name__ == '__main__':
    tdir = os.path.join(ROOT, 'data', 'curated', 'threads')
    for f in sorted(os.listdir(tdir)):
        if not f.endswith('.json'):
            continue
        data = json.load(open(os.path.join(tdir, f)))
        for th in (data if isinstance(data, list) else [data]):
            md = os.path.join(ROOT, 'research', f"{th['id']}.md")
            if os.path.exists(md):
                print('rendered', render(th['id'], md))
