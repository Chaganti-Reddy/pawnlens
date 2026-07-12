// Turn engine numbers + board facts into plain-English notes. No LLM, no cost.
import { Chess } from 'chess.js';

const PIECE_NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function uciToSan(fen, uci) {
  if (!uci || uci.length < 4) return null;
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
    return mv ? { san: mv.san, captured: mv.captured, to: mv.to, piece: mv.piece, chess: c } : null;
  } catch {
    return null;
  }
}

// After `byColor` lands a piece on `fromSquare`, how many enemy pieces does it hit?
function detectFork(chess, fromSquare, byColor) {
  const targets = [];
  let hitsKing = false;
  try {
    for (const row of chess.board()) {
      for (const sq of row) {
        if (!sq || sq.color === byColor) continue;
        const attackers = chess.attackers(sq.square, byColor) || [];
        if (attackers.includes(fromSquare)) {
          if (sq.type === 'k') hitsKing = true;
          else if ((PIECE_VALUE[sq.type] || 0) >= 3) targets.push(sq.type);
        }
      }
    }
  } catch {
    /* ignore */
  }
  return { count: targets.length + (hitsKing ? 1 : 0), targets, hitsKing };
}

function isBackRank(square, defenderColor) {
  const rank = square[1];
  return defenderColor === 'w' ? rank === '1' : rank === '8';
}

// Build a note for one move.
// args: { tag, delta, playedMove(verbose), fenBefore, fenAfter, bestUci, evalAfter, moverColor }
export function coachNote(args) {
  const { tag, delta, playedMove, fenBefore, fenAfter, bestUci, evalAfter, moverColor } = args;
  const best = uciToSan(fenBefore, bestUci);
  const bestSan = best?.san;

  // Positive / neutral moves.
  if (tag === 'Sharp') return { text: `A sacrifice that keeps the initiative — well spotted.`, bestSan, category: null };
  if (tag === 'Best') return { text: 'Best move — matches the engine.', bestSan, category: null };
  if (tag === 'Solid') return { text: 'Solid; barely gives anything up.', bestSan, category: null };
  if (tag === 'Fine') return { text: 'Reasonable, if not the sharpest.', bestSan, category: null };

  // Mistakes: explain WHY.
  const parts = [];
  let category = 'positional-drift';
  const oppColor = moverColor === 'w' ? 'b' : 'w';
  const oppBest = evalAfter && uciToSan(fenAfter, evalAfter.bestmove);

  // 1) Allowed a forced mate?
  if (evalAfter && evalAfter.mate != null && evalAfter.mate > 0) {
    const kingBack = oppBest && isBackRank(oppBest.to, moverColor);
    parts.push(
      kingBack && evalAfter.mate <= 2
        ? `This allows a back-rank mate (#${evalAfter.mate}).`
        : `This allows a forced mate (#${evalAfter.mate}).`
    );
    category = 'allowed-mate';
  }

  // 2) Opponent's reply forks your pieces.
  if (!parts.length && oppBest && oppBest.chess) {
    const fork = detectFork(oppBest.chess, oppBest.to, oppColor);
    if (fork.count >= 2) {
      parts.push(
        fork.hitsKing
          ? `${oppBest.san} forks your king and a ${PIECE_NAME[fork.targets[0]] || 'piece'}.`
          : `${oppBest.san} forks two of your pieces.`
      );
      category = 'tactic-allowed';
    }
  }

  // 3) Hung material — opponent's best reply is a winning capture.
  if (!parts.length && oppBest && oppBest.captured) {
    const gained = PIECE_VALUE[oppBest.captured] || 0;
    if (gained >= 3) {
      parts.push(`You left your ${PIECE_NAME[oppBest.captured]} loose — ${oppBest.san} wins it.`);
      category = 'hung-piece';
    }
  }

  // 4) A losing trade.
  if (!parts.length && playedMove?.captured) {
    parts.push(`This trade leaves you worse.`);
    category = 'bad-trade';
  }

  // 5) Missed a stronger move.
  if (!parts.length && bestSan) {
    parts.push(`${bestSan} was stronger here.`);
    category = 'missed-better-move';
  }

  // 6) Fallback.
  if (!parts.length) parts.push(`Drops about ${Math.round(delta)}% of your winning chances.`);

  // Always point to the better move + cost.
  if (bestSan && !parts.join(' ').includes(bestSan)) parts.push(`Engine preferred ${bestSan}.`);
  if (delta >= 5) parts.push(`(−${Math.round(delta)}% win chance)`);

  return { text: parts.join(' '), bestSan, category };
}
