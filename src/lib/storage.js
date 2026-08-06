// Local-only history. Data lives in the user's browser (localStorage). No server, no DB.

const KEY = 'pawnlens.history.v1';

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    /* quota — ignore */
  }
}

// Build a compact, storable summary from a full analysis result.
export function summarize(game, result, focusColor) {
  const badMoves = result.moves
    .filter((m) => m.color === focusColor && m.tagKind === 'bad')
    .map((m) => ({
      ply: m.ply,
      san: m.san,
      tag: m.tag,
      category: m.category,
      phase: m.phase,
      delta: Math.round(m.delta),
      note: m.note,
      // enough to reconstruct a puzzle:
      fen: m.fenBefore,
      solution: m.bestUci,
      solutionSan: m.bestSan,
      bestLine: m.bestLine,
    }));
  return {
    id: `${game.white}-${game.black}-${game.date || ''}-${game.url || Math.round(result.moves.length)}`,
    white: game.white,
    black: game.black,
    date: game.date || '',
    result: game.result || '*',
    source: game.source || 'pgn',
    url: game.url || '',
    opening: game.opening || '',
    pgn: game.pgn || '',
    gameId: game.gameId || '',
    savedAt: Date.now(),
    focusColor,
    focusName: focusColor === 'w' ? game.white : game.black,
    accuracy: focusColor === 'w' ? result.accuracyWhite : result.accuracyBlack,
    rating: focusColor === 'w' ? result.ratingWhite : result.ratingBlack,
    counts: result.counts[focusColor],
    badMoves,
  };
}

// Accuracy over time for a player (oldest -> newest), for the trend chart.
export function accuracyTrend(playerName) {
  const games = loadHistory()
    .filter((g) => (g.focusName || '').toLowerCase() === (playerName || '').toLowerCase())
    .filter((g) => g.accuracy != null)
    .sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
  return games.map((g) => ({ accuracy: g.accuracy, rating: g.rating || 0, date: g.date, savedAt: g.savedAt }));
}

// Openings where the player scores worst (min 2 games), for the weakness page.
export function worstOpenings(playerName, minGames = 2) {
  const games = loadHistory().filter(
    (g) => (g.focusName || '').toLowerCase() === (playerName || '').toLowerCase() && g.opening
  );
  const byOpening = {};
  for (const g of games) {
    const key = g.opening;
    if (!byOpening[key]) byOpening[key] = { opening: key, games: 0, accSum: 0 };
    byOpening[key].games++;
    byOpening[key].accSum += g.accuracy || 0;
  }
  return Object.values(byOpening)
    .filter((o) => o.games >= minGames)
    .map((o) => ({ opening: o.opening, games: o.games, avgAccuracy: o.accSum / o.games }))
    .sort((a, b) => a.avgAccuracy - b.avgAccuracy)
    .slice(0, 5);
}

// Flat, enriched list of every stored mistake for a player — each item carries
// its game context + PGN + ply so the UI can explain and jump straight to it.
export function mistakeInstances(playerName) {
  const games = loadHistory().filter(
    (g) => (g.focusName || '').toLowerCase() === (playerName || '').toLowerCase()
  );
  const out = [];
  for (const g of games) {
    for (const bm of g.badMoves || []) {
      out.push({
        white: g.white,
        black: g.black,
        date: g.date,
        color: g.focusColor,
        pgn: g.pgn || '',
        ply: bm.ply,
        moveNumber: Math.floor(bm.ply / 2) + 1,
        san: bm.san,
        tag: bm.tag,
        category: bm.category || 'positional-drift',
        phase: bm.phase,
        delta: bm.delta,
        note: bm.note,
      });
    }
  }
  return out.sort((a, b) => (b.delta || 0) - (a.delta || 0));
}

