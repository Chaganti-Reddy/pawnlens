// Tiny move "click" via the Web Audio API — no audio files, no network.
const KEY = 'pawnlens.sound';
let ctx = null;

export function isSoundOn() {
  return localStorage.getItem(KEY) !== 'off';
}
export function setSoundOn(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* quota */ }
}

export function playMove(capture = false) {
  if (!isSoundOn()) return;
  try {
    ctx = ctx || new (window.AudioContext || window['webkitAudioContext'])();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = capture ? 220 : 380;
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch { /* audio unavailable */ }
}
