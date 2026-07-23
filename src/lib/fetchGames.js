// Fetch games from public, CORS-open APIs. No server, no API key, no scraping of paywalled data.
// chess.com: https://www.chess.com/news/view/published-data-api
// lichess:   https://lichess.org/api
import i18n from '../i18n.js';

const t = (k, o) => i18n.t(k, o);

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

function openingFromEcoUrl(url) {
  if (!url) return '';
  const slug = url.split('/openings/')[1];
  if (!slug) return '';
  return decodeURIComponent(slug).replace(/-/g, ' ').replace(/\.{3}.*$/, '').replace(/\s+\d.*$/, '').trim();
}

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

// Fetch JSON with human-friendly errors keyed to the platform + username.
async function getJson(url, ctx) {
  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new Error(t('errors.network'));
  }
  if (res.status === 404) throw new Error(ctx.notFound);
  if (res.status === 429) throw new Error(t('errors.rateLimited'));
  if (res.status >= 500) throw new Error(t('errors.serverTrouble', { site: ctx.site }));
  if (!res.ok) throw new Error(t('errors.requestFailed', { site: ctx.site, status: res.status }));
  return res.json();
}

export async function fetchChessComGames(username, count = 20) {
  const user = username.trim().toLowerCase();
  const site = 'chess.com';
  if (!user) throw new Error(t('errors.typeUser', { site }));
  const ctx = { site, notFound: t('errors.notFound', { site, name: username.trim() }) };
  const arch = await getJson(`https://api.chess.com/pub/player/${user}/games/archives`, ctx);
  const urls = arch.archives || [];
  if (!urls.length) throw new Error(t('errors.noGames', { site, name: username.trim() }));
  const games = [];
  for (let i = urls.length - 1; i >= 0 && games.length < count; i--) {
    const month = await getJson(urls[i], ctx);
    for (const g of (month.games || []).reverse()) {
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
  if (!games.length) throw new Error(t('errors.noRecent', { name: username.trim() }));
  return games;
}

export async function fetchLichessGames(username, count = 20) {
  const user = username.trim();
  const site = 'lichess';
  if (!user) throw new Error(t('errors.typeUser', { site }));
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(user)}?max=${count}&opening=true&clocks=false&evals=false`;
  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' } });
  } catch {
    throw new Error(t('errors.networkLichess'));
  }
  if (res.status === 404) throw new Error(t('errors.notFound', { site, name: user }));
  if (res.status === 429) throw new Error(t('errors.rateLimitedLichess'));
  if (!res.ok) throw new Error(t('errors.requestFailed', { site, status: res.status }));
  const text = await res.text();
  const list = splitPgns(text);
  if (!list.length) throw new Error(t('errors.noGames', { site, name: user }));
  return list.map((pgn) => withUserView({ ...pgnMeta(pgn), timeClass: guessLichessTimeClass(pgn), source: 'lichess' }, user));
}

function guessLichessTimeClass(pgn) {
  const ev = tagOf(pgn, 'Event').toLowerCase();
  if (ev.includes('bullet')) return 'bullet';
  if (ev.includes('blitz')) return 'blitz';
  if (ev.includes('rapid')) return 'rapid';
  if (ev.includes('classical') || ev.includes('correspondence')) return 'daily';
  return '';
}
