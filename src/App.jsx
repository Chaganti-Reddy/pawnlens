import { useEffect, useRef, useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Engine } from './engine/engine.js';
import { analyzeGame } from './lib/analyze.js';
import { fetchChessComGames, fetchLichessGames, splitPgns, pgnMeta } from './lib/fetchGames.js';
import { summarize, addToHistory, loadHistory, aggregateWeaknesses, clearHistory } from './lib/storage.js';
import { getRecents, addRecent, removeRecent } from './lib/recents.js';
import { TAGS } from './lib/classify.js';
import EvalBar from './components/EvalBar.jsx';
import MoveList from './components/MoveList.jsx';
import Dashboard from './components/Dashboard.jsx';
import GameCard from './components/GameCard.jsx';
import { SourceMark } from './components/icons.jsx';
import Logo from './components/Logo.jsx';
import './App.css';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const DEPTHS = [
  { label: 'Fast', value: 8 },
  { label: 'Balanced', value: 12 },
  { label: 'Deep', value: 16 },
];
const BATCH_DEPTH = 8;

const SOURCE_LABEL = { chesscom: 'chess.com', lichess: 'lichess', pgn: 'PGN' };

export default function App() {
  const engineRef = useRef(null);
  const [tab, setTab] = useState('chesscom');
  const [username, setUsername] = useState('');
  const [pgnText, setPgnText] = useState('');
  const [depth, setDepth] = useState(12);
  const [games, setGames] = useState([]);
  const [lastQuery, setLastQuery] = useState(''); // searched username, for auto-side + dashboard
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recents, setRecents] = useState(getRecents('chesscom'));

  const [engineStatus, setEngineStatus] = useState('loading'); // loading|ready
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [batch, setBatch] = useState(null); // {i, n} while batch running
  const [analysis, setAnalysis] = useState(null);
  const [focusColor, setFocusColor] = useState('w');
  const [selectedPly, setSelectedPly] = useState(-1);
  const [view, setView] = useState('input');

  const [history, setHistory] = useState(loadHistory());
  const [dashName, setDashName] = useState('');

  // Warm the engine in the background as soon as the app loads.
  const ensureEngine = useCallback(async () => {
    const eng = engineRef.current || (engineRef.current = new Engine());
    await eng.init();
    return eng;
  }, []);
  useEffect(() => {
    let alive = true;
    ensureEngine().then(() => alive && setEngineStatus('ready')).catch(() => {});
    return () => { alive = false; };
  }, [ensureEngine]);

  // ---- tabs ----
  const switchTab = (t) => {
    setTab(t);
    setGames([]);
    setError('');
    setUsername('');
    setRecents(getRecents(t));
  };

  // ---- data loading ----
  const doFetch = useCallback(
    async (overrideName) => {
      const name = (overrideName ?? username).trim();
      if (overrideName != null) setUsername(overrideName);
      setError('');
      setBusy(true);
      setGames([]);
      try {
        if (tab === 'pgn') {
          const list = splitPgns(pgnText).map(pgnMeta);
          if (!list.length) throw new Error('Paste a valid PGN first.');
          setGames(list.map((g) => ({ ...g, source: 'pgn' })));
          setLastQuery('');
        } else {
          const fetcher = tab === 'chesscom' ? fetchChessComGames : fetchLichessGames;
          const list = await fetcher(name, 12);
          setGames(list);
          setLastQuery(name);
          setRecents(addRecent(tab, name));
        }
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setBusy(false);
      }
    },
    [tab, username, pgnText]
  );

  // ---- single-game analysis ----
  const runAnalysis = useCallback(
    async (game, color) => {
      setError('');
      const side = color || game.userColor || 'w';
      setFocusColor(side);
      setView('review');
      setBatch(null);
      try {
        setEngineStatus('loading');
        const eng = await ensureEngine();
        setEngineStatus('ready');
        setProgress({ done: 0, total: 1 });
        setAnalysis(null);
        const res = await analyzeGame(game.pgn, {
          engine: eng,
          depth,
          onProgress: (done, total) => setProgress({ done, total }),
        });
        res.game = game;
        setAnalysis(res);
        const firstBad = res.moves.find((m) => m.color === side && m.tagKind === 'bad');
        setSelectedPly(firstBad ? firstBad.ply : res.moves.length - 1);
        setHistory(addToHistory(summarize(game, res, side)));
      } catch (e) {
        setError(e.message || String(e));
      }
    },
    [depth, ensureEngine]
  );

  // ---- batch analysis (all fetched games) ----
  const runBatch = useCallback(async () => {
    if (!games.length) return;
    setError('');
    setView('dashboard');
    try {
      const eng = await ensureEngine();
      const n = games.length;
      for (let i = 0; i < n; i++) {
        const g = games[i];
        const side = g.userColor || 'w';
        setBatch({ i: i + 1, n });
        setProgress({ done: 0, total: 1 });
        const res = await analyzeGame(g.pgn, {
          engine: eng,
          depth: BATCH_DEPTH,
          onProgress: (done, total) => setProgress({ done, total }),
        });
        setHistory(addToHistory(summarize(g, res, side)));
      }
      setBatch(null);
      if (lastQuery) setDashName(lastQuery);
    } catch (e) {
      setError(e.message || String(e));
      setBatch(null);
    }
  }, [games, ensureEngine, lastQuery]);

  // ---- navigation ----
  const total = analysis?.moves.length ?? 0;
  const go = useCallback((ply) => setSelectedPly(Math.max(-1, Math.min(total - 1, ply))), [total]);
  useEffect(() => {
    if (view !== 'review') return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(selectedPly - 1);
      else if (e.key === 'ArrowRight') go(selectedPly + 1);
      else if (e.key === 'Home') go(-1);
      else if (e.key === 'End') go(total - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, selectedPly, total, go]);

  const node = selectedPly >= 0 && analysis ? analysis.moves[selectedPly] : null;
  const fen = node ? node.fenAfter : START_FEN;
  const evalWhite = node ? node.cpAfterMover : { cp: 0 };

  const arrows = [];
  const squareStyles = {};
  if (node) {
    arrows.push({ startSquare: node.from, endSquare: node.to, color: 'rgba(255,255,255,0.30)' });
    squareStyles[node.from] = { background: 'rgba(230,193,75,0.28)' };
    squareStyles[node.to] = { background: 'rgba(230,193,75,0.40)' };
    if (node.tagKind === 'bad' && node.bestUci?.length >= 4) {
      arrows.push({ startSquare: node.bestUci.slice(0, 2), endSquare: node.bestUci.slice(2, 4), color: '#26c2a3' });
    }
  }
  const boardOptions = {
    id: 'review',
    position: fen,
    boardOrientation: focusColor === 'w' ? 'white' : 'black',
    arrows,
    squareStyles,
    allowDragging: false,
    showNotation: true,
    darkSquareStyle: { backgroundColor: '#6b8f5e' },
    lightSquareStyle: { backgroundColor: '#e9edcc' },
  };

  const weakness = dashName ? aggregateWeaknesses(dashName) : null;
  const loadingPct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const analyzing = view === 'review' && (!analysis || progress.done < progress.total);
  const knownNames = [...new Set(history.map((h) => h.focusName))].filter(Boolean);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => setView('input')}>
          <Logo size={30} />
          <span className="brand-name">PawnLens</span>
          <span className="tagline">free unlimited game review</span>
        </div>
        <nav className="topnav">
          <button className={view === 'input' ? 'on' : ''} onClick={() => setView('input')}>New review</button>
          <button className={view === 'review' ? 'on' : ''} onClick={() => analysis && setView('review')} disabled={!analysis}>Review</button>
          <button className={view === 'dashboard' ? 'on' : ''} onClick={() => setView('dashboard')}>My weaknesses</button>
          <span className={`engine-dot ${engineStatus}`} title={engineStatus === 'ready' ? 'Engine ready' : 'Loading engine…'} />
        </nav>
      </header>

      {error && <div className="banner error">{error}</div>}

      {view === 'input' && (
        <main className="input-view">
          <div className="tabs">
            {['chesscom', 'lichess', 'pgn'].map((t) => (
              <button key={t} className={tab === t ? 'on' : ''} onClick={() => switchTab(t)}>
                {t !== 'pgn' && <SourceMark source={SOURCE_LABEL[t]} />}
                {t === 'chesscom' ? 'chess.com' : t === 'lichess' ? 'lichess' : 'Paste PGN'}
              </button>
            ))}
          </div>

          <div className="input-row">
            {tab === 'pgn' ? (
              <textarea className="pgn-input" placeholder="Paste one or more PGNs here…" value={pgnText} onChange={(e) => setPgnText(e.target.value)} />
            ) : (
              <input
                className="user-input"
                placeholder={`${SOURCE_LABEL[tab]} username`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doFetch()}
                autoFocus
              />
            )}
            <button className="primary" onClick={() => doFetch()} disabled={busy}>
              {busy ? 'Loading…' : tab === 'pgn' ? 'Load PGN' : 'Get games'}
            </button>
          </div>

          {tab !== 'pgn' && recents.length > 0 && (
            <div className="recents">
              <span className="recents-label">Recent:</span>
              {recents.map((n) => (
                <span className="pill" key={n}>
                  <button className="pill-main" onClick={() => doFetch(n)}>{n}</button>
                  <button className="pill-x" onClick={() => setRecents(removeRecent(tab, n))} title="Remove">×</button>
                </span>
              ))}
            </div>
          )}

          {games.length > 0 && (
            <>
              {lastQuery && (
                <div className="batch-bar">
                  <span>{games.length} games loaded for <b>{lastQuery}</b></span>
                  <button className="primary sm" onClick={runBatch}>Analyze all → find my weaknesses</button>
                </div>
              )}
              <div className="picker">
                {games.map((g, i) => (
                  <GameCard key={i} game={g} focusName={lastQuery} onReview={() => runAnalysis(g)} />
                ))}
              </div>
            </>
          )}

          <div className="depth-row">
            <span className="depth-label">Engine depth</span>
            <div className="depth-pick">
              {DEPTHS.map((d) => (
                <button key={d.value} className={depth === d.value ? 'on' : ''} onClick={() => setDepth(d.value)}>{d.label}</button>
              ))}
            </div>
          </div>

          <p className="footnote">
            Runs Stockfish 18 in your browser — nothing uploaded, no limits, no login.
            First run downloads the ~7&nbsp;MB engine once, then it's cached.
            <br />
            Not affiliated with chess.com or lichess.
          </p>
        </main>
      )}

      {view === 'review' && (
        <main className="review-view">
          <div className="board-col">
            {analysis && (
              <div className="game-head">
                <span className="gh-players">{analysis.game.white} vs {analysis.game.black}</span>
                {analysis.game.opening && <span className="gh-opening">{analysis.game.opening}</span>}
              </div>
            )}
            <div className="board-wrap">
              <EvalBar evalWhite={evalWhite} orientation={focusColor === 'w' ? 'white' : 'black'} />
              <div className="board"><Chessboard options={boardOptions} /></div>
            </div>
            <div className="nav">
              <button onClick={() => go(-1)} title="Start (Home)">⏮</button>
              <button onClick={() => go(selectedPly - 1)} title="Prev (←)">◀</button>
              <button onClick={() => go(selectedPly + 1)} title="Next (→)">▶</button>
              <button onClick={() => go(total - 1)} title="End (End)">⏭</button>
            </div>
          </div>

          <div className="side-col">
            {analyzing ? (
              <div className="loading">
                <div className="spinner" />
                <p>{engineStatus === 'loading' ? 'Loading engine…' : `Analyzing… ${loadingPct}%`}</p>
                <div className="progress"><div className="progress-fill" style={{ width: `${loadingPct}%` }} /></div>
              </div>
            ) : analysis ? (
              <>
                <div className="acc-cards">
                  <div className={`acc ${focusColor === 'w' ? 'focus' : ''}`}>
                    <div className="acc-val">{analysis.accuracyWhite.toFixed(1)}%</div>
                    <div className="acc-lbl">♔ {analysis.game.white}</div>
                  </div>
                  <div className={`acc ${focusColor === 'b' ? 'focus' : ''}`}>
                    <div className="acc-val">{analysis.accuracyBlack.toFixed(1)}%</div>
                    <div className="acc-lbl">♚ {analysis.game.black}</div>
                  </div>
                </div>

                <div className="tag-legend">
                  {Object.entries(analysis.counts[focusColor] || {}).map(([t, n]) => (
                    <span className="chip" key={t} style={{ borderColor: TAGS[t]?.color }}>
                      <span className="chip-dot" style={{ background: TAGS[t]?.color }} />
                      {TAGS[t]?.label} {n}
                    </span>
                  ))}
                </div>

                {node && (
                  <div className="coach" style={{ borderColor: node.tagColor }}>
                    <div className="coach-head">
                      <span className="coach-move">{node.moveNumber}{node.color === 'w' ? '.' : '…'} {node.san}</span>
                      <span className="coach-tag" style={{ background: node.tagColor }}>{node.tagLabel} {node.tagSymbol}</span>
                    </div>
                    <p className="coach-text">{node.note}</p>
                  </div>
                )}

                <MoveList moves={analysis.moves} selectedPly={selectedPly} onSelect={go} />

                <div className="re-analyze">
                  <button onClick={() => runAnalysis(analysis.game, focusColor === 'w' ? 'b' : 'w')}>
                    Analyze from {focusColor === 'w' ? 'Black' : 'White'}'s side
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </main>
      )}

      {view === 'dashboard' && (
        <main className="dash-view">
          {batch ? (
            <div className="loading">
              <div className="spinner" />
              <p>Analyzing game {batch.i} of {batch.n}… {loadingPct}%</p>
              <div className="progress"><div className="progress-fill" style={{ width: `${((batch.i - 1 + loadingPct / 100) / batch.n) * 100}%` }} /></div>
            </div>
          ) : (
            <>
              <div className="dash-controls">
                <input placeholder="Your username" value={dashName} onChange={(e) => setDashName(e.target.value)} />
                <div className="known-names">
                  {knownNames.slice(0, 8).map((n) => (
                    <button key={n} className={dashName === n ? 'on' : ''} onClick={() => setDashName(n)}>{n}</button>
                  ))}
                </div>
                <button className="ghost" onClick={() => { clearHistory(); setHistory([]); }} title="Delete all locally-stored games">
                  Clear ({history.length})
                </button>
              </div>
              <Dashboard data={weakness} playerName={dashName} />
            </>
          )}
        </main>
      )}
    </div>
  );
}
