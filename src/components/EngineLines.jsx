import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Chess } from 'chess.js';
import { useReviewer } from '../context/ReviewerContext.jsx';

function scoreText(line) {
  if (line.mate != null) return `#${Math.abs(line.mate)}`;
  const p = (line.cp ?? 0) / 100;
  return (p >= 0 ? '+' : '') + p.toFixed(1);
}

// Top engine moves for the currently viewed position, fetched lazily.
export default function EngineLines({ fen }) {
  const { t } = useTranslation();
  const { getTopMoves } = useReviewer();
  const [lines, setLines] = useState(null);

  useEffect(() => {
    if (!fen) return;
    let alive = true;
    setLines(null);
    getTopMoves(fen, 3).then((res) => {
      if (!alive) return;
      const out = res
        .filter((l) => l.pv?.length)
        .map((l) => {
          let san = l.pv[0];
          try {
            const c = new Chess(fen);
            const mv = c.move({ from: l.pv[0].slice(0, 2), to: l.pv[0].slice(2, 4), promotion: l.pv[0][4] || undefined });
            san = mv?.san || l.pv[0];
          } catch { /* keep uci */ }
          return { san, score: scoreText(l) };
        });
      setLines(out);
    });
    return () => { alive = false; };
  }, [fen, getTopMoves]);

  return (
    <div className="engine-lines">
      <div className="el-title">{t('review.engineLines')}</div>
      {!lines ? (
        <span className="muted">…</span>
      ) : (
        <div className="el-rows">
          {lines.map((l, i) => (
            <span className="el-row" key={i}>
              <b>{l.san}</b> <span className="el-score">{l.score}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
