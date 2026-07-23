import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaCrown } from '../ui/icons.js';
import { mastersForFen } from '../lib/masters.js';

// "How the strong players handle this." Masters data when the position is known,
// otherwise the engine's line. Collapsible, framed as a nudge — never a scolding.
export default function ComparePanel({ node }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [masters, setMasters] = useState(undefined); // undefined=loading, null=none
  const fen = node?.fenBefore;

  useEffect(() => {
    if (!open || !fen) return;
    let alive = true;
    setMasters(undefined);
    mastersForFen(fen).then((d) => alive && setMasters(d));
    return () => { alive = false; };
  }, [open, fen]);

  if (!node) return null;
  const playedSan = node.san;

  return (
    <div className="compare">
      <button className="compare-toggle" onClick={() => setOpen((o) => !o)}>
        <FaCrown /> {t('review.strongPlayers')}
        <FaChevronDown className={`chev ${open ? 'open' : ''}`} />
      </button>
      {open && (
        <div className="compare-body">
          {masters === undefined && <p className="muted">{t('review.lookingUp')}</p>}
          {masters && (
            <>
              <p className="muted">{t('review.mastersIntro')}</p>
              <ul className="master-moves">
                {masters.moves.map((m) => (
                  <li key={m.uci} className={m.san === playedSan ? 'you' : ''}>
                    <span className="mm-san">{m.san}</span>
                    <span className="mm-bar"><span style={{ width: `${m.share}%` }} /></span>
                    <span className="mm-share">{m.share}%</span>
                    {m.san === playedSan && <span className="mm-tag">{t('review.yourMove')}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {masters === null && (
            <>
              <p className="muted">{t('review.enginePlanIntro')}</p>
              <div className="best-line inline">
                {node.bestLine?.length ? node.bestLine.map((san, i) => <span className="bl-move" key={i}>{san}</span>) : <span className="muted">—</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
