import { Chess } from 'chess.js';
import { winPct, scoreToCp, classifyMove, ratingFromAccuracy, TAGS } from './classify.js';
import { coachNote } from './coach.js';
import { parseClocks, baseOf, incrementOf } from './timecontrol.js';

// White-perspective win% (0..100) from a white-perspective eval.
function whiteWin(ev) {
  const cp = ev?.mate != null ? (ev.mate > 0 ? 10000 : -10000) : (ev?.cp ?? 0);
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

// Lichess accuracy for one colour: average of a volatility-weighted mean and the
// harmonic mean of the per-move accuracies. Faithful to lichess's published method
// — window size = clamp(positions/10, 2, 8); each move's weight is the standard
// deviation of the win% over a fixed-size window (front-clamped like lichess's
// padded sliding), floored at 0.5, so swingy moments count more than quiet ones.
function stdev(xs) {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
}
function colorAccuracy(moves, color, whiteWinSeries) {
  const mine = moves.filter((m) => m.color === color);
  if (!mine.length) return 0;
  const n = whiteWinSeries.length; // number of positions
  const w = Math.min(8, Math.max(2, Math.round(n / 10)));
  const weightAt = (ply) => {
    const start = Math.min(Math.max(0, ply + 1 - w + 1), Math.max(0, n - w));
    return Math.max(0.5, stdev(whiteWinSeries.slice(start, start + w)));
  };
  const accs = mine.map((m) => Math.max(1, m.accuracy));
  const weights = mine.map((m) => weightAt(m.ply));
  const wSum = weights.reduce((a, b) => a + b, 0);
  const weighted = accs.reduce((s, a, i) => s + a * weights[i], 0) / wSum;
  const harmonic = accs.length / accs.reduce((s, a) => s + 1 / a, 0);
  return (weighted + harmonic) / 2;
}

function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

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

  // Per-move clocks from [%clk] comments (chess.com PGNs carry them). Only trust
  // them when there's one clock per ply; otherwise leave time data off entirely.
  const tc = (pgn.match(/\[TimeControl\s+"([^"]+)"\]/) || [])[1] || '';
  const clocks = parseClocks(pgn);
  const hasClocks = clocks.length === verbose.length && clocks.length > 0;
  const inc = incrementOf(tc);
  const startBase = baseOf(tc);
  const timeSpentAt = (ply) => {
    if (!hasClocks) return null;
    const before = ply >= 2 ? clocks[ply - 2] : startBase || clocks[ply] + inc;
    return Math.max(0, before - clocks[ply] + inc);
  };

  const evals = [];
  for (let i = 0; i < positions.length; i++) {
    // A mated/stalemated position has no engine eval — score it ourselves.
    const term = new Chess(positions[i]);
    if (term.isCheckmate()) {
      // side to move is checkmated (lost); score is side-to-move relative.
      evals.push({ fen: positions[i], bestmove: null, cp: -30000, mate: null, pv: [] });
      onProgress?.(i + 1, positions.length);
      continue;
    }
    if (term.isStalemate() || term.isInsufficientMaterial() || term.isDraw()) {
      evals.push({ fen: positions[i], bestmove: null, cp: 0, mate: null, pv: [] });
      onProgress?.(i + 1, positions.length);
      continue;
    }
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

  const accByPhase = { w: { opening: [], middlegame: [], endgame: [] }, b: { opening: [], middlegame: [], endgame: [] } };
  const cpLossByColor = { w: [], b: [] };
  const moves = verbose.map((m, i) => {
    const before = evals[i];
    const after = evals[i + 1];
    const moverWinBefore = winPct(before);
    const moverWinAfter = 100 - winPct(after);
    const cpLoss = Math.min(1000, Math.max(0, scoreToCp(before) - -scoreToCp(after)));
    cpLossByColor[m.color].push(cpLoss);
    const playedUci = m.from + m.to + (m.promotion || '');

    const chessAfter = new Chess(positions[i + 1]);
    const cls = classifyMove({
      moverWinBefore, moverWinAfter, playedUci, bestUci: before.bestmove,
      chessAfter, toSquare: m.to, moverColor: m.color, movedPieceType: m.piece,
    });
    const phase = i < 16 ? 'opening' : i < 40 ? 'middlegame' : 'endgame';
    accByPhase[m.color][phase].push(cls.accuracy);

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
      phase,
      fenBefore: positions[i],
      fenAfter: positions[i + 1],
      evalWhite: whiteEval(i + 1),
      clock: hasClocks ? clocks[i] : null,
      secondsSpent: timeSpentAt(i),
    };
  });

  // Eval series (White perspective) for the whole game, incl. start.
  const evalSeries = positions.map((_, i) => whiteEval(i));

  const counts = { w: {}, b: {} };
  for (const mv of moves) counts[mv.color][mv.tag] = (counts[mv.color][mv.tag] || 0) + 1;

  const whiteWinSeries = evalSeries.map(whiteWin);
  const phaseAcc = (color) => ({
    opening: mean(accByPhase[color].opening),
    middlegame: mean(accByPhase[color].middlegame),
    endgame: mean(accByPhase[color].endgame),
  });
  const accuracyWhite = colorAccuracy(moves, 'w', whiteWinSeries);
  const accuracyBlack = colorAccuracy(moves, 'b', whiteWinSeries);
  const acplWhite = Math.round(mean(cpLossByColor.w));
  const acplBlack = Math.round(mean(cpLossByColor.b));

  return {
    moves,
    positions,
    evals,
    evalSeries,
    accuracyWhite,
    accuracyBlack,
    ratingWhite: ratingFromAccuracy(accuracyWhite),
    ratingBlack: ratingFromAccuracy(accuracyBlack),
    acplWhite,
    acplBlack,
    accuracyByPhase: { w: phaseAcc('w'), b: phaseAcc('b') },
    counts,
    timeControl: tc,
    hasClocks,
    avgSecondsWhite: hasClocks ? mean(moves.filter((m) => m.color === 'w').map((m) => m.secondsSpent)) : null,
    avgSecondsBlack: hasClocks ? mean(moves.filter((m) => m.color === 'b').map((m) => m.secondsSpent)) : null,
  };
}