// Mistakes bucketed by move number — reveals when a player tends to slip.
export function mistakeHeatmap(playerName) {
  const buckets = [
    { label: '1–10', min: 1, max: 10, count: 0, items: [] },
    { label: '11–20', min: 11, max: 20, count: 0, items: [] },
    { label: '21–30', min: 21, max: 30, count: 0, items: [] },
    { label: '31–40', min: 31, max: 40, count: 0, items: [] },
    { label: '41+', min: 41, max: Infinity, count: 0, items: [] },
  ];
  for (const inst of mistakeInstances(playerName)) {
    const b = buckets.find((x) => inst.moveNumber >= x.min && inst.moveNumber <= x.max);
    if (b) { b.count++; b.items.push(inst); }
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return buckets.map((b) => ({ ...b, pct: Math.round((b.count / max) * 100) }));
}

// Collect all stored bad moves that can become puzzles.
export function collectPuzzles(playerName) {
  const games = loadHistory().filter(
    (g) => !playerName || (g.focusName || '').toLowerCase() === (playerName || '').toLowerCase()
  );
  const puzzles = [];
  for (const g of games) {
    for (const bm of g.badMoves || []) {
      if (!bm.fen || !bm.solution) continue;
      const delta = bm.delta || 0;
      const difficulty = delta >= 30 ? 'easy' : delta >= 15 ? 'medium' : 'hard';
      puzzles.push({
        id: `${g.id}#${bm.ply}`,
        fen: bm.fen,
        solution: bm.solution,
        solutionSan: bm.solutionSan,
        bestLine: bm.bestLine,
        note: bm.note,
        category: bm.category || 'positional-drift',
        difficulty,
        sideToMove: g.focusColor,
        from: `${g.white} vs ${g.black}`,
        opening: g.opening,
      });
    }
  }
  return puzzles;
}

export function addToHistory(summary) {
  const list = loadHistory();
  const without = list.filter((g) => g.id !== summary.id);
  without.unshift({ ...summary });
  saveHistory(without);
  return without;
}

export function clearHistory() {
  saveHistory([]);
}

// Aggregate weaknesses across all stored games for a given player name.
export function aggregateWeaknesses(playerName) {
  const games = loadHistory().filter(
    (g) => (g.focusName || '').toLowerCase() === (playerName || '').toLowerCase()
  );
  if (!games.length) return null;

  const instances = mistakeInstances(playerName);
  const catCounts = {};
  const phaseCounts = { opening: 0, middlegame: 0, endgame: 0 };
  const byCat = {};
  let accSum = 0;
  for (const g of games) accSum += g.accuracy || 0;
  for (const inst of instances) {
    const cat = inst.category;
    catCounts[cat] = (catCounts[cat] || 0) + 1;
    phaseCounts[inst.phase] = (phaseCounts[inst.phase] || 0) + 1;
    (byCat[cat] = byCat[cat] || []).push(inst);
  }
  const totalBad = instances.length;

  // A category is only a real *weakness* if it recurs — not a one-off. Score by
  // how often it happens AND how costly it is (avg win% dropped). Filter noise.
  const perGame = games.length ? totalBad / games.length : 0;
  const all = Object.entries(catCounts).map(([cat, count]) => {
    const list = byCat[cat];
    const avgDelta = list.reduce((s, i) => s + (i.delta || 0), 0) / list.length;
    const pct = Math.round((count / totalBad) * 100);
    return { cat, count, pct, avgDelta, score: count * (1 + avgDelta / 20), example: list[0], instances: list.slice(0, 4) };
  });
  // Keep patterns that recur (>=2 and >=15% of mistakes) or are individually costly.
  const topCategories = all
    .filter((c) => (c.count >= 2 && c.pct >= 15) || (c.count >= 2 && c.avgDelta >= 20))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const worstPhase = Object.entries(phaseCounts).sort((a, b) => b[1] - a[1])[0];
  // Need a reasonable sample before calling anything a weakness.
  const enoughData = games.length >= 3 && totalBad >= 6 && topCategories.length > 0;

  return {
    gamesAnalyzed: games.length,
    avgAccuracy: accSum / games.length,
    totalMistakes: totalBad,
    mistakesPerGame: perGame,
    topCategories,
    allCategories: all.sort((a, b) => b.count - a.count),
    enoughData,
    phaseCounts,
    worstPhase: worstPhase ? worstPhase[0] : null,
  };
}
