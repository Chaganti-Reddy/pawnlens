import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useReviewer } from '../context/ReviewerContext.jsx';
import { collectPuzzles } from '../lib/storage.js';
import { loadTactics } from '../lib/tactics.js';
import { dueList, review } from '../lib/srs.js';
import { getPuzzleRating, updatePuzzleRating, isSolved, markSolved, solvedCount } from '../lib/progress.js';
import { BOARD_THEMES, getHints } from '../lib/theme.js';
import { piecesFor } from '../lib/pieces.jsx';
import { playMove } from '../lib/sound.js';
import { FaCircleCheck, FaCircleXmark } from '../ui/icons.js';

const DOT = { background: 'radial-gradient(circle, rgba(0,0,0,0.28) 20%, transparent 22%)' };
const RING = { boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.28)' };
const MISTAKE_RATING = { easy: 900, medium: 1300, hard: 1700 };

function fenAfter(fen, line, n) {
  const c = new Chess(fen);
  for (let i = 0; i < n; i++) {
    const u = line[i];
    try { c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' }); } catch { break; }
  }
  return c.fen();
}

export default function Train() {
  const { t } = useTranslation();
  const { boardThemeKey, pieceSetKey } = useReviewer();
  const board = BOARD_THEMES[boardThemeKey];
  const [params] = useSearchParams();
  const catParam = params.get('cat');
  const themeParam = params.get('theme');

  const [data, setData] = useState(null);
  const [filter, setFilter] = useState(catParam ? 'mistakes' : themeParam || 'all');
  const [queue, setQueue] = useState([]);
  const [qi, setQi] = useState(0);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState('solving'); // solving | wrong | thinking | solved
  const [scored, setScored] = useState(false);
  const [hintSquares, setHintSquares] = useState({});
  const [rating, setRating] = useState(getPuzzleRating());
  const [delta, setDelta] = useState(null);

  useEffect(() => { loadTactics().then(setData); }, []);

  const patterns = data?.patterns || [];

  const pool = useMemo(() => {
    if (!data) return [];
    const mistakes = collectPuzzles().filter((p) => !catParam || p.category === catParam).map((p) => ({
      id: p.id, fen: p.fen, line: [p.solution], source: 'mistake',
      rating: MISTAKE_RATING[p.difficulty] || 1200, label: p.from, sub: p.opening || '', note: p.note,
    }));
    const tactics = data.puzzles.map((p) => ({
      id: p.id, fen: p.fen, line: p.line, source: 'tactic',
      rating: p.rating, label: patterns.find((x) => x.id === p.pattern)?.name || 'Tactic', pattern: p.pattern,
    }));
    let all;
    if (filter === 'mistakes') all = mistakes;
    else if (filter === 'all') all = [...mistakes, ...tactics];
    else if (filter.startsWith('theme:')) {
      const th = filter.slice(6);
      all = data.puzzles.filter((p) => (p.themes || []).includes(th)).map((p) => ({
        id: p.id, fen: p.fen, line: p.line, source: 'tactic',
        rating: p.rating, label: patterns.find((x) => x.id === p.pattern)?.name || 'Tactic', pattern: p.pattern,
      }));
    } else all = tactics.filter((p) => p.pattern === filter);
    return all;
  }, [data, filter, catParam, patterns]);

  useEffect(() => {
    if (!data) return;
    setQueue(dueList(pool).slice(0, 80));
    setQi(0); setIdx(0); setStatus('solving'); setScored(false); setHintSquares({});
  }, [pool, data]);

  const puzzle = queue[qi];
  const sideToMove = puzzle ? puzzle.fen.split(' ')[1] : 'w';
  const fen = puzzle ? fenAfter(puzzle.fen, puzzle.line, idx) : undefined;

  const nextPuzzle = () => { setQi((i) => i + 1); setIdx(0); setStatus('solving'); setScored(false); setHintSquares({}); setDelta(null); };

  const onSquareClick = ({ square }) => {
    if (!getHints() || !puzzle || status === 'thinking' || status === 'solved') { setHintSquares({}); return; }
    try {
      const c = new Chess(fen);
      const p = c.get(square);
      if (!p || p.color !== c.turn()) { setHintSquares({}); return; }
      const styles = {};
      for (const m of c.moves({ square, verbose: true })) styles[m.to] = m.captured ? RING : DOT;
      setHintSquares(styles);
    } catch { setHintSquares({}); }
  };

  const score = (correct) => {
    if (scored) return;
    setScored(true);
    const r = updatePuzzleRating(puzzle.rating, correct);
    setRating(r.rating); setDelta(r.delta);
    review(puzzle.id, correct);
    if (correct) markSolved(puzzle.id);
  };

  const onDrop = ({ sourceSquare, targetSquare }) => {
    setHintSquares({});
    if (!puzzle || status === 'thinking' || status === 'solved') return false;
    let mv;
    try { const c = new Chess(fen); mv = c.move({ from: sourceSquare, to: targetSquare, promotion: 'q' }); } catch { return false; }
    if (!mv) return false;
    const uci = mv.from + mv.to + (mv.promotion || '');
    if (uci.slice(0, 4) !== puzzle.line[idx].slice(0, 4)) {
      score(false);
      setStatus('wrong'); // board stays live — just try again
      return false;
    }
    playMove(!!mv.captured);
    const afterUser = idx + 1;
    if (afterUser >= puzzle.line.length) { score(true); setIdx(afterUser); setStatus('solved'); return false; }
    setIdx(afterUser); setStatus('thinking');
    setTimeout(() => {
      setIdx((n) => {
        const after = n + 1;
        if (after >= puzzle.line.length) { score(true); setStatus('solved'); }
        else setStatus('solving');
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
        <p className="muted">{t('train.ratingLine', { rating })} · {t('train.solvedTotal', { n: solvedCount() })}</p>
        <button className="primary" onClick={() => { setQueue(dueList(pool).slice(0, 80)); setQi(0); nextPuzzle(); }}>{t('tactics.more')}</button>
      </main>
    );
  }

  const options = {
    id: 'train', position: fen, boardOrientation: sideToMove === 'b' ? 'black' : 'white',
    allowDragging: status === 'solving' || status === 'wrong',
    showNotation: true, showAnimations: true, squareStyles: hintSquares, onSquareClick, onPieceDrop: onDrop,
    pieces: piecesFor(pieceSetKey),
    darkSquareStyle: { backgroundColor: board.dark }, lightSquareStyle: { backgroundColor: board.light },
  };

  return (
    <main className="train-view">
      <div className="train-board"><div className="board"><Chessboard options={options} /></div></div>
      <div className="train-side">
        <div className="train-progress">
          <span className="train-rating">
            {t('train.rating', { n: rating })}
            {delta != null && <span className={`rd ${delta >= 0 ? 'up' : 'down'}`}>{delta >= 0 ? '+' : ''}{delta}</span>}
          </span>
          <span className="train-solved">{t('train.solvedTotal', { n: solvedCount() })}</span>
        </div>

        <select className="count-pick" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">{t('train.filterAll')}</option>
          <option value="mistakes">{t('train.filterMistakes')}</option>
          <option value="theme:endgame">{t('train.filterEndgames')}</option>
          <option value="theme:mate">{t('train.filterMates')}</option>
          <option value="theme:middlegame">{t('train.filterMiddlegame')}</option>
          {patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="train-prompt">
          {t('tactics.toMove', { side: sideToMove === 'w' ? t('review.sideWhite') : t('review.sideBlack') })}
          {isSolved(puzzle.id) && <span className="solved-tag">{t('train.solvedBefore')}</span>}
        </div>
        <p className="train-from muted">
          {puzzle.source === 'mistake' ? t('train.yourGame', { from: puzzle.label }) : `${puzzle.label} · ${t('tactics.rating', { n: puzzle.rating })}`}
        </p>

        {status === 'wrong' && <div className="train-feedback bad"><FaCircleXmark /> {t('tactics.wrong')}</div>}
        {status === 'solved' && (
          <div className="train-feedback ok">
            <FaCircleCheck /> {t('tactics.solved')}
            {puzzle.note && <span className="solved-note">{puzzle.note}</span>}
          </div>
        )}

        <button className="primary" onClick={nextPuzzle}>{t('train.next')}</button>
      </div>
    </main>
  );
}
