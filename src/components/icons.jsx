// Small inline SVG icons — no external requests, theme via currentColor.

export const TimeIcon = ({ kind }) => {
  const map = {
    bullet: '🌀',
    blitz: '⚡',
    rapid: '⏱️',
    daily: '📅',
  };
  const title = kind ? kind[0].toUpperCase() + kind.slice(1) : 'Game';
  return (
    <span className="tc-icon" title={title} aria-label={title}>
      {map[kind] || '♟️'}
    </span>
  );
};

// Colored result dot: win / loss / draw.
export const ResultBadge = ({ result }) => {
  const cfg = {
    win: { c: '#7dc96b', t: 'W' },
    loss: { c: '#e0574b', t: 'L' },
    draw: { c: '#9b9b9b', t: '½' },
  }[result] || { c: '#6b6b6b', t: '–' };
  return (
    <span className="result-badge" style={{ background: cfg.c }} title={result || 'unknown'}>
      {cfg.t}
    </span>
  );
};

export const ChessComMark = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M6 20h12l-1.2-2.5c1.4-1.3 2.2-3 2.2-5C19 8.9 15.9 6 12 6S5 8.9 5 12.5c0 2 .8 3.7 2.2 5L6 20zm6-11a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
  </svg>
);

export const LichessMark = () => (
  <svg width="16" height="16" viewBox="0 0 50 50" fill="currentColor" aria-hidden>
    <path d="M25 3c-2 6 2 8 4 12 3 5-1 9-4 11-5 3-9 6-9 12 0 5 4 8 9 8s13-3 13-14c0-8-6-12-9-18-2-4-3-8-4-11z" />
  </svg>
);

export const SourceMark = ({ source }) =>
  source === 'chess.com' ? <ChessComMark /> : source === 'lichess' ? <LichessMark /> : <span>♟</span>;
