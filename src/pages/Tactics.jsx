import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useReviewer } from '../context/ReviewerContext.jsx';
import { loadTactics } from '../lib/tactics.js';
import { dueList, review, bestStreak, recordStreak } from '../lib/srs.js';
import { BOARD_THEMES, getHints } from '../lib/theme.js';
import { playMove } from '../lib/sound.js';
import { FaDumbbell, FaCircleCheck, FaCircleXmark, FaLightbulb } from '../ui/icons.js';

const DOT = { background: 'radial-gradient(circle, rgba(0,0,0,0.28) 20%, transparent 22%)' };
const RING = { boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.28)' };

// Replay the first n UCI moves of a line from a FEN.
function fenAfter(fen, line, n) {
  const c = new Chess(fen);
  for (let i = 0; i < n; i++) {
    const u = line[i];
    try { c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' }); } catch { break; }
  }
  return c.fen();
}

export default function Tactics() {
  const { t } = useTranslation();
  const { boardThemeKey } = useReviewer();
  const board = BOARD_THEMES[boardThemeKey];

  const [data, setData] = useState(null);
  const [pattern, setPattern] = useState('all');
  const [queue, setQueue] = useState([]);
  const [qi, setQi] = useState(0);
  const [idx, setIdx] = useState(0); // how many line moves played
  const [status, setStatus] = useState('solving'); // solving | wrong | solved | thinking
  const [hintSquares, setHintSquares] = useState({});
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(bestStreak());

  useEffect(() => { loadTactics().then(setData); }, []);

  const pool = useMemo(() => {
    if (!data) return [];
    const all = data.puzzles;
    return pattern === 'all' ? all : all.filter((p) => p.pattern === pattern);
  }, [data, pattern]);

  // Build a fresh due-ordered queue when the pool changes.
  useEffect(() => {
    if (!data) return;
    setQueue(dueList(pool).slice(0, 60));
    setQi(0); setIdx(0); setStatus('solving');
  }, [pool, data]);

  const puzzle = queue[qi];
  const sideToMove = puzzle ? puzzle.fen.split(' ')[1] : 'w';
  const fen = puzzle ? fenAfter(puzzle.fen, puzzle.line, idx) : undefined;

  const nextPuzzle = () => { setQi((i) => i + 1); setIdx(0); setStatus('solving'); setHintSquares({}); };

  const onSquareClick = ({ square }) => {
    if (!getHints() || !puzzle || status !== 'solving') { setHintSquares({}); return; }
    try {
      const c = new Chess(fen);
      const p = c.get(square);
      if (!p || p.color !== c.turn()) { setHintSquares({}); return; }
      const styles = {};
      for (const m of c.moves({ square, verbose: true })) styles[m.to] = m.captured ? RING : DOT;
      setHintSquares(styles);
    } catch { setHintSquares({}); }
  };

  const onDrop = ({ sourceSquare, targetSquare }) => {
    setHintSquares({});
    if (!puzzle || status !== 'solving') return false;
    let mv;
    try { const c = new Chess(fen); mv = c.move({ from: sourceSquare, to: targetSquare, promotion: 'q' }); } catch { return false; }
    if (!mv) return false;
    const uci = mv.from + mv.to + (mv.promotion || '');
    if (uci.slice(0, 4) !== puzzle.line[idx].slice(0, 4)) {
      review(puzzle.id, false); setStreak(0); setStatus('wrong');
      return false;
    }
    playMove(!!mv.captured);
    const afterUser = idx + 1;
    if (afterUser >= puzzle.line.length) {
      review(puzzle.id, true);
      const s = streak + 1; setStreak(s); setBest(recordStreak(s));
      setIdx(afterUser); setStatus('solved');
      return false;
    }
    // auto-play opponent's reply from the line
    setIdx(afterUser); setStatus('thinking');
    setTimeout(() => {
      setIdx((n) => {
        const after = n + 1;
        if (after >= puzzle.line.length) {
          review(puzzle.id, true);
          setStreak((st) => { const s = st + 1; setBest(recordStreak(s)); return s; });
          setStatus('solved');
        } else {
          setStatus('solving');
        }
        return after;
      });
      playMove(false);
    }, 350);
    return false;
  };

  if (!data) return <main className="drills-view"><p className="muted">{t('tactics.loading')}</p></main>;

  if (!puzzle) {
    return (
      <main className="train-view empty">
        <FaCircleCheck className="train-empty-icon done" />
        <p>{t('tactics.done')}</p>
        <button className="primary" onClick={() => { setQueue(dueList(pool).slice(0, 60)); setQi(0); setIdx(0); setStatus('solving'); }}>{t('tactics.more')}</button>
      </main>
    );
  }

  const options = {
    id: 'tactics', position: fen, boardOrientation: sideToMove === 'b' ? 'black' : 'white',
    allowDragging: status === 'solving', showNotation: true, showAnimations: true,
    squareStyles: hintSquares, onSquareClick, onPieceDrop: onDrop,
    darkSquareStyle: { backgroundColor: board.dark }, lightSquareStyle: { backgroundColor: board.light },
  };

  return (
    <main className="train-view">
      <div className="train-board"><div className="board"><Chessboard options={options} /></div></div>
      <div className="train-side">
        <div className="train-progress">
          <span><FaDumbbell /> {t('tactics.rating', { n: puzzle.rating })}</span>
          <span className="train-streak">{t('train.streak', { n: streak })} · {t('train.best', { n: best })}</span>
        </div>
        <select className="count-pick" value={pattern} onChange={(e) => setPattern(e.target.value)}>
          <option value="all">{t('tactics.allThemes')}</option>
          {data.patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="train-prompt">
          {t('tactics.toMove', { side: sideToMove === 'w' ? t('review.sideWhite') : t('review.sideBlack') })}
        </div>

        {status === 'wrong' && <div className="train-feedback bad"><FaCircleXmark /> {t('tactics.wrong')}</div>}
        {status === 'solved' && <div className="train-feedback ok"><FaCircleCheck /> {t('tactics.solved')}</div>}
        {(status === 'solving' || status === 'wrong') && (
          <div className="tactics-theme"><FaLightbulb /> {data.patterns.find((p) => p.id === puzzle.pattern)?.name}</div>
        )}

        <div className="train-actions">
          {status === 'wrong' && <button className="ghost" onClick={() => { setIdx(0); setStatus('solving'); }}>{t('tactics.retry')}</button>}
          <button className="primary" onClick={nextPuzzle}>{t('train.next')}</button>
        </div>
      </div>
    </main>
  );
}
