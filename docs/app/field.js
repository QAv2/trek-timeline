// The continuum field: a zoomable canvas of lanes, records, history, incursion arcs,
// divergences and personnel worldlines.
import { SEGMENTS, tToU, uToT, ticks, fmtTime } from './scale.js';
import { OUTCOME } from './data.js';

const F_LABEL = '600 12px Antonio, "Arial Narrow", sans-serif';
const F_SMALL = '500 11px Antonio, "Arial Narrow", sans-serif';
const F_AXIS = '500 12px Antonio, "Arial Narrow", sans-serif';
const GOLD = '#ffb347', BONE = '#e9e2cf', DIM = '#a9a5c4', RED = '#ff5b5b', ICE = '#7fd4ff';
const WORLD_COLORS = [GOLD, ICE];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (x) => 1 - Math.pow(1 - x, 3);

function lowerBound(arr, u) {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].u < u) lo = m + 1; else hi = m; }
  return lo;
}

export class Field {
  constructor({ stage, canvas, labels, tip, store, hooks }) {
    Object.assign(this, { stage, canvas, labelsEl: labels, tip, S: store, hooks });
    this.ctx = canvas.getContext('2d');
    this.zt = d3.zoomIdentity;
    this.muted = new Set();
    this.mode = 'continuum';
    this.sel = null;
    this.hover = null;
    this.hoverX = null;
    this.worlds = [];
    this.thread = null;
    this.reveal = 1;
    this.tw = new Map();
    this.raf = 0;
    this.lanes = [];
    this.prepare();
    this.initZoom();
    this.initPointer();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(stage);
    this.resize();
  }

  // ── data prep ─────────────────────────────────────────────────────
  prepare() {
    const S = this.S;
    this.byLane = new Map(S.lanes.map((l) => [l.id, []]));
    for (const r of S.records) {
      const arr = this.byLane.get(r.l) || this.byLane.get('ST');
      arr.push(r);
    }
    this.mirrorGhosts = S.records.filter((r) => r.tl === 'mirror').map((r) => ({ u: r.u, r }));
    for (const arr of this.byLane.values()) arr.sort((a, b) => a.u - b.u);
    this.mirrorGhosts.sort((a, b) => a.u - b.u);
    this.events = S.events;
    // presence spans: runs of records with no gap longer than ~4 years
    this.spans = new Map();
    for (const [id, arr] of this.byLane) {
      const spans = [];
      let cur = null;
      for (const r of arr) {
        if (cur && r.t - cur.t1 < 4) { cur.t1 = r.t; cur.u1 = r.u; }
        else { cur = { t0: r.t, t1: r.t, u0: r.u, u1: r.u }; spans.push(cur); }
      }
      this.spans.set(id, spans);
    }
    this.legs = S.incursions.flatMap((inc) => inc.legs);
  }

  // ── geometry ──────────────────────────────────────────────────────
  resize() {
    const r = this.stage.getBoundingClientRect();
    const w = Math.max(200, r.width), h = Math.max(200, r.height);
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.narrow = this.w < 640;
    this.labelW = this.narrow ? 58 : 92;
    this.px0 = this.labelW + 10;
    this.px1 = this.w - 12;
    this.pw = this.px1 - this.px0;
    this.layout();
    if (this.zoom) {
      this.zoom.extent([[this.px0, 0], [this.px1, this.h]]).translateExtent([[this.px0, 0], [this.px1, this.h]]);
      // keep the same visible window after a resize
      if (this.lastVis) this.fitU(this.lastVis[0], this.lastVis[1], null, 0, 1);
    }
    this.requestDraw();
  }

  layout() {
    const S = this.S, H = this.h;
    this.axisH = 28;
    const weights = S.lanes.map((l) => (l.id === 'HISTORY' ? 2.8 : l.id === 'ALT' ? clamp(0.35 * S.altRows, 1.4, 3.4) : 1));
    const minArc = this.narrow ? 70 : 96;
    const avail = H - this.axisH - minArc - 4;
    const unit = clamp(avail / weights.reduce((a, b) => a + b, 0), 11, 30);
    const used = unit * weights.reduce((a, b) => a + b, 0);
    this.arcTop = 4;
    let y = H - this.axisH - 4 - used;
    this.lanesTop = y;
    this.lanes = S.lanes.map((l, i) => {
      const h = unit * weights[i];
      const L = { ...l, y0: y, y1: y + h, yc: y + h / 2, h };
      y += h;
      return L;
    });
    this.laneMap = new Map(this.lanes.map((l) => [l.id, l]));
    this.unit = unit;
    this.renderLaneLabels();
  }

  renderLaneLabels() {
    const counts = new Map();
    for (const r of this.S.records) counts.set(r.l, (counts.get(r.l) || 0) + 1);
    counts.set('HISTORY', this.S.events.length);
    counts.set('ALT', this.S.divergences.filter((d) => d.lane === 'ALT').length);
    counts.set('MIRROR', (counts.get('MIRROR') || 0) + this.mirrorGhosts.length);
    this.labelsEl.innerHTML = this.lanes.map((l) => {
      const ph = Math.min(l.h - 3, l.id === 'HISTORY' || l.id === 'ALT' ? 26 : 22);
      return `<button class="lanelabel${this.muted.has(l.id) ? ' muted' : ''}" data-lane="${l.id}" title="${l.sub}: show or mute this lane"
        style="top:${(l.yc - ph / 2).toFixed(1)}px;height:${ph.toFixed(1)}px;background:${l.color}">
        <span class="n">${counts.get(l.id) || ''}</span>${l.label}</button>`;
    }).join('');
  }

