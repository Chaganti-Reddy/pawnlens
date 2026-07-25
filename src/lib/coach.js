// Turn engine numbers + board facts into plain-English notes that read like a
// friendly coach. No LLM — rule-based templates, all copy from the translation file.
import { Chess } from 'chess.js';
import i18n from '../i18n.js';

const t = (k, o) => i18n.t(k, o);
const pieceName = (type) => t(`piece.${type}`);
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

function ideaBehind(best, bestLine) {
  if (!best) return t('idea.solid');
  if (best.san.startsWith('O-O')) return t('idea.castle');
  if (best.san.includes('+')) return t('idea.check');
  if (best.captured) return t('idea.capture', { piece: pieceName(best.captured) });
  if ((best.piece === 'n' || best.piece === 'b') && best.san[0] === best.san[0].toUpperCase())
    return t('idea.develop');
  if (bestLine?.length >= 2) return t('idea.initiative', { move: bestLine[1] });
  return t('idea.solid');
}

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

const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

// Ray scan from a sliding piece's square: is an enemy piece pinned or skewered?
function detectLine(chess, fromSquare, pieceType) {
  if (!['b', 'r', 'q'].includes(pieceType)) return null;
  const dirs = pieceType === 'r' ? ROOK_DIRS : pieceType === 'b' ? BISHOP_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
  const fx = fromSquare.charCodeAt(0) - 97;
  const fy = Number(fromSquare[1]) - 1;
  const mover = chess.get(fromSquare)?.color;
  if (!mover) return null;
  try {
    for (const [dx, dy] of dirs) {
      const found = [];
      let x = fx + dx, y = fy + dy;
      while (x >= 0 && x < 8 && y >= 0 && y < 8) {
        const sq = String.fromCharCode(97 + x) + (y + 1);
        const p = chess.get(sq);
        if (p) {
          found.push(p);
          if (found.length === 2) break;
        }
        x += dx; y += dy;
      }
      if (found.length < 2) continue;
      const [p1, p2] = found;
      if (p1.color === mover || p2.color === mover) continue; // both must be the defender's
      const v1 = PIECE_VALUE[p1.type], v2 = PIECE_VALUE[p2.type];
      if (p2.type === 'k' || v2 > v1) return { motif: 'pin', p1: p1.type, p2: p2.type };
      if (p1.type === 'k' || v1 > v2) return { motif: 'skewer', p1: p1.type, p2: p2.type };
    }
  } catch { /* ignore */ }
  return null;
}

export function coachNote(args) {
  const { tag, delta, playedMove, fenBefore, fenAfter, bestUci, evalAfter, moverColor, bestLine } = args;
  const best = playMove(fenBefore, bestUci);
  const bestSan = best?.san;
  const oppColor = moverColor === 'w' ? 'b' : 'w';
  const oppBest = evalAfter && playMove(fenAfter, evalAfter.bestmove);

  if (tag === 'Sharp') {
    const cont = bestLine?.[1] ? t('coach.sharpCont', { move: bestLine[1] }) : '';
    return { text: t('coach.sharp', { cont }), bestSan, category: null };
  }
  if (tag === 'Best') return { text: t('coach.best', { idea: ideaBehind(best, bestLine) }), bestSan, category: null };
  if (tag === 'Solid') return { text: t('coach.solid'), bestSan, category: null };
  if (tag === 'Fine') return { text: t('coach.fine', { best: bestSan || t('coach.anotherMove') }), bestSan, category: null };

  let text = '';
  let category = 'positional-drift';

  if (evalAfter?.mate != null && evalAfter.mate > 0) {
    const backRank = oppBest && isBackRank(oppBest.to, moverColor) && evalAfter.mate <= 2;
    text = backRank ? t('coach.mateBackRank') : t('coach.mate');
    if (oppBest) text += t('coach.mateAfter', { opp: oppBest.san, n: evalAfter.mate });
    if (bestSan) text += t('coach.mateSaved', { best: bestSan });
    category = 'allowed-mate';
  } else if (oppBest?.chess && detectFork(oppBest.chess, oppBest.to, oppColor).count >= 2) {
    const f = detectFork(oppBest.chess, oppBest.to, oppColor);
    text = f.hitsKing
      ? t('coach.forkKing', { opp: oppBest.san, piece: pieceName(f.targets[0] || 'n') })
      : t('coach.forkTwo', { opp: oppBest.san });
    if (bestSan) text += t('coach.forkSaved', { best: bestSan });
    category = 'tactic-allowed';
  } else if (oppBest?.chess && detectLine(oppBest.chess, oppBest.to, oppBest.piece)) {
    const m = detectLine(oppBest.chess, oppBest.to, oppBest.piece);
    text = t(`coach.${m.motif}`, { opp: oppBest.san, p1: pieceName(m.p1), p2: pieceName(m.p2) });
    if (bestSan) text += t('coach.tacticSaved', { best: bestSan });
    category = 'tactic-allowed';
  } else if (oppBest?.captured && (PIECE_VALUE[oppBest.captured] || 0) >= 3) {
    text = t('coach.hung', { piece: pieceName(oppBest.captured), opp: oppBest.san });
    if (bestSan) text += t('coach.hungSaved', { best: bestSan });
    category = 'hung-piece';
  } else if (playedMove?.captured) {
    text = t('coach.badTrade');
    if (bestSan) text += t('coach.badTradeSaved', { best: bestSan });
    category = 'bad-trade';
  } else if (bestSan) {
    text = t('coach.missed', { best: bestSan, idea: ideaBehind(best, bestLine) });
    category = 'missed-better-move';
  } else {
    text = t('coach.slip');
  }

  if (delta >= 8) text += t('coach.cost', { pct: Math.round(delta) });
  return { text: text.trim(), bestSan, category };
}
