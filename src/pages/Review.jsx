import { useCallback, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { useReviewer } from '../context/ReviewerContext.jsx';
import { TAGS } from '../lib/classify.js';
import EvalBar from '../components/EvalBar.jsx';
import EvalGraph from '../components/EvalGraph.jsx';
import MoveList from '../components/MoveList.jsx';
import CoachCard from '../components/CoachCard.jsx';
import ComparePanel from '../components/ComparePanel.jsx';
import { FaAngleLeft, FaAngleRight, FaAnglesLeft, FaAnglesRight, FaArrowLeftLong } from '../ui/icons.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export default function Review() {
  const navigate = useNavigate();
  const { analysis, focusColor, progress, engineStatus, selectedPly, setSelectedPly, runAnalysis } = useReviewer();

  const total = analysis?.moves.length ?? 0;
  const go = useCallback((ply) => setSelectedPly(Math.max(-1, Math.min(total - 1, ply))), [total, setSelectedPly]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(selectedPly - 1);
      else if (e.key === 'ArrowRight') go(selectedPly + 1);
      else if (e.key === 'Home') go(-1);
      else if (e.key === 'End') go(total - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedPly, total, go]);

  const analyzing = !analysis || progress.done < progress.total;
  const loadingPct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  // No analysis and nothing running -> go home.
  if (!analysis && engineStatus === 'ready' && progress.total === 0) return <Navigate to="/" replace />;

  const node = selectedPly >= 0 && analysis ? analysis.moves[selectedPly] : null;
  const fen = node ? node.fenAfter : START_FEN;
  const evalWhite = node ? node.evalWhite : { cp: 0 };

  const arrows = [];
  const squareStyles = {};
  if (node) {
    arrows.push({ startSquare: node.from, endSquare: node.to, color: 'rgba(255,255,255,0.30)' });
    squareStyles[node.from] = { background: 'rgba(230,193,75,0.28)' };
    squareStyles[node.to] = { background: 'rgba(230,193,75,0.40)' };
    if (node.bestUci?.length >= 4 && node.tag !== 'Best' && node.tag !== 'Sharp') {
      arrows.push({ startSquare: node.bestUci.slice(0, 2), endSquare: node.bestUci.slice(2, 4), color: '#26c2a3' });
    }
  }
  const boardOptions = {
    id: 'review', position: fen, boardOrientation: focusColor === 'w' ? 'white' : 'black',
    arrows, squareStyles, allowDragging: false, showNotation: true,
    darkSquareStyle: { backgroundColor: '#6b8f5e' }, lightSquareStyle: { backgroundColor: '#e9edcc' },
  };

  return (
    <main className="review-view">
      <div className="board-col">
        <button className="back-btn" onClick={() => navigate('/')}><FaArrowLeftLong /> Back to games</button>
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
        {analysis && <EvalGraph series={analysis.evalSeries} selectedPly={selectedPly} onSelect={go} />}
        <div className="nav">
          <button onClick={() => go(-1)} title="Start (Home)"><FaAnglesLeft /></button>
          <button onClick={() => go(selectedPly - 1)} title="Prev (←)"><FaAngleLeft /></button>
          <button onClick={() => go(selectedPly + 1)} title="Next (→)"><FaAngleRight /></button>
          <button onClick={() => go(total - 1)} title="End (End)"><FaAnglesRight /></button>
        </div>
      </div>

      <div className="side-col">
        {analyzing ? (
          <div className="loading">
            <div className="spinner" />
            <p>{engineStatus === 'loading' ? 'Loading engine…' : `Analyzing… ${loadingPct}%`}</p>
            <div className="progress"><div className="progress-fill" style={{ width: `${loadingPct}%` }} /></div>
          </div>
        ) : (
          <>
            <div className="acc-cards">
              <div className={`acc ${focusColor === 'w' ? 'focus' : ''}`}>
                <div className="acc-val">{analysis.accuracyWhite.toFixed(1)}%</div>
                <div className="acc-lbl">{analysis.game.white}</div>
              </div>
              <div className={`acc ${focusColor === 'b' ? 'focus' : ''}`}>
                <div className="acc-val">{analysis.accuracyBlack.toFixed(1)}%</div>
                <div className="acc-lbl">{analysis.game.black}</div>
              </div>
            </div>
            <div className="tag-legend">
              {Object.entries(analysis.counts[focusColor] || {}).map(([t, n]) => (
                <span className="chip" key={t} style={{ borderColor: TAGS[t]?.color }}>
                  <span className="chip-dot" style={{ background: TAGS[t]?.color }} />{TAGS[t]?.label} {n}
                </span>
              ))}
            </div>
            <CoachCard node={node} />
            <ComparePanel node={node} />
            <MoveList moves={analysis.moves} selectedPly={selectedPly} onSelect={go} />
            <div className="re-analyze">
              <button onClick={() => runAnalysis(analysis.game, focusColor === 'w' ? 'b' : 'w')}>
                Analyze from {focusColor === 'w' ? 'Black' : 'White'}'s side
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
