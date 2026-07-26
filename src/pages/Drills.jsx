import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Chessboard } from 'react-chessboard';
import { useReviewer } from '../context/ReviewerContext.jsx';
import { BOARD_THEMES } from '../lib/theme.js';
import { EMPTY_FEN, randomSquare, isLight, knightTargets, singlePieceFen } from '../lib/board.js';
import { FaRegClock, FaCircleCheck, FaArrowLeftLong } from '../ui/icons.js';

const GREEN = { background: 'rgba(125,201,107,0.55)' };
const RED = { background: 'rgba(224,87,75,0.55)' };
const ROUND = 45;

function useCountdown(active, onEnd) {
  const [left, setLeft] = useState(ROUND);
  const ended = useRef(false);
  useEffect(() => {
    if (!active) { setLeft(ROUND); ended.current = false; return; }
    if (left <= 0) { if (!ended.current) { ended.current = true; onEnd(); } return; }
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
  }, [active, left, onEnd]);
  return [left, () => { setLeft(ROUND); ended.current = false; }];
}

function boardOpts(extra, boardKey) {
  const b = BOARD_THEMES[boardKey];
  return {
    id: 'drill', allowDragging: false, showNotation: true,
    darkSquareStyle: { backgroundColor: b.dark }, lightSquareStyle: { backgroundColor: b.light },
    ...extra,
  };
}

function Scoreboard({ left, score, miss, t }) {
  return (
    <div className="drill-score">
      <span><FaRegClock /> {left}s</span>
      <span className="ds-ok">{t('drills.score', { n: score })}</span>
      <span className="ds-miss">{t('drills.miss', { n: miss })}</span>
    </div>
  );
}

// --- Coordinate trainer: name a square, click it ---
function CoordinateDrill({ boardKey, t }) {
  const [playing, setPlaying] = useState(false);
  const [target, setTarget] = useState(randomSquare());
  const [orient, setOrient] = useState('white');
  const [score, setScore] = useState(0);
  const [miss, setMiss] = useState(0);
  const [styles, setStyles] = useState({});
  const [left, reset] = useCountdown(playing, () => setPlaying(false));

  const start = () => { setScore(0); setMiss(0); setTarget(randomSquare()); reset(); setPlaying(true); };
  const nextTarget = () => {
    setTarget(randomSquare());
    setOrient(Math.random() < 0.5 ? 'white' : 'black');
  };
  const onSquareClick = ({ square }) => {
    if (!playing) return;
    if (square === target) {
      setScore((s) => s + 1);
      setStyles({ [square]: GREEN });
      setTimeout(() => setStyles({}), 150);
      nextTarget();
    } else {
      setMiss((m) => m + 1);
      setStyles({ [square]: RED });
      setTimeout(() => setStyles({}), 150);
    }
  };

  return (
    <div className="drill-run">
      <div className="board">
        <Chessboard options={boardOpts({ position: EMPTY_FEN, boardOrientation: orient, squareStyles: styles, onSquareClick }, boardKey)} />
      </div>
      <div className="drill-panel">
        {playing ? (
          <>
            <Scoreboard left={left} score={score} miss={miss} t={t} />
            <div className="drill-cue">{t('drills.clickSquare')} <b>{target}</b></div>
          </>
        ) : (
          <StartOrResult started={score + miss > 0} score={score} miss={miss} onStart={start} t={t} />
        )}
      </div>
    </div>
  );
}

// --- Square colour: light or dark? ---
function ColorDrill({ t }) {
  const [playing, setPlaying] = useState(false);
  const [target, setTarget] = useState(randomSquare());
  const [score, setScore] = useState(0);
  const [miss, setMiss] = useState(0);
  const [flash, setFlash] = useState('');
  const [left, reset] = useCountdown(playing, () => setPlaying(false));

  const start = () => { setScore(0); setMiss(0); setTarget(randomSquare()); reset(); setPlaying(true); };
  const answer = (light) => {
    if (!playing) return;
    const ok = light === isLight(target);
    setFlash(ok ? 'ok' : 'bad');
    setTimeout(() => setFlash(''), 150);
    if (ok) setScore((s) => s + 1); else setMiss((m) => m + 1);
    setTarget(randomSquare());
  };

  return (
    <div className="drill-run color-drill">
      <div className="drill-panel wide">
        {playing ? (
          <>
            <Scoreboard left={left} score={score} miss={miss} t={t} />
            <div className={`color-cue ${flash}`}>{target}</div>
            <div className="color-btns">
              <button className="light-btn" onClick={() => answer(true)}>{t('drills.light')}</button>
              <button className="dark-btn" onClick={() => answer(false)}>{t('drills.dark')}</button>
            </div>
          </>
        ) : (
          <StartOrResult started={score + miss > 0} score={score} miss={miss} onStart={start} t={t} />
        )}
      </div>
    </div>
  );
}

