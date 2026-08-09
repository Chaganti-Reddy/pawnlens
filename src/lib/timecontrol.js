// Time-control formatting + per-move clock parsing from PGN [%clk] comments.

// "600" -> "10 min", "300+2" -> "5+2", "180+1" -> "3+1", "60" -> "1 min",
// "30" -> "30 sec", "1/86400" -> "1 day/move".
export function formatTimeControl(tc) {
  if (!tc) return '';
  if (tc.includes('/')) {
    const secs = Number(tc.split('/')[1]);
    if (!secs) return '';
    const days = Math.round(secs / 86400);
    return days >= 1 ? `${days} day${days > 1 ? 's' : ''}/move` : `${Math.round(secs / 3600)} h/move`;
  }
  const [baseStr, incStr] = tc.split('+');
  const base = Number(baseStr);
  const inc = Number(incStr || 0);
  if (!base && base !== 0) return '';
  if (base % 60 === 0 && base >= 60) return inc ? `${base / 60}+${inc}` : `${base / 60} min`;
  return inc ? `${base}s+${inc}` : `${base} sec`;
}

// Increment (seconds) from a TimeControl string.
export function incrementOf(tc) {
  if (!tc || tc.includes('/')) return 0;
  return Number(tc.split('+')[1] || 0);
}
export function baseOf(tc) {
  if (!tc || tc.includes('/')) return 0;
  return Number(tc.split('+')[0] || 0);
}

// Infer a time class from the TimeControl when the platform didn't label it.
// chess.com-style thresholds on estimated game seconds (base + 40*inc).
export function classifyTimeControl(tc) {
  if (!tc) return '';
  if (tc.includes('/')) return 'daily';
  const base = baseOf(tc);
  const est = base + 40 * incrementOf(tc);
  if (!est) return '';
  if (est < 180) return 'bullet';
  if (est < 600) return 'blitz';
  if (est < 1800) return 'rapid';
  return 'daily';
}

function toSeconds(clk) {
  const parts = clk.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

// Remaining-clock (seconds) after each ply, parsed from [%clk] comments. Empty if absent.
export function parseClocks(pgn) {
  return [...pgn.matchAll(/\[%clk\s+([\d:.]+)\]/g)].map((m) => Math.round(toSeconds(m[1])));
}

// "125" -> "2:05", "9" -> "0:09".
export function secondsToClock(s) {
  if (s == null) return '';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// Elapsed time, human: "9s", "12s", "2m 05s".
export function formatDuration(s) {
  if (s == null) return '';
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(Math.round(s % 60)).padStart(2, '0')}s`;
}
