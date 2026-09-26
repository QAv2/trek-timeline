// Archive search. Titles and names match directly; plain descriptions ("the one where Data
// builds a daughter") are ranked by weighted term overlap across titles, loglines, summaries
// and billed cast, all in the browser.
import { norm } from './data.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = encodeURIComponent;
const GROUP = { r: 'Records', p: 'Personnel', e: 'History', i: 'Incursions', d: 'Divergences', th: 'Threads' };
const STOP = new Set(('a an and the of to in on at by for from with into onto about over under as is are was were be been being it its '
  + 'this that these those there their they them he she his her him hers who whom whose what which when where why how '
  + 'one ones some any all each every episode episodes ep show series film movie tell me computer find show search look '
  + 'remember recall think maybe perhaps kind sort thing things something someone somebody involved involving happens happened '
  + 'happen get gets got do does did done have has had just like also then than so very really can could would should will '
  + 'i we you our your my us out up off again still ever even though while after before during between through').split(' '));

// a small synonym ring for how people describe plots
const SYN = {};
[['build', 'create', 'construct', 'make', 'invent'], ['daughter', 'child', 'girl'], ['son', 'child', 'boy'], ['kill', 'murder', 'death', 'die', 'dead'],
 ['wife', 'marry', 'married', 'wedding'], ['husband', 'marry', 'married', 'wedding'], ['love', 'romance', 'kiss', 'feelings', 'date', 'relationship'], ['past', 'back', 'earlier'],
 ['future', 'forward', 'later'], ['alien', 'species', 'lifeform'], ['ghost', 'spirit', 'haunt'], ['robot', 'android'], ['clone', 'duplicate', 'copy'],
 ['body', 'swap', 'switch'], ['hologram', 'holodeck', 'holographic'], ['war', 'battle', 'fight'], ['sick', 'disease', 'illness', 'plague', 'virus'],
 ['dream', 'vision', 'hallucination'], ['old', 'age', 'aging', 'elderly'], ['young', 'child', 'kid'], ['brother', 'sibling'], ['sister', 'sibling'],
 ['trapped', 'stuck', 'stranded'], ['loop', 'repeat', 'causality'], ['stranded', 'lost'], ['lifetime', 'life', 'decades', 'years'],
 ['dying', 'dead', 'doomed', 'extinct'], ['planet', 'world'], ['music', 'song', 'flute', 'sing']]
  .forEach((g) => g.forEach((w) => { SYN[w] = [...new Set([...(SYN[w] || []), ...g.filter((x) => x !== w)])]; }));

// light suffix stripping, applied identically to the index and the query
const SUFFIX = [['ies', 'y'], ['ing', ''], ['ied', 'y'], ['ed', ''], ['ive', ''], ['ions', ''], ['ion', ''], ['ly', ''], ['es', ''], ['s', '']];
const stem = (w) => {
  if (w.length <= 4) return w.endsWith('s') && w.length === 4 && !w.endsWith('ss') ? w.slice(0, -1) : w;
  for (const [suf, rep] of SUFFIX) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) return w.slice(0, -suf.length) + rep;
  }
  return w;
};
const tokens = (s) => norm(s).split(' ').filter((w) => w && !STOP.has(w)).map(stem);

