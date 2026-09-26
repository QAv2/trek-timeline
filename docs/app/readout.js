// The readout panel: every list and every dossier the console can show.
import { OUTCOME, FATE, norm } from './data.js';
import { fmtTime, centuryLabel, sdForTime, timeForSd } from './scale.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = (s) => encodeURIComponent(s);
const MA = (t) => `https://memory-alpha.fandom.com/wiki/${encodeURIComponent(String(t).replace(/ /g, '_'))}`;
const PREC = { sd: 'Stardate-derived', date: 'Dated on screen', year: 'Year of record', est: 'Estimated', decade: 'Decade only', century: 'Century only', range: 'Spans years' };
const TL = { prime: 'Prime', kelvin: 'Kelvin reality', mirror: 'Mirror universe', alt: 'Alternate timeline' };
const CONF = { explicit: 'Explicit', inferred: 'Inferred', estimated: 'Estimated' };
const KIND_CHIP = { 'alternate-timeline': 'ALT', 'alternate-reality': 'REAL', 'parallel-universe': 'PARA', 'quantum-reality': 'QNTM', 'possible-future': 'FUT', loop: 'LOOP', pocket: 'PCKT' };
const OC_CHIP = { restored: 'RSTR', predestination: 'PRED', divergence: 'DIVG', persistent: 'PERS', loop: 'LOOP', unresolved: 'OPEN', unknown: 'UNKN' };

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
const cell = (k, v, cls = '') => (v == null || v === '' ? '' : `<div class="c ${cls}"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`);

export class Readout {
  constructor({ store, head, tools, body, field }) {
    Object.assign(this, { S: store, head, tools, body, field });
    this.state = {};
    body.addEventListener('click', (e) => this.onClick(e));
    body.addEventListener('input', (e) => this.onInput(e));
  }

  set(kicker, html, toolsHtml = '') {
    this.head.textContent = kicker;
    this.tools.innerHTML = toolsHtml;
    this.body.innerHTML = html;
    this.body.scrollTop = 0;
  }
  back(hash, label = 'Back') { return `<button class="back" data-go="${hash}">◂ ${esc(label)}</button>`; }

  // ── building blocks ───────────────────────────────────────────────
  chip(label, color) { return `<span class="chip" style="background:${color}">${esc(label)}</span>`; }
  code(r) { return r.s === 'FLM' ? (r.l === 'KELVIN' ? 'Kelvin film' : 'Film') : `${r.s} ${r.n || ''}`.trim(); }
  recRow(r, right) {
    const d = right != null ? right : (r.sd ? `SD ${r.sd}` : r.tt);
    return `<li><button class="row" data-go="#/r/${enc(r.id)}">${this.chip(r.lane.label, r.lane.color)}
      <span class="t">${esc(r.ti)}<small>${esc(r.lg)}</small></span><span class="d">${esc(d)}</span></button></li>`;
  }
  evRow(e, right) {
    return `<li><button class="row" data-go="#/e/${enc(e.id)}">${this.chip('HIST', e.conflict ? '#ff5b5b' : '#e9e2cf')}
      <span class="t">${esc(e.title)}<small>${esc(e.summary || '')}</small></span><span class="d">${esc(right != null ? right : e.tText || '')}</span></button></li>`;
  }
  incRow(inc) {
    const g = inc.legs[0], oc = OUTCOME[inc.oc];
    const route = `${g.from.tText || Math.round(g.from.t)} → ${g.to.tText || Math.round(g.to.t)}`;
    return `<li><button class="row" data-go="#/i/${enc(inc.id)}">${this.chip(OC_CHIP[inc.oc], oc.c)}
      <span class="t">${esc(inc.title)}<small>${esc(route)}</small></span><span class="d">${esc(this.srcCode(inc))}</span></button></li>`;
  }
  divRow(d) {
    const fate = d.end && d.end.fate ? FATE[d.end.fate] || d.end.fate : '';
    return `<li><button class="row" data-go="#/d/${enc(d.id)}">${this.chip(KIND_CHIP[d.kind] || 'DIV', d.lane === 'MIRROR' ? '#e0475b' : d.lane === 'KELVIN' ? '#b6e3ff' : '#ff8a7a')}
      <span class="t">${esc(d.title)}<small>${esc((d.branch && d.branch.cause) || d.summary || '')}</small></span><span class="d">${esc((d.branch && d.branch.tText) || '')}${fate ? ' · ' + esc(fate) : ''}</span></button></li>`;
  }
  srcCode(x) { const r = x.srcRecs && x.srcRecs[0]; return r ? this.code(r) : ''; }
  personChip(p, extra = '') { return `<button class="pchip" data-go="#/p/${enc(p.k)}"><b>${esc(p.name)}</b>${extra}</button>`; }
  primaryLane(p) {
    const c = new Map();
    for (const r of p.recs) c.set(r.l, (c.get(r.l) || 0) + 1);
    let best = null, n = -1;
    for (const [l, v] of c) if (v > n) { n = v; best = l; }
    return this.S.laneById.get(best) || this.S.laneById.get('HISTORY');
  }

