// Chronometric Archive — boot, routing and wiring.
import { loadArchive } from './data.js';
import { Field } from './field.js';
import { Ribbon } from './ribbon.js';
import { Readout } from './readout.js';
import { Search } from './search.js';
import { fmtTime, centuryLabel, sdForTime, uToT, tToU } from './scale.js';
import { chirp, audioOn, setAudio } from './audio.js';

const $ = (s) => document.querySelector(s);
const MODES = ['continuum', 'incursions', 'divergences', 'personnel', 'threads', 'records', 'stardate', 'archive'];
const HOME = [2140, 2410];
const state = { mode: 'continuum', sel: null, route: null };

function spanFor(t) {
  if (t >= 2100 && t < 2500) return 9;
  if (t >= 3100 && t < 3250) return 7;
  if (t >= 1850 && t < 2100) return 30;
  if (t >= 2500) return 120;
  return Math.max(50, Math.abs(2400 - t) * 0.3);
}

// zoom deep enough that neighbours in the record's own lane separate
function spanForRec(r) {
  const S = window.__S;
  const near = S ? S.records.filter((x) => x.l === r.l && Math.abs(x.t - r.t) < 1).length : 1;
  if (near > 14) return 1.1;
  if (near > 6) return 2.2;
  return spanFor(r.t) * (near > 2 ? 0.5 : 1);
}

// ── the gate: medallion hologram while the archive synchronizes ──────
const gate = {
  el: document.getElementById('gate'),
  stage(n, text) {
    const bars = document.querySelectorAll('.gate-bar span');
    bars.forEach((b, i) => b.classList.toggle('on', i < n));
    const st = document.getElementById('gate-status');
    if (st) st.textContent = text;
  },
  ready(onEnter) {
    const el = this.el, go = document.getElementById('gate-go');
    if (!el) { onEnter(); return; }
    this.stage(5, 'Archive synchronized');
    el.classList.add('ready');
    go.disabled = false;
    go.focus({ preventScroll: true });
    let done = false;
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); }
    };
    const enter = () => {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      el.classList.add('leaving');
      document.body.classList.remove('gating');
      setTimeout(() => el.remove(), 700);
      onEnter();
    };
    go.addEventListener('click', enter);
    document.getElementById('gate-hit').addEventListener('click', enter);
    document.addEventListener('keydown', onKey);
  },
  fail(msg) {
    if (!this.el) return;
    this.el.classList.add('error');
    this.stage(0, msg);
  },
};

