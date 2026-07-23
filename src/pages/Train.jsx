import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { collectPuzzles } from '../lib/storage.js';
import { dueList, review, stats } from '../lib/srs.js';
import { getBoardTheme, BOARD_THEMES } from '../lib/theme.js';
import { playMove } from '../lib/sound.js';
import { FaDumbbell, FaCircleCheck, FaCircleXmark, FaLightbulb } from '../ui/icons.js';

export default function Train() {
  const { t } = useTranslation();
  const allPuzzles = useMemo(() => collectPuzzles(), []);
  const [queue] = useState(() => dueList(allPuzzles));
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState('solving'); // solving | correct | wrong | revealed
  const board = BOARD_THEMES[getBoardTheme()];

  const puzzle = queue[idx];
  const done = idx >= queue.length;
  const srsStats = stats(allPuzzles);

  const next = () => { setStatus('solving'); setIdx((i) => i + 1); };

  const onDrop = ({ sourceSquare, targetSquare }) => {
    if (!puzzle || status === 'correct') return false;
    let uci;
    try {
      const c = new Chess(puzzle.fen);
      const mv = c.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (!mv) return false;
      uci = mv.from + mv.to + (mv.promotion || '');
    } catch { return false; }
    const ok = uci.slice(0, 4) === (puzzle.solution || '').slice(0, 4);
    if (ok) {
      playMove(true);
      review(puzzle.id, true);
      setStatus('correct');
    } else {
      review(puzzle.id, false);
      setStatus('wrong');
    }
    return false;
  };

  if (!allPuzzles.length) {
    return (
      <main className="train-view empty">
        <FaDumbbell className="train-empty-icon" />
        <p>{t('train.empty1')}</p>
        <p className="muted">{t('train.empty2')}</p>
      </main>
    );
  }

  if (done) {
    return (
      <main className="train-view empty">
        <FaCircleCheck className="train-empty-icon done" />
        <p>{t('train.allDone')}</p>
        <p className="muted">{t('train.learned', { learned: srsStats.learned, total: srsStats.total })}</p>
      </main>
    );
  }

  const options = {
    id: 'train',
    position: puzzle.fen,
    boardOrientation: puzzle.sideToMove === 'b' ? 'black' : 'white',
    allowDragging: status !== 'correct',
    darkSquareStyle: { backgroundColor: board.dark },
    lightSquareStyle: { backgroundColor: board.light },
    onPieceDrop: onDrop,
  };

  return (
    <main className="train-view">
      <div className="train-board">
        <div className="board"><Chessboard options={options} /></div>
      </div>
      <div className="train-side">
        <div className="train-progress">
          <FaDumbbell /> {t('train.progress', { n: idx + 1, total: queue.length })}
        </div>
        <div className="train-prompt">
          {t('train.findBest', { side: puzzle.sideToMove === 'w' ? t('review.sideWhite') : t('review.sideBlack') })}
        </div>
        <p className="train-from muted">{puzzle.from}{puzzle.opening ? ` · ${puzzle.opening}` : ''}</p>

        {status === 'correct' && (
          <div className="train-feedback ok"><FaCircleCheck /> {t('train.correct', { move: puzzle.solutionSan })}</div>
        )}
        {status === 'wrong' && (
          <div className="train-feedback bad"><FaCircleXmark /> {t('train.wrong')}</div>
        )}
        {status === 'revealed' && (
          <div className="train-feedback hint"><FaLightbulb /> {t('train.answer', { move: puzzle.solutionSan })}</div>
        )}

        <div className="train-actions">
          {status !== 'correct' && status !== 'revealed' && (
            <button className="ghost" onClick={() => setStatus('revealed')}>{t('train.reveal')}</button>
          )}
          <button className="primary" onClick={next}>{t('train.next')}</button>
        </div>
        {puzzle.note && (status === 'correct' || status === 'revealed') && (
          <p className="train-note">{puzzle.note}</p>
        )}
      </div>
    </main>
  );
}
