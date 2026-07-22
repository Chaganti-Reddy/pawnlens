// Win-probability model + move classification.
// Uses the widely-published logistic win% curve and per-move accuracy formula
// (same shape lichess uses). Tag NAMES are our own — not chess.com's system.

// Convert an engine score {cp, mate} (side-to-move perspective) to a single
// centipawn-ish number, mapping mate scores to large magnitudes.
export function scoreToCp(ev) {
  if (!ev) return 0;
  if (ev.mate != null) {
    return ev.mate > 0 ? 10000 - ev.mate * 10 : -10000 - ev.mate * 10;
  }
  return ev.cp != null ? ev.cp : 0;
}

// Win% for the side to move, 0..100.
export function winPct(ev) {
  const cp = scoreToCp(ev);
  const chances = 2 / (1 + Math.exp(-0.00368208 * cp)) - 1; // -1..1
  return 50 + 50 * chances;
}

// Per-move accuracy 0..100 given win% before/after from the MOVER's perspective.
export function moveAccuracy(winBefore, winAfter) {
  if (winAfter >= winBefore) return 100;
  const acc = 103.1668 * Math.exp(-0.04354 * (winBefore - winAfter)) - 3.1669;
  return Math.max(0, Math.min(100, acc));
}

// Simple mean accuracy across a color's moves.
export function gameAccuracy(accuracies) {
  if (!accuracies.length) return 0;
  return accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
}

export const TAGS = {
  Best: { label: 'Best', color: '#7dc96b', symbol: '', kind: 'good' },
  Sharp: { label: 'Sharp', color: '#26c2a3', symbol: '!!', kind: 'good' },
  Solid: { label: 'Solid', color: '#9bcf6b', symbol: '', kind: 'good' },
  Fine: { label: 'Fine', color: '#b7b7b7', symbol: '', kind: 'ok' },
  Loose: { label: 'Loose', color: '#e6c14b', symbol: '?!', kind: 'bad' },
  Slip: { label: 'Slip', color: '#e6913c', symbol: '?', kind: 'bad' },
  Drop: { label: 'Drop', color: '#e0574b', symbol: '??', kind: 'bad' },
};

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Detect a sound sacrifice: the played piece lands where a lower-valued enemy
// piece can capture it, yet the position stays winning for the mover.
function looksLikeSacrifice(chessAfter, toSquare, moverColor, movedPieceType, winAfterMover) {
  try {
    if (movedPieceType === 'p') return false;
    if (winAfterMover < 55) return false;
    const enemy = moverColor === 'w' ? 'b' : 'w';
    const attackerSquares = chessAfter.attackers(toSquare, enemy) || [];
    if (!attackerSquares.length) return false;
    const movedVal = PIECE_VALUE[movedPieceType] || 0;
    for (const sq of attackerSquares) {
      const p = chessAfter.get(sq);
      if (p && (PIECE_VALUE[p.type] || 0) < movedVal) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Classify one move. Returns { tag, delta (win% lost), accuracy }.
export function classifyMove({
  moverWinBefore,
  moverWinAfter,
  playedUci,
  bestUci,
  chessAfter,
  toSquare,
  moverColor,
  movedPieceType,
}) {
  const delta = Math.max(0, moverWinBefore - moverWinAfter);
  const accuracy = moveAccuracy(moverWinBefore, moverWinAfter);
  const isBest = playedUci && bestUci && playedUci === bestUci;

  let tag;
  if (isBest) {
    tag = looksLikeSacrifice(chessAfter, toSquare, moverColor, movedPieceType, moverWinAfter)
      ? 'Sharp'
      : 'Best';
  } else if (delta < 2) tag = 'Solid';
  else if (delta < 5) tag = 'Fine';
  else if (delta < 10) tag = 'Loose';
  else if (delta < 20) tag = 'Slip';
  else tag = 'Drop';

  return { tag, delta, accuracy };
}
