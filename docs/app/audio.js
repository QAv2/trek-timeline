// Console chirps, synthesized (no sampled sound files). Off until the viewer turns them on.
let ctx = null;
let on = false;
try { on = localStorage.getItem('tic-audio') === 'on'; } catch (_) { /* storage blocked */ }

export function audioOn() { return on; }
export function setAudio(v) {
  on = v;
  try { localStorage.setItem('tic-audio', v ? 'on' : 'off'); } catch (_) { /* storage blocked */ }
}

const VOICES = {
  select: [[1320, 0], [1760, 0.055]],
  nav: [[880, 0], [1175, 0.05]],
  soft: [[1480, 0]],
  deny: [[330, 0], [262, 0.08]],
};

export function chirp(kind = 'select') {
  if (!on) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ctx.currentTime;
    for (const [f, dt] of VOICES[kind] || VOICES.select) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t0 + dt);
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.09, t0 + dt + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.07);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + dt); o.stop(t0 + dt + 0.08);
    }
  } catch (_) { /* audio unavailable */ }
}