  laneAt(py) { return this.lanes.find((l) => py >= l.y0 && py < l.y1) || null; }
  X(u) { return this.zt.k * (this.px0 + u * this.pw) + this.zt.x; }
  uAt(px) { return ((px - this.zt.x) / this.zt.k - this.px0) / this.pw; }
  visibleU() { return [Math.max(0, this.uAt(this.px0)), Math.min(1, this.uAt(this.px1))]; }
  yearsPerPx(u) { const a = uToT(u), b = uToT(Math.min(1, u + 1 / (this.pw * this.zt.k))); return Math.abs(b - a); }

  // ── zoom & pointer ────────────────────────────────────────────────
  initZoom() {
    const sel = d3.select(this.canvas);
    this.zoom = d3.zoom()
      .scaleExtent([1, 900])
      .extent([[this.px0, 0], [this.px1, this.h]])
      .translateExtent([[this.px0, 0], [this.px1, this.h]])
      .clickDistance(5)
      .filter((e) => (!e.ctrlKey || e.type === 'wheel') && !e.button)
      .on('zoom', (e) => {
        this.zt = e.transform;
        this.lastVis = this.visibleU();
        this.requestDraw();
        this.hooks.onView && this.hooks.onView(false);
      })
      .on('end', () => this.hooks.onView && this.hooks.onView(true));
    sel.call(this.zoom).on('dblclick.zoom', null);
    // horizontal trackpad / shift+wheel pans instead of zooming
    this.canvas.addEventListener('wheel', (e) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!dx) return;
      e.preventDefault(); e.stopImmediatePropagation();
      this.zoom.translateBy(sel, -dx / this.zt.k, 0);
    }, { capture: true, passive: false });
  }

  initPointer() {
    const c = this.canvas;
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      this.hoverX = px >= this.px0 && px <= this.px1 ? px : null;
      const hit = e.buttons ? null : this.pick(px, py);
      this.hover = hit;
      c.classList.toggle('point', !!hit);
      c.classList.toggle('grab', !hit);
      this.showTip(hit, px, py);
      if (this.hoverX != null) this.hooks.onHover && this.hooks.onHover(uToT(this.uAt(px)), this.yearsPerPx(this.uAt(px)));
      this.requestDraw();
    });
    c.addEventListener('pointerleave', () => {
      this.hover = null; this.hoverX = null; this.showTip(null);
      this.hooks.onHover && this.hooks.onHover(null);
      this.requestDraw();
    });
    c.addEventListener('click', (e) => {
      const r = c.getBoundingClientRect();
      const hit = this.pick(e.clientX - r.left, e.clientY - r.top);
      this.hooks.onPick && this.hooks.onPick(hit);
    });
    this.labelsEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lane]');
      if (!b) return;
      const id = b.dataset.lane;
      if (this.muted.has(id)) this.muted.delete(id); else this.muted.add(id);
      b.classList.toggle('muted', this.muted.has(id));
      this.requestDraw();
      this.hooks.onView && this.hooks.onView(true);
    });
  }

  // ── camera ────────────────────────────────────────────────────────
  transformFor(ua, ub, center) {
    const base = (u) => this.px0 + u * this.pw;
    const k = clamp((this.px1 - this.px0) * 0.88 / Math.max(1e-9, base(ub) - base(ua)), 1, 900);
    const c = center == null ? (ua + ub) / 2 : center;
    const tx = (this.px0 + this.px1) / 2 - k * base(c);
    return d3.zoomIdentity.translate(tx, 0).scale(k);
  }
  fitU(ua, ub, center = null, dur = 750, pad = 0.88) {
    let t = this.transformFor(ua, ub, center);
    if (pad === 1) t = d3.zoomIdentity.translate(this.px0 - (this.px0 + ua * this.pw) * ((this.px1 - this.px0) / ((ub - ua) * this.pw)), 0)
      .scale(clamp((this.px1 - this.px0) / Math.max(1e-9, (ub - ua) * this.pw), 1, 900));
    const sel = d3.select(this.canvas);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!dur || reduce) sel.call(this.zoom.transform, t);
    else sel.transition().duration(dur).ease(d3.easeCubicInOut).call(this.zoom.transform, t);
  }
  fitT(t0, t1, dur) {
    const a = tToU(Math.min(t0, t1)), b = tToU(Math.max(t0, t1));
    const minW = 0.004;
    const m = (a + b) / 2, half = Math.max((b - a) / 2, minW / 2);
    this.fitU(m - half, m + half, null, dur);
  }
  /** Bring time t into view at a working zoom, moving only as far as needed. */
  bringIntoView(t, spanYears = 10) {
    if (window.__dbg) console.log('BRING', t, spanYears, JSON.stringify(this.visibleU()), this.px0, this.px1, this.pw, this.zt.k, this.zt.x);
    const u = tToU(t);
    const ua = tToU(t - spanYears / 2), ub = tToU(t + spanYears / 2);
    const [va, vb] = this.visibleU();
    const want = Math.max(ub - ua, 0.0025);
    const x = this.X(u);
    const inView = x > this.px0 + 30 && x < this.px1 - 30;
    if (inView && vb - va <= want * 6) return;
    this.fitU(u - want / 2, u + want / 2, u);
  }
  centerU(u, dur = 0) {
    const [va, vb] = this.visibleU();
    const half = (vb - va) / 2;
    this.fitU(u - half, u + half, u, dur, 1);
  }
  zoomBy(f) { d3.select(this.canvas).transition().duration(250).call(this.zoom.scaleBy, f, [(this.px0 + this.px1) / 2, this.h / 2]); }

  // ── state from the app ────────────────────────────────────────────
  setMode(m) { this.mode = m; this.requestDraw(); }
  select(sel) { this.sel = sel; this.requestDraw(); }
  setWorlds(people) { this.worlds = people.map((p, i) => ({ p, color: WORLD_COLORS[i % 2] })); this.requestDraw(); }
  setThread(th) { this.thread = th; this.setWorlds(th ? th.persons.filter(Boolean) : []); }
  startReveal() {
    this.hold = false;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { this.reveal = 1; this.requestDraw(); return; }
    this.reveal = 0; this.revealStart = performance.now();
    this.requestDraw();
    // if animation frames are throttled (background tab), finish the reveal anyway
    setTimeout(() => { if (this.reveal < 1) { this.reveal = 1; this.requestDraw(); } }, 1500);
  }

  inView() {
    const [ua, ub] = this.visibleU();
    const out = [];
    for (const r of this.S.records) if (r.u >= ua && r.u <= ub && !this.muted.has(r.l)) out.push(r);
    if (!this.muted.has('HISTORY')) for (const e of this.S.events) if (e.u >= ua && e.u <= ub) out.push(e);
    out.sort((a, b) => a.t - b.t);
    return out;
  }

  // ── hit testing ───────────────────────────────────────────────────
  pick(px, py) {
    if (px < this.px0 - 4 || px > this.px1 + 4) return null;
    const lane = this.laneAt(py);
    const near = (arr, tol) => {
      const u = this.uAt(px), du = tol / (this.pw * this.zt.k);
      let i = lowerBound(arr, u - du), best = null, bd = tol + 1;
      for (; i < arr.length && arr[i].u <= u + du; i++) {
        const d = Math.abs(this.X(arr[i].u) - px);
        if (d < bd) { bd = d; best = arr[i]; }
      }
      return best;
    };
    if (lane && !this.muted.has(lane.id)) {
      if (lane.id === 'HISTORY') {
        const e = near(this.events, 7);
        if (e) return { kind: 'e', item: e };
      } else if (lane.id === 'ALT') {
        const u = this.uAt(px), rowH = lane.h / this.S.altRows;
        const row = Math.floor((py - lane.y0) / rowH);
        const d = this.S.divergences.find((x) => x.lane === 'ALT' && x.row === row && u >= x.u0 - 6 / (this.pw * this.zt.k) && u <= x.u1 + 6 / (this.pw * this.zt.k));
        if (d) return { kind: 'd', item: d };
      } else {
        const arr = lane.id === 'MIRROR' ? this.mirrorGhosts.map((g) => g.r) : this.byLane.get(lane.id) || [];
        const r = near(arr, 7);
        if (r) return { kind: 'r', item: r };
        const u = this.uAt(px);
        const d = this.S.divergences.find((x) => x.lane === lane.id && u >= x.u0 && u <= x.u1);
        if (d) return { kind: 'd', item: d };
      }
    }
    // arcs
    let best = null, bd = 7;
    for (const g of this.legs) {
      const geo = this.arcGeo(g);
      if (!geo) continue;
      for (let i = 0; i <= 28; i++) {
        const t = i / 28, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
        const x = a * geo.x0 + b * geo.cx + c * geo.x1, y = a * geo.y0 + b * geo.cy + c * geo.y1;
        const d = Math.hypot(x - px, y - py);
        if (d < bd) { bd = d; best = g; }
      }
    }
    if (best) return { kind: 'i', item: best.inc, leg: best };
    return null;
  }

  showTip(hit, px, py) {
    const tip = this.tip;
    if (!hit) { tip.classList.remove('on'); return; }
    const it = hit.item;
    let k, t, d;
    if (hit.kind === 'r') { k = `${it.s === 'FLM' ? 'Film' : it.s + (it.n ? ' ' + it.n : '')}`; t = it.ti; d = it.tt + (it.sd ? `  ·  SD ${it.sd}` : ''); }
    else if (hit.kind === 'e') { k = 'History'; t = it.title; d = it.tText || ''; }
    else if (hit.kind === 'i') { const g = hit.leg; k = `Incursion · ${OUTCOME[it.oc].label}`; t = it.title; d = `${g.from.tText || Math.round(g.from.t)} → ${g.to.tText || Math.round(g.to.t)}`; }
    else if (hit.kind === 'd') { k = 'Divergence'; t = it.title; d = `${it.branch && it.branch.tText || ''}${it.end && it.end.tText ? ' → ' + it.end.tText : ''}`; }
    tip.innerHTML = `<div class="tk">${esc(k)}</div><div class="tt">${esc(t)}</div><div class="td">${esc(d)}</div>`;
    tip.classList.add('on');
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = px + 16, y = py + 14;
    if (x + tw > this.w - 6) x = px - tw - 14;
    if (y + th > this.h - 6) y = py - th - 12;
    tip.style.transform = `translate(${Math.max(4, x)}px, ${Math.max(4, y)}px)`;
  }

  // ── drawing ───────────────────────────────────────────────────────
  requestDraw() {
    if (this.raf) return;
    this.raf = requestAnimationFrame((now) => this.draw(now));
    // watchdog: if frames are stalled (throttled or headless), draw anyway
    clearTimeout(this.rafT);
    this.rafT = setTimeout(() => { if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; this.draw(performance.now()); } }, 300);
  }

  alphaFor(laneId) {
    if (this.muted.has(laneId)) return 0.12;
    if (this.worlds.length) return 0.34;
    if (this.mode === 'incursions') return 0.5;
    if (this.mode === 'divergences') return ['ALT', 'KELVIN', 'MIRROR'].includes(laneId) ? 1 : 0.45;
    return 1;
  }

  draw(now) {
    this.raf = 0;
    clearTimeout(this.rafT);
    if (this.hold) return; // behind the gate: don't spend frames
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (this.reveal < 1) this.reveal = Math.min(1, Math.max(0, (performance.now() - this.revealStart) / 1300));
    const [ua, ub] = this.visibleU();
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.px0 - 3, 0, this.pw + 6, h);
    ctx.clip();
    if (this.reveal < 1) { ctx.beginPath(); ctx.rect(this.px0 - 3, 0, (this.pw + 6) * ease(this.reveal), h); ctx.clip(); }
    // each layer is guarded so one bad record can't blank the whole field
    const layer = (name, fn) => {
      try { ctx.save(); fn(); } catch (err) { console.error(`field layer ${name}:`, err); } finally { ctx.restore(); ctx.globalAlpha = 1; ctx.setLineDash([]); }
    };
    layer('eras', () => this.drawEras(ua, ub));
    layer('lanes', () => this.drawLanes());
    layer('divergences', () => this.drawDivergences(ua, ub));
    layer('crossings', () => this.drawCrossings());
    layer('records', () => this.drawRecords(ua, ub));
    layer('events', () => this.drawEvents(ua, ub));
    layer('arcs', () => this.drawArcs(now));
    this.jumpBoxes = [];
    layer('worlds', () => this.drawWorlds());
    layer('labels', () => this.drawLabels(ua, ub));
    layer('selection', () => this.drawSelection(now));
    layer('hover', () => this.drawHoverLine());
    ctx.restore();
    layer('axis', () => this.drawAxis());
    if (this.reveal < 1) this.requestDraw();
    else if (this.animating() && !this.flowTimer) this.flowTimer = setTimeout(() => { this.flowTimer = 0; this.requestDraw(); }, 40);
  }

  animating() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return !!(this.sel && this.sel.kind === 'i');
  }

  drawEras(ua, ub) {
    const ctx = this.ctx;
    const top = this.arcTop, bot = this.h - this.axisH;
    ctx.font = F_SMALL;
    ctx.textBaseline = 'top';
    for (const s of SEGMENTS) {
      const x0 = this.X(s.u0), x1 = this.X(s.u1);
      if (x1 < this.px0 || x0 > this.px1) continue;
      if (s.u0 > 0) {
        ctx.strokeStyle = '#2b2f56';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 5]);
        ctx.beginPath(); ctx.moveTo(Math.round(x0) + 0.5, top); ctx.lineTo(Math.round(x0) + 0.5, bot); ctx.stroke();
        ctx.setLineDash([]);
      }
      const vis0 = Math.max(x0, this.px0), vis1 = Math.min(x1, this.px1);
      if (vis1 - vis0 > 80) {
        ctx.fillStyle = '#5f6394';
        const label = s.label.toUpperCase();
        const tw = this.textW(label, F_SMALL);
        const lx = clamp(vis0 + 8, vis0 + 4, vis1 - tw - 6);
        ctx.fillText(label, lx, top + 4);
      }
    }
    // faint grid on major ticks
    ctx.strokeStyle = '#141731';
    ctx.lineWidth = 1;
    for (const tk of this.ticksCache || []) {
      if (!tk.major || tk.boundary) continue;
      ctx.beginPath(); ctx.moveTo(Math.round(tk.x) + 0.5, this.lanesTop); ctx.lineTo(Math.round(tk.x) + 0.5, bot); ctx.stroke();
    }
  }

  drawLanes() {
    const ctx = this.ctx;
    for (const L of this.lanes) {
      ctx.fillStyle = '#12142a';
      ctx.fillRect(this.px0, Math.round(L.yc), this.pw, 1);
      const spans = this.spans.get(L.id) || [];
      const a = this.alphaFor(L.id);
      ctx.fillStyle = L.color;
      ctx.globalAlpha = 0.15 * a;
      const bh = Math.min(10, L.h * 0.5);
      for (const s of spans) {
        const x0 = this.X(s.u0) - 4, x1 = this.X(s.u1) + 4;
        if (x1 < this.px0 || x0 > this.px1) continue;
        roundRect(ctx, x0, L.yc - bh / 2, Math.max(8, x1 - x0), bh, bh / 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  tickW() { return clamp(2.2 + Math.log2(this.zt.k) * 0.55, 2.2, 7); }

  drawRecords(ua, ub) {
    const ctx = this.ctx, tw = this.tickW();
    const margin = 10 / (this.pw * this.zt.k);
    for (const L of this.lanes) {
      if (L.id === 'HISTORY' || L.id === 'ALT') continue;
      const arr = L.id === 'MIRROR' ? this.mirrorGhosts : this.byLane.get(L.id) || [];
      const a = this.alphaFor(L.id);
      const th = Math.min(L.h * 0.62, 16);
      let i = lowerBound(arr, ua - margin);
      for (; i < arr.length && arr[i].u <= ub + margin; i++) {
        const it = arr[i], r = it.r || it;
        const x = this.X(it.u);
        if (L.id === 'MIRROR') {
          ctx.globalAlpha = a;
          ctx.strokeStyle = L.color; ctx.lineWidth = 1.5;
          roundRect(ctx, x - tw / 2, L.yc - th / 2, tw, th, tw / 2); ctx.stroke();
          continue;
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = r.tl === 'alt' ? '#ff8a7a' : L.color;
        roundRect(ctx, x - tw / 2, L.yc - th / 2, tw, th, tw / 2);
        ctx.fill();
        if (r.tl === 'mirror') { ctx.fillStyle = '#e0475b'; ctx.fillRect(x - tw / 2, L.yc + th / 2 + 1.5, tw, 2); }
      }
    }
    ctx.globalAlpha = 1;
  }

  drawEvents(ua, ub) {
    const L = this.laneMap.get('HISTORY');
    if (!L) return;
    const ctx = this.ctx, a = this.alphaFor('HISTORY');
    const margin = 10 / (this.pw * this.zt.k);
    const ev = this.events;
    let i = lowerBound(ev, ua - margin);
    const rowOff = L.h * 0.22;
    for (; i < ev.length && ev[i].u <= ub + margin; i++) {
      const e = ev[i];
      const x = this.X(e.u), y = L.yc + (e.row - 1) * rowOff;
      const s = e.w >= 3 ? 5.5 : e.w === 2 ? 4.2 : 3.2;
      ctx.globalAlpha = a;
      ctx.fillStyle = e.conflict ? RED : e.category === 'temporal' ? ICE : BONE;
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  laneY(id) { const L = this.laneMap.get(id) || this.laneMap.get('HISTORY'); return L.yc; }

  arcGeo(g) {
    const x0 = this.X(g.u0), x1 = this.X(g.u1);
    if ((x0 < this.px0 - 50 && x1 < this.px0 - 50) || (x0 > this.px1 + 50 && x1 > this.px1 + 50)) return null;
    const y0 = this.laneY(g.fromLane), y1 = this.laneY(g.toLane);
    const dt = Math.abs(g.to.t - g.from.t);
    const f = clamp(Math.log10(1 + dt) / 4.2, 0.12, 1);
    const topY = this.arcTop + 14;
    const apex = Math.min(y0, y1) - 10 - (Math.min(y0, y1) - 10 - topY) * f;
    const cy = 2 * apex - (y0 + y1) / 2;
    return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy, loop: Math.abs(x1 - x0) < 3 };
  }

  drawArcs(now) {
    const ctx = this.ctx;
    const selInc = this.sel && this.sel.kind === 'i' ? this.sel.item : null;
    const hovInc = this.hover && this.hover.kind === 'i' ? this.hover.item : null;
    const selRec = this.sel && (this.sel.kind === 'r') ? this.sel.item : null;
    let base = this.mode === 'incursions' ? 0.62 : this.mode === 'divergences' ? 0.04 : 0.15;
    if (this.worlds.length) base = 0.1;
    if (selInc || selRec) base *= 0.55;
    for (const g of this.legs) {
      const geo = this.arcGeo(g);
      if (!geo) continue;
      const inc = g.inc, oc = OUTCOME[inc.oc];
      const hot = inc === selInc || inc === hovInc || (selRec && inc.srcRecs.includes(selRec));
      if (this.muted.has(g.fromLane) && this.muted.has(g.toLane) && !hot) continue;
      ctx.globalAlpha = hot ? 1 : base;
      ctx.strokeStyle = hot && inc === selInc ? GOLD : oc.c;
      ctx.lineWidth = hot ? 2.4 : 1.25;
      if (hot && inc === selInc && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        ctx.setLineDash([7, 6]);
        ctx.lineDashOffset = -(now / 45) % 13;
      } else ctx.setLineDash(oc.dash);
      ctx.beginPath();
      if (geo.loop) {
        const r = 9;
        ctx.arc(geo.x0, geo.y0 - r - 3, r, 0, Math.PI * 2);
      } else {
        ctx.moveTo(geo.x0, geo.y0);
        ctx.quadraticCurveTo(geo.cx, geo.cy, geo.x1, geo.y1);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      if (hot || this.mode === 'incursions') {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath(); ctx.arc(geo.x1, geo.y1, hot ? 4 : 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(geo.x0, geo.y0, hot ? 3.2 : 2, 0, Math.PI * 2); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawDivergences(ua, ub) {
    const ctx = this.ctx;
    const selD = this.sel && this.sel.kind === 'd' ? this.sel.item : null;
    const hovD = this.hover && this.hover.kind === 'd' ? this.hover.item : null;
    const selRec = this.sel && this.sel.kind === 'r' ? this.sel.item : null;
    const ALT = this.laneMap.get('ALT');
    for (const d of this.S.divergences) {
      const L = this.laneMap.get(d.lane);
      if (!L) continue;
      const x0 = this.X(d.u0), x1 = Math.max(this.X(d.u1), x0 + 6);
      if (x1 < this.px0 - 10 || x0 > this.px1 + 10) continue;
      const hot = d === selD || d === hovD || (selRec && d.srcRecs.includes(selRec));
      const a = hot ? 1 : this.alphaFor(d.lane) * (d.lane === 'ALT' ? 0.9 : 0.5);
      ctx.globalAlpha = a;
      let y, hh;
      if (d.lane === 'ALT') {
        const rowH = ALT.h / this.S.altRows;
        y = ALT.y0 + rowH * (d.row + 0.5); hh = Math.min(6, rowH * 0.45);
      } else { y = L.yc; hh = Math.min(10, L.h * 0.5); }
      const col = hot ? GOLD : L.color;
      if (d.lane === 'ALT') {
        ctx.strokeStyle = col; ctx.lineWidth = hot ? 3 : 1.5;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        // ticks where the timeline was witnessed on screen
        ctx.fillStyle = col;
        for (const r of d.srcRecs) {
          const rx = this.X(r.u);
          if (rx >= x0 - 2 && rx <= x1 + 2) ctx.fillRect(rx - 1.5, y - 4, 3, 8);
        }
        // branch fork
        ctx.beginPath(); ctx.moveTo(x0 - 7, y - 5); ctx.quadraticCurveTo(x0 - 1, y - 5, x0, y); ctx.stroke();
        // fate cap
        const fate = d.end && d.end.fate;
        ctx.lineWidth = 2;
        if (fate === 'persists') { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1, y - 4.5); ctx.lineTo(x1 + 7, y); ctx.lineTo(x1, y + 4.5); ctx.fill(); }
        else if (fate === 'collapsed' || fate === 'restored' || fate === 'averted') {
          ctx.beginPath(); ctx.moveTo(x1 - 4, y - 4); ctx.lineTo(x1 + 4, y + 4); ctx.moveTo(x1 + 4, y - 4); ctx.lineTo(x1 - 4, y + 4); ctx.stroke();
        } else { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x1, y, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      } else {
        ctx.fillStyle = col;
        ctx.globalAlpha = a * 0.35;
        roundRect(ctx, x0, y - hh / 2, x1 - x0, hh, hh / 2); ctx.fill();
        ctx.globalAlpha = a;
        ctx.strokeStyle = col; ctx.lineWidth = 1;
        roundRect(ctx, x0, y - hh / 2, x1 - x0, hh, hh / 2); ctx.stroke();
      }
      // branch connector from the prime history line when focused
      if (hot && d.lane !== 'MIRROR') {
        const H = this.laneMap.get('HISTORY');
        const bx = this.X(d.u);
        ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(bx, H.yc); ctx.bezierCurveTo(bx, (H.yc + y) / 2, bx - 18, (H.yc + y) / 2, x0, y); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawCrossings() {
    const ctx = this.ctx, M = this.laneMap.get('MIRROR');
    if (!M || !this.S.crossings.length) return;
    const selRec = this.sel && this.sel.kind === 'r' ? this.sel.item : null;
    for (const c of this.S.crossings) {
      const x = this.X(c.u);
      if (x < this.px0 - 5 || x > this.px1 + 5) continue;
      const r = c.srcRecs[0];
      const y0 = r ? this.laneY(r.l) : this.laneY('HISTORY');
      const hot = selRec && c.srcRecs.includes(selRec);
      ctx.globalAlpha = hot ? 1 : 0.28 * this.alphaFor('MIRROR');
      ctx.strokeStyle = hot ? GOLD : '#e0475b';
      ctx.lineWidth = hot ? 1.8 : 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, M.yc); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  worldPoints(p) {
    const pts = [];
    let last = null;
    for (const r of p.recs) {
      if (last && last.id === r.id) continue;
      pts.push({ x: this.X(r.u), y: this.laneY(r.l), r });
      last = r;
    }
    return pts;
  }

  drawWorlds() {
    if (!this.worlds.length) return;
    const ctx = this.ctx;
    const shared = new Set();
    if (this.worlds.length > 1) {
      const a = new Set(this.worlds[0].p.recs.map((r) => r.id));
      for (const r of this.worlds[1].p.recs) if (a.has(r.id)) shared.add(r.id);
    }
    for (const w of this.worlds) {
      const wl = this.S.worldline(w.p);
      if (!wl.length) continue;
      const pts = wl.map((pt) => ({ x: this.X(pt.u), y: this.laneY(pt.l), pt }));
      ctx.lineJoin = 'round';
      const jumpGeo = (a, b) => ({ a, b, top: Math.min(a.y, b.y) - 18 - Math.min(60, Math.abs(b.x - a.x) * 0.12) });
      for (const pass of [[7, 0.16], [1.8, 0.95]]) {
        ctx.strokeStyle = w.color; ctx.lineWidth = pass[0];
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          if ((a.x < this.px0 - 400 && b.x < this.px0 - 400) || (a.x > this.px1 + 400 && b.x > this.px1 + 400)) continue;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          if (b.pt.jump) {
            // a jump through time: a dashed arc over the lanes, no glow
            if (pass[0] > 2) continue;
            const g = jumpGeo(a, b);
            ctx.globalAlpha = 0.85; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
            ctx.quadraticCurveTo((a.x + b.x) / 2, g.top, b.x, b.y);
            ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = pass[0];
            this.jumpLabel(g, w.color);
            continue;
          }
          ctx.globalAlpha = pass[1];
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1; ctx.fillStyle = w.color;
      for (const q of pts) {
        if (!q.pt.r || q.pt.ghost || q.x < this.px0 - 5 || q.x > this.px1 + 5) continue;
        const sh = shared.has(q.pt.r.id);
        ctx.beginPath(); ctx.arc(q.x, q.y, sh ? 4.2 : 2.6, 0, Math.PI * 2); ctx.fill();
        if (sh) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); }
      }
    }
    // thread beats
    if (this.thread) {
      ctx.font = F_LABEL; ctx.textBaseline = 'bottom';
      let lastX = -1e9;
      for (const b of this.thread.beats) {
        const x = this.X(b.u);
        if (x < this.px0 - 5 || x > this.px1 + 5) continue;
        const y = b.rec ? this.laneY(b.rec.l) : this.laneY('HISTORY');
        const s = b.weight >= 3 ? 6.5 : 5;
        ctx.fillStyle = '#000'; ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        if ((b.weight || 1) >= 2 && x - lastX > 90) {
          const label = b.title || '';
          const tw = this.textW(label, F_LABEL);
          ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - s - 18, tw + 6, 15);
          ctx.fillStyle = GOLD; ctx.fillText(label, x + 1, y - s - 4);
          lastX = x + tw;
        }
      }
    }
  }

  jumpLabel(g, color) {
    const { a, b, top } = g;
    const inA = a.x >= this.px0 && a.x <= this.px1, inB = b.x >= this.px0 && b.x <= this.px1;
    if (inA === inB) return;
    const from = inA ? a : b, to = inA ? b : a;
    const cx = (a.x + b.x) / 2;
    let last = null;
    for (let i = 0; i <= 60; i++) {
      const tt = inA ? i / 60 : 1 - i / 60;
      const x = (1 - tt) * (1 - tt) * a.x + 2 * (1 - tt) * tt * cx + tt * tt * b.x;
      const y = (1 - tt) * (1 - tt) * a.y + 2 * (1 - tt) * tt * top + tt * tt * b.y;
      if (x < this.px0 + 2 || x > this.px1 - 2) break;
      last = { x, y };
    }
    if (!last) return;
    const label = `${to.x < from.x ? '◂ ' : ''}${fmtTime(to.pt.t)}${to.x > from.x ? ' ▸' : ''}`;
    const ctx = this.ctx;
    ctx.font = F_SMALL; ctx.textBaseline = 'middle';
    const w = this.textW(label, F_SMALL);
    const x = to.x < from.x ? Math.max(this.px0 + 2, last.x) : Math.min(this.px1 - w - 2, last.x - w);
    const box = [x - 2, last.y - 7, w + 4, 14];
    const placed = this.jumpBoxes || (this.jumpBoxes = []);
    if (placed.some((b) => box[0] < b[0] + b[2] && box[0] + box[2] > b[0] && box[1] < b[1] + b[3] && box[1] + box[3] > b[1])) return;
    placed.push(box);
    ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(...box);
    ctx.fillStyle = color; ctx.fillText(label, x, last.y);
  }

  nearestPt(pts, t) {
    let best = null, bd = Infinity;
    for (const p of pts) { const d = Math.abs(p.r.t - t); if (d < bd) { bd = d; best = p; } }
    return bd < 3 ? best : null;
  }

  textW(s, font) {
    const key = font + '|' + s;
    let w = this.tw.get(key);
    if (w == null) { this.ctx.font = font; w = this.ctx.measureText(s).width; this.tw.set(key, w); }
    return w;
  }

  drawLabels(ua, ub) {
    const ctx = this.ctx, tw = this.tickW();
    ctx.font = F_LABEL; ctx.textBaseline = 'middle';
    const margin = 2 / (this.pw * this.zt.k);
    for (const L of this.lanes) {
      if (L.id === 'HISTORY' || L.id === 'ALT' || L.id === 'MIRROR' || this.muted.has(L.id)) continue;
      const arr = this.byLane.get(L.id) || [];
      let i = lowerBound(arr, ua - margin);
      const end = lowerBound(arr, ub + margin);
      ctx.globalAlpha = this.worlds.length ? 0.4 : 0.92;
      // zoomed out: label each run of records with its years (or its title when it stands alone)
      const spans = this.spans.get(L.id) || [];
      const dense = spans.some((sp) => {
        const n = arr.filter((r) => r.u >= sp.u0 && r.u <= sp.u1).length;
        return n > 1 && (this.X(sp.u1) - this.X(sp.u0)) / (n - 1) < 16;
      });
      if (dense || end - i > 90) {
        const vis = spans.filter((sp) => this.X(sp.u1) >= this.px0 - 4 && this.X(sp.u0) <= this.px1 + 4);
        vis.forEach((sp, j) => {
          const recs = arr.filter((r) => r.u >= sp.u0 && r.u <= sp.u1);
          const x = this.X(sp.u1) + tw / 2 + 7;
          const nx = j + 1 < vis.length ? this.X(vis[j + 1].u0) - 6 : this.px1;
          const y0 = Math.floor(sp.t0), y1 = Math.floor(sp.t1);
          const label = recs.length === 1 ? (recs[0].sh || recs[0].ti) : (y0 === y1 ? String(y0) : `${y0}–${y1}`);
          const w = this.textW(label, F_LABEL);
          if (nx - x > w + 4) { ctx.fillStyle = recs.length === 1 ? '#d9d2c1' : L.color; ctx.fillText(label, x, L.yc + 0.5); }
        });
        continue;
      }
      for (; i < end; i++) {
        const r = arr[i];
        const x = this.X(r.u) + tw / 2 + 4;
        const nx = i + 1 < arr.length ? this.X(arr[i + 1].u) - tw : this.px1;
        const room = nx - x - 6;
        if (room < 26) continue;
        let label = r.ti, w = this.textW(label, F_LABEL);
        if (w > room && r.sh) { label = r.sh; w = this.textW(label, F_LABEL); }
        ctx.fillStyle = '#d9d2c1';
        if (w <= room) ctx.fillText(label, x, L.yc + 0.5);
        else if (room > 44) ctx.fillText(this.fit(label, room, F_LABEL), x, L.yc + 0.5);
      }
    }
    // history: landmark events first, two label rows above and below the line
    const H = this.laneMap.get('HISTORY');
    if (H && !this.muted.has('HISTORY')) {
      const vis = [];
      let i = lowerBound(this.events, ua - margin);
      for (; i < this.events.length && this.events[i].u <= ub + margin; i++) vis.push(this.events[i]);
      vis.sort((a, b) => b.w - a.w || a.u - b.u);
      const rows = [[], []];
      const rowOff = H.h * 0.22;
      ctx.font = F_SMALL;
      ctx.globalAlpha = this.worlds.length ? 0.4 : 1;
      let placed = 0;
      for (const e of vis) {
        if (placed > 60) break;
        const x = this.X(e.u) + 6;
        const label = e.title;
        const w = this.textW(label, F_SMALL);
        const r = e.row === 0 ? 0 : e.row === 2 ? 1 : (rows[0].length <= rows[1].length ? 0 : 1);
        const tryRow = (ri) => rows[ri].every(([a, b]) => x + w + 8 < a || x > b + 8);
        let ri = tryRow(r) ? r : tryRow(1 - r) ? 1 - r : -1;
        if (ri < 0 || x + w > this.px1) continue;
        rows[ri].push([x, x + w]);
        placed++;
        const y = H.yc + (ri === 0 ? -rowOff - 8 : rowOff + 8);
        ctx.fillStyle = e.conflict ? '#ff8f8f' : e.w >= 3 ? BONE : '#b9b3a4';
        ctx.fillText(label, x, y);
      }
    }
    ctx.globalAlpha = 1;
  }

  fit(s, room, font) {
    let lo = 0, hi = s.length;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (this.textW(s.slice(0, m) + '…', font) <= room) lo = m; else hi = m - 1;
    }
    return s.slice(0, lo) + '…';
  }

  itemPos(sel) {
    const it = sel.item;
    if (sel.kind === 'r') return { x: this.X(it.u), y: this.laneY(it.l) };
    if (sel.kind === 'e') { const H = this.laneMap.get('HISTORY'); return { x: this.X(it.u), y: H.yc + (it.row - 1) * H.h * 0.22 }; }
    return null;
  }

  drawSelection(now) {
    const ctx = this.ctx;
    if (!this.sel) return;
    const pos = this.itemPos(this.sel);
    if (!pos) return;
    const pulse = 0;
    ctx.strokeStyle = GOLD; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(Math.round(pos.x) + 0.5, this.arcTop + 18); ctx.lineTo(Math.round(pos.x) + 0.5, this.h - this.axisH); ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 8 + pulse * 2.5, 0, Math.PI * 2); ctx.stroke();
    // callout
    const it = this.sel.item;
    const label = this.sel.kind === 'r' ? it.ti : it.title;
    ctx.font = F_LABEL; ctx.textBaseline = 'middle';
    const w = this.textW(label, F_LABEL);
    let lx = pos.x + 13;
    if (lx + w + 10 > this.px1) lx = pos.x - 13 - w - 8;
    const ly = pos.y - 17;
    ctx.fillStyle = '#000'; ctx.fillRect(lx - 4, ly - 9, w + 12, 18);
    ctx.fillStyle = GOLD; ctx.fillRect(lx - 4, ly - 9, 3, 18);
    ctx.fillText(label, lx + 3, ly + 0.5);
  }

  drawHoverLine() {
    if (this.hoverX == null) return;
    const ctx = this.ctx;
    ctx.strokeStyle = GOLD; ctx.globalAlpha = 0.45; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(Math.round(this.hoverX) + 0.5, this.lanesTop - 6); ctx.lineTo(Math.round(this.hoverX) + 0.5, this.h - this.axisH); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (this.hover) {
      const pos = this.hover.kind === 'r' || this.hover.kind === 'e' ? this.itemPos(this.hover) : null;
      if (pos) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2); ctx.stroke(); }
    }
  }

  drawAxis() {
    const ctx = this.ctx, y = this.h - this.axisH;
    ctx.fillStyle = '#000'; ctx.fillRect(0, y, this.w, this.axisH);
    ctx.fillStyle = '#5a5fa8'; ctx.fillRect(this.px0, y + 1, this.pw, 2);
    const tk = ticks((u) => this.X(u), this.px0, this.px1, this.narrow ? 58 : 74);
    this.ticksCache = tk;
    ctx.font = F_AXIS; ctx.textBaseline = 'top';
    let lastEnd = -1e9;
    for (const t of tk) {
      if (t.x < this.px0 - 1 || t.x > this.px1 + 1) continue;
      if (t.boundary) {
        // scale-shift mark where the projection changes rate, labelled with the boundary year
        ctx.strokeStyle = '#8c9cff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(t.x - 4, y + 9); ctx.lineTo(t.x, y - 2); ctx.moveTo(t.x + 1, y + 9); ctx.lineTo(t.x + 5, y - 2); ctx.stroke();
        if (t.seg && t.seg.t0 >= 1000 && t.seg.u0 > 0) {
          const label = String(t.seg.t0), w = this.textW(label, F_AXIS), lx = t.x - w / 2;
          if (lx > lastEnd + 8 && lx > this.px0 - 2 && lx + w < this.px1 + 2) {
            ctx.fillStyle = '#d8d2ff'; ctx.fillText(label, lx, y + 11); lastEnd = lx + w;
          }
        }
        continue;
      }
      ctx.fillStyle = t.major ? '#8c9cff' : '#3c4072';
      ctx.fillRect(Math.round(t.x), y + 3, 1, t.major ? 7 : 4);
      if (!t.label) continue;
      const w = this.textW(t.label, F_AXIS);
      const lx = t.x - w / 2;
      if (lx < lastEnd + 8 || lx < this.px0 - 2 || lx + w > this.px1 + 2) continue;
      ctx.fillStyle = t.major ? '#d8d2ff' : '#8e8ab0';
      ctx.fillText(t.label, lx, y + 11);
      lastEnd = lx + w;
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