export class Search {
  constructor({ input, results, store, go }) {
    Object.assign(this, { input, results, S: store, go });
    this.items = this.buildIndex();
    this.buildTerms();
    if (window.__dbg) window.__search = this;
    this.sel = -1;
    this.flat = [];
    input.addEventListener('input', () => { clearTimeout(this.t); this.t = setTimeout(() => this.run(), 60); });
    input.addEventListener('focus', () => { if (input.value.trim()) this.run(); });
    input.addEventListener('keydown', (e) => this.key(e));
    results.addEventListener('mousedown', (e) => e.preventDefault());
    results.addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]');
      if (b) this.choose(b.dataset.go);
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.search')) this.close(); });
  }

  buildIndex() {
    const S = this.S, out = [];
    const cast = (r, n) => r.c.slice(0, Math.min(n, r.cu == null ? n : r.cu)).map((i) => S.people[i].name).join(' ');
    for (const r of S.records) {
      const code = r.s === 'FLM' ? 'film' : `${r.s} ${r.n || ''}`;
      out.push({ k: 'r', key: norm(r.ti), alt: norm(`${code} ${r.s}`), label: r.ti, meta: `${r.s === 'FLM' ? 'Film' : r.s + ' ' + (r.n || '')} · ${r.tt}`,
        go: `#/r/${enc(r.id)}`, boost: 4, fields: [[r.ti, 3], [r.lg, 1], [cast(r, 10), 1.6], [S.series[r.s] || '', 0.4]] });
    }
    for (const p of S.people) {
      if (!p.recs.length && !p.dossier) continue;
      const short = p.dossier && p.dossier.short ? ' ' + norm(p.dossier.short) : '';
      out.push({ k: 'p', key: norm(p.name) + short, alt: norm(p.k), label: p.name, meta: `${p.recs.length} records`, go: `#/p/${enc(p.k)}`,
        boost: Math.min(6, Math.log2(1 + p.recs.length)) + (p.dossier ? 3 : 0), fields: p.recs.length >= 8 || p.dossier ? [[p.name + short, 2.2]] : [] });
    }
    for (const e of S.events) out.push({ k: 'e', key: norm(e.title), alt: norm(e.summary), label: e.title, meta: e.tText || '', go: `#/e/${enc(e.id)}`, boost: e.w,
      fields: [[e.title, 3], [e.summary, 1], [e.civ || '', 0.5]] });
    for (const i of S.incursions) out.push({ k: 'i', key: norm(i.title), alt: norm(`${i.method} ${(i.travelers || []).join(' ')}`), label: i.title,
      meta: `${i.legs[0].from.tText || ''} → ${i.legs[0].to.tText || ''}`, go: `#/i/${enc(i.id)}`, boost: 2,
      fields: [[i.title, 3], [i.summary, 1], [(i.travelers || []).join(' '), 1.5], [i.method || '', 1]] });
    for (const d of S.divergences) out.push({ k: 'd', key: norm(d.title), alt: norm(d.summary), label: d.title, meta: (d.branch && d.branch.tText) || '', go: `#/d/${enc(d.id)}`, boost: 2,
      fields: [[d.title, 3], [d.summary, 1], [(d.keyDifferences || []).join(' '), 0.8]] });
    for (const th of S.threads) out.push({ k: 'th', key: norm(th.title), alt: norm((th.people || []).join(' ')), label: th.title, meta: `${th.beats.length} beats`, go: `#/th/${enc(th.id)}`, boost: 6,
      fields: [[th.title, 3], [(th.people || []).join(' '), 2], [th.summary || '', 0.8]] });
    return out;
  }

  // inverted index for descriptive queries
  buildTerms() {
    const post = new Map();
    this.items.forEach((it, idx) => {
      const seen = new Map();
      for (const [text, w] of it.fields || []) for (const t of tokens(text)) seen.set(t, Math.max(seen.get(t) || 0, w));
      for (const [t, w] of seen) { if (!post.has(t)) post.set(t, []); post.get(t).push([idx, w]); }
    });
    this.post = post;
    this.vocab = [...post.keys()];
    const N = this.items.length;
    this.idf = new Map([...post].map(([t, l]) => [t, Math.log(1 + N / l.length)]));
  }

  describe(q) {
    const terms = [...new Set(tokens(q))];
    if (!terms.length) return [];
    const acc = new Map(), hitCount = new Map();
    for (const qt of terms) {
      const matches = this.post.has(qt) ? [[qt, 1]] : [];
      if (qt.length >= 4) for (const v of this.vocab) if (v !== qt && v.startsWith(qt)) matches.push([v, 0.8]);
      for (const alt of SYN[qt] || []) if (this.post.has(stem(alt))) matches.push([stem(alt), 0.7]);
      const best = new Map();
      for (const [m, f] of matches.slice(0, 48)) {
        const idf = this.idf.get(m) * f;
        for (const [idx, w] of this.post.get(m)) best.set(idx, Math.max(best.get(idx) || 0, idf * w));
      }
      for (const [idx, v] of best) { acc.set(idx, (acc.get(idx) || 0) + v); hitCount.set(idx, (hitCount.get(idx) || 0) + 1); }
    }
    const out = [];
    for (const [idx, v] of acc) {
      const cover = hitCount.get(idx) / terms.length;
      if (terms.length > 1 && cover < (terms.length >= 5 ? 0.4 : 0.5)) continue;
      out.push([v * (0.4 + cover), this.items[idx]]);
    }
    return out.sort((a, b) => b[0] - a[0]).slice(0, 40);
  }

  score(it, q, words) {
    let s = 0;
    if (it.key === q) s = 100;
    else if (it.key.startsWith(q)) s = 80;
    else if (words.every((w) => it.key.split(' ').some((kw) => kw.startsWith(w)))) s = 60;
    else if (it.key.includes(q)) s = 45;
    return s ? s + it.boost : 0;
  }

  run() {
    const raw = this.input.value.trim();
    const q = norm(raw);
    if (!q) { this.close(); return; }
    const words = q.split(' ');
    const direct = [];
    for (const it of this.items) { const s = this.score(it, q, words); if (s) direct.push([s, it]); }
    direct.sort((a, b) => b[0] - a[0]);
    // descriptive matches fill in when the query reads like a sentence, or when direct hits are thin
    const descriptive = words.length >= 2 || direct.length < 3 ? this.describe(raw) : [];
    const seen = new Set(direct.map(([, it]) => it));
    const hits = [...direct];
    const bestDirect = direct.length ? direct[0][0] : 0;
    for (const [v, it] of descriptive) if (!seen.has(it)) { hits.push([Math.min(bestDirect > 59 ? 44 : 99, 20 + v * 4), it]); seen.add(it); }
    hits.sort((a, b) => b[0] - a[0]);
    const groups = new Map();
    for (const [, it] of hits) {
      if (!groups.has(it.k)) groups.set(it.k, []);
      const g = groups.get(it.k);
      if (g.length < (it.k === 'r' || it.k === 'p' ? 7 : 4)) g.push(it);
    }
    const order = [...groups.keys()].sort((a, b) => hits.findIndex((h) => h[1].k === a) - hits.findIndex((h) => h[1].k === b));
    this.flat = [];
    let html = '';
    for (const k of order) {
      html += `<div class="grp">${GROUP[k]}</div>`;
      for (const it of groups.get(k)) {
        const idx = this.flat.push(it) - 1;
        html += `<button role="option" id="sr-${idx}" data-go="${esc(it.go)}" aria-selected="false"><span class="rt">${esc(it.label)}</span><span class="rm">${esc(it.meta)}</span></button>`;
      }
    }
    const yr = raw.match(/^(-?\d{1,4})(\.\d+)?$/);
    if (yr) html = `<div class="grp">Coordinate</div><button role="option" id="sr-y" data-go="#/t/${esc(yr[0])}" aria-selected="false"><span class="rt">Travel to ${esc(yr[0])}</span><span class="rm">Continuum</span></button>` + html;
    this.results.innerHTML = html || `<div class="empty">Nothing on record for “${esc(raw)}”. Try a title, a name, a year, or a few words about what happens.</div>`;
    this.results.classList.add('open');
    this.input.setAttribute('aria-expanded', 'true');
    this.sel = this.flat.length ? 0 : -1;
    this.mark();
  }

  mark() {
    this.results.querySelectorAll('[role="option"][id^="sr-"]').forEach((b) => b.setAttribute('aria-selected', String(b.id === `sr-${this.sel}`)));
    const cur = this.results.querySelector(`#sr-${this.sel}`);
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  key(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); this.sel = Math.min(this.flat.length - 1, this.sel + 1); this.mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.sel = Math.max(0, this.sel - 1); this.mark(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const yr = this.input.value.trim().match(/^(-?\d{1,4})(\.\d+)?$/);
      if (yr) this.choose(`#/t/${yr[0]}`);
      else if (this.sel >= 0 && this.flat[this.sel]) this.choose(this.flat[this.sel].go);
    } else if (e.key === 'Escape') { this.input.value = ''; this.close(); this.input.blur(); }
  }

  choose(hash) { this.close(); this.input.blur(); this.go(hash); }
  close() { this.results.classList.remove('open'); this.input.setAttribute('aria-expanded', 'false'); }
}
