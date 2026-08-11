import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Engine } from '../engine/engine.js';
import { analyzeGame } from '../lib/analyze.js';
import { fetchChessComGames, fetchLichessGames, splitPgns, pgnMeta } from '../lib/fetchGames.js';
import { summarize, addToHistory, loadHistory } from '../lib/storage.js';
import { addRecent, setMe } from '../lib/recents.js';
import { applyTheme, getTheme, getBoardTheme, setBoardTheme, getPieceSet, setPieceSet } from '../lib/theme.js';
import i18n from '../i18n.js';

const Ctx = createContext(null);
export const useReviewer = () => useContext(Ctx);

const BATCH_DEPTH = 8;

export function ReviewerProvider({ children }) {
  const navigate = useNavigate();
  const engineRef = useRef(null);
  const runIdRef = useRef(0);
  // Per-session cache of full analyses, keyed by pgn+depth, so re-reviewing the
  // same game (or opening it from history) is instant instead of re-running the engine.
  const cacheRef = useRef(new Map());

  const [engineStatus, setEngineStatus] = useState('loading');
  const [source, setSource] = useState('chesscom');
  const [games, setGames] = useState([]);
  const [lastQuery, setLastQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchCount, setFetchCount] = useState(0);
  const [error, setError] = useState('');

  const [depth, setDepth] = useState(18);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [batch, setBatch] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [focusColor, setFocusColor] = useState('w');
  const [selectedPly, setSelectedPly] = useState(-1);

  const [history, setHistory] = useState(loadHistory());
  const [boardThemeKey, setBoardThemeKey] = useState(getBoardTheme());
  const changeBoardTheme = useCallback((key) => { setBoardTheme(key); setBoardThemeKey(key); }, []);
  const [pieceSetKey, setPieceSetKey] = useState(getPieceSet());
  const changePieceSet = useCallback((key) => { setPieceSet(key); setPieceSetKey(key); }, []);

  const ensureEngine = useCallback(async () => {
    const eng = engineRef.current || (engineRef.current = new Engine());
    await eng.init();
    return eng;
  }, []);

  // Analyze a pgn at the current depth, reusing a cached result when we've already
  // done this exact (pgn, depth) pair. onProgress still fires (instantly) for cache hits.
  const analyzeCached = useCallback(async (pgn, d, onProgress) => {
    const key = `${d}|${pgn}`;
    const hit = cacheRef.current.get(key);
    if (hit) { onProgress?.(1, 1); return hit; }
    const eng = await ensureEngine();
    const res = await analyzeGame(pgn, { engine: eng, depth: d, onProgress });
    cacheRef.current.set(key, res);
    return res;
  }, [ensureEngine]);
  useEffect(() => {
    applyTheme(getTheme());
    let alive = true;
    ensureEngine().then(() => alive && setEngineStatus('ready')).catch(() => {});
    return () => { alive = false; };
  }, [ensureEngine]);

  // Lazy: top N engine moves for a single position (for the review "engine lines").
  const getTopMoves = useCallback(async (fen, n = 3, d = 12) => {
    const eng = await ensureEngine();
    const r = await eng.analyze(fen, { depth: d, multipv: n });
    return r.lines;
  }, [ensureEngine]);

  const fetchGames = useCallback(async (src, name, count = 20) => {
    setError('');
    setBusy(true);
    setGames([]);
    setSource(src);
    setFetchCount(count);
    try {
      const fetcher = src === 'chesscom' ? fetchChessComGames : fetchLichessGames;
      const list = await fetcher(name, count);
      setGames(list);
      setLastQuery(name.trim());
      addRecent(src, name.trim());
      setMe(name.trim()); // the username you search is "you"
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  // Fetch a larger batch of the same user's games (keeps what's shown until the
  // bigger list arrives, so there's no flash of an empty list).
  const loadMoreGames = useCallback(async () => {
    if (source === 'pgn' || !lastQuery || loadingMore) return;
    setLoadingMore(true);
    const next = fetchCount + 25;
    try {
      const fetcher = source === 'chesscom' ? fetchChessComGames : fetchLichessGames;
      const list = await fetcher(lastQuery, next);
      setGames(list);
      setFetchCount(next);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoadingMore(false);
    }
  }, [source, lastQuery, fetchCount, loadingMore]);

  const loadPgnText = useCallback((text) => {
    setError('');
    const list = splitPgns(text).map((p) => ({ ...pgnMeta(p), source: 'pgn' }));
    if (!list.length) { setError(i18n.t('home.errorPgn')); return; }
    setGames(list);
    setLastQuery('');
    setSource('pgn');
  }, []);

  const runAnalysis = useCallback(async (game, color) => {
    const side = color || game.userColor || 'w';
    const myRun = ++runIdRef.current; // supersede any in-flight analysis
    setError('');
    setFocusColor(side);
    setAnalysis(null);
    setSelectedPly(-1);
    setBatch(null);
    setProgress({ done: 0, total: 1 });
    setEngineStatus('loading');
    navigate(game.gameId ? `/review/${game.gameId}` : '/review');
    try {
      await ensureEngine();
      if (runIdRef.current !== myRun) return;
      setEngineStatus('ready');
      const res = await analyzeCached(game.pgn, depth, (d, t) => { if (runIdRef.current === myRun) setProgress({ done: d, total: t }); });
      if (runIdRef.current !== myRun) return; // a newer run replaced this one
      res.game = game;
      setAnalysis(res);
      setSelectedPly(-1); // open at the starting position
      setHistory(addToHistory(summarize(game, res, side)));
    } catch (e) {
      if (runIdRef.current === myRun) setError(e.message || String(e));
    }
  }, [depth, ensureEngine, analyzeCached, navigate]);

  // Analyze a raw PGN (used by shared links + weakness "review this"). Does not navigate.
  const runAnalysisFromPgn = useCallback(async (pgn, side, targetPly) => {
    const game = { ...pgnMeta(pgn), source: 'shared' };
    const color = side || game.userColor || 'w';
    const myRun = ++runIdRef.current;
    setError('');
    setFocusColor(color);
    setAnalysis(null);
    setSelectedPly(-1);
    setBatch(null);
    setProgress({ done: 0, total: 1 });
    setEngineStatus('loading');
    try {
      await ensureEngine();
      if (runIdRef.current !== myRun) return;
      setEngineStatus('ready');
      const res = await analyzeCached(pgn, depth, (d, t) => { if (runIdRef.current === myRun) setProgress({ done: d, total: t }); });
      if (runIdRef.current !== myRun) return;
      res.game = game;
      setAnalysis(res);
      setSelectedPly(targetPly != null ? targetPly : -1);
    } catch (e) {
      setError(e.message || String(e));
    }
  }, [depth, ensureEngine, analyzeCached]);

  // Jump straight from a weakness instance into a review at that exact move.
  const reviewStoredMove = useCallback((inst) => {
    if (!inst?.pgn) return;
    navigate('/review');
    runAnalysisFromPgn(inst.pgn, inst.color, inst.ply);
  }, [navigate, runAnalysisFromPgn]);

  const runBatch = useCallback(async (list) => {
    const items = list && list.length ? list : games;
    if (!items.length) return;
    const myRun = ++runIdRef.current; // supersede any single-game analysis
    setError('');
    const user = lastQuery;
    navigate(`/weaknesses${user ? `?u=${encodeURIComponent(user)}` : ''}`);
    try {
      await ensureEngine();
      const n = items.length;
      for (let i = 0; i < n; i++) {
        if (runIdRef.current !== myRun) return; // superseded
        setBatch({ i: i + 1, n });
        setProgress({ done: 0, total: 1 });
        const g = items[i];
        const res = await analyzeCached(g.pgn, BATCH_DEPTH, (d, t) => { if (runIdRef.current === myRun) setProgress({ done: d, total: t }); });
        setHistory(addToHistory(summarize(g, res, g.userColor || 'w')));
      }
    } catch (e) {
      if (runIdRef.current === myRun) setError(e.message || String(e));
    } finally {
      if (runIdRef.current === myRun) setBatch(null);
    }
  }, [games, lastQuery, ensureEngine, analyzeCached, navigate]);

  const value = {
    engineStatus, source, games, lastQuery, busy, error, setError,
    loadingMore, fetchCount, loadMoreGames,
    depth, setDepth, progress, batch, analysis, focusColor, setFocusColor,
    selectedPly, setSelectedPly, history, setHistory,
    boardThemeKey, changeBoardTheme, pieceSetKey, changePieceSet,
    fetchGames, loadPgnText, runAnalysis, runAnalysisFromPgn, reviewStoredMove, runBatch, getTopMoves,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
