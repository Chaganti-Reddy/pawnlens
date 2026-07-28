// Bundled tactics bank (subset of the open Lichess puzzle set, CC0). Lazy-loaded.
let cache = null;
export async function loadTactics() {
  if (cache) return cache;
  const m = await import('../data/puzzles.json');
  cache = m.default;
  return cache;
}