  // ── continuum: what's in the window ───────────────────────────────
  inView(items) {
    const shown = items.slice(0, 450);
    let html = '', curKey = null;
    for (const it of shown) {
      const key = it.t >= 1000 ? String(Math.floor(it.t)) : centuryLabel(it.t);
      if (key !== curKey) {
        if (curKey != null) html += '</ul>';
        const n = shown.filter((x) => (x.t >= 1000 ? String(Math.floor(x.t)) : centuryLabel(x.t)) === key).length;
        html += `<div class="yearhead">${esc(key)}<span class="sub">${n} ${n === 1 ? 'entry' : 'entries'}</span></div><ul class="list">`;
        curKey = key;
      }
      html += it.$ === 'r' ? this.recRow(it) : this.evRow(it, it.t >= 1000 ? '' : it.tText || fmtTime(it.t));
    }
    if (curKey != null) html += '</ul>';
    if (!items.length) html = `<p class="note">Nothing is recorded in this window. Zoom out, or drag the gold window on the era ribbon to move through time.</p>`;
    else if (items.length > shown.length) html += `<p class="note">Showing the first ${shown.length} of ${items.length}. Zoom in to narrow the window.</p>`;
    const recs = items.filter((x) => x.$ === 'r').length;
    let seen = true;
    try { seen = localStorage.getItem('tic-hint') === '1'; } catch (_) { /* storage blocked */ }
    const hint = seen ? '' : `<div class="statusnote hint"><div class="k">Orientation</div>Drag the field to move through time; scroll or pinch to zoom. Click any mark for its record. Press / to search, or describe an episode in plain words. The gold window on the ribbon above is where you are in all of time.
      <div class="btnrow" style="margin:8px 0 2px"><button class="btn gold" data-act="hint-ok">Understood</button></div></div>`;
    this.set(`In view: ${recs} records, ${items.length - recs} events`, hint + html);
  }

  // ── record ────────────────────────────────────────────────────────
  record(r) {
    const S = this.S;
    const seriesName = r.s === 'FLM' ? (r.l === 'KELVIN' ? 'Star Trek films, Kelvin reality' : 'Star Trek films') : S.series[r.s] || r.s;
    const people = r.c.map((i) => S.people[i]);
    const credited = people.slice(0, r.cu == null ? people.length : r.cu), uncredited = people.slice(credited.length);
    const links = S.recLinks.get(r.id) || [];
    const act = [];
    for (const l of links) {
      if (l.kind === 'i') act.push(this.incRow(l.item));
      if (l.kind === 'd') act.push(this.divRow(l.item));
      if (l.kind === 'e') act.push(this.evRow(l.item));
      if (l.kind === 'th') act.push(`<li><button class="row" data-go="#/th/${enc(l.item.id)}">${this.chip('THRD', '#ffb347')}<span class="t">${esc(l.item.title)}<small>${esc(l.item.status || '')}</small></span><span class="d"></span></button></li>`);
      if (l.kind === 'x') act.push(`<li><div class="row">${this.chip('XING', '#e0475b')}<span class="t">Mirror crossing<small>${esc(l.item.summary || '')}</small></span><span class="d">${esc(l.item.tText || '')}</span></div></li>`);
    }
    const seen = new Set();
    const actUniq = act.filter((h) => (seen.has(h) ? false : seen.add(h)));
    const prev = S.chron[r.ci - 1], next = S.chron[r.ci + 1];
    const nb = (x) => (x ? (x.$ === 'r' ? this.recRow(x, x.tt) : this.evRow(x)) : '');
    const top = credited.slice(0, 16), rest = credited.slice(16).concat(uncredited);
    const html = `
      <div class="series-tag"><i style="background:${r.lane.color}"></i>${esc(seriesName)}</div>
      <h2>${esc(r.ti)}</h2>
      <div class="cells">
        ${cell('In-universe', r.tt, 'gold')}
        ${cell('Stardate', r.sd)}
        ${cell(r.s === 'FLM' ? 'Released' : 'Aired', fmtDate(r.ad))}
        ${cell('Episode', r.s === 'FLM' ? null : r.n)}
        ${cell('Timeline', TL[r.tl] || r.tl)}
        ${cell('Placement', PREC[r.pr] || 'Year of record')}
      </div>
      <p class="lead">${esc(r.lg)}</p>
      ${r.or ? `<p class="note">Also set in: ${esc(r.or)}</p>` : ''}
      ${actUniq.length ? `<h3>Temporal activity</h3><ul class="list">${actUniq.join('')}</ul>` : ''}
      ${people.length ? `<h3>Personnel on record</h3><div class="chips">${top.map((p) => this.personChip(p)).join('')}
        ${rest.length ? `<span class="more-wrap" hidden>${rest.map((p) => this.personChip(p)).join('')}</span><button class="more" data-act="more">Show ${rest.length} more${uncredited.length ? ', including uncredited' : ''}</button>` : ''}</div>` : ''}
      <h3>Before and after, in-universe</h3>
      <ul class="list">${nb(prev)}${nb(next)}</ul>
      ${r.prevAir || r.nextAir ? `<h3>Previous and next ${r.s === 'FLM' ? 'film' : 'episode'}</h3><ul class="list">${r.prevAir ? this.recRow(r.prevAir, 'Previous') : ''}${r.nextAir ? this.recRow(r.nextAir, 'Next') : ''}</ul>` : ''}
      <div class="btnrow"><a class="btn f3" href="${MA(r.ma)}" target="_blank" rel="noopener">Memory Alpha</a><button class="btn f1" data-act="fit-rec" data-id="${esc(r.id)}">Center in continuum</button></div>
      <p class="fine">${r.lgs === 'ma' ? 'Synopsis from Memory Alpha (CC BY-NC). ' : ''}In-universe dating follows Memory Alpha.</p>`;
    this.set(`Record ${this.code(r)}`, html, this.back('#/continuum', 'In view'));
  }

