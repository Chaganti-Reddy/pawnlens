import { Chess } from 'chess.js';
import { winPct, classifyMove, gameAccuracy, TAGS } from './classify.js';
import { coachNote } from './coach.js';

// Analyze a full game. Evaluates each position ONCE (N+1 evals for N moves),
// then classifies every move from consecutive evals.
// onProgress(done, total) fires as positions are evaluated.
export async function analyzeGame(pgn, { engine, depth = 12, onProgress } = {}) {
  const base = new Chess();
  base.loadPgn(pgn);
  const verbose = base.history({ verbose: true });
  if (!verbose.length) throw new Error('No moves found in this PGN.');

  // Rebuild the FEN before every move (positions[i] = position the mover faces).
  const replay = new Chess();
  const positions = [replay.fen()];
  for (const m of verbose) {
    replay.move(m);
    positions.push(replay.fen());
  }

  // Evaluate each position once.
  const evals = [];
  for (let i = 0; i < positions.length; i++) {
    const r = await engine.analyze(positions[i], { depth, multipv: 1 });
    const l0 = r.lines[0] || {};
    evals.push({ fen: positions[i], bestmove: r.bestmove, cp: l0.cp ?? null, mate: l0.mate ?? null });
    onProgress?.(i + 1, positions.length);
  }

  const accByColor = { w: [], b: [] };
  const moves = verbose.map((m, i) => {
    const before = evals[i]; // mover to move
    const after = evals[i + 1]; // opponent to move
    const moverWinBefore = winPct(before);
    const moverWinAfter = 100 - winPct(after); // flip opponent perspective -> mover
    const playedUci = m.from + m.to + (m.promotion || '');

    const chessAfter = new Chess(positions[i + 1]);
    const cls = classifyMove({
      moverWinBefore,
      moverWinAfter,
      playedUci,
      bestUci: before.bestmove,
      chessAfter,
      toSquare: m.to,
      moverColor: m.color,
      movedPieceType: m.piece,
    });

    accByColor[m.color].push(cls.accuracy);

    const note = coachNote({
      tag: cls.tag,
      delta: cls.delta,
      playedMove: m,
      fenBefore: positions[i],
      fenAfter: positions[i + 1],
      bestUci: before.bestmove,
      evalAfter: after,
      moverColor: m.color,
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
      cpAfterMover: (() => {
        // eval bar value from White's perspective at this node
        const e = after;
        if (e.mate != null) {
          const m2 = m.color === 'w' ? -e.mate : e.mate; // after has opponent to move
          return { mate: m2 };
        }
        // 'after' cp is opponent-to-move; convert to White perspective
        const whiteToMove = (i + 1) % 2 === 0;
        const cpWhite = whiteToMove ? e.cp : -e.cp;
        return { cp: cpWhite };
      })(),
    };
  });

  // Count tags per color for the summary.
  const counts = { w: {}, b: {} };
  for (const mv of moves) {
    counts[mv.color][mv.tag] = (counts[mv.color][mv.tag] || 0) + 1;
  }

  return {
    moves,
    positions,
    evals,
    accuracyWhite: gameAccuracy(accByColor.w),
    accuracyBlack: gameAccuracy(accByColor.b),
    counts,
  };
}
