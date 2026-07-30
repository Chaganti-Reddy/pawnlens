import { Chess } from 'chess.js';

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };

// Squares of the side-to-move's pieces that are hanging: attacked by the enemy
// and either undefended, or attackable by something cheaper (a losing trade).
export function hangingSquares(fen) {
  try {
    const c = new Chess(fen);
    const stm = c.turn();
    const enemy = stm === 'w' ? 'b' : 'w';
    const out = [];
    for (const row of c.board()) {
      for (const sq of row) {
        if (!sq || sq.color !== stm || sq.type === 'k') continue;
        const attackers = c.attackers(sq.square, enemy) || [];
        if (!attackers.length) continue;
        const defenders = c.attackers(sq.square, stm) || [];
        const minAtk = Math.min(...attackers.map((s) => VAL[c.get(s)?.type] || 99));
        if (defenders.length === 0 || minAtk < VAL[sq.type]) out.push(sq.square);
      }
    }
    return out;
  } catch {
    return [];
  }
}
