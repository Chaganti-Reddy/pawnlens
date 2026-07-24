import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useReviewer } from '../context/ReviewerContext.jsx';
import EvalBar from '../components/EvalBar.jsx';
import EvalGraph from '../components/EvalGraph.jsx';
import MoveList from '../components/MoveList.jsx';
import CoachCard from '../components/CoachCard.jsx';
import ComparePanel from '../components/ComparePanel.jsx';
import StatsPanel from '../components/StatsPanel.jsx';
import CriticalMoments from '../components/CriticalMoments.jsx';
import EngineLines from '../components/EngineLines.jsx';
import ExportMenu from '../components/ExportMenu.jsx';
import Takeaway from '../components/Takeaway.jsx';
import { getBoardTheme, BOARD_THEMES } from '../lib/theme.js';
import { playMove } from '../lib/sound.js';
import { parseSharedGame } from '../lib/share.js';
import { FaAngleLeft, FaAngleRight, FaAnglesLeft, FaAnglesRight, FaArrowLeftLong, FaDumbbell, FaCircleCheck, FaCircleXmark } from '../ui/icons.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export default function Review() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { analysis, focusColor, progress, engineStatus, selectedPly, setSelectedPly, runAnalysis, runAnalysisFromPgn } = useReviewer();

  // Shared link: decode PGN from the URL and analyze it once.
  const sharedLoaded = useRef(false);
  useEffect(() => {
    if (sharedLoaded.current || analysis || progress.total > 0) return;
    const shared = parseSharedGame(params.toString());
    if (shared) {
      sharedLoaded.current = true;
      runAnalysisFromPgn(shared.pgn, shared.side);
    }
  }, [params, analysis, progress.total, runAnalysisFromPgn]);

  const total = analysis?.moves.length ?? 0;

  // Retry-the-position: play the best move yourself on a blunder.
  const [retry, setRetry] = useState(false);
  const [retryFen, setRetryFen] = useState(null);
  const [retryStatus, setRetryStatus] = useState('idle'); // idle | correct | wrong

  const go = useCallback((ply) => {
    const clamped = Math.max(-1, Math.min(total - 1, ply));
    setSelectedPly(clamped);
    setRetry(false); setRetryStatus('idle'); setRetryFen(null);
    if (clamped >= 0 && analysis) playMove(analysis.moves[clamped]?.san?.includes('x'));
  }, [total, setSelectedPly, analysis]);

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
  const hasSharedParam = !!params.get('g');

  if (!analysis && engineStatus === 'ready' && progress.total === 0 && !hasSharedParam) return <Navigate to="/" replace />;

  const node = selectedPly >= 0 && analysis ? analysis.moves[selectedPly] : null;
  const fen = node ? node.fenAfter : START_FEN;
  const evalWhite = node ? node.evalWhite : { cp: 0 };
  const boardTheme = BOARD_THEMES[getBoardTheme()];
  const canRetry = node && node.tagKind === 'bad' && node.bestUci;

  const startRetry = () => { setRetry(true); setRetryStatus('idle'); setRetryFen(node.fenBefore); };
  const exitRetry = () => { setRetry(false); setRetryStatus('idle'); setRetryFen(null); };
  const onRetryDrop = ({ sourceSquare, targetSquare }) => {
    if (retryStatus === 'correct') return false;
    const baseFen = retryFen || node.fenBefore;
    try {
      const c = new Chess(baseFen);
      const mv = c.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (!mv) return false;
      const uci = mv.from + mv.to + (mv.promotion || '');
      if (uci.slice(0, 4) === node.bestUci.slice(0, 4)) {
        playMove(!!mv.captured);
        // show the payoff: play the engine's expected reply, if we have it
        if (node.bestLine?.[1]) { try { c.move(node.bestLine[1]); } catch { /* ignore */ } }
        setRetryFen(c.fen());
        setRetryStatus('correct');
      } else {
        setRetryStatus('wrong');
      }
    } catch { /* illegal */ }
    return false;
  };

  const arrows = [];
  const squareStyles = {};
  if (node && !retry) {
    arrows.push({ startSquare: node.from, endSquare: node.to, color: 'rgba(255,255,255,0.30)' });
    squareStyles[node.from] = { background: 'rgba(230,193,75,0.28)' };
    squareStyles[node.to] = { background: 'rgba(230,193,75,0.40)' };
    if (node.bestUci?.length >= 4 && node.tag !== 'Best' && node.tag !== 'Sharp') {
      arrows.push({ startSquare: node.bestUci.slice(0, 2), endSquare: node.bestUci.slice(2, 4), color: '#26c2a3' });
    }
  }
  const boardOptions = retry
    ? {
        id: 'review', position: retryFen || node.fenBefore,
        boardOrientation: focusColor === 'w' ? 'white' : 'black',
        allowDragging: retryStatus !== 'correct', showNotation: true, showAnimations: true,
        onPieceDrop: onRetryDrop,
        darkSquareStyle: { backgroundColor: boardTheme.dark }, lightSquareStyle: { backgroundColor: boardTheme.light },
      }
    : {
        id: 'review', position: fen, boardOrientation: focusColor === 'w' ? 'white' : 'black',
        arrows, squareStyles, allowDragging: false, showNotation: true, showAnimations: true,
        darkSquareStyle: { backgroundColor: boardTheme.dark }, lightSquareStyle: { backgroundColor: boardTheme.light },
      };

  if (analyzing) {
    return (
      <main className="review-view analyzing">
        <div className="loading">
          <div className="spinner" />
          <p>{engineStatus === 'loading' ? t('review.loadingEngine') : t('review.analyzing', { pct: loadingPct })}</p>
          <div className="progress"><div className="progress-fill" style={{ width: `${loadingPct}%` }} /></div>
        </div>
      </main>
    );
  }

  return (
    <main className="review-view three-col">
      {/* LEFT — everything about the current move */}
      <aside className="col-current">
        <div className="col-title">{t('review.thisMove')}</div>
        <StatsPanel analysis={analysis} selectedPly={selectedPly} focusColor={focusColor} />
        <CoachCard node={node} />
        {canRetry && !retry && (
          <button className="try-better" onClick={startRetry}><FaDumbbell /> {t('review.tryBetter')}</button>
        )}
        <EngineLines fen={node ? node.fenBefore : START_FEN} />
        <ComparePanel node={node} />
      </aside>

      {/* CENTER — the board */}
      <div className="col-board">
        <button className="back-btn" onClick={() => navigate('/')}><FaArrowLeftLong /> {t('review.back')}</button>
        <div className="game-head">
          <span className="gh-players">{analysis.game.white} {t('review.vs')} {analysis.game.black}</span>
          {analysis.game.opening && <span className="gh-opening">{analysis.game.opening}</span>}
        </div>
        <div className="board-wrap">
          <EvalBar evalWhite={evalWhite} orientation={focusColor === 'w' ? 'white' : 'black'} />
          <div className="board"><Chessboard options={boardOptions} /></div>
        </div>
        {retry ? (
          <div className={`retry-bar ${retryStatus}`}>
            {retryStatus === 'idle' && <span>{t('review.retryPrompt')}</span>}
            {retryStatus === 'correct' && <span><FaCircleCheck /> {t('review.retryCorrect')}</span>}
            {retryStatus === 'wrong' && <span><FaCircleXmark /> {t('review.retryWrong')}</span>}
            <button className="retry-exit" onClick={exitRetry}>{t('review.exitRetry')}</button>
          </div>
        ) : (
          <EvalGraph series={analysis.evalSeries} selectedPly={selectedPly} onSelect={go} />
        )}
        <div className="nav">
          <button onClick={() => go(-1)} title={t('review.navStart')}><FaAnglesLeft /></button>
          <button onClick={() => go(selectedPly - 1)} title={t('review.navPrev')}><FaAngleLeft /></button>
          <button onClick={() => go(selectedPly + 1)} title={t('review.navNext')}><FaAngleRight /></button>
          <button onClick={() => go(total - 1)} title={t('review.navEnd')}><FaAnglesRight /></button>
        </div>
      </div>

      {/* RIGHT — the whole game */}
      <aside className="col-full">
        <div className="col-title">{t('review.wholeGame')}</div>
        <Takeaway analysis={analysis} focusColor={focusColor} />
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
        <CriticalMoments moves={analysis.moves} focusColor={focusColor} onSelect={go} selectedPly={selectedPly} />
        <MoveList moves={analysis.moves} selectedPly={selectedPly} onSelect={go} />
        <ExportMenu analysis={analysis} focusColor={focusColor} currentFen={fen} />
        <div className="re-analyze">
          <button onClick={() => runAnalysis(analysis.game, focusColor === 'w' ? 'b' : 'w')}>
            {t('review.analyzeFromSide', { side: focusColor === 'w' ? t('review.sideBlack') : t('review.sideWhite') })}
          </button>
        </div>
      </aside>
    </main>
  );
}
