// "What do strong players do here?" — lichess Masters opening explorer.
// Free, CORS-open, no key. Populated for opening / known positions; empty deep
// in unique middlegames (caller falls back to the engine line there).
const CACHE = new Map();

export async function mastersForFen(fen) {
  if (CACHE.has(fen)) return CACHE.get(fen);
  const url = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&moves=5&topGames=0`;
  let data = null;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const total = (json.white || 0) + (json.draws || 0) + (json.black || 0);
      if (json.moves?.length && total > 0) {
        data = {
          total,
          moves: json.moves.slice(0, 4).map((m) => {
            const games = m.white + m.draws + m.black;
            return {
              san: m.san,
              uci: m.uci,
              games,
              share: Math.round((games / total) * 100),
              // score from White's point of view
              whiteScore: Math.round(((m.white + m.draws / 2) / games) * 100),
            };
          }),
        };
      }
    }
  } catch {
    data = null;
  }
  CACHE.set(fen, data);
  return data;
}
