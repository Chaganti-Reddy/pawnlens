// Synthesized chess sounds via pre-rendered AudioBuffers. Each sound is rendered
// once into a buffer, then played fire-and-forget through a fresh BufferSource —
// so every play is identical volume with no scheduling drift. No audio files.
const KEY = 'pawnlens.sound';
let ctx = null;
const buffers = {};
const DUR = 0.26;

export function isSoundOn() {
  return localStorage.getItem(KEY) !== 'off';
}
export function setSoundOn(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* quota */ }
}

function actx() {
  if (!ctx) ctx = new (window.AudioContext || window['webkitAudioContext'])();
  return ctx;
}

// A "thock": pitched body + lowpassed noise transient, exponential decay.
function addThock(d, sr, { f, tau, noise, delay = 0 }) {
  let lp = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / sr - delay;
    const rnd = Math.random() * 2 - 1;
    lp += 0.15 * (rnd - lp);
    if (t < 0) continue;
    const env = Math.exp(-t / tau);
    d[i] += env * (0.55 * Math.sin(2 * Math.PI * f * t) + noise * lp);
  }
}
function addTone(d, sr, { f, tau, amp = 0.4, delay = 0, square = false }) {
  for (let i = 0; i < d.length; i++) {
    const t = i / sr - delay;
    if (t < 0) continue;
    const env = Math.exp(-t / tau);
    const s = Math.sin(2 * Math.PI * f * t);
    d[i] += amp * env * (square ? Math.sign(s) : s);
  }
}

function render(kind) {
  const c = actx();
  const sr = c.sampleRate;
  const buf = c.createBuffer(1, Math.ceil(sr * DUR), sr);
  const d = buf.getChannelData(0);
  switch (kind) {
    case 'capture': addThock(d, sr, { f: 130, tau: 0.04, noise: 0.9 }); break;
    case 'check': addThock(d, sr, { f: 170, tau: 0.025, noise: 0.3 }); addTone(d, sr, { f: 1180, tau: 0.09, amp: 0.3, delay: 0.02 }); break;
    case 'castle': addThock(d, sr, { f: 170, tau: 0.03, noise: 0.5 }); addThock(d, sr, { f: 150, tau: 0.03, noise: 0.5, delay: 0.09 }); break;
    case 'promote': addTone(d, sr, { f: 660, tau: 0.08, amp: 0.35 }); addTone(d, sr, { f: 880, tau: 0.08, amp: 0.35, delay: 0.06 }); addTone(d, sr, { f: 1245, tau: 0.1, amp: 0.35, delay: 0.12 }); break;
    case 'error': addTone(d, sr, { f: 150, tau: 0.1, amp: 0.4, square: true }); break;
    default: addThock(d, sr, { f: 175, tau: 0.03, noise: 0.5 });
  }
  // normalize to avoid clipping
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 1) for (let i = 0; i < d.length; i++) d[i] /= peak;
  return buf;
}

export function playSound(kind = 'move') {
  if (!isSoundOn()) return;
  try {
    const c = actx();
    if (c.state === 'suspended') c.resume();
    const buf = buffers[kind] || (buffers[kind] = render(kind));
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = 0.85;
    src.connect(g).connect(c.destination);
    src.start();
  } catch { /* audio unavailable */ }
}

export function soundForSan(san) {
  if (!san) return 'move';
  if (san.startsWith('O-O')) return 'castle';
  if (san.includes('=')) return 'promote';
  if (san.includes('+') || san.includes('#')) return 'check';
  if (san.includes('x')) return 'capture';
  return 'move';
}

export function playMove(capture = false) {
  playSound(capture ? 'capture' : 'move');
}
