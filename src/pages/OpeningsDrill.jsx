import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useReviewer } from '../context/ReviewerContext.jsx';
import { BOARD_THEMES, getHints } from '../lib/theme.js';
import { piecesFor } from '../lib/pieces.jsx';
import { playMove } from '../lib/sound.js';
import { loadHistory } from '../lib/storage.js';
import { FaBook, FaCircleXmark, FaCircleCheck, FaArrowLeftLong, FaMagnifyingGlass, FaLightbulb } from '../ui/icons.js';

const DOT = 'radial-gradient(circle, rgba(0,0,0,0.28) 20%, transparent 22%)';

const POPULAR = [
  'Ruy Lopez', 'Italian Game', 'Sicilian Defense', 'French Defense', 'Caro-Kann Defense',
  "Queen's Gambit", 'King’s Indian Defense', 'English Opening', 'London System',
  'Scandinavian Defense', 'Vienna Game', 'Nimzo-Indian Defense',
];

// SAN move list for an opening's PGN.
function movesOf(pgn) {
  try { const c = new Chess(); c.loadPgn(pgn); return c.history(); } catch { return []; }
}

function OpeningRunner({ opening, boardKey, pieceSetKey, userSide, onExit, t }) {
  const board = BOARD_THEMES[boardKey];
  const moves = useMemo(() => movesOf(opening.pgn), [opening]);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState('play'); // play | wrong | done
  const [hint, setHint] = useState(false);
  const [hintSquares, setHintSquares] = useState({});

  const fenAt = (n) => { const c = new Chess(); for (let i = 0; i < n; i++) c.move(moves[i]); return c.fen(); };
  const fen = fenAt(idx);
  const done = idx >= moves.length;
  const myTurn = !done && (idx % 2 === 0 ? 'w' : 'b') === userSide;

  // The bot plays the opponent's book move automatically.
  useEffect(() => {
    if (done || myTurn) return;
    const id = setTimeout(() => { playMove(); setIdx((n) => n + 1); }, 500);
    return () => clearTimeout(id);
  }, [idx, done, myTurn]);

  useEffect(() => { if (done) setStatus('done'); }, [done]);

  const onSquareClick = ({ square }) => {
    if (!getHints() || !myTurn) { setHintSquares({}); return; }
    try {
      const c = new Chess(fen);
      const p = c.get(square);
      if (!p || p.color !== userSide) { setHintSquares({}); return; }
      const styles = {};
      for (const m of c.moves({ square, verbose: true })) styles[m.to] = { background: DOT };
      setHintSquares(styles);
    } catch { setHintSquares({}); }
  };

  const onDrop = ({ sourceSquare, targetSquare }) => {
    setHintSquares({});
    if (done || !myTurn) return false;
    let mv;
    try { const c = new Chess(fen); mv = c.move({ from: sourceSquare, to: targetSquare, promotion: 'q' }); } catch { return false; }
    if (!mv) return false;
    if (mv.san === moves[idx]) {
      playMove(!!mv.captured);
      setIdx((n) => n + 1); setHint(false);
    } else {
      setStatus('wrong');
      setTimeout(() => setStatus('play'), 800);
    }
    return false;
  };

  const options = {
    id: 'openings', position: fen, boardOrientation: userSide === 'b' ? 'black' : 'white',
    allowDragging: myTurn, showNotation: true, showAnimations: true, onPieceDrop: onDrop,
    squareStyles: hintSquares, onSquareClick, pieces: piecesFor(pieceSetKey),
    darkSquareStyle: { backgroundColor: board.dark }, lightSquareStyle: { backgroundColor: board.light },
  };

  return (
    <main className="review-view three-col openings-drill">
      <aside className="col-current">
        <button className="back-btn" onClick={onExit}><FaArrowLeftLong /> {t('openings.back')}</button>
        <div className="col-title"><FaBook /> {opening.eco} · {opening.name}</div>
        <p className="muted">{t('openings.playLine')}</p>
        <div className="opening-progress">{t('openings.moveOf', { n: Math.min(idx + 1, moves.length), total: moves.length })}</div>
        {status === 'wrong' && <div className="train-feedback bad"><FaCircleXmark /> {t('openings.wrongMove')}</div>}
        {status === 'done' && <div className="train-feedback ok"><FaCircleCheck /> {t('openings.correctLine')}</div>}
        {status !== 'done' && (
          <button className="ghost" onClick={() => setHint(true)}><FaLightbulb /> {t('openings.showNext')}</button>
        )}
        {hint && status !== 'done' && <div className="opening-hint">{t('openings.nextIs', { move: moves[idx] })}</div>}
      </aside>

      <div className="col-board">
        <div className="board-wrap"><div className="board"><Chessboard options={options} /></div></div>
        <div className="nav"><button className="primary" onClick={() => { setIdx(0); setStatus('play'); setHint(false); }}>{t('openings.restart')}</button></div>
      </div>

      <aside className="col-full">
        <div className="col-title">{t('openings.line')}</div>
        <div className="movelist"><div className="ol-line">
          {moves.map((san, i) => (
            <span className={`bl-move ${i < idx ? 'done' : ''}`} key={i}>{i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}{san}</span>
          ))}
        </div></div>
      </aside>
    </main>
  );
}

