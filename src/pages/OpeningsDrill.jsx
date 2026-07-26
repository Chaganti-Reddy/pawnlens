import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useReviewer } from '../context/ReviewerContext.jsx';
import { mastersForFen } from '../lib/masters.js';
import { BOARD_THEMES } from '../lib/theme.js';
import { playMove } from '../lib/sound.js';
import { FaBook, FaCircleXmark } from '../ui/icons.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export default function OpeningsDrill() {
  const { t } = useTranslation();
  const { boardThemeKey } = useReviewer();
  const board = BOARD_THEMES[boardThemeKey];
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(START);
  const [side] = useState('w');
  const [book, setBook] = useState(null); // acceptable master moves for the side to move
  const [status, setStatus] = useState('loading'); // loading | your-turn | thinking | out-of-book | wrong
  const [line, setLine] = useState([]);
  const [lastInfo, setLastInfo] = useState('');

  const reset = useCallback(() => {
    gameRef.current = new Chess();
    setFen(START); setLine([]); setLastInfo(''); setStatus('loading');
  }, []);

  // Load the book for the current position (whose turn it is).
  const loadBook = useCallback(async () => {
    const data = await mastersForFen(gameRef.current.fen());
    if (!data || !data.moves.length) { setBook(null); setStatus('out-of-book'); return; }
    setBook(data);
    setStatus('your-turn');
  }, []);

  useEffect(() => { if (status === 'loading') loadBook(); }, [status, loadBook]);

  const opponentReply = useCallback(async () => {
    setStatus('thinking');
    const data = await mastersForFen(gameRef.current.fen());
    if (!data || !data.moves.length) { setStatus('out-of-book'); return; }
    const top = data.moves[0];
    const mv = gameRef.current.move(top.san);
    if (mv) { playMove(!!mv.captured); setFen(gameRef.current.fen()); setLine((l) => [...l, mv.san]); }
    loadBook();
  }, [loadBook]);

  const onDrop = ({ sourceSquare, targetSquare }) => {
    if (status !== 'your-turn' || !book) return false;
    let uci;
    const test = new Chess(gameRef.current.fen());
    let mv;
    try { mv = test.move({ from: sourceSquare, to: targetSquare, promotion: 'q' }); } catch { return false; }
    if (!mv) return false;
    uci = mv.from + mv.to + (mv.promotion || '');
    const match = book.moves.find((m) => m.uci.slice(0, 4) === uci.slice(0, 4));
    if (!match) { setStatus('wrong'); setTimeout(() => setStatus('your-turn'), 900); return false; }
    gameRef.current.move(mv.san);
    playMove(!!mv.captured);
    setFen(gameRef.current.fen());
    setLine((l) => [...l, mv.san]);
    setLastInfo(t('openings.played', { move: mv.san, share: match.share }));
    opponentReply();
    return false;
  };

  const options = {
    id: 'openings', position: fen, boardOrientation: side === 'w' ? 'white' : 'black',
    allowDragging: status === 'your-turn', showNotation: true, showAnimations: true, onPieceDrop: onDrop,
    darkSquareStyle: { backgroundColor: board.dark }, lightSquareStyle: { backgroundColor: board.light },
  };

  return (
    <main className="review-view three-col openings-drill">
      <aside className="col-current">
        <div className="col-title"><FaBook /> {t('openings.title')}</div>
        <p className="muted">{t('openings.sub')}</p>
        {status === 'your-turn' && book && (
          <div className="opening-book">
            <div className="ob-title">{t('openings.bookMoves')}</div>
            {book.moves.map((m) => (
              <div className="ob-row" key={m.uci}>
                <span className="ob-hidden">{t('openings.hidden')}</span>
                <span className="mm-share">{m.share}%</span>
              </div>
            ))}
          </div>
        )}
        {lastInfo && <p className="opening-info">{lastInfo}</p>}
        {status === 'wrong' && <div className="train-feedback bad"><FaCircleXmark /> {t('openings.notBook')}</div>}
        {status === 'out-of-book' && <div className="train-feedback hint">{t('openings.outOfBook')}</div>}
      </aside>

      <div className="col-board">
        <h2 className="drill-title">{t('openings.title')}</h2>
        <div className="board-wrap"><div className="board"><Chessboard options={options} /></div></div>
        <div className="nav">
          <button className="primary" onClick={reset}>{t('openings.restart')}</button>
        </div>
      </div>

      <aside className="col-full">
        <div className="col-title">{t('openings.line')}</div>
        <div className="movelist">
          {line.length === 0 ? <span className="muted">—</span> : (
            <div className="ol-line">{line.map((san, i) => <span className="bl-move" key={i}>{i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}{san}</span>)}</div>
          )}
        </div>
      </aside>
    </main>
  );
}