  // ── history event ─────────────────────────────────────────────────
  event(e) {
    const html = `
      <div class="series-tag"><i style="background:${e.conflict ? '#ff5b5b' : '#e9e2cf'}"></i>History, ${esc(centuryLabel(e.t))}</div>
      <h2>${esc(e.title)}</h2>
      <div class="cells">${cell('When', e.tText, 'gold')}${cell('Confidence', CONF[e.confidence] || e.confidence)}${cell('Category', e.category)}${cell('Civilization', e.civ)}</div>
      <p class="lead">${esc(e.summary)}</p>
      ${e.conflict ? `<div class="anomaly"><div class="k">Chronometric anomaly</div>${esc(e.conflict)}</div>` : ''}
      ${e.srcRecs.length ? `<h3>Established in</h3><ul class="list">${e.srcRecs.map((r) => this.recRow(r, r.tt)).join('')}</ul>` : ''}
      <div class="btnrow">${e.ma ? `<a class="btn f3" href="${MA(e.ma)}" target="_blank" rel="noopener">Memory Alpha</a>` : ''}<button class="btn f1" data-act="fit-t" data-t="${e.t}">Center in continuum</button></div>`;
    this.set('History', html, this.back('#/continuum', 'In view'));
  }

  // ── incursion ─────────────────────────────────────────────────────
  incursion(inc) {
    const S = this.S, oc = OUTCOME[inc.oc];
    const lane = (id) => (S.laneById.get(id) || {}).sub || id;
    const legs = inc.legs.map((g) => `<div class="leg">
        <div class="end"><div class="k">From · ${esc(lane(g.fromLane))}</div><div class="v">${esc(g.from.tText || Math.round(g.from.t))}</div></div>
        <div class="arrow"></div>
        <div class="end" style="border-left-color:${oc.c}"><div class="k">To · ${esc(lane(g.toLane))}</div><div class="v">${esc(g.to.tText || Math.round(g.to.t))}</div></div></div>`).join('');
    const trav = (inc.travelers || []).map((k) => (S.personByKey.has(k) ? this.personChip(S.personByKey.get(k)) : `<span class="pchip">${esc(k)}</span>`)).join('');
    const html = `
      <div class="series-tag"><i style="background:${oc.c}"></i>Temporal incursion</div>
      <h2>${esc(inc.title)}</h2>
      <div class="cells">${cell('Outcome', oc.label, 'gold')}${cell('Method', inc.method)}${cell('Agency', inc.agency)}${cell('Confidence', CONF[inc.confidence] || inc.confidence)}</div>
      <div class="legs">${legs}</div>
      <p class="lead">${esc(inc.summary)}</p>
      ${inc.conflict ? `<div class="anomaly"><div class="k">Chronometric anomaly</div>${esc(inc.conflict)}</div>` : ''}
      ${inc.div ? `<h3>Divergence caused</h3><ul class="list">${this.divRow(inc.div)}</ul>` : ''}
      ${trav ? `<h3>Travelers</h3><div class="chips">${trav}</div>` : ''}
      ${inc.srcRecs.length ? `<h3>On record</h3><ul class="list">${inc.srcRecs.map((r) => this.recRow(r, r.tt)).join('')}</ul>` : ''}
      <p class="fine">${esc(oc.note)}.</p>`;
    this.set('Incursion', html, this.back('#/incursions', 'Registry'));
  }

