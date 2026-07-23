// Presentational icon helpers, all backed by react-icons (no emoji).
import { FaBolt, FaStopwatch, FaRegClock, FaRegCalendar, FaChessKnight, SiChessdotcom, SiLichess } from '../ui/icons.js';

const TIME_ICON = { bullet: FaBolt, blitz: FaStopwatch, rapid: FaRegClock, daily: FaRegCalendar };

export const TimeIcon = ({ kind }) => {
  const Icon = TIME_ICON[kind] || FaChessKnight;
  const title = kind ? kind[0].toUpperCase() + kind.slice(1) : 'Game';
  return <Icon className="tc-icon" title={title} aria-label={title} />;
};

// Colored result badge: win / loss / draw.
export const ResultBadge = ({ result }) => {
  const cfg = { win: { c: '#7dc96b', t: 'W' }, loss: { c: '#e0574b', t: 'L' }, draw: { c: '#9b9b9b', t: '½' } }[result];
  if (!cfg) return null;
  return <span className="result-badge" style={{ background: cfg.c }} title={result}>{cfg.t}</span>;
};

export const SourceMark = ({ source, size = 16 }) => {
  if (source === 'chess.com' || source === 'chesscom') return <SiChessdotcom size={size} title="chess.com" />;
  if (source === 'lichess') return <SiLichess size={size} title="lichess" />;
  return <FaChessKnight size={size} title="PGN" />;
};
