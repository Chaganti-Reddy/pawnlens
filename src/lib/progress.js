// Puzzle rating (Elo-style, adjusts per solve) + solved tracking. Local only.
const RATING_KEY = 'pawnlens.puzzlerating';
const SOLVED_KEY = 'pawnlens.solved.v1';

export function getPuzzleRating() {
  const v = Number(localStorage.getItem(RATING_KEY));
  return Number.isFinite(v) && v > 0 ? v : 1200;
}

// Elo update against the puzzle's own rating.
export function updatePuzzleRating(puzzleRating, correct) {
  const ur = getPuzzleRating();
  const pr = puzzleRating || 1200;
  const expected = 1 / (1 + Math.pow(10, (pr - ur) / 400));
  const K = 28;
  const next = Math.max(400, Math.min(3000, Math.round(ur + K * ((correct ? 1 : 0) - expected))));
  try { localStorage.setItem(RATING_KEY, String(next)); } catch { /* quota */ }
  return { rating: next, delta: next - ur };
}

function loadSolved() {
  try { return new Set(JSON.parse(localStorage.getItem(SOLVED_KEY) || '[]')); } catch { return new Set(); }
}
let solved = loadSolved();

export function isSolved(id) { return solved.has(id); }
export function markSolved(id) {
  solved.add(id);
  try { localStorage.setItem(SOLVED_KEY, JSON.stringify([...solved])); } catch { /* quota */ }
}
export function solvedCount() { return solved.size; }
