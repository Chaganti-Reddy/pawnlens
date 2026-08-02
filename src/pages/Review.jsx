import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams, useParams } from 'react-router-dom';
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
import { BOARD_THEMES } from '../lib/theme.js';
import { piecesFor } from '../lib/pieces.jsx';
import { playMove, playSound, soundForSan } from '../lib/sound.js';
import { parseSharedGame } from '../lib/share.js';
import { hangingSquares } from '../lib/threats.js';
import { outcomeText } from '../lib/outcome.js';
import { loadHistory } from '../lib/storage.js';
import { FaAngleLeft, FaAngleRight, FaAnglesLeft, FaAnglesRight, FaArrowLeftLong, FaDumbbell, FaCircleCheck, FaCircleXmark } from '../ui/icons.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export default function Review() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { gid } = useParams();
  const { analysis, focusColor, progress, engineStatus, selectedPly, setSelectedPly, runAnalysis, runAnalysisFromPgn, getTopMoves, boardThemeKey, pieceSetKey } = useReviewer();

  // Load the game: a shared PGN in the URL, or a stored game by its id (/review/:gid).
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current || analysis || progress.total > 0) return;
    const shared = parseSharedGame(params.toString());
    if (shared) { loaded.current = true; runAnalysisFromPgn(shared.pgn, shared.side); return; }
    if (gid) {
      const g = loadHistory().find((h) => h.gameId === gid);
      if (g?.pgn) { loaded.current = true; runAnalysisFromPgn(g.pgn, g.focusColor); }
    }
  }, [params, gid, analysis, progress.total, runAnalysisFromPgn]);

  const total = analysis?.moves.length ?? 0;

  // Retry-the-position: play the best move yourself on a blunder.
  const [retry, setRetry] = useState(false);
  const [retryFen, setRetryFen] = useState(null);
  const [retryStatus, setRetryStatus] = useState('idle'); // idle | correct | wrong

  // Active-recall + board-intelligence toggles.
  const [guess, setGuess] = useState(false);
  const [guessResult, setGuessResult] = useState(null);
  const [showThreats, setShowThreats] = useState(false);
  const [threatArrow, setThreatArrow] = useState(null);
  const [narrate, setNarrate] = useState(false);

  // Free explore / analysis board.
  const [explore, setExplore] = useState(false);
  const [exploreFen, setExploreFen] = useState(null);
  const [exploreStack, setExploreStack] = useState([]);
  const [exploreEval, setExploreEval] = useState({ cp: 0 });

  const go = useCallback((ply) => {
    const clamped = Math.max(-1, Math.min(total - 1, ply));
    setSelectedPly(clamped);
    setRetry(false); setRetryStatus('idle'); setRetryFen(null);
    setGuessResult(null);
    if (clamped >= 0 && analysis) playSound(soundForSan(analysis.moves[clamped]?.san));
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

  // Opponent-threat arrow: what the other side would play if it were their move.
  useEffect(() => {
    const cur = selectedPly >= 0 && analysis ? analysis.moves[selectedPly] : null;
    if (!showThreats || explore || retry) { setThreatArrow(null); return; }
    const f = cur ? cur.fenAfter : START_FEN;
    const parts = f.split(' ');
    parts[1] = parts[1] === 'w' ? 'b' : 'w';
    parts[3] = '-';
    let alive = true;
    getTopMoves(parts.join(' '), 1).then((lines) => {
      const uci = lines?.[0]?.pv?.[0];
      if (alive && uci?.length >= 4) setThreatArrow({ startSquare: uci.slice(0, 2), endSquare: uci.slice(2, 4), color: 'rgba(230,120,60,0.9)' });
      else if (alive) setThreatArrow(null);
    });
    return () => { alive = false; };
  }, [showThreats, explore, retry, selectedPly, analysis, getTopMoves]);

  // Auto narration: step through and read each move's coach note aloud.
  useEffect(() => {
    if (!narrate) { try { window.speechSynthesis?.cancel(); } catch { /* none */ } return; }
    if (selectedPly >= total - 1) { setNarrate(false); return; }
    const cur = selectedPly >= 0 && analysis ? analysis.moves[selectedPly] : null;
    const text = cur ? `${cur.moveNumber}${cur.color === 'w' ? '.' : '...'} ${cur.san}. ${cur.note}` : '';
    try {
      window.speechSynthesis?.cancel();
      if (text && window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    } catch { /* no speech */ }
    const id = setTimeout(() => go(selectedPly + 1), 3600);
    return () => clearTimeout(id);
  }, [narrate, selectedPly, total, analysis, go]);

  const analyzing = !analysis || progress.done < progress.total;
  const loadingPct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const hasSharedParam = !!params.get('g') || !!gid;

  if (!analysis && engineStatus === 'ready' && progress.total === 0 && !hasSharedParam) return <Navigate to="/" replace />;

  const node = selectedPly >= 0 && analysis ? analysis.moves[selectedPly] : null;
  const fen = node ? node.fenAfter : START_FEN;
  const evalWhite = explore ? exploreEval : node ? node.evalWhite : { cp: 0 };
  const boardTheme = BOARD_THEMES[boardThemeKey];
  const canRetry = node && node.tagKind === 'bad' && node.bestUci;

  const startRetry = () => { setRetry(true); setRetryStatus('idle'); setRetryFen(node.fenBefore); };
  const exitRetry = () => { setRetry(false); setRetryStatus('idle'); setRetryFen(null); };

  // Engine plays the opponent's reply so the user can keep playing the line.
  const engineReply = async (fen) => {
    setRetryStatus('thinking');
    try {
      const lines = await getTopMoves(fen, 1);
      const uci = lines?.[0]?.pv?.[0];
      const c = new Chess(fen);
      if (uci) {
        const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
        if (mv) playMove(!!mv.captured);
      }
      setRetryFen(c.fen());
    } catch { /* ignore */ }
    setRetryStatus('playing');
  };

  const onRetryDrop = ({ sourceSquare, targetSquare }) => {
    if (retryStatus === 'thinking') return false;
    const base = retryFen || node.fenBefore;
    let c, mv;
    try {
      c = new Chess(base);
      mv = c.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch { return false; }
    if (!mv) return false;
    // First move must be the best move (that's the lesson); after that, free play.
    if (retryStatus === 'idle' || retryStatus === 'wrong') {
      const uci = mv.from + mv.to + (mv.promotion || '');
      if (uci.slice(0, 4) !== node.bestUci.slice(0, 4)) { setRetryStatus('wrong'); return false; }
    }
    playMove(!!mv.captured);
    setRetryFen(c.fen());
    if (c.isGameOver()) { setRetryStatus('playing'); return false; }
    engineReply(c.fen());
    return false;
  };

  // Free explore / analysis board.
  const evalToWhite = (lines, turn) => {
    const l = lines?.[0];
    if (!l) return { cp: 0 };
    if (l.mate != null) return { mate: turn === 'w' ? l.mate : -l.mate };
    return { cp: turn === 'w' ? l.cp : -(l.cp ?? 0) };
  };
  const evalFen = (f) => { getTopMoves(f, 1).then((lines) => setExploreEval(evalToWhite(lines, f.split(' ')[1]))); };
  const startExplore = () => {
    const base = node ? node.fenAfter : START_FEN;
    setExplore(true); setExploreFen(base); setExploreStack([]); evalFen(base);
  };
  const exitExplore = () => { setExplore(false); setExploreFen(null); setExploreStack([]); };
  const onExploreDrop = ({ sourceSquare, targetSquare }) => {
    let c, mv;
    try { c = new Chess(exploreFen); mv = c.move({ from: sourceSquare, to: targetSquare, promotion: 'q' }); } catch { return false; }
    if (!mv) return false;
    playSound(soundForSan(mv.san));
    setExploreStack((s) => [...s, exploreFen]);
    setExploreFen(c.fen());
    evalFen(c.fen());
    return false;
  };
  const undoExplore = () => setExploreStack((s) => {
    if (!s.length) return s;
    const prev = s[s.length - 1];
    setExploreFen(prev); evalFen(prev);
    return s.slice(0, -1);
  });
  const resetExplore = () => { const base = node ? node.fenAfter : START_FEN; setExploreFen(base); setExploreStack([]); evalFen(base); };

  const arrows = [];
  const squareStyles = {};
  if (node && !retry && !explore) {
    arrows.push({ startSquare: node.from, endSquare: node.to, color: 'rgba(255,255,255,0.30)' });
    squareStyles[node.from] = { background: 'rgba(230,193,75,0.28)' };
    squareStyles[node.to] = { background: 'rgba(230,193,75,0.40)' };
    if (node.bestUci?.length >= 4 && node.tag !== 'Best' && node.tag !== 'Sharp') {
      arrows.push({ startSquare: node.bestUci.slice(0, 2), endSquare: node.bestUci.slice(2, 4), color: '#26c2a3' });
    }
  }
  // Guess-the-move: on your turn, hide the answer and let you play it.
  const nextMove = analysis && selectedPly + 1 < total ? analysis.moves[selectedPly + 1] : null;
  const guessTurn = guess && !retry && !!nextMove && nextMove.color === focusColor;
  const sanOfUci = (fenBefore, uci) => {
    if (!uci) return null;
    try { const c = new Chess(fenBefore); return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' })?.san; } catch { return null; }
  };
  const onGuessDrop = ({ sourceSquare, targetSquare }) => {
    if (!nextMove) return false;
    let mv;
    try { const c = new Chess(nextMove.fenBefore); mv = c.move({ from: sourceSquare, to: targetSquare, promotion: 'q' }); } catch { return false; }
    if (!mv) return false;
    const uci = mv.from + mv.to + (mv.promotion || '');
    let text, kind;
    if (uci.slice(0, 4) === (nextMove.bestUci || '').slice(0, 4)) { text = t('review.guessBest', { played: nextMove.san }); kind = 'ok'; }
    else if (uci === nextMove.uci) { text = t('review.guessSame'); kind = nextMove.tagKind === 'bad' ? 'bad' : 'ok'; }
    else { text = t('review.guessDiff', { you: mv.san, played: nextMove.san, best: sanOfUci(nextMove.fenBefore, nextMove.bestUci) || '?' }); kind = 'info'; }
    setGuessResult({ text, kind });
    setSelectedPly(nextMove.ply);
    setRetry(false);
    playSound(soundForSan(nextMove.san));
    return false;
  };

  // Assemble the board by mode: explore / retry play / guess / normal review.
  let pos, dragging, onDrop, arrowsUsed = [], styles = {};
  if (explore) { pos = exploreFen || fen; dragging = true; onDrop = onExploreDrop; }
  else if (retry) { pos = retryFen || node.fenBefore; dragging = retryStatus !== 'thinking'; onDrop = onRetryDrop; }
  else if (guessTurn) { pos = nextMove.fenBefore; dragging = true; onDrop = onGuessDrop; }
  else { pos = fen; dragging = false; arrowsUsed = threatArrow ? [...arrows, threatArrow] : arrows; styles = { ...squareStyles }; }
  if (showThreats) {
    for (const sq of hangingSquares(pos)) styles[sq] = { background: 'rgba(224,87,75,0.5)' };
  }
  const boardOptions = {
    id: 'review', position: pos, boardOrientation: focusColor === 'w' ? 'white' : 'black',
    arrows: arrowsUsed, squareStyles: styles, allowDragging: dragging, onPieceDrop: onDrop,
    showNotation: true, showAnimations: true, pieces: piecesFor(pieceSetKey),
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

  const oc = outcomeText(analysis.game);
  let resultLine;
  if (oc.text) resultLine = oc.text;
  else if (oc.winner === 'ongoing') resultLine = t('review.ongoing');
  else {
    const who = oc.winner === 'draw' ? t('review.drawResult') : oc.winner === 'white' ? t('review.whiteWon') : t('review.blackWon');
    resultLine = oc.reasonKey ? `${who} ${t('review.by', { reason: t(`review.reason_${oc.reasonKey}`) })}` : who;
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
        <div className="re-analyze">
          <button onClick={() => runAnalysis(analysis.game, focusColor === 'w' ? 'b' : 'w')}>
            {t('review.analyzeFromSide', { side: focusColor === 'w' ? t('review.sideBlack') : t('review.sideWhite') })}
          </button>
        </div>
      </aside>

      {/* CENTER — the board */}
      <div className="col-board">
        <button className="back-btn" onClick={() => navigate('/')}><FaArrowLeftLong /> {t('review.back')}</button>
        <div className="game-head">
          <span className="gh-players">{analysis.game.white} {t('review.vs')} {analysis.game.black}</span>
          {analysis.game.opening && <span className="gh-opening">{analysis.game.opening}</span>}
        </div>
        <div className="board-toggles">
          <button className={guess ? 'on' : ''} onClick={() => { setGuess((g) => !g); setGuessResult(null); }} disabled={explore}>
            {t('review.guessMode')}
          </button>
          <button className={showThreats ? 'on' : ''} onClick={() => setShowThreats((s) => !s)}>
            {t('review.threats')}
          </button>
          <button className={explore ? 'on' : ''} onClick={() => (explore ? exitExplore() : startExplore())}>
            {t('review.explore')}
          </button>
          <button className={narrate ? 'on' : ''} onClick={() => setNarrate((n) => !n)} disabled={explore}>
            {t('review.narrate')}
          </button>
        </div>
        <div className="board-wrap">
          <EvalBar evalWhite={evalWhite} orientation={focusColor === 'w' ? 'white' : 'black'} />
          <div className="board"><Chessboard options={boardOptions} /></div>
        </div>
        {explore ? (
          <div className="retry-bar">
            <span>{t('review.exploreHint')}</span>
            <button className="retry-exit" onClick={undoExplore} disabled={!exploreStack.length}>{t('review.undo')}</button>
            <button className="retry-exit" onClick={resetExplore}>{t('review.resetPos')}</button>
          </div>
        ) : retry ? (
          <div className={`retry-bar ${retryStatus}`}>
            {retryStatus === 'idle' && <span>{t('review.retryPrompt')}</span>}
            {retryStatus === 'wrong' && <span><FaCircleXmark /> {t('review.retryWrong')}</span>}
            {retryStatus === 'thinking' && <span><span className="mini-spin" /> {t('review.retryThinking')}</span>}
            {retryStatus === 'playing' && <span><FaCircleCheck /> {t('review.retryPlaying')}</span>}
            <button className="retry-exit" onClick={exitRetry}>{t('review.exitRetry')}</button>
          </div>
        ) : guessResult ? (
          <div className={`retry-bar ${guessResult.kind === 'ok' ? 'correct' : guessResult.kind === 'bad' ? 'wrong' : ''}`}>
            <span>{guessResult.text}</span>
          </div>
        ) : guessTurn ? (
          <div className="retry-bar"><span>{t('review.guessPrompt')}</span></div>
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
        <div className={`result-card r-${oc.winner}`}>
          <span className="rc-score">{oc.result}</span>
          <span className="rc-text">{resultLine}</span>
        </div>
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
        <CriticalMoments analysis={analysis} onSelect={go} selectedPly={selectedPly} />
        <MoveList moves={analysis.moves} selectedPly={selectedPly} onSelect={go} />
        <ExportMenu analysis={analysis} focusColor={focusColor} currentFen={fen} />
      </aside>
    </main>
  );
}
