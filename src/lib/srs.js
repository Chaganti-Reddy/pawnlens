// Spaced repetition using FSRS-4.5 (Free Spaced Repetition Scheduler).
// Puzzles are graded pass/fail: a solve = "good" (3), a miss = "again" (1).
// State per puzzle id in localStorage: { S (stability, days), D (difficulty 1-10),
// due (ms), reps, lapses, last (ms) }.
const KEY = 'pawnlens.fsrs.v1';
const DAY = 86400000;
const FACTOR = 19 / 81;
const DECAY = -0.5;
const REQUEST_RETENTION = 0.9;
const MIN_INTERVAL = 10 / 1440; // 10 minutes, in days

// FSRS-4.5 default weights.
const W = [0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
  0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466];

const clampD = (d) => Math.min(10, Math.max(1, d));

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function save(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* quota */ }
}

const initStability = (g) => W[g - 1];
const initDifficulty = (g) => clampD(W[4] - (g - 3) * W[5]);
const retrievability = (elapsedDays, S) => Math.pow(1 + FACTOR * elapsedDays / S, DECAY);
const intervalFromStability = (S) => S / FACTOR * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);

function nextDifficulty(D, g) {
  const d = D - W[6] * (g - 3);
  return clampD(W[7] * initDifficulty(4) + (1 - W[7]) * d);
}
function nextStabilityRecall(D, S, R, g) {
  const hard = g === 2 ? W[15] : 1;
  const easy = g === 4 ? W[16] : 1;
  return S * (1 + Math.exp(W[8]) * (11 - D) * Math.pow(S, -W[9]) * (Math.exp((1 - R) * W[10]) - 1) * hard * easy);
}
function nextStabilityLapse(D, S, R) {
  return W[11] * Math.pow(D, -W[12]) * (Math.pow(S + 1, W[13]) - 1) * Math.exp((1 - R) * W[14]);
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
  const g = correct ? 3 : 1;
  const now = Date.now();
  let card = map[id];
  let S, D;

  if (!card) {
    S = initStability(g);
    D = initDifficulty(g);
    card = { reps: 0, lapses: 0 };
  } else {
    const elapsed = Math.max(0, (now - (card.last || now)) / DAY);
    const R = retrievability(elapsed, card.S || 1);
    D = nextDifficulty(card.D || 5, g);
    S = correct ? nextStabilityRecall(D, card.S || 1, R, g) : nextStabilityLapse(D, card.S || 1, R);
  }

  const interval = Math.max(MIN_INTERVAL, intervalFromStability(S));
  const next = {
    S, D,
    reps: (card.reps || 0) + 1,
    lapses: (card.lapses || 0) + (correct ? 0 : 1),
    last: now,
    due: now + interval * DAY,
  };
  map[id] = next;
  save(map);
  return next;
}

const STREAK_KEY = 'pawnlens.beststreak';
export function bestStreak() {
  try { return Number(localStorage.getItem(STREAK_KEY) || 0); } catch { return 0; }
}
export function recordStreak(current) {
  if (current > bestStreak()) {
    try { localStorage.setItem(STREAK_KEY, String(current)); } catch { /* quota */ }
  }
  return bestStreak();
}

// "Learned" = memory stable enough to survive a few days.
export function stats(puzzles) {
  const map = load();
  let learned = 0;
  for (const p of puzzles) {
    const s = map[p.id];
    if (s && (s.S || 0) >= 4 && s.reps >= 2) learned++;
  }
  return { total: puzzles.length, learned };
}
