// Fetch games from public, CORS-open APIs. No server, no API key, no scraping of paywalled data.
// chess.com: https://www.chess.com/news/view/published-data-api
// lichess:   https://lichess.org/api

// Split a possibly-multi-game PGN blob into individual game strings.
export function splitPgns(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/\n\s*\n(?=\[Event )/g);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function tagOf(pgn, name) {
  const m = pgn.match(new RegExp(`\\[${name}\\s+"([^"]*)"\\]`));
  return m ? m[1] : '';
}

// Turn a chess.com ECO url slug into a readable opening name.
function openingFromEcoUrl(url) {
  if (!url) return '';
  const slug = url.split('/openings/')[1];
  if (!slug) return '';
  return decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .replace(/\.{3}.*$/, '')
    .replace(/\s+\d.*$/, '')
    .trim();
}

// Light metadata from a PGN's header tags.
export function pgnMeta(pgn) {
  const opening = tagOf(pgn, 'Opening') || openingFromEcoUrl(tagOf(pgn, 'ECOUrl'));
  return {
    pgn,
    white: tagOf(pgn, 'White') || 'White',
    black: tagOf(pgn, 'Black') || 'Black',
    whiteElo: tagOf(pgn, 'WhiteElo'),
    blackElo: tagOf(pgn, 'BlackElo'),
    result: tagOf(pgn, 'Result') || '*',
    date: tagOf(pgn, 'Date') || tagOf(pgn, 'UTCDate'),
    event: tagOf(pgn, 'Event'),
    timeControl: tagOf(pgn, 'TimeControl'),
    eco: tagOf(pgn, 'ECO'),
    opening,
    termination: tagOf(pgn, 'Termination'),
    site: tagOf(pgn, 'Site'),
  };
}

// Given a game and the searched user, tag which side they played + their result.
function withUserView(game, user) {
  const u = (user || '').toLowerCase();
  let userColor = null;
  if (game.white.toLowerCase() === u) userColor = 'w';
  else if (game.black.toLowerCase() === u) userColor = 'b';
  let userResult = null;
  if (userColor && game.result !== '*') {
    if (game.result === '1/2-1/2') userResult = 'draw';
    else if (game.result === '1-0') userResult = userColor === 'w' ? 'win' : 'loss';
    else if (game.result === '0-1') userResult = userColor === 'b' ? 'win' : 'loss';
  }
  return { ...game, userColor, userResult };
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Request failed (${res.status}) for ${url}`);
  return res.json();
}

// chess.com — most recent `count` games for a username.
export async function fetchChessComGames(username, count = 12) {
  const user = username.trim().toLowerCase();
  if (!user) throw new Error('Enter a chess.com username.');
  const arch = await getJson(`https://api.chess.com/pub/player/${user}/games/archives`);
  const urls = arch.archives || [];
  if (!urls.length) throw new Error('No games found for that chess.com user.');
  const games = [];
  for (let i = urls.length - 1; i >= 0 && games.length < count; i--) {
    const month = await getJson(urls[i]);
    const monthGames = (month.games || []).reverse();
    for (const g of monthGames) {
      if (!g.pgn) continue;
      const base = {
        ...pgnMeta(g.pgn),
        white: g.white?.username || 'White',
        black: g.black?.username || 'Black',
        whiteElo: g.white?.rating ? String(g.white.rating) : '',
        blackElo: g.black?.rating ? String(g.black.rating) : '',
        result: g.white?.result === 'win' ? '1-0' : g.black?.result === 'win' ? '0-1' : '1/2-1/2',
        timeClass: g.time_class || '',
        timeControl: g.time_control || '',
        url: g.url || '',
        source: 'chess.com',
      };
      games.push(withUserView(base, user));
      if (games.length >= count) break;
    }
  }
  return games;
}

// lichess — most recent `count` games for a username.
export async function fetchLichessGames(username, count = 12) {
  const user = username.trim();
  if (!user) throw new Error('Enter a lichess username.');
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(user)}?max=${count}&opening=true&clocks=false&evals=false`;
  const res = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' } });
  if (!res.ok) throw new Error(`lichess request failed (${res.status}).`);
  const text = await res.text();
  return splitPgns(text).map((pgn) => {
    const base = { ...pgnMeta(pgn), timeClass: guessLichessTimeClass(pgn), source: 'lichess' };
    return withUserView(base, user);
  });
}

// lichess PGN Event tag usually reads e.g. "Rated Blitz game".
function guessLichessTimeClass(pgn) {
  const ev = tagOf(pgn, 'Event').toLowerCase();
  if (ev.includes('bullet')) return 'bullet';
  if (ev.includes('blitz')) return 'blitz';
  if (ev.includes('rapid')) return 'rapid';
  if (ev.includes('classical') || ev.includes('correspondence')) return 'daily';
  return '';
}
