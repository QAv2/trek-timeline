// The era ribbon: the whole continuum at a glance, with record density and the
// field's current window. Click to jump, drag the window to pan, double-click an era to fit it.
import { SEGMENTS } from './scale.js';

const F = '600 12px Antonio, "Arial Narrow", sans-serif';
const BLOCKS = ['#5a5fa8', '#8c9cff', '#c8a6f2', '#9fd3ff'];

export class Ribbon {
  constructor(canvas, store, field) {
    Object.assign(this, { canvas, S: store, field });
    this.ctx = canvas.getContext('2d');
    this.bins = null;
    this.drag = null;
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.initPointer();
    this.resize();
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.w = Math.max(100, r.width); this.h = Math.max(30, r.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr);
    this.x0 = 2; this.x1 = this.w - 2;
    const n = Math.max(60, Math.floor((this.x1 - this.x0) / 3));
    const bins = new Float32Array(n);
    for (const r of this.S.records) bins[Math.min(n - 1, Math.floor(r.u * n))] += 1;
    for (const e of this.S.events) bins[Math.min(n - 1, Math.floor(e.u * n))] += 0.6;
    this.bins = bins; this.binMax = Math.max(...bins);
    this.draw();
  }

  X(u) { return this.x0 + u * (this.x1 - this.x0); }
  U(x) { return (x - this.x0) / (this.x1 - this.x0); }

  draw() {
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const blockTop = h - 20, blockH = 18;
    // density
    const n = this.bins.length, bw = (this.x1 - this.x0) / n;
    const dh = blockTop - 5;
    ctx.fillStyle = '#3d4180';
    for (let i = 0; i < n; i++) {
      if (!this.bins[i]) continue;
      const v = Math.sqrt(this.bins[i] / this.binMax);
      const bh = Math.max(1.5, v * dh);
      ctx.fillRect(this.x0 + i * bw, blockTop - 3 - bh, Math.max(1, bw - 1), bh);
    }
    // era blocks
    ctx.font = F; ctx.textBaseline = 'middle';
    SEGMENTS.forEach((s, i) => {
      const a = this.X(s.u0) + (i ? 1.5 : 0), b = this.X(s.u1) - 1.5;
      ctx.fillStyle = BLOCKS[i % BLOCKS.length];
      ctx.fillRect(a, blockTop, Math.max(1, b - a), blockH);
      const label = b - a > 64 ? s.short : b - a > 30 ? s.short.split(/[ –]/)[0] : '';
      if (label) {
        ctx.fillStyle = '#000';
        const tw = ctx.measureText(label).width;
        if (tw < b - a - 6) ctx.fillText(label, b - tw - 5, blockTop + blockH / 2 + 0.5);
      }
    });
    // the field's window
    const [ua, ub] = this.field.visibleU();
    let xa = this.X(ua), xb = this.X(ub);
    if (xb - xa < 6) { const m = (xa + xb) / 2; xa = m - 3; xb = m + 3; }
    this.win = [xa, xb];
    ctx.fillStyle = 'rgba(255,179,71,0.14)';
    ctx.fillRect(xa, 0, xb - xa, h);
    ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 2;
    ctx.strokeRect(xa + 1, 1, xb - xa - 2, h - 2);
  }

  initPointer() {
    const c = this.canvas;
    const pos = (e) => { const r = c.getBoundingClientRect(); return e.clientX - r.left; };
    c.addEventListener('pointerdown', (e) => {
      const x = pos(e);
      c.setPointerCapture(e.pointerId);
      const [a, b] = this.win || [0, 0];
      if (x >= a - 4 && x <= b + 4) this.drag = { dx: x - (a + b) / 2 };
      else { this.drag = { dx: 0 }; this.field.centerU(this.U(x), 450); }
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.drag || !e.buttons) return;
      this.field.centerU(this.U(pos(e) - this.drag.dx), 0);
    });
    c.addEventListener('pointerup', () => { this.drag = null; });
    c.addEventListener('dblclick', (e) => {
      const u = this.U(pos(e));
      const s = SEGMENTS.find((x) => u >= x.u0 && u <= x.u1);
      if (s) this.field.fitU(s.u0, s.u1);
    });
  }
}