export default function OpeningsDrill() {
  const { t } = useTranslation();
  const { boardThemeKey, pieceSetKey } = useReviewer();
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState(null);
  const [side, setSide] = useState('w');
  const [openings, setOpenings] = useState(null);

  useEffect(() => { import('../data/openings.json').then((m) => setOpenings(m.default)); }, []);

  // Openings the user actually plays (from their analyzed games), matched into the book.
  const mine = useMemo(() => {
    if (!openings) return [];
    const names = new Set(loadHistory().map((g) => (g.opening || '').toLowerCase()).filter(Boolean));
    if (!names.size) return [];
    return openings.filter((o) => [...names].some((n) => o.name.toLowerCase().includes(n) || n.includes(o.name.toLowerCase()))).slice(0, 12);
  }, [openings]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !openings) return [];
    return openings.filter((o) => o.name.toLowerCase().includes(q) || o.eco.toLowerCase() === q).slice(0, 40);
  }, [query, openings]);

  // Popular openings to suggest before any search (shortest/mainline match per name).
  const popular = useMemo(() => {
    if (!openings) return [];
    return POPULAR.map((name) => {
      const matches = openings.filter((o) => o.name.toLowerCase().startsWith(name.toLowerCase()));
      return matches.sort((a, b) => a.pgn.length - b.pgn.length)[0];
    }).filter(Boolean);
  }, [openings]);

  if (chosen) return <OpeningRunner opening={chosen} boardKey={boardThemeKey} pieceSetKey={pieceSetKey} userSide={side} onExit={() => setChosen(null)} t={t} />;

  const random = () => openings && setChosen(openings[Math.floor(Math.random() * openings.length)]);

  return (
    <main className="drills-view">
      <h2><FaBook /> {t('openings.title')}</h2>
      <p className="muted">{t('openings.sub2', { count: openings ? openings.length : '…' })}</p>

      <div className="input-row">
        <input
          className="user-input"
          placeholder={t('openings.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
          autoFocus
        />
        <button className="primary" onClick={random}><FaMagnifyingGlass /> {t('openings.random')}</button>
      </div>

      <div className="side-choice">
        <span className="muted">{t('openings.playAs')}</span>
        <button className={side === 'w' ? 'on' : ''} onClick={() => setSide('w')}>{t('review.sideWhite')}</button>
        <button className={side === 'b' ? 'on' : ''} onClick={() => setSide('b')}>{t('review.sideBlack')}</button>
      </div>

      {!query && mine.length > 0 && (
        <>
          <h3 className="op-section">{t('openings.fromGames')}</h3>
          <div className="op-list">
            {mine.map((o, i) => (
              <button className="op-item" key={i} onClick={() => setChosen(o)}>
                <span className="op-eco">{o.eco}</span><span className="op-nm">{o.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!query && (
        <>
          <h3 className="op-section">{t('openings.popular')}</h3>
          <div className="op-list">
            {popular.map((o, i) => (
              <button className="op-item" key={i} onClick={() => setChosen(o)}>
                <span className="op-eco">{o.eco}</span><span className="op-nm">{o.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {query && (
        <div className="op-list">
          {results.length === 0 ? <p className="muted">{t('openings.noMatch')}</p> : results.map((o, i) => (
            <button className="op-item" key={i} onClick={() => setChosen(o)}>
              <span className="op-eco">{o.eco}</span><span className="op-nm">{o.name}</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
