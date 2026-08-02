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

  const [engineStatus, setEngineStatus] = useState('loading');
  const [source, setSource] = useState('chesscom');
  const [games, setGames] = useState([]);
  const [lastQuery, setLastQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [depth, setDepth] = useState(14);
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
    setError('');
    setFocusColor(side);
    setAnalysis(null);
    setSelectedPly(-1);
    setBatch(null);
    setProgress({ done: 0, total: 1 });
    setEngineStatus('loading');
    navigate(game.gameId ? `/review/${game.gameId}` : '/review');
    try {
      const eng = await ensureEngine();
      setEngineStatus('ready');
      const res = await analyzeGame(game.pgn, { engine: eng, depth, onProgress: (d, t) => setProgress({ done: d, total: t }) });
      res.game = game;
      setAnalysis(res);
      setSelectedPly(-1); // open at the starting position
      setHistory(addToHistory(summarize(game, res, side)));
    } catch (e) {
      setError(e.message || String(e));
    }
  }, [depth, ensureEngine, navigate]);

  // Analyze a raw PGN (used by shared links + weakness "review this"). Does not navigate.
  const runAnalysisFromPgn = useCallback(async (pgn, side, targetPly) => {
    const game = { ...pgnMeta(pgn), source: 'shared' };
    const color = side || game.userColor || 'w';
    setError('');
    setFocusColor(color);
    setAnalysis(null);
    setSelectedPly(-1);
    setBatch(null);
    setProgress({ done: 0, total: 1 });
    setEngineStatus('loading');
    try {
      const eng = await ensureEngine();
      setEngineStatus('ready');
      const res = await analyzeGame(pgn, { engine: eng, depth, onProgress: (d, t) => setProgress({ done: d, total: t }) });
      res.game = game;
      setAnalysis(res);
      setSelectedPly(targetPly != null ? targetPly : -1);
    } catch (e) {
      setError(e.message || String(e));
    }
  }, [depth, ensureEngine]);

  // Jump straight from a weakness instance into a review at that exact move.
  const reviewStoredMove = useCallback((inst) => {
    if (!inst?.pgn) return;
    navigate('/review');
    runAnalysisFromPgn(inst.pgn, inst.color, inst.ply);
  }, [navigate, runAnalysisFromPgn]);

  const runBatch = useCallback(async (list) => {
    const items = list && list.length ? list : games;
    if (!items.length) return;
    setError('');
    const user = lastQuery;
    navigate(`/weaknesses${user ? `?u=${encodeURIComponent(user)}` : ''}`);
    try {
      const eng = await ensureEngine();
      const n = items.length;
      for (let i = 0; i < n; i++) {
        setBatch({ i: i + 1, n });
        setProgress({ done: 0, total: 1 });
        const g = items[i];
        const res = await analyzeGame(g.pgn, { engine: eng, depth: BATCH_DEPTH, onProgress: (d, t) => setProgress({ done: d, total: t }) });
        setHistory(addToHistory(summarize(g, res, g.userColor || 'w')));
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBatch(null);
    }
  }, [games, lastQuery, ensureEngine, navigate]);

  const value = {
    engineStatus, source, games, lastQuery, busy, error, setError,
    depth, setDepth, progress, batch, analysis, focusColor, setFocusColor,
    selectedPly, setSelectedPly, history, setHistory,
    boardThemeKey, changeBoardTheme, pieceSetKey, changePieceSet,
    fetchGames, loadPgnText, runAnalysis, runAnalysisFromPgn, reviewStoredMove, runBatch, getTopMoves,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
