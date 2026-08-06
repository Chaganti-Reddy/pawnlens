import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useReviewer } from '../context/ReviewerContext.jsx';
import { FaAngleRight } from '../ui/icons.js';

// Cross-game weakness report with evidence: each pattern lists the exact moves
// (game + move number + what happened) and jumps you into that position.
export default function Dashboard({ data, playerName }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { reviewStoredMove } = useReviewer();
  const [open, setOpen] = useState(null);

  if (!data) {
    return (
      <div className="dash empty">
        <p>{t('weakness.empty1', { name: playerName || t('weakness.emptyNoName') })}</p>
        <p className="muted">{t('weakness.empty2')}</p>
      </div>
    );
  }
  const phaseLabel = (p) => (p ? t(`phase.${p}`) : t('phase.none'));

  return (
    <div className="dash">
      <div className="dash-stats">
        <Stat label={t('weakness.statGames')} value={data.gamesAnalyzed} />
        <Stat label={t('weakness.statAccuracy')} value={`${data.avgAccuracy.toFixed(1)}%`} />
        <Stat label={t('weakness.statMistakes')} value={data.mistakesPerGame.toFixed(1)} />
        <Stat label={t('weakness.statPhase')} value={phaseLabel(data.worstPhase)} />
      </div>

      <h3>{t('weakness.recurring')}</h3>
      {!data.enoughData && (
        <p className="muted dash-hint">{t('weakness.needMore')}</p>
      )}
      {data.topCategories.length === 0 ? (
        <p className="muted dash-hint">{t('weakness.balanced')}</p>
      ) : (
      <div className="dash-cats">
        {data.topCategories.map((c) => (
          <div className="cat" key={c.cat}>
            <div className="cat-head">
              <button className="cat-label-btn" onClick={() => setOpen(open === c.cat ? null : c.cat)}>
                <FaAngleRight className={`cat-caret ${open === c.cat ? 'open' : ''}`} />
                <span className="cat-label">{t(`category.${c.cat}`)}</span>
                <span className="cat-count">{c.count} ({c.pct}%)</span>
              </button>
              <button className="cat-drill-btn" onClick={() => navigate(`/train?cat=${encodeURIComponent(c.cat)}`)}>
                {t('weakness.drill')}
              </button>
            </div>
            <div className="cat-bar"><div className="cat-bar-fill" style={{ width: `${c.pct}%` }} /></div>

            {open === c.cat && (
              <div className="cat-evidence">
                {c.instances.map((inst, i) => (
                  <div className="evidence-row" key={i}>
                    <div className="ev-main">
                      <span className="ev-game">{inst.white} {t('weakness.vs')} {inst.black}</span>
                      <span className="ev-move">{t('weakness.atMove', { n: inst.moveNumber })} · {inst.san}</span>
                    </div>
                    <div className="ev-note">{inst.note}</div>
                    {inst.pgn && (
                      <button className="ev-review" onClick={() => reviewStoredMove(inst)}>{t('weakness.reviewMove')}</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="stat">
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);