async function boot() {
  const rbody = $('#rbody');
  let S;
  gate.stage(1, 'Retrieving records');
  try {
    S = await loadArchive();
  } catch (err) {
    gate.fail('Temporal link failed. Reload to retry.');
    $('#rk').textContent = 'Archive offline';
    rbody.innerHTML = `<p class="lead">The archive data didn't load (${String(err.message || err)}). Reload the page; if you opened the file directly from disk, serve the folder over HTTP instead.</p>`;
    return;
  }
  gate.stage(2, `${S.records.length} records, ${S.people.length} personnel indexed`);
  window.__S = S;
  await Promise.race([document.fonts && document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);

  let listTimer = 0;
  const field = new Field({
    stage: $('#stage'), canvas: $('#field'), labels: $('#lanelabels'), tip: $('#tip'), store: S,
    hooks: {
      onView(ended) {
        ribbon && ribbon.draw();
        updateStatus();
        if (ended && state.mode === 'continuum' && !state.sel) {
          clearTimeout(listTimer);
          listTimer = setTimeout(() => { if (state.mode === 'continuum' && !state.sel) readout.inView(field.inView()); }, 140);
        }
      },
      onHover(t, res) { updateStatus(t, res); },
      onPick(hit) {
        if (hit) {
          const it = hit.item;
          go(hit.kind === 'r' ? `#/r/${enc(it.id)}` : hit.kind === 'e' ? `#/e/${enc(it.id)}` : hit.kind === 'i' ? `#/i/${enc(it.id)}` : `#/d/${enc(it.id)}`);
        } else if (state.sel) go(`#/${state.mode}`);
      },
    },
  });
  field.hold = !!document.getElementById('gate');
  gate.stage(3, `${S.incursions.length} incursions plotted`);
  const ribbon = new Ribbon($('#ribbon'), S, field);
  const readout = new Readout({ store: S, head: $('#rk'), tools: $('#rtools'), body: rbody, field });
  readout.onFit = () => fitCurrent();
  new Search({ input: $('#q'), results: $('#results'), store: S, go });

  // nav counts
  const counts = { incursions: S.incursions.length, divergences: S.divergences.length, personnel: S.people.filter((p) => p.recs.length).length, threads: S.threads.length, records: S.records.length };
  document.querySelectorAll('.navbtn[data-mode]').forEach((b) => { const n = counts[b.dataset.mode]; if (n) b.querySelector('.num').textContent = n; });
  $('#navwrap').innerHTML = [...document.querySelectorAll('.rail .navbtn[data-mode]')].map((b) => b.outerHTML).join('');
  $('#data-stamp').textContent = `DATA ${S.meta.built.slice(0, 7).replace('-', '.')}`;

  function enc(s) { return encodeURIComponent(s); }

  function updateStatus(t, res) {
    const [a, b] = field.visibleU();
    const center = uToT((a + b) / 2);
    if (t == null) { t = center; res = field.yearsPerPx((a + b) / 2); }
    $('#s-coord').textContent = fmtTime(t, res);
    const sd = sdForTime(t);
    $('#s-sd').textContent = sd ? sd.sd.toFixed(res < 0.02 ? 1 : 0) : '—';
    $('#s-era').textContent = centuryLabel(t);
    $('#era-block').textContent = centuryLabel(center).toUpperCase();
  }
  function updateCount() {
    const items = field.inView();
    const r = items.filter((x) => x.$ === 'r').length;
    $('#s-view').textContent = `${r} records, ${items.length - r} events`;
  }

  function fitRange(t0, t1, dur) {
    if (!isFinite(t0) || !isFinite(t1)) return;
    const a = tToU(Math.min(t0, t1)), b = tToU(Math.max(t0, t1));
    const pad = Math.max(0.006, (b - a) * 0.06);
    field.fitU(a - pad, b + pad, null, dur);
  }
  function fitCurrent() {
    const r = state.route;
    if (!r) return;
    if (r.kind === 'p' && r.item.recs.length) {
      const ts = r.item.recs.map((x) => x.t).sort((a, b) => a - b);
      const q = (f) => ts[Math.min(ts.length - 1, Math.max(0, Math.round(f * (ts.length - 1))))];
      fitRange(q(ts.length > 12 ? 0.03 : 0), q(ts.length > 12 ? 0.97 : 1));
    }
    if (r.kind === 'th' && r.item.beats.length) fitRange(r.item.beats[0].t, r.item.beats[r.item.beats.length - 1].t);
  }

  function parse() {
    const h = decodeURI(location.hash || '').replace(/^#\/?/, '');
    const [kind, ...rest] = h.split('/');
    return { kind: kind || 'continuum', id: decodeURIComponent(rest.join('/')) };
  }

  function apply() {
    const { kind, id } = parse();
    if (window.__dbg) console.log('APPLY', kind, id, JSON.stringify(field.visibleU()));
    state.sel = null;
    state.route = null;
    field.setThread(null);
    let mode = MODES.includes(kind) ? kind : 'continuum';
    const miss = () => { readout.set('Not on record', `<p class="lead">No entry matches “${String(id).replace(/</g, '&lt;')}”. It may have been renamed. Search for it instead.</p>`, readout.back('#/continuum', 'In view')); };
    if (kind === 'r') {
      const r = S.recById.get(id);
      if (!r) miss(); else { state.sel = { kind: 'r', item: r }; readout.record(r); field.bringIntoView(r.t, spanForRec(r)); }
      mode = 'continuum';
    } else if (kind === 'e') {
      const e = S.evById.get(id);
      if (!e) miss(); else { state.sel = { kind: 'e', item: e }; readout.event(e); field.bringIntoView(e.t, spanFor(e.t)); }
      mode = 'continuum';
    } else if (kind === 'i') {
      const inc = S.incById.get(id);
      mode = 'incursions';
      if (!inc) miss();
      else {
        state.sel = { kind: 'i', item: inc }; readout.incursion(inc);
        const ts = inc.legs.flatMap((g) => [g.from.t, g.to.t]);
        fitRange(Math.min(...ts), Math.max(...ts));
      }
    } else if (kind === 'd') {
      const d = S.divById.get(id);
      mode = 'divergences';
      if (!d) miss();
      else {
        state.sel = { kind: 'd', item: d }; readout.divergence(d);
        const b = d.branch && typeof d.branch.t === 'number' ? d.branch.t : null;
        fitRange(b != null ? Math.min(b, d.t) : d.t, d.end && typeof d.end.t === 'number' ? Math.max(d.end.t, d.t) : d.t + 5);
      }
    } else if (kind === 'p') {
      const p = S.personByKey.get(id);
      mode = 'personnel';
      if (!p) miss();
      else { state.route = { kind: 'p', item: p }; field.setWorlds([p]); readout.person(p); fitCurrent(); }
    } else if (kind === 'th') {
      const th = S.thById.get(id);
      mode = 'threads';
      if (!th) miss();
      else { state.route = { kind: 'th', item: th }; field.setThread(th); readout.thread(th); fitCurrent(); }
    } else if (kind === 'v') {
      const [a, b] = id.split('/').map(parseFloat);
      mode = 'continuum';
      if (isFinite(a) && isFinite(b)) fitRange(a, b, 0);
      setTimeout(() => readout.inView(field.inView()), 50);
    } else if (kind === 't') {
      const t = parseFloat(id);
      mode = 'continuum';
      if (isFinite(t)) field.bringIntoView(t, spanFor(t));
      setTimeout(() => readout.inView(field.inView()), 800);
    } else {
      readout.list(mode);
    }
    if (!['p', 'th'].includes(kind)) field.setWorlds([]);
    field.select(state.sel);
    state.mode = mode;
    field.setMode(mode);
    document.querySelectorAll('.navbtn[data-mode]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.mode === mode)));
    if (mode === 'continuum' && !state.sel && kind !== 'r') readout.inView(field.inView());
  }

  function go(hash) {
    chirp(hash.startsWith('#/r/') || hash.startsWith('#/e/') ? 'select' : 'nav');
    if (location.hash === hash) apply(); else location.hash = hash;
  }
  window.addEventListener('hashchange', apply);

  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g && !e.target.closest('.results')) { e.preventDefault(); go(g.dataset.go); return; }
    const m = e.target.closest('.navbtn[data-mode]');
    if (m) go(`#/${m.dataset.mode}`);
  });

  const audioBtn = $('#audio');
  const paintAudio = () => { audioBtn.textContent = audioOn() ? 'Audio on' : 'Audio off'; audioBtn.classList.toggle('on', audioOn()); audioBtn.setAttribute('aria-pressed', String(audioOn())); };
  audioBtn.addEventListener('click', () => { setAudio(!audioOn()); paintAudio(); chirp('nav'); });
  paintAudio();

  $('#z-in').addEventListener('click', () => field.zoomBy(1.8));
  $('#z-out').addEventListener('click', () => field.zoomBy(1 / 1.8));
  $('#z-reset').addEventListener('click', () => fitRange(HOME[0], HOME[1]));

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === '/') { e.preventDefault(); $('#q').focus(); }
    else if (e.key === 'Escape') { if (state.sel || state.route) go(`#/${state.mode}`); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      let i;
      if (state.sel && (state.sel.kind === 'r' || state.sel.kind === 'e')) i = state.sel.item.ci + dir;
      else {
        const [a, b] = field.visibleU(), t = uToT((a + b) / 2);
        i = S.chron.findIndex((x) => x.t >= t);
        if (dir < 0) i -= 1;
      }
      const x = S.chron[Math.max(0, Math.min(S.chron.length - 1, i))];
      if (x) { e.preventDefault(); go(x.$ === 'r' ? `#/r/${enc(x.id)}` : `#/e/${enc(x.id)}`); }
    } else if (e.key === '+' || e.key === '=') field.zoomBy(1.6);
    else if (e.key === '-' || e.key === '_') field.zoomBy(1 / 1.6);
    else if (e.key === '0') fitRange(HOME[0], HOME[1]);
  });

  // first light happens behind the gate; the reveal plays when the viewer engages
  const a = tToU(HOME[0]), b = tToU(HOME[1]);
  field.fitU(a, b, null, 0);
  ribbon.draw();
  updateStatus();
  apply();
  updateCount();
  field.hooks.onView = ((orig) => (ended) => { orig(ended); if (ended) updateCount(); })(field.hooks.onView);
  gate.stage(4, `${S.divergences.length} divergences charted`);
  setTimeout(() => gate.ready(() => {
    chirp('nav');
    document.body.classList.remove('boot');
    void document.body.offsetWidth;
    document.body.classList.add('boot');
    field.startReveal();
    setTimeout(() => document.body.classList.remove('boot'), 1500);
  }), 350);
}

boot();
