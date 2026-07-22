// Turn engine numbers + board facts into plain-English notes that read like a
// friendly coach — not an engine dump. No LLM, no cost: all rule-based templates.
import { Chess } from 'chess.js';

const PIECE_NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function playMove(fen, uci) {
  if (!uci || uci.length < 4) return null;
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
    return mv ? { san: mv.san, captured: mv.captured, to: mv.to, piece: mv.piece, chess: c } : null;
  } catch {
    return null;
  }
}

// A short phrase for the idea behind the best move.
function ideaBehind(best, bestLine) {
  if (!best) return '';
  if (best.san.startsWith('O-O')) return 'tucking your king away safely';
  if (best.san.includes('+')) return 'putting the king under pressure';
  if (best.captured) return `picking up the ${PIECE_NAME[best.captured]}`;
  if ((best.piece === 'n' || best.piece === 'b') && /[a-h][12]/.test(best.to) === false && best.san[0] === best.san[0].toUpperCase())
    return 'bringing a piece into the game';
  if (bestLine?.length >= 2) return `and after ${bestLine[1]} you keep the initiative`;
  return 'keeping your position solid';
}

// After `byColor` lands on `fromSquare`, how many enemy pieces does it hit?
function detectFork(chess, fromSquare, byColor) {
  const targets = [];
  let hitsKing = false;
  try {
    for (const row of chess.board()) {
      for (const sq of row) {
        if (!sq || sq.color === byColor) continue;
        if ((chess.attackers(sq.square, byColor) || []).includes(fromSquare)) {
          if (sq.type === 'k') hitsKing = true;
          else if ((PIECE_VALUE[sq.type] || 0) >= 3) targets.push(sq.type);
        }
      }
    }
  } catch { /* ignore */ }
  return { count: targets.length + (hitsKing ? 1 : 0), targets, hitsKing };
}

function isBackRank(square, defenderColor) {
  return defenderColor === 'w' ? square[1] === '1' : square[1] === '8';
}

export function coachNote(args) {
  const { tag, delta, playedMove, fenBefore, fenAfter, bestUci, evalAfter, moverColor, bestLine } = args;
  const best = playMove(fenBefore, bestUci);
  const bestSan = best?.san;
  const oppColor = moverColor === 'w' ? 'b' : 'w';
  const oppBest = evalAfter && playMove(fenAfter, evalAfter.bestmove);

  // Good / neutral — warm, brief.
  if (tag === 'Sharp')
    return { text: `Brave and correct — the sacrifice breaks through${bestLine?.[1] ? `, and ${bestLine[1]} keeps it rolling` : ''}.`, bestSan, category: null };
  if (tag === 'Best')
    return { text: `Spot on — that's the best move, ${ideaBehind(best, bestLine)}.`, bestSan, category: null };
  if (tag === 'Solid')
    return { text: `Good, solid choice — you gave up almost nothing.`, bestSan, category: null };
  if (tag === 'Fine')
    return { text: `Playable, though ${bestSan || 'another move'} had a touch more to offer.`, bestSan, category: null };

  // Mistakes — explain what went wrong, then the better plan.
  let text = '';
  let category = 'positional-drift';

  if (evalAfter?.mate != null && evalAfter.mate > 0) {
    const backRank = oppBest && isBackRank(oppBest.to, moverColor) && evalAfter.mate <= 2;
    text = backRank
      ? `Careful — this walks into a back-rank mate. `
      : `Ouch — this walks into a forced mate. `;
    if (oppBest) text += `After ${oppBest.san} there's no escape (mate in ${evalAfter.mate}). `;
    text += bestSan ? `${bestSan} was the way to stay alive.` : '';
    category = 'allowed-mate';
  } else if (oppBest && oppBest.chess && detectFork(oppBest.chess, oppBest.to, oppColor).count >= 2) {
    const f = detectFork(oppBest.chess, oppBest.to, oppColor);
    text = f.hitsKing
      ? `This lets ${oppBest.san} fork your king and ${PIECE_NAME[f.targets[0]] || 'a piece'} — you'll drop material next move. `
      : `This runs into ${oppBest.san}, forking two of your pieces. `;
    text += bestSan ? `${bestSan} would've kept everything defended.` : '';
    category = 'tactic-allowed';
  } else if (oppBest?.captured && (PIECE_VALUE[oppBest.captured] || 0) >= 3) {
    text = `You left the ${PIECE_NAME[oppBest.captured]} loose — ${oppBest.san} just takes it. `;
    text += bestSan ? `${bestSan} kept it protected.` : '';
    category = 'hung-piece';
  } else if (playedMove?.captured) {
    text = `This trade actually helps your opponent — you come out worse. `;
    text += bestSan ? `${bestSan} kept the tension in your favour.` : '';
    category = 'bad-trade';
  } else if (bestSan) {
    text = `${bestSan} was stronger, ${ideaBehind(best, bestLine)}. Your move hands a little back.`;
    category = 'missed-better-move';
  } else {
    text = `This slips a bit — there was something cleaner here.`;
  }

  if (delta >= 8) text += ` (about ${Math.round(delta)}% of your advantage)`;
  return { text: text.trim(), bestSan, category };
}
