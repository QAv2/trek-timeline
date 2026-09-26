// Loads the archive and builds every index and derived structure the console needs.
import { tToU, setStardateFit32 } from './scale.js';

export const OUTCOME = {
  restored: { c: '#56c7ff', label: 'Restored', dash: [], note: 'History put back as it was' },
  predestination: { c: '#a77bff', label: 'Predestination', dash: [], note: 'The visit was always part of history' },
  divergence: { c: '#ff6f61', label: 'Divergence', dash: [], note: 'Spawned or exposed an alternate timeline' },
  persistent: { c: '#9be15d', label: 'Persistent', dash: [], note: 'The travellers stayed, or the change held' },
  loop: { c: '#e9e2cf', label: 'Causality loop', dash: [2, 4], note: 'Time closed on itself' },
  unresolved: { c: '#a9a5c4', label: 'Unresolved', dash: [7, 4], note: 'Open incursion' },
  unknown: { c: '#a9a5c4', label: 'Unknown', dash: [7, 4], note: 'Outcome not established' },
};

export const FATE = {
  collapsed: 'Collapsed', restored: 'Restored', persists: 'Persists', averted: 'Averted', unknown: 'Unknown', merged: 'Merged',
};

const css = getComputedStyle(document.documentElement);
const colorCache = {};
export function laneColor(tok) {
  if (!colorCache[tok]) colorCache[tok] = css.getPropertyValue(`--l-${tok}`).trim() || '#9aa';
  return colorCache[tok];
}

export function displayName(k) {
  return k.replace(/ \(alternate reality\)$/, ' (Kelvin)').replace(/ \(mirror\)$/, ' (Mirror)');
}