// --- Knight sight: click every square the knight attacks ---
function KnightDrill({ boardKey, t }) {
  const [playing, setPlaying] = useState(false);
  const [from, setFrom] = useState(randomSquare());
  const [targets, setTargets] = useState(new Set(knightTargets(randomSquare())));
  const [found, setFound] = useState(new Set());
  const [score, setScore] = useState(0);
  const [miss, setMiss] = useState(0);
  const [flash, setFlash] = useState({});
  const [left, reset] = useCountdown(playing, () => setPlaying(false));

  const newRound = () => {
    const sq = randomSquare();
    setFrom(sq);
    setTargets(new Set(knightTargets(sq)));
    setFound(new Set());
  };
  const start = () => { setScore(0); setMiss(0); newRound(); reset(); setPlaying(true); };

  const onSquareClick = ({ square }) => {
    if (!playing || square === from) return;
    if (targets.has(square)) {
      if (found.has(square)) return;
      const nf = new Set(found); nf.add(square); setFound(nf);
      if (nf.size === targets.size) { setScore((s) => s + 1); setTimeout(newRound, 200); }
    } else {
      setMiss((m) => m + 1);
      setFlash({ [square]: RED });
      setTimeout(() => setFlash({}), 150);
    }
  };

  const styles = { ...flash };
  for (const sq of found) styles[sq] = GREEN;

  return (
    <div className="drill-run">
      <div className="board">
        <Chessboard options={boardOpts({ position: singlePieceFen(from, 'N'), squareStyles: styles, onSquareClick }, boardKey)} />
      </div>
      <div className="drill-panel">
        {playing ? (
          <>
            <Scoreboard left={left} score={score} miss={miss} t={t} />
            <div className="drill-cue">{t('drills.knightCue', { found: found.size, total: targets.size })}</div>
          </>
        ) : (
          <StartOrResult started={score + miss > 0} score={score} miss={miss} onStart={start} t={t} />
        )}
      </div>
    </div>
  );
}

function StartOrResult({ started, score, miss, onStart, t }) {
  return (
    <div className="drill-start">
      {started && (
        <div className="drill-result">
          <FaCircleCheck className="dr-icon" />
          <div className="dr-score">{score}</div>
          <div className="muted">{t('drills.solvedIn', { round: ROUND })} · {t('drills.miss', { n: miss })}</div>
        </div>
      )}
      <button className="primary" onClick={onStart}>{started ? t('drills.again') : t('drills.start')}</button>
    </div>
  );
}

const DRILLS = [
  { key: 'coordinate', comp: CoordinateDrill },
  { key: 'color', comp: ColorDrill },
  { key: 'knight', comp: KnightDrill },
];

export default function Drills() {
  const { t } = useTranslation();
  const { boardThemeKey } = useReviewer();
  const [active, setActive] = useState(null);

  if (active) {
    const D = DRILLS.find((d) => d.key === active).comp;
    return (
      <main className="drills-view">
        <button className="back-btn" onClick={() => setActive(null)}><FaArrowLeftLong /> {t('drills.back')}</button>
        <h2 className="drill-title">{t(`drills.${active}Title`)}</h2>
        <p className="muted drill-desc">{t(`drills.${active}Desc`)}</p>
        <D boardKey={boardThemeKey} t={t} />
      </main>
    );
  }

  return (
    <main className="drills-view">
      <h2>{t('drills.heading')}</h2>
      <p className="muted">{t('drills.sub')}</p>
      <div className="drill-cards">
        {DRILLS.map((d) => (
          <button key={d.key} className="drill-card" onClick={() => setActive(d.key)}>
            <span className="drill-card-title">{t(`drills.${d.key}Title`)}</span>
            <span className="drill-card-desc">{t(`drills.${d.key}Desc`)}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