  // ── divergence ────────────────────────────────────────────────────
  divergence(d) {
    const b = d.branch || {}, e = d.end || {};
    const html = `
      <div class="series-tag"><i style="background:${d.lane === 'MIRROR' ? '#e0475b' : d.lane === 'KELVIN' ? '#b6e3ff' : '#ff8a7a'}"></i>${esc((d.kind || '').replace(/-/g, ' '))}</div>
      <h2>${esc(d.title)}</h2>
      <div class="cells">${cell('Branch', b.tText, 'gold')}${cell('Ends', e.tText)}${cell('Fate', FATE[e.fate] || e.fate)}${cell('Confidence', CONF[d.confidence] || d.confidence)}</div>
      ${b.cause ? `<p class="note">Cause: ${esc(b.cause)}</p>` : ''}
      <p class="lead">${esc(d.summary)}</p>
      ${(d.keyDifferences || []).length ? `<h3>What's different</h3><ul>${d.keyDifferences.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${d.inverted ? `<p class="note">This branch is the overwritten original history. The Prime lane shows the altered version that stuck.</p>` : ''}
      ${d.conflict ? `<div class="anomaly"><div class="k">Chronometric anomaly</div>${esc(d.conflict)}</div>` : ''}
      ${(d.incs || []).length ? `<h3>Caused by</h3><ul class="list">${d.incs.map((i) => this.incRow(i)).join('')}</ul>` : ''}
      ${d.srcRecs.length ? `<h3>On record</h3><ul class="list">${d.srcRecs.map((r) => this.recRow(r, r.tt)).join('')}</ul>` : ''}`;
    this.set('Divergence', html, this.back('#/divergences', 'Registry'));
  }

  // ── person ────────────────────────────────────────────────────────
  person(p) {
    const S = this.S, d = p.dossier || {};
    const recs = p.recs;
    const wl = S.worldline(p).filter((x) => x.r && !x.ghost);
    const first = wl.length ? wl[0].r : recs[0], last = wl.length ? wl[wl.length - 1].r : recs[recs.length - 1];
    const byLane = new Map();
    for (const r of recs) { if (!byLane.has(r.l)) byLane.set(r.l, []); byLane.get(r.l).push(r); }
    const max = Math.max(1, ...[...byLane.values()].map((a) => a.length));
    const bars = S.lanes.filter((l) => byLane.has(l.id)).map((l) => `<div class="b"><span>${esc(l.label)}</span><span class="track"><span class="fillb" style="display:block;width:${(byLane.get(l.id).length / max) * 100}%;background:${l.color}"></span></span><span class="n">${byLane.get(l.id).length}</span></div>`).join('');
    const threads = S.threads.filter((th) => th.persons.includes(p));
    const cps = (d.counterparts || []).map((k) => S.personByKey.get(k)).filter(Boolean);
    const lists = S.lanes.filter((l) => byLane.has(l.id)).map((l) => `<details${byLane.size === 1 ? ' open' : ''}><summary class="yearhead" style="position:static;cursor:pointer">${esc(l.label)}<span class="sub">${byLane.get(l.id).length} records</span></summary><ul class="list">${byLane.get(l.id).map((r) => this.recRow(r, r.tt)).join('')}</ul></details>`).join('');
    const posts = (d.posts || []).map((x) => `<dt>${esc(x.from)}${x.to && x.to !== x.from ? '–' + esc(x.to) : ''}</dt><dd>${esc(x.text)}</dd>`).join('');
    const dis = (d.displacements || []).map((x) => `<div class="leg"><div class="end"><div class="k">From</div><div class="v">${esc(fmtTime(x.from))}</div></div><div class="arrow"></div><div class="end" style="border-left-color:var(--gold)"><div class="k">To</div><div class="v">${esc(fmtTime(x.to))}</div></div></div><p class="note">${esc(x.via || '')}</p>`).join('');
    const html = `
      <div class="series-tag"><i style="background:var(--gold)"></i>Personnel file</div>
      <h2>${esc(p.name)}</h2>
      <div class="cells">
        ${cell('Species', d.species)}${cell('Born', d.born && d.born.tText)}${cell('Died', d.died && d.died.tText)}
        ${cell('Records', recs.length)}${cell('First', first && first.tt, 'gold')}${cell('Last', last && last.tt)}
      </div>
      ${d.summary ? `<p class="lead">${esc(d.summary)}</p>` : ''}
      ${posts ? `<h3>Posts</h3><dl class="kv">${posts}</dl>` : ''}
      ${dis ? `<h3>Temporal displacements</h3>${dis}` : ''}
      ${threads.length ? `<h3>Threads</h3><ul class="list">${threads.map((th) => `<li><button class="row" data-go="#/th/${enc(th.id)}">${this.chip('THRD', '#ffb347')}<span class="t">${esc(th.title)}<small>${esc(th.status || th.kind || '')}</small></span><span class="d">${th.beats.length} beats</span></button></li>`).join('')}</ul>` : ''}
      ${cps.length ? `<h3>Counterparts</h3><div class="chips">${cps.map((c) => this.personChip(c)).join('')}</div>` : ''}
      ${bars ? `<h3>Appearances by lane</h3><div class="bars">${bars}</div>` : ''}
      ${lists ? `<h3>Records</h3>${lists}` : '<p class="note">No appearances in the cast records.</p>'}
      ${(p.archive || []).length ? `<h3>Archive footage</h3><p class="note">Seen in these records through footage from earlier ones, so they're left off the worldline.</p><ul class="list">${p.archive.map((r) => this.recRow(r, r.tt)).join('')}</ul>` : ''}
      <div class="btnrow"><a class="btn f3" href="${MA(p.k)}" target="_blank" rel="noopener">Memory Alpha</a><button class="btn f1" data-act="fit-person">Fit worldline</button></div>
      <p class="fine">The gold line on the continuum is this person's worldline through every record they appear in.</p>`;
    this.set('Personnel file', html, this.back('#/personnel', 'Roster'));
  }

