// Synthesized chess sounds via Web Audio — no audio files, no licensing, offline.
// A short filtered-noise "thock" (piece hitting the board) plus a body thump,
// with distinct variants per event. Toggle with the settings menu.
const KEY = 'pawnlens.sound';
let ctx = null;

export function isSoundOn() {
  return localStorage.getItem(KEY) !== 'off';
}
export function setSoundOn(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* quota */ }
}

let queueT = 0; // monotonic scheduling cursor so rapid sounds don't stack on one timestamp
function actx() {
  if (!ctx) ctx = new (window.AudioContext || window['webkitAudioContext'])();
  return ctx;
}

function noise(c, dur) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// One "thock": a noise transient through a lowpass + a pitched body thump.
function thock(c, t, { freq, cutoff, dur, vol }) {
  const nb = c.createBufferSource();
  nb.buffer = noise(c, dur);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = cutoff;
  const ng = c.createGain();
  ng.gain.setValueAtTime(vol, t);
  ng.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  nb.connect(lp).connect(ng).connect(c.destination);
  nb.start(t); nb.stop(t + dur);

  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
  const og = c.createGain();
  og.gain.setValueAtTime(vol * 0.7, t);
  og.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(og).connect(c.destination);
  o.start(t); o.stop(t + dur);
}

function tone(c, t, freq, dur, vol, type = 'sine') {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur);
}

export function playSound(kind = 'move') {
  if (!isSoundOn()) return;
  try {
    const c = actx();
    if (c.state === 'suspended') c.resume();
    // Give each sound its own slot; never stack two on the same timestamp.
    const t = Math.max(c.currentTime + 0.02, queueT);
    queueT = t + 0.16;
    switch (kind) {
      case 'capture':
        thock(c, t, { freq: 140, cutoff: 2200, dur: 0.09, vol: 0.32 });
        break;
      case 'check':
        thock(c, t, { freq: 170, cutoff: 900, dur: 0.06, vol: 0.2 });
        tone(c, t + 0.02, 1180, 0.12, 0.12, 'triangle');
        break;
      case 'castle':
        thock(c, t, { freq: 170, cutoff: 800, dur: 0.06, vol: 0.22 });
        thock(c, t + 0.09, { freq: 150, cutoff: 800, dur: 0.06, vol: 0.22 });
        break;
      case 'promote':
        tone(c, t, 660, 0.09, 0.12, 'triangle');
        tone(c, t + 0.08, 880, 0.09, 0.12, 'triangle');
        tone(c, t + 0.16, 1245, 0.12, 0.12, 'triangle');
        break;
      case 'error':
        tone(c, t, 150, 0.14, 0.15, 'square');
        break;
      default: // move
        thock(c, t, { freq: 175, cutoff: 850, dur: 0.07, vol: 0.24 });
    }
  } catch { /* audio unavailable */ }
}

// Pick a sound from a SAN string.
export function soundForSan(san) {
  if (!san) return 'move';
  if (san.startsWith('O-O')) return 'castle';
  if (san.includes('=')) return 'promote';
  if (san.includes('+') || san.includes('#')) return 'check';
  if (san.includes('x')) return 'capture';
  return 'move';
}

// Back-compat helper used by older callers.
export function playMove(capture = false) {
  playSound(capture ? 'capture' : 'move');
}
