// Lightweight spaced repetition for puzzles (SM-2-lite). State in localStorage.
const KEY = 'pawnlens.srs.v1';
const DAY = 86400000;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function save(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* quota */ }
}

// A puzzle is due if never seen, or its due date has passed.
export function dueList(puzzles) {
  const map = load();
  const now = Date.now();
  const unseen = [];
  const due = [];
  for (const p of puzzles) {
    const s = map[p.id];
    if (!s) unseen.push(p);
    else if ((s.due || 0) <= now) due.push(p);
  }
  return [...unseen, ...due];
}

export function review(id, correct) {
  const map = load();
  const s = map[id] || { reps: 0, interval: 0 };
  if (correct) {
    s.reps = (s.reps || 0) + 1;
    s.interval = s.reps === 1 ? 1 : s.reps === 2 ? 3 : Math.round((s.interval || 1) * 2.3);
    s.due = Date.now() + s.interval * DAY;
  } else {
    s.reps = 0;
    s.interval = 0;
    s.due = Date.now() + 10 * 60 * 1000; // retry in ~10 min
  }
  map[id] = s;
  save(map);
  return s;
}

export function stats(puzzles) {
  const map = load();
  const now = Date.now();
  let learned = 0;
  for (const p of puzzles) {
    const s = map[p.id];
    if (s && (s.due || 0) > now && s.reps >= 2) learned++;
  }
  return { total: puzzles.length, learned };
}
