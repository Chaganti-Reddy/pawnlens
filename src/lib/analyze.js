import { Chess } from 'chess.js';
import { winPct, classifyMove, gameAccuracy, TAGS } from './classify.js';
import { coachNote } from './coach.js';

// Convert a UCI line to SAN, played out from `fen`. Returns up to `max` moves.
function uciLineToSan(fen, uciLine, max = 6) {
  if (!uciLine?.length) return [];
  const c = new Chess(fen);
  const out = [];
  for (const uci of uciLine.slice(0, max)) {
    try {
      const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
      if (!mv) break;
      out.push(mv.san);
    } catch {
      break;
    }
  }
  return out;
}

// Analyze a full game. Evaluates each position ONCE (N+1 evals for N moves),
// then classifies every move from consecutive evals.
export async function analyzeGame(pgn, { engine, depth = 12, onProgress } = {}) {
  const base = new Chess();
  base.loadPgn(pgn);
  const verbose = base.history({ verbose: true });
  if (!verbose.length) throw new Error('No moves found in this PGN.');

  const replay = new Chess();
  const positions = [replay.fen()];
  for (const m of verbose) {
    replay.move(m);
    positions.push(replay.fen());
  }

  const evals = [];
  for (let i = 0; i < positions.length; i++) {
    const r = await engine.analyze(positions[i], { depth, multipv: 1 });
    const l0 = r.lines[0] || {};
    evals.push({ fen: positions[i], bestmove: r.bestmove, cp: l0.cp ?? null, mate: l0.mate ?? null, pv: l0.pv || [] });
    onProgress?.(i + 1, positions.length);
  }

  // White-perspective eval for a node (used by the eval graph + bar).
  const whiteEval = (idx) => {
    const e = evals[idx];
    const whiteToMove = idx % 2 === 0;
    if (e.mate != null) return { mate: whiteToMove ? e.mate : -e.mate };
    return { cp: whiteToMove ? e.cp : -(e.cp ?? 0) };
  };

  const accByColor = { w: [], b: [] };
  const moves = verbose.map((m, i) => {
    const before = evals[i];
    const after = evals[i + 1];
    const moverWinBefore = winPct(before);
    const moverWinAfter = 100 - winPct(after);
    const playedUci = m.from + m.to + (m.promotion || '');

    const chessAfter = new Chess(positions[i + 1]);
    const cls = classifyMove({
      moverWinBefore, moverWinAfter, playedUci, bestUci: before.bestmove,
      chessAfter, toSquare: m.to, moverColor: m.color, movedPieceType: m.piece,
    });
    accByColor[m.color].push(cls.accuracy);

    const bestLine = uciLineToSan(positions[i], before.pv, 6);
    const note = coachNote({
      tag: cls.tag, delta: cls.delta, playedMove: m,
      fenBefore: positions[i], fenAfter: positions[i + 1],
      bestUci: before.bestmove, evalAfter: after, moverColor: m.color, bestLine,
    });

    const meta = TAGS[cls.tag];
    return {
      ply: i,
      moveNumber: Math.floor(i / 2) + 1,
      color: m.color,
      san: m.san,
      from: m.from,
      to: m.to,
      uci: playedUci,
      bestUci: before.bestmove,
      bestLine,
      tag: cls.tag,
      tagLabel: meta.label,
      tagColor: meta.color,
      tagSymbol: meta.symbol,
      tagKind: meta.kind,
      delta: cls.delta,
      accuracy: cls.accuracy,
      note: note.text,
      bestSan: note.bestSan,
      category: note.category,
      phase: i < 16 ? 'opening' : i < 40 ? 'middlegame' : 'endgame',
      fenBefore: positions[i],
      fenAfter: positions[i + 1],
      evalWhite: whiteEval(i + 1),
    };
  });

  // Eval series (White perspective) for the whole game, incl. start.
  const evalSeries = positions.map((_, i) => whiteEval(i));

  const counts = { w: {}, b: {} };
  for (const mv of moves) counts[mv.color][mv.tag] = (counts[mv.color][mv.tag] || 0) + 1;

  return {
    moves,
    positions,
    evals,
    evalSeries,
    accuracyWhite: gameAccuracy(accByColor.w),
    accuracyBlack: gameAccuracy(accByColor.b),
    counts,
  };
}