  // ── thread ────────────────────────────────────────────────────────
  thread(th) {
    const beat = (b) => `<li class="w${b.weight || 1}">
      <div class="bm">${esc(b.tText || fmtTime(b.t))}${b.rec ? ` · ${esc(this.code(b.rec))}` : ''}</div>
      <div class="bt">${b.rec ? `<button data-go="#/r/${enc(b.rec.id)}">${esc(b.title)}</button>` : esc(b.title)}</div>
      <div>${esc(b.note || '')}</div>${b.rec ? `<div class="note">${esc(b.rec.ti)}</div>` : ''}</li>`;
    const ppl = th.persons.map((p, i) => this.personChip(p, `<span class="x" style="color:${i ? '#7fd4ff' : '#ffb347'}">●</span>`)).join('');
    const web = (th.sources_web || []).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>${s.date ? ` <span class="fine">${esc(s.date)}</span>` : ''}</li>`).join('');
    const html = `
      <div class="series-tag"><i style="background:var(--gold)"></i>${esc(th.kind || 'thread')}</div>
      <h2>${esc(th.title)}</h2>
      <div class="chips">${ppl}</div>
      <p class="lead" style="margin-top:12px">${esc(th.summary || '')}</p>
      ${th.brief ? `<p><a href="${esc(th.brief)}">Read the full briefing</a>, including what the latest episode set up and what the writers have said.</p>` : ''}
      ${th.status ? `<div class="statusnote"><div class="k">Where it stands</div>${esc(th.status)}</div>` : ''}
      <h3>Beats</h3><ol class="beats">${th.beats.map(beat).join('')}</ol>
      ${(th.alternate || []).length ? `<h3>Kelvin reality</h3><ol class="beats">${th.alternate.map(beat).join('')}</ol>` : ''}
      ${web ? `<h3>Sources beyond canon</h3><ul>${web}</ul>` : ''}
      <div class="btnrow">${th.brief ? `<a class="btn gold" href="${esc(th.brief)}">Read the briefing</a>` : ''}<button class="btn f1" data-act="fit-thread">Fit thread</button></div>
      <p class="fine">Gold and ice lines are the two worldlines; ringed points are records they share. Diamonds mark the beats.</p>`;
    this.set('Thread', html, this.back('#/threads', 'Threads'));
  }

  // ── registries and tools ──────────────────────────────────────────
  list(mode) {
    const f = this[`list_${mode}`];
    if (f) f.call(this); else this.inView(this.field.inView());
  }

  list_incursions() {
    const S = this.S;
    const oc = this.state.oc || 'all', q = this.state.iq || '';
    const items = S.incursions.filter((i) => (oc === 'all' || i.oc === oc) && (!q || norm(`${i.title} ${i.summary} ${i.method} ${(i.travelers || []).join(' ')}`).includes(norm(q))));
    const counts = {};
    for (const i of S.incursions) counts[i.oc] = (counts[i.oc] || 0) + 1;
    const seg = ['all', ...Object.keys(OUTCOME).filter((k) => counts[k])].map((k) => `<button data-act="oc" data-v="${k}" aria-pressed="${k === oc}">${k === 'all' ? 'All' : OUTCOME[k].label}</button>`).join('');
    const legend = Object.entries(OUTCOME).filter(([k]) => counts[k]).map(([k, o]) => `<div class="li">${legendArc(o)}<span><b>${esc(o.label)}</b> <span class="note">${esc(o.note)}. ${counts[k]} on record.</span></span></div>`).join('');
    const html = `
      <p class="note">Every time-travel event in the canon, drawn as an arc from where the travellers left to where they arrived. Longer jumps arc higher.</p>
      <div class="filterbar"><input type="search" data-in="iq" placeholder="Filter incursions" value="${esc(q)}"></div>
      <div class="seg" style="margin-bottom:12px">${seg}</div>
      <ul class="list" data-list>${items.map((i) => this.incRow(i)).join('') || '<p class="note">No incursions match. Clear the filter.</p>'}</ul>
      <h3>Legend</h3><div class="legend">${legend}</div>`;
    this.set(`Incursion registry: ${S.incursions.length}`, html);
  }

  list_divergences() {
    const S = this.S;
    const groups = [['Alternate timelines', (d) => d.lane === 'ALT'], ['Mirror Universe', (d) => d.lane === 'MIRROR'], ['Kelvin reality', (d) => d.lane === 'KELVIN']];
    let html = '<p class="note">Timelines that branched away from the Prime record. A cross marks one that collapsed or was undone; an arrowhead marks one that persists.</p>';
    for (const [label, fn] of groups) {
      const arr = S.divergences.filter(fn);
      if (arr.length) html += `<h3>${esc(label)}</h3><ul class="list">${arr.map((d) => this.divRow(d)).join('')}</ul>`;
    }
    if (S.crossings.length) {
      html += `<h3>Mirror crossings</h3><ul class="list">${S.crossings.map((x) => `<li><button class="row" ${x.srcRecs[0] ? `data-go="#/r/${enc(x.srcRecs[0].id)}"` : ''}>${this.chip(x.to === 'mirror' ? 'IN' : 'OUT', '#e0475b')}<span class="t">${esc((x.travelers || []).slice(0, 3).join(', ') || 'Crossing')}<small>${esc(x.summary || '')}</small></span><span class="d">${esc(x.tText || '')}</span></button></li>`).join('')}</ul>`;
    }
    if (!S.divergences.length) html += '<p class="note">The divergence registry is still being compiled.</p>';
    this.set(`Divergence registry: ${S.divergences.length}`, html);
  }

  list_personnel() {
    const S = this.S, q = this.state.pq || '', scope = this.state.ps || 'principal';
    let arr = scope === 'principal' ? S.people.filter((p) => p.dossier) : S.people.filter((p) => p.recs.length);
    if (!arr.length) arr = S.people.filter((p) => p.recs.length >= 30);
    if (q) { const nq = norm(q); arr = S.people.filter((p) => norm(p.name).includes(nq)); }
    arr = arr.slice().sort((a, b) => b.recs.length - a.recs.length);
    const limit = this.state.plimit || 200;
    const rows = arr.slice(0, limit).map((p) => {
      const L = this.primaryLane(p);
      return `<li><button class="row" data-go="#/p/${enc(p.k)}">${this.chip(L.label, L.color)}<span class="t">${esc(p.name)}<small>${esc((p.dossier && p.dossier.summary) || '')}</small></span><span class="d">${p.recs.length}</span></button></li>`;
    }).join('');
    const html = `
      <div class="filterbar"><input type="search" data-in="pq" placeholder="Find anyone: Uhura, Garak, Kovich…" value="${esc(q)}"></div>
      <div class="seg" style="margin-bottom:10px"><button data-act="ps" data-v="principal" aria-pressed="${scope === 'principal'}">Principal</button><button data-act="ps" data-v="all" aria-pressed="${scope === 'all'}">Everyone on record</button></div>
      <ul class="list">${rows || '<p class="note">Nobody on record by that name. Try a surname.</p>'}</ul>
      ${arr.length > limit ? `<button class="more" data-act="plimit">Show more (${arr.length - limit} remaining)</button>` : ''}
      <p class="fine">The number is how many records each person appears in, from the credited cast lists.</p>`;
    this.set(`Personnel: ${S.people.length}`, html);
  }

  list_threads() {
    const S = this.S;
    const rows = S.threads.map((th) => `<li><button class="row" data-go="#/th/${enc(th.id)}">${this.chip('THRD', '#ffb347')}<span class="t">${esc(th.title)}<small>${esc(th.summary || '')}</small></span><span class="d">${th.beats.length} beats</span></button></li>`).join('');
    const html = `<p class="note">Relationship arcs traced across the continuum. Opening a thread draws both worldlines and marks the moments between them.</p>
      <ul class="list">${rows || '<p class="note">Threads are still being compiled.</p>'}</ul>`;
    this.set(`Threads: ${S.threads.length}`, html);
  }

  list_records() {
    const S = this.S;
    const keys = ['ENT', 'DIS', 'SNW', 'TOS', 'TAS', 'FLM', 'TNG', 'DS9', 'VOY', 'LD', 'PRO', 'PIC', 'SA', 'ST', 'VST', 'KELVIN'].filter((k) => S.bySeries.has(k));
    const cur = this.state.rs || 'TOS';
    const arr = S.bySeries.get(cur) || [];
    let html = `<div class="seg" style="margin-bottom:12px">${keys.map((k) => `<button data-act="rs" data-v="${k}" aria-pressed="${k === cur}">${k === 'FLM' ? 'Films' : k === 'KELVIN' ? 'Kelvin' : k === 'SA' ? 'SFA' : k}</button>`).join('')}</div>`;
    let season = null;
    for (const r of arr) {
      const s = r.s === 'FLM' ? 'Films' : `Season ${r.se}`;
      if (s !== season) { if (season) html += '</ul>'; html += `<div class="yearhead">${esc(s)}</div><ul class="list">`; season = s; }
      html += this.recRow(r, r.n ? r.n : fmtDate(r.ad));
    }
    if (season) html += '</ul>';
    const name = cur === 'FLM' ? 'Star Trek films' : cur === 'KELVIN' ? 'Kelvin films' : S.series[cur] || cur;
    this.set(`Records: ${name}`, html);
  }

  list_stardate() {
    const html = `
      <p class="note">Stardates only convert cleanly from the 24th century on, where each thousand units is a year. Earlier stardates don't follow a formula, so the resolver shows the nearest records instead.</p>
      <div class="tool"><label for="sd-in">Stardate</label><input id="sd-in" data-in="sd" inputmode="decimal" placeholder="41153.7" value="${esc(this.state.sd || '')}"><div class="out" id="sd-out"></div></div>
      <div class="tool"><label for="yr-in">Year</label><input id="yr-in" data-in="yr" inputmode="decimal" placeholder="2364" value="${esc(this.state.yr || '')}"><div class="out" id="yr-out"></div></div>
      <h3>Nearest records</h3><ul class="list" id="sd-near"></ul>`;
    this.set('Stardate resolver', html);
    this.updateStardate();
  }

  updateStardate() {
    const S = this.S;
    const sdOut = this.body.querySelector('#sd-out'), yrOut = this.body.querySelector('#yr-out'), near = this.body.querySelector('#sd-near');
    if (!sdOut) return;
    const sd = parseFloat(this.state.sd), yr = parseFloat(this.state.yr);
    let target = null;
    if (isFinite(sd)) {
      const r = timeForSd(sd);
      sdOut.innerHTML = r ? `${esc(fmtTime(r.t, 0.01))} <small>${esc(r.rule)}</small>` : `No formula <small>Before the 24th century, stardates don't map to a calendar. Nearest records by stardate are below.</small>`;
      const cands = S.records.filter((x) => x.sd && isFinite(+x.sd)).map((x) => [Math.abs(+x.sd - sd), x]).sort((a, b) => a[0] - b[0]).slice(0, 8).map((a) => a[1]);
      near.innerHTML = cands.map((x) => this.recRow(x, `SD ${x.sd}`)).join('');
      target = r ? r.t : null;
    } else sdOut.innerHTML = '';
    if (isFinite(yr)) {
      const r = sdForTime(yr);
      yrOut.innerHTML = r ? `SD ${esc(r.sd.toFixed(1))} <small>${esc(r.rule)}</small>` : `No stardate <small>No consistent stardate scale covers ${esc(fmtTime(yr))}.</small>`;
      if (!isFinite(sd)) {
        const cands = S.records.map((x) => [Math.abs(x.t - yr), x]).sort((a, b) => a[0] - b[0]).slice(0, 8).map((a) => a[1]);
        near.innerHTML = cands.map((x) => this.recRow(x, x.tt)).join('');
      }
      target = target == null ? yr : target;
    } else yrOut.innerHTML = '';
    if (!isFinite(sd) && !isFinite(yr)) near.innerHTML = '<p class="note">Enter a stardate or a year.</p>';
    if (target != null && isFinite(target)) this.field.bringIntoView(target, 6);
  }

  list_archive() {
    const S = this.S, m = S.meta;
    const html = `
      <h2>How to read the continuum</h2>
      <p>Time runs left to right. Each lane is a series or a record type; drag to pan, scroll or pinch to zoom, and click anything for its record. The era ribbon above the field shows the whole of time; drag its gold window to travel.</p>
      <p>The scale is not uniform. Deep time is compressed logarithmically, and each century gets width in proportion to how much of the canon happens in it. The chevrons on the axis mark where the scale changes.</p>
      <div class="legend">
        <div class="li"><svg width="44" height="18"><rect x="19" y="3" width="4" height="12" rx="2" fill="#ff9f43"/></svg><span>A record: one episode or film, in its series lane</span></div>
        <div class="li"><svg width="44" height="18"><path d="M22 3 L28 9 L22 15 L16 9Z" fill="#e9e2cf"/></svg><span>A history event; red if the canon contradicts itself</span></div>
        <div class="li"><svg width="44" height="18"><path d="M4 16 Q22 -6 40 16" fill="none" stroke="#56c7ff" stroke-width="2"/></svg><span>A temporal incursion, from departure to arrival</span></div>
        <div class="li"><svg width="44" height="18"><path d="M4 9 H34" stroke="#ff8a7a" stroke-width="2"/><path d="M31 5 L39 13 M39 5 L31 13" stroke="#ff8a7a" stroke-width="2"/></svg><span>An alternate timeline, and where it collapsed</span></div>
        <div class="li"><svg width="44" height="18"><path d="M4 14 L16 6 L28 12 L40 4" fill="none" stroke="#ffb347" stroke-width="2"/></svg><span>A worldline: one person through every record they're in</span></div>
        <div class="li"><svg width="44" height="18"><path d="M22 0 V18" stroke="#ffb347" stroke-width="2"/></svg><span>The temporal locator: your current focus</span></div>
      </div>
      <h3>Placement</h3>
      <p>Episodes sit at their in-universe date. For the 24th century on, stardates place them within the year; otherwise they're spread through the year in broadcast order. Every record says how it was placed.</p>
      <h3>Keys</h3>
      <dl class="kv"><dt>/</dt><dd>Search</dd><dt>← →</dt><dd>Step to the previous or next entry in time</dd><dt>+ −</dt><dd>Zoom</dd><dt>0</dt><dd>Reset the view</dd><dt>Esc</dt><dd>Close the record</dd></dl>
      <h3>Sources</h3>
      <p>Episode data, in-universe dates and cast lists come from <a href="https://memory-alpha.fandom.com" target="_blank" rel="noopener">Memory Alpha</a> (CC BY-NC). History, incursions, divergences, threads and dossiers were compiled for this archive from on-screen canon, with sources cited on every entry.</p>
      <div class="cells">${cell('Records', m.records)}${cell('Personnel', S.people.length)}${cell('Events', S.events.length)}${cell('Incursions', S.incursions.length)}${cell('Divergences', S.divergences.length)}${cell('Data built', m.built, 'gold')}</div>
      <p class="fine">An unofficial fan reference. Star Trek and related marks belong to CBS Studios and Paramount; this archive is not affiliated with or endorsed by them. The Temporal Integrity Commission is a fictional agency.</p>`;
    this.set('Archive', html);
  }

  // ── interaction inside the panel ──────────────────────────────────
  onClick(e) {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const act = a.dataset.act, v = a.dataset.v;
    if (act === 'hint-ok') { try { localStorage.setItem('tic-hint', '1'); } catch (_) { /* storage blocked */ } const h = a.closest('.hint'); if (h) h.remove(); return; }
    if (act === 'more') { const w = a.previousElementSibling; if (w) { w.hidden = false; a.remove(); } }
    else if (act === 'oc') { this.state.oc = v; this.list_incursions(); }
    else if (act === 'ps') { this.state.ps = v; this.state.pq = ''; this.list_personnel(); }
    else if (act === 'plimit') { this.state.plimit = (this.state.plimit || 200) + 300; const st = this.body.scrollTop; this.list_personnel(); this.body.scrollTop = st; }
    else if (act === 'rs') { this.state.rs = v; this.list_records(); }
    else if (act === 'fit-rec') { const r = this.S.recById.get(a.dataset.id); if (r) this.field.bringIntoView(r.t, 8); }
    else if (act === 'fit-t') this.field.bringIntoView(+a.dataset.t, 20);
    else if (act === 'fit-person' || act === 'fit-thread') this.onFit && this.onFit();
  }

  onInput(e) {
    const k = e.target.dataset.in;
    if (!k) return;
    this.state[k] = e.target.value;
    if (k === 'sd' || k === 'yr') { this.updateStardate(); return; }
    clearTimeout(this.inT);
    this.inT = setTimeout(() => {
      const pos = e.target.selectionStart;
      if (k === 'iq') this.list_incursions();
      if (k === 'pq') this.list_personnel();
      const inp = this.body.querySelector(`[data-in="${k}"]`);
      if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (_) { /* search inputs */ } }
    }, 160);
  }
}

function legendArc(o) {
  return `<svg width="44" height="18" aria-hidden="true"><path d="M4 16 Q22 -6 40 16" fill="none" stroke="${o.c}" stroke-width="2" ${o.dash.length ? `stroke-dasharray="${o.dash.join(' ')}"` : ''}/></svg>`;
}
