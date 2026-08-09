import { useTranslation } from 'react-i18next';
import { TAGS, ratingFromAccuracy } from '../lib/classify.js';
import { formatDuration, secondsToClock } from '../lib/timecontrol.js';
import { FaRegClock } from '../ui/icons.js';

function whiteWin(ev) {
  if (ev?.mate != null) return ev.mate > 0 ? 100 : 0;
  const cp = ev?.cp ?? 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

// Cumulative-to-the-current-move stats: what the player's numbers looked like
// AT THIS POINT — win%, accuracy so far, rating, and running tag counts.
export default function StatsPanel({ analysis, selectedPly, focusColor }) {
  const { t } = useTranslation();
  const moves = analysis.moves;
  const upto = moves.filter((m) => m.ply <= selectedPly && m.color === focusColor);
  const runAcc = upto.length ? upto.reduce((s, m) => s + m.accuracy, 0) / upto.length : 0;
  const counts = {};
  for (const m of upto) counts[m.tag] = (counts[m.tag] || 0) + 1;

  const node = selectedPly >= 0 ? moves[selectedPly] : null;
  const wWin = node ? whiteWin(node.evalWhite) : 50;
  const focusWin = focusColor === 'w' ? wWin : 100 - wWin;

  const overall = focusColor === 'w' ? analysis.accuracyWhite : analysis.accuracyBlack;
  const phase = analysis.accuracyByPhase[focusColor];

  return (
    <div className="stats-panel">
      <div className="sp-top">
        <div className="sp-win">
          <div className="sp-win-val">{focusWin.toFixed(0)}%</div>
          <div className="sp-lbl">{t('review.winNow')}</div>
        </div>
        <div className="sp-acc" title={t('review.ratingApprox')}>
          <div className="sp-acc-val">{runAcc.toFixed(1)}%</div>
          <div className="sp-lbl">{t('review.runningAccuracy')} · ≈{ratingFromAccuracy(runAcc)}</div>
        </div>
      </div>

      <div className="sp-move">
        {selectedPly < 0
          ? t('review.startPos')
          : t('review.movePos', { n: selectedPly + 1, total: moves.length })}
      </div>

      {node && node.secondsSpent != null && (
        <div className="sp-clock">
          <FaRegClock className="tc-icon" />
          <span>{t('review.took', { time: formatDuration(node.secondsSpent) })}</span>
          {node.clock != null && <span className="sp-clock-left">{t('review.clockLeft', { time: secondsToClock(node.clock) })}</span>}
        </div>
      )}

      <div className="tag-legend">
        {Object.entries(counts).map(([key, n]) => (
          <span className="chip" key={key} style={{ borderColor: TAGS[key]?.color }}>
            <span className="chip-dot" style={{ background: TAGS[key]?.color }} />{t(`tag.${key}`)} {n}
          </span>
        ))}
      </div>

      <div className="phase-acc">
        <span className="pa-title">{t('review.phaseAccuracy')} · {t('review.overall')} {overall.toFixed(0)}%</span>
        {['opening', 'middlegame', 'endgame'].map((ph) => (
          <div className="pa-row" key={ph}>
            <span className="pa-name">{t(`phase.${ph}`)}</span>
            <span className="pa-bar"><span style={{ width: `${phase[ph] || 0}%` }} /></span>
            <span className="pa-val">{phase[ph] ? `${phase[ph].toFixed(0)}%` : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
