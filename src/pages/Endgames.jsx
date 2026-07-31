import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useReviewer } from '../context/ReviewerContext.jsx';
import { BOARD_THEMES } from '../lib/theme.js';
import { piecesFor } from '../lib/pieces.jsx';
import { playMove } from '../lib/sound.js';
import ENDGAMES from '../data/endgames.json';
import { FaArrowLeftLong, FaCircleCheck, FaCircleXmark } from '../ui/icons.js';

function Runner({ eg, boardKey, onExit, t }) {
  const board = BOARD_THEMES[boardKey];
  const { getTopMoves, pieceSetKey } = useReviewer();
  const gameRef = useRef(new Chess(eg.fen));
  const [fen, setFen] = useState(eg.fen);
  const [status, setStatus] = useState('play'); // play | thinking | won | drawn | lost
  const side = eg.fen.split(' ')[1];

  const reset = () => { gameRef.current = new Chess(eg.fen); setFen(eg.fen); setStatus('play'); };

  const outcome = (g) => {
    if (g.isCheckmate()) return g.turn() === side ? 'lost' : 'won';
    if (g.isDraw() || g.isStalemate()) return 'drawn';
    return null;
  };

  const enginePlay = async () => {
    setStatus('thinking');
    const g = gameRef.current;
    try {
      const lines = await getTopMoves(g.fen(), 1, 14);
      const uci = lines?.[0]?.pv?.[0];
      if (uci) { const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' }); if (mv) playMove(!!mv.captured); }
    } catch { /* ignore */ }
    setFen(g.fen());
    const o = outcome(g);
    setStatus(o || 'play');
  };

  const onDrop = ({ sourceSquare, targetSquare }) => {
    if (status !== 'play') return false;
    const g = gameRef.current;
    let mv;
    try { mv = g.move({ from: sourceSquare, to: targetSquare, promotion: 'q' }); } catch { return false; }
    if (!mv) return false;
    playMove(!!mv.captured);
    setFen(g.fen());
    const o = outcome(g);
    if (o) { setStatus(o); return false; }
    enginePlay();
    return false;
  };

  const options = {
    id: 'endgame', position: fen, boardOrientation: side === 'b' ? 'black' : 'white',
    allowDragging: status === 'play', showNotation: true, showAnimations: true, onPieceDrop: onDrop,
    pieces: piecesFor(pieceSetKey),
    darkSquareStyle: { backgroundColor: board.dark }, lightSquareStyle: { backgroundColor: board.light },
  };

  return (
    <main className="train-view">
      <div className="train-board"><div className="board"><Chessboard options={options} /></div></div>
      <div className="train-side">
        <button className="back-btn" onClick={onExit}><FaArrowLeftLong /> {t('endgames.back')}</button>
        <div className="train-prompt">{eg.name}</div>
        <p className="train-from muted">{t(`endgames.goal_${eg.goal}`)}</p>
        {status === 'thinking' && <div className="train-feedback hint"><span className="mini-spin" /> {t('endgames.thinking')}</div>}
        {status === 'won' && <div className="train-feedback ok"><FaCircleCheck /> {t('endgames.won')}</div>}
        {status === 'drawn' && <div className="train-feedback hint">{t('endgames.drawn')}</div>}
        {status === 'lost' && <div className="train-feedback bad"><FaCircleXmark /> {t('endgames.lost')}</div>}
        <button className="primary" onClick={reset}>{t('endgames.restart')}</button>
      </div>
    </main>
  );
}

export default function Endgames() {
  const { t } = useTranslation();
  const { boardThemeKey } = useReviewer();
  const [chosen, setChosen] = useState(null);
  const list = useMemo(() => ENDGAMES, []);

  if (chosen) return <Runner eg={chosen} boardKey={boardThemeKey} onExit={() => setChosen(null)} t={t} />;

  return (
    <main className="drills-view">
      <h2>{t('endgames.title')}</h2>
      <p className="muted">{t('endgames.sub')}</p>
      <div className="op-list">
        {list.map((eg) => (
          <button className="op-item" key={eg.id} onClick={() => setChosen(eg)}>
            <span className="op-nm">{eg.name}</span>
            <span className="op-eco">{t(`endgames.goal_${eg.goal}`)}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
