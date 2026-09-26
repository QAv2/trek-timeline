// The chronometric projection.
// In-universe time t (float years; negative = BCE) maps to a base unit u in [0, 1].
// Deep time is projected logarithmically on years-before-2400; recorded history is linear,
// with each era given width in proportion to how much of the canon happens there.

const YB_REF = 2400;

export const SEGMENTS = [
  { id: 'deep', label: 'Deep time', short: 'DEEP TIME', t0: -14e9, t1: -1e5, mode: 'log', w: 0.052 },
  { id: 'ancient', label: 'Antiquity', short: 'ANTIQUITY', t0: -1e5, t1: 1000, mode: 'log', w: 0.043 },
  { id: 'c11', label: '11th–19th centuries', short: '1000–1900', t0: 1000, t1: 1900, mode: 'lin', w: 0.03 },
  { id: 'c20', label: '20th–21st centuries', short: '20TH–21ST C', t0: 1900, t1: 2100, mode: 'lin', w: 0.075 },
  { id: 'c22', label: '22nd century', short: '22ND C', t0: 2100, t1: 2200, mode: 'lin', w: 0.07 },
  { id: 'c23', label: '23rd century', short: '23RD C', t0: 2200, t1: 2300, mode: 'lin', w: 0.19 },
  { id: 'c24', label: '24th century', short: '24TH C', t0: 2300, t1: 2400, mode: 'lin', w: 0.28 },
  { id: 'c25', label: '25th century', short: '25TH C', t0: 2400, t1: 2500, mode: 'lin', w: 0.05 },
  { id: 'far', label: '26th–31st centuries', short: '26TH–31ST C', t0: 2500, t1: 3100, mode: 'lin', w: 0.06 },
  { id: 'c32', label: '32nd century', short: '32ND C', t0: 3100, t1: 3200, mode: 'lin', w: 0.1 },
  { id: 'beyond', label: 'Beyond the 32nd century', short: 'BEYOND', t0: 3200, t1: 4400, mode: 'lin', w: 0.05 },
];
{
  let acc = 0;
  for (const s of SEGMENTS) { s.u0 = acc; acc += s.w; s.u1 = acc; }
  const last = SEGMENTS[SEGMENTS.length - 1]; last.u1 = 1;
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lg = (t) => Math.log10(YB_REF - t);

export function tToU(t) {
  if (!(t > SEGMENTS[0].t0)) return 0;
  for (const s of SEGMENTS) {
    if (t <= s.t1) {
      const f = s.mode === 'log' ? (lg(s.t0) - lg(t)) / (lg(s.t0) - lg(s.t1)) : (t - s.t0) / (s.t1 - s.t0);
      return s.u0 + f * s.w;
    }
  }
  return 1;
}

export function uToT(u) {
  u = clamp(u, 0, 1);
  for (const s of SEGMENTS) {
    if (u <= s.u1) {
      const f = (u - s.u0) / s.w;
      if (s.mode === 'log') {
        const a = lg(s.t0), b = lg(s.t1);
        return YB_REF - Math.pow(10, a - f * (a - b));
      }
      return s.t0 + f * (s.t1 - s.t0);
    }
  }
  return SEGMENTS[SEGMENTS.length - 1].t1;
}

export function segmentOf(t) {
  for (const s of SEGMENTS) if (t <= s.t1) return s;
  return SEGMENTS[SEGMENTS.length - 1];
}

const ordinal = (n) => {
  const v = n % 100;
  return n + (v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
};

export function centuryLabel(t) {
  if (t < 1000) return segmentOf(t).label;
  return `${ordinal(Math.floor((t - 1) / 100) + 1)} century`;
}

function trim(n, d) { return Number(n.toFixed(d)).toString(); }

/** Human label for a time; `res` is the display resolution in years (smaller = finer). */
export function fmtTime(t, res = 1) {
  const yb = YB_REF - t;
  if (t < -1e5) {
    if (yb >= 1e9) return `${trim(yb / 1e9, 2)} billion years ago`;
    if (yb >= 1e6) return `${trim(yb / 1e6, yb >= 1e8 ? 0 : 1)} million years ago`;
    return `${Math.round(yb / 1e3).toLocaleString('en-US')},000 years ago`;
  }
  if (t < 0) return `${Math.round(-t).toLocaleString('en-US')} BCE`;
  if (t < 1000) return `${Math.max(1, Math.round(t))} CE`;
  if (res < 1 / 6) {
    const y = Math.floor(t), m = Math.min(11, Math.floor((t - y) * 12));
    return `${MONTHS[m]} ${y}`;
  }
  return String(Math.floor(t));
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = MONTHS.map((m) => m.slice(0, 3).toUpperCase());

/**
 * Axis ticks for the visible window. `xOfU` maps u to screen x.
 * Returns [{x, label, major}] with labels spaced at least `minGap` px apart.
 */
export function ticks(xOfU, px0, px1, minGap = 70) {
  const out = [];
  for (const s of SEGMENTS) {
    const sx0 = xOfU(s.u0), sx1 = xOfU(s.u1);
    if (sx1 < px0 || sx0 > px1) continue;
    const segW = sx1 - sx0;
    out.push({ x: sx0, label: null, major: true, boundary: true, seg: s });
    if (s.mode === 'log') {
      const cands = s.id === 'deep'
        ? [1e10, 5e9, 2e9, 1e9, 5e8, 2e8, 1e8, 5e7, 2e7, 1e7, 5e6, 2e6, 1e6, 5e5, 2e5].map((yb) => YB_REF - yb)
        : [-5e4, -2e4, -1e4, -5000, -3000, -2000, -1000, -500, 0, 500];
      let last = -1e9;
      for (const t of cands) {
        if (t <= s.t0 || t >= s.t1) continue;
        const x = xOfU(tToU(t));
        if (x < px0 - 40 || x > px1 + 40) continue;
        if (x - last < minGap || x - sx0 < 30 || sx1 - x < 30) continue;
        out.push({ x, label: shortLabel(t), major: false });
        last = x;
      }
      continue;
    }
    const pxPerYear = segW / (s.t1 - s.t0);
    const steps = [500, 200, 100, 50, 20, 10, 5, 2, 1, 1 / 4, 1 / 12];
    let step = steps[0];
    for (const st of steps) { if (st * pxPerYear >= minGap) step = st; else break; }
    const visT0 = s.t0 + ((Math.max(px0, sx0) - sx0) / segW) * (s.t1 - s.t0);
    const visT1 = s.t0 + ((Math.min(px1, sx1) - sx0) / segW) * (s.t1 - s.t0);
    const start = Math.ceil((visT0 - 1e-9) / step) * step;
    for (let t = start; t <= visT1 + 1e-9; t += step) {
      if (t <= s.t0 + 1e-6 || t >= s.t1 - 1e-6) continue;
      const x = sx0 + (t - s.t0) * pxPerYear;
      let label, major = false;
      if (step >= 1) { label = String(Math.round(t)); major = Math.round(t) % (step * 5) === 0; }
      else {
        const y = Math.floor(t + 1e-9), m = Math.round((t - y) * 12) % 12;
        label = m === 0 ? String(y) : MON[m];
        major = m === 0;
      }
      out.push({ x, label, major });
    }
  }
  return out;
}

function shortLabel(t) {
  const yb = YB_REF - t;
  if (yb >= 1e9) return `${trim(yb / 1e9, 1)} BYA`;
  if (yb >= 1e6) return `${trim(yb / 1e6, 0)} MYA`;
  if (yb >= 1e4 && t < -1e4) return `${Math.round(yb / 1e3)} KYA`;
  if (t < 0) return `${Math.round(-t)} BCE`;
  if (t === 0) return '1 CE';
  return `${Math.round(t)} CE`;
}

// ── stardates ────────────────────────────────────────────────────────────
// 24th-century convention (TNG onward): year ≈ 2323 + SD/1000. It holds from TNG through
// Picard and even Prodigy's 2436. Earlier stardates don't convert; the 32nd-century scale
// is fitted from Discovery/Academy records at load time.
let fit32 = null;
export function setStardateFit32(f) { fit32 = f; }

export function sdForTime(t) {
  if (t >= 2323 && t < 2560) return { sd: (t - 2323) * 1000, rule: 'TNG-era convention' };
  if (fit32 && t >= 3150 && t < 3250) return { sd: (t - fit32.b) / fit32.a, rule: '32nd-century fit' };
  return null;
}

export function timeForSd(sd) {
  if (sd >= 40000 && sd < 240000) return { t: 2323 + sd / 1000, rule: 'TNG-era convention: year ≈ 2323 + SD ÷ 1000' };
  if (fit32 && sd >= 800000 && sd < 1000000) return { t: fit32.a * sd + fit32.b, rule: 'fitted to Discovery and Academy stardates' };
  return null;
}
