// Archive search: records, people, history, incursions, divergences, threads.
import { norm } from './data.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = encodeURIComponent;
const GROUP = { r: 'Records', p: 'Personnel', e: 'History', i: 'Incursions', d: 'Divergences', th: 'Threads' };

export class Search {
  constructor({ input, results, store, go }) {
    Object.assign(this, { input, results, S: store, go });
    this.items = this.buildIndex();
    this.sel = -1;
    this.flat = [];
    input.addEventListener('input', () => this.run());
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
    for (const r of S.records) {
      const code = r.s === 'FLM' ? 'film' : `${r.s} ${r.n || ''}`;
      out.push({ k: 'r', key: norm(r.ti), alt: norm(`${code} ${r.s}`), label: r.ti, meta: `${r.s === 'FLM' ? 'Film' : r.s + ' ' + (r.n || '')} · ${r.tt}`, go: `#/r/${enc(r.id)}`, boost: 4 });
    }
    for (const p of S.people) {
      if (!p.recs.length && !p.dossier) continue;
      const short = p.dossier && p.dossier.short ? ' ' + norm(p.dossier.short) : '';
      out.push({ k: 'p', key: norm(p.name) + short, alt: norm(p.k), label: p.name, meta: `${p.recs.length} records`, go: `#/p/${enc(p.k)}`, boost: Math.min(6, Math.log2(1 + p.recs.length)) + (p.dossier ? 3 : 0) });
    }
    for (const e of S.events) out.push({ k: 'e', key: norm(e.title), alt: norm(e.summary), label: e.title, meta: e.tText || '', go: `#/e/${enc(e.id)}`, boost: e.w });
    for (const i of S.incursions) out.push({ k: 'i', key: norm(i.title), alt: norm(`${i.method} ${(i.travelers || []).join(' ')}`), label: i.title, meta: `${i.legs[0].from.tText || ''} → ${i.legs[0].to.tText || ''}`, go: `#/i/${enc(i.id)}`, boost: 2 });
    for (const d of S.divergences) out.push({ k: 'd', key: norm(d.title), alt: norm(d.summary), label: d.title, meta: (d.branch && d.branch.tText) || '', go: `#/d/${enc(d.id)}`, boost: 2 });
    for (const th of S.threads) out.push({ k: 'th', key: norm(th.title), alt: norm((th.people || []).join(' ')), label: th.title, meta: `${th.beats.length} beats`, go: `#/th/${enc(th.id)}`, boost: 6 });
    return out;
  }

  score(it, q, words) {
    let s = 0;
    if (it.key === q) s = 100;
    else if (it.key.startsWith(q)) s = 80;
    else if (words.every((w) => it.key.split(' ').some((kw) => kw.startsWith(w)))) s = 60;
    else if (it.key.includes(q)) s = 45;
    else if (it.alt && words.every((w) => it.alt.includes(w))) s = 22;
    return s ? s + it.boost : 0;
  }

  run() {
    const raw = this.input.value.trim();
    const q = norm(raw);
    if (!q) { this.close(); return; }
    const words = q.split(' ');
    const hits = [];
    for (const it of this.items) { const s = this.score(it, q, words); if (s) hits.push([s, it]); }
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
    this.results.innerHTML = html || `<div class="empty">Nothing on record for “${esc(raw)}”. Try a title, a name, or a year.</div>`;
    this.results.classList.add('open');
    this.input.setAttribute('aria-expanded', 'true');
    this.sel = this.flat.length ? 0 : -1;
    this.mark();
  }

  mark() {
    this.results.querySelectorAll('[role="option"]').forEach((b, i) => b.setAttribute('aria-selected', String(i === this.sel)));
    const cur = this.results.querySelector(`#sr-${this.sel}`);
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  key(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); this.sel = Math.min(this.flat.length - 1, this.sel + 1); this.mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.sel = Math.max(0, this.sel - 1); this.mark(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const yr = this.input.value.trim().match(/^(-?\d{1,4})(\.\d+)?$/);
      if (this.sel >= 0 && this.flat[this.sel]) this.choose(this.flat[this.sel].go);
      else if (yr) this.choose(`#/t/${yr[0]}`);
    } else if (e.key === 'Escape') { this.input.value = ''; this.close(); this.input.blur(); }
  }

  choose(hash) { this.close(); this.input.blur(); this.go(hash); }
  close() { this.results.classList.remove('open'); this.input.setAttribute('aria-expanded', 'false'); }
}
