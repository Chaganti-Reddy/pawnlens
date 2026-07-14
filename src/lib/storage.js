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
    }));
  return {
    id: `${game.white}-${game.black}-${game.date || ''}-${game.url || Math.round(result.moves.length)}`,
    white: game.white,
    black: game.black,
    date: game.date || '',
    result: game.result || '*',
    source: game.source || 'pgn',
    url: game.url || '',
    focusColor,
    focusName: focusColor === 'w' ? game.white : game.black,
    accuracy: focusColor === 'w' ? result.accuracyWhite : result.accuracyBlack,
    counts: result.counts[focusColor],
    badMoves,
  };
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

const CATEGORY_LABEL = {
  'hung-piece': 'Hanging pieces (dropping material)',
  'allowed-mate': 'Walking into forced mates',
  'tactic-allowed': 'Allowing tactics (forks, etc.)',
  'bad-trade': 'Trading into a worse position',
  'missed-better-move': 'Missing stronger moves',
  'positional-drift': 'Slow positional slips',
};

// Aggregate weaknesses across all stored games for a given player name.
export function aggregateWeaknesses(playerName) {
  const games = loadHistory().filter(
    (g) => (g.focusName || '').toLowerCase() === (playerName || '').toLowerCase()
  );
  if (!games.length) return null;

  const catCounts = {};
  const phaseCounts = { opening: 0, middlegame: 0, endgame: 0 };
  const examples = {};
  let totalBad = 0;
  let accSum = 0;

  for (const g of games) {
    accSum += g.accuracy || 0;
    for (const bm of g.badMoves || []) {
      totalBad++;
      const cat = bm.category || 'positional-drift';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
      phaseCounts[bm.phase] = (phaseCounts[bm.phase] || 0) + 1;
      if (!examples[cat]) examples[cat] = bm;
    }
  }

  const topCategories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => ({
      cat,
      label: CATEGORY_LABEL[cat] || cat,
      count,
      pct: Math.round((count / totalBad) * 100),
      example: examples[cat],
    }));

  const worstPhase = Object.entries(phaseCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    gamesAnalyzed: games.length,
    avgAccuracy: accSum / games.length,
    totalMistakes: totalBad,
    mistakesPerGame: totalBad / games.length,
    topCategories,
    phaseCounts,
    worstPhase: worstPhase ? worstPhase[0] : null,
  };
}