export const norm = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[’'`]/g, '').replace(/[^a-z0-9²]+/g, ' ').trim();

const LANE_ALIAS = { FILM: 'FILM', FLM: 'FILM', FUTURE: 'HISTORY', SFA: 'SA', VST: 'ST' };

export async function loadArchive() {
  const res = await fetch('data/archive.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`archive.json: HTTP ${res.status}`);
  const A = await res.json();
  const S = {
    meta: A.meta, series: A.series, lanes: A.lanes, laneById: new Map(),
    records: A.records, recById: new Map(), recByMa: new Map(),
    people: A.people, personByKey: new Map(), personnelByKey: new Map(),
    events: [], evById: new Map(), incursions: [], incById: new Map(),
    divergences: [], divById: new Map(), crossings: [], threads: [], thById: new Map(),
    recLinks: new Map(), chron: [], altRows: 1,
  };
  S.lanes.forEach((l, i) => { l.i = i; l.color = laneColor(l.tok); S.laneById.set(l.id, l); });
  const laneOk = (id) => (S.laneById.has(LANE_ALIAS[id] || id) ? (LANE_ALIAS[id] || id) : null);

  // people
  S.people.forEach((p, i) => { p.$ = 'p'; p.i = i; p.name = displayName(p.k); p.recs = []; S.personByKey.set(p.k, p); });
  const person = (k) => {
    if (!k) return null;
    let p = S.personByKey.get(k);
    if (!p) { p = { $: 'p', k, n: 0, i: S.people.length, name: displayName(k), recs: [] }; S.people.push(p); S.personByKey.set(k, p); }
    return p;
  };

  // records
  S.records.forEach((r, i) => {
    r.i = i; r.$ = 'r'; r.u = tToU(r.t);
    r.lane = S.laneById.get(r.l) || S.laneById.get('ST');
    S.recById.set(r.id, r); S.recByMa.set(r.ma, r);
    for (const ci of r.c) S.people[ci].recs.push(r);
    for (const ci of r.ca || []) (S.people[ci].archive = S.people[ci].archive || []).push(r);
  });
  for (const p of S.people) p.recs.sort((a, b) => a.t - b.t);
  const rec = (ma) => (ma ? S.recByMa.get(ma) || S.recByMa.get(`${ma} (episode)`) || null : null);
  const link = (r, kind, item) => {
    if (!r) return;
    if (!S.recLinks.has(r.id)) S.recLinks.set(r.id, []);
    S.recLinks.get(r.id).push({ kind, item });
  };

  // curated personnel dossiers
  for (const d of A.personnel || []) {
    if (!d || !d.ma) continue;
    const p = person(d.ma);
    p.dossier = d;
    if (d.name) p.name = d.name;
    S.personnelByKey.set(d.ma, d);
  }

  // events
  const seenEv = new Set();
  for (const e of A.events || []) {
    if (!e || typeof e.t !== 'number' || seenEv.has(e.id)) continue;
    seenEv.add(e.id);
    e.$ = 'e'; e.u = tToU(e.t); e.w = e.weight || 1; e.srcRecs = (e.sources || []).map(rec).filter(Boolean);
    S.events.push(e); S.evById.set(e.id, e);
    e.srcRecs.forEach((r) => link(r, 'e', e));
  }
  S.events.sort((a, b) => a.t - b.t);
  // stagger events into three rows inside the HISTORY lane: landmarks on the centre line
  let flip = 0;
  for (const e of S.events) e.row = e.w >= 3 ? 1 : (flip++ % 2 ? 0 : 2);

  // incursions — resolve which lane each end of each leg lands in
  for (const inc of A.incursions || []) {
    if (!inc || !Array.isArray(inc.legs) || !inc.legs.length) continue;
    inc.$ = 'i'; inc.srcRecs = (inc.sources || []).map(rec).filter(Boolean);
    const near = (t, tl) => {
      if (tl === 'kelvin') return 'KELVIN';
      if (tl === 'mirror') return 'MIRROR';
      const r = inc.srcRecs.find((x) => Math.abs(x.t - t) < 1.6);
      return r ? r.l : null;
    };
    let prevTo = null;
    inc.legs = inc.legs.filter((g) => g && g.from && g.to && typeof g.from.t === 'number' && typeof g.to.t === 'number');
    if (!inc.legs.length) continue;
    for (const g of inc.legs) {
      g.fromLane = near(g.from.t, g.from.timeline) || prevTo || (inc.srcRecs[0] && inc.srcRecs[0].l) || 'HISTORY';
      g.toLane = near(g.to.t, g.to.timeline) || laneOk(g.toLane) || 'HISTORY';
      g.u0 = tToU(g.from.t); g.u1 = tToU(g.to.t); g.inc = inc;
      prevTo = g.toLane;
    }
    inc.t = inc.legs[0].from.t; inc.u = tToU(inc.t);
    inc.oc = OUTCOME[inc.outcome] ? inc.outcome : 'unknown';
    S.incursions.push(inc); S.incById.set(inc.id, inc);
    inc.srcRecs.forEach((r) => link(r, 'i', inc));
  }
  S.incursions.sort((a, b) => a.t - b.t);

  // divergences: alternate timelines get packed rows in the DIVERGENT lane;
  // the Mirror Universe and the Kelvin reality have lanes of their own.
  const rows = [];
  const dv = (A.divergences || []).filter((d) => d && d.id);
  const startOf = (d) => { const sp = d.span || {}, b = d.branch || {}; return typeof sp.from === 'number' ? sp.from : typeof b.t === 'number' ? b.t : 0; };
  dv.sort((a, b) => startOf(a) - startOf(b));
  for (const d of dv) {
    d.$ = 'd';
    const b = d.branch || {};
    const sp = d.span || {};
    const from = typeof sp.from === 'number' ? sp.from : typeof b.t === 'number' ? b.t : null;
    const to = typeof sp.to === 'number' ? sp.to : d.end && typeof d.end.t === 'number' ? d.end.t : from;
    if (from == null) continue;
    d.t = typeof b.t === 'number' ? b.t : from;
    d.u0 = tToU(Math.min(from, to)); d.u1 = tToU(Math.max(from, to)); d.u = tToU(d.t);
    d.srcRecs = (d.sources || []).map(rec).filter(Boolean);
    const txt = norm(`${d.id} ${d.title} ${d.kind} ${(b.cause || '')}`);
    d.lane = d.kind === 'parallel-universe' || /mirror/.test(txt) && d.kind !== 'alternate-timeline' ? 'MIRROR'
      : d.kind === 'alternate-reality' && /kelvin|narada|nero/.test(txt) ? 'KELVIN' : 'ALT';
    if (d.lane === 'ALT') {
      let row = rows.findIndex((end) => end < d.u0 - 0.004);
      if (row < 0) { row = rows.length; rows.push(0); }
      rows[row] = Math.max(d.u1, d.u0 + 0.012);
      d.row = row;
    }
    S.divergences.push(d); S.divById.set(d.id, d);
    d.srcRecs.forEach((r) => link(r, 'd', d));
  }
  S.altRows = Math.max(1, rows.length);
  S.divergences.sort((a, b) => a.t - b.t);

  for (const x of A.crossings || []) {
    if (!x || typeof x.t !== 'number') continue;
    x.$ = 'x'; x.u = tToU(x.t); x.srcRecs = (x.sources || []).map(rec).filter(Boolean);
    S.crossings.push(x);
    x.srcRecs.forEach((r) => link(r, 'x', x));
  }

  // incursion <-> divergence links (shared ids or divergenceHint)
  for (const inc of S.incursions) {
    const d = S.divById.get(inc.divergenceHint) || S.divById.get(inc.id);
    if (d) { inc.div = d; (d.incs = d.incs || []).push(inc); }
  }

  // threads
  for (const th of A.threads || []) {
    if (!th || !th.id) continue;
    th.$ = 'th';
    th.persons = (th.people || []).map(person);
    const prep = (b) => { b.rec = rec(b.source); if (typeof b.t !== 'number') b.t = b.rec ? b.rec.t : null; b.u = b.t == null ? null : tToU(b.t); return b; };
    th.beats = (th.beats || []).map(prep).filter((b) => b.t != null).sort((a, b) => a.t - b.t);
    th.alternate = (th.alternate || []).map(prep).filter((b) => b.t != null).sort((a, b) => a.t - b.t);
    S.threads.push(th); S.thById.set(th.id, th);
    th.beats.forEach((b) => link(b.rec, 'th', th));
  }

  // one chronology to step through with the arrow keys
  S.chron = [...S.records, ...S.events].sort((a, b) => a.t - b.t);
  S.chron.forEach((x, i) => { x.ci = i; });

  // per-series air order for "previous / next episode"
  const bySeries = new Map();
  for (const r of S.records) {
    const k = r.s === 'FLM' ? (r.l === 'KELVIN' ? 'KELVIN' : 'FLM') : r.s;
    if (!bySeries.has(k)) bySeries.set(k, []);
    bySeries.get(k).push(r);
  }
  for (const arr of bySeries.values()) {
    arr.sort((a, b) => (a.ad || '').localeCompare(b.ad || '') || (a.ep || 0) - (b.ep || 0));
    arr.forEach((r, i) => { r.prevAir = arr[i - 1] || null; r.nextAir = arr[i + 1] || null; });
  }
  S.bySeries = bySeries;

  // 32nd-century stardate fit (least squares over dated Discovery/Academy records)
  const pts = S.records.filter((r) => r.sd && +r.sd > 800000 && (r.pr === 'year' || r.pr === 'date')).map((r) => [+r.sd, Math.floor(r.t) + 0.5]);
  if (pts.length >= 3) {
    const n = pts.length, sx = pts.reduce((a, p) => a + p[0], 0), sy = pts.reduce((a, p) => a + p[1], 0);
    const sxx = pts.reduce((a, p) => a + p[0] * p[0], 0), sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
    const a = (n * sxy - sx * sy) / (n * sxx - sx * sx), b = (sy - a * sx) / n;
    if (isFinite(a) && a > 0) setStardateFit32({ a, b, n });
  }
  S.worldline = (p) => worldline(S, p);
  return S;
}

// ── worldlines ──────────────────────────────────────────────────────
// A person's path through the records in the order they lived them (proper time), not
// calendar order: a trip to 1968 shows as a jump out and back; incursions they took part
// in and personal displacements (Scotty's 75 years in a transporter buffer) are jumps.
const CORE = {
  TOS: [[2250, 2275]], TAS: [[2268, 2272]], TNG: [[2363, 2372]], DS9: [[2368, 2376]], VOY: [[2370, 2379]],
  ENT: [[2150, 2162]], DIS: [[2254, 2259], [3187, 3192]], SNW: [[2258, 2264]], LD: [[2379, 2383]],
  PRO: [[2382, 2386]], PIC: [[2398, 2403]], SA: [[3190, 3200]],
};
const VESSEL = /^(USS|ISS|IKS|IRW|SS|NX|HMS|Enterprise|Discovery|Voyager|Defiant|Protostar|Cerritos|La Sirena|Titan|Stargazer)/;

function homeTime(r) {
  const core = CORE[r.l];
  if (!core) return r.t;
  const inCore = (t) => core.some(([a, b]) => t >= a && t <= b);
  if (inCore(r.t)) return r.t;
  const v = (r.v || []).find((x) => inCore(x.t));
  return v ? v.t : r.t;
}

function worldline(S, p) {
  if (p._wl) return p._wl;
  const ents = p.recs.filter((r) => r.s !== 'VST').map((r) => ({ r, h: homeTime(r) })).sort((a, b) => a.h - b.h);
  const pts = [];
  ents.forEach((e, i) => {
    const r = e.r;
    const at = r.c.indexOf(p.i);
    const principal = at > -1 && at < Math.min(r.cu == null ? r.c.length : r.cu, 12);
    const incs = (S.recLinks.get(r.id) || []).filter((l) => l.kind === 'i').map((l) => l.item)
      .filter((inc) => (inc.travelers || []).some((t) => t === p.k || (principal && VESSEL.test(t))));
    if (incs.length) {
      pts.push({ t: e.h, l: r.l, r });
      for (const inc of incs.sort((a, b) => a.t - b.t)) {
        for (const g of inc.legs) {
          pts.push({ t: g.from.t, l: g.fromLane, r });
          pts.push({ t: g.to.t, l: g.toLane, r, jump: true });
        }
      }
      return;
    }
    if (Math.abs(r.t - e.h) > 2) {
      pts.push({ t: e.h, l: r.l, r, ghost: true });
      pts.push({ t: r.t, l: r.l, r, jump: true });
      pts.push({ t: e.h, l: r.l, r, jump: true, ghost: true });
      return;
    }
    const cands = [r.t, ...(r.v || []).map((v) => v.t)];
    if (cands.length > 1) {
      const nb = [ents[i - 1], ents[i + 1]].filter(Boolean).map((x) => x.h);
      let best = r.t, bd = Infinity;
      for (const c of cands) {
        const d = nb.length ? Math.min(...nb.map((n) => Math.abs(n - c))) : 0;
        if (d < bd - 1e-9) { bd = d; best = c; }
      }
      pts.push({ t: best, l: r.l, r });
      return;
    }
    pts.push({ t: r.t, l: r.l, r });
  });
  // personal displacements from the dossier
  for (const d of (p.dossier && p.dossier.displacements) || []) {
    if (typeof d.from !== 'number' || typeof d.to !== 'number') continue;
    let k = -1;
    for (let j = 0; j < pts.length; j++) if (pts[j].t <= d.from + 0.05) k = j;
    const lane = k >= 0 ? pts[k].l : 'HISTORY';
    const after = pts[k + 1];
    pts.splice(k + 1, 0, { t: d.from, l: lane, r: null }, { t: d.to, l: after ? after.l : lane, r: null, jump: true, via: d.via });
  }
  for (const pt of pts) pt.u = tToU(pt.t);
  p._wl = pts;
  return pts;
}
