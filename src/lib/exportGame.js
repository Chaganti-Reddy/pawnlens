// Export a reviewed game as an annotated PGN (coach notes as move comments).
function pad(n) { return String(n).padStart(2, '0'); }

export function buildAnnotatedPgn(analysis) {
  const g = analysis.game || {};
  const headers = [
    ['Event', g.event || 'PawnLens review'],
    ['White', g.white || 'White'],
    ['Black', g.black || 'Black'],
    ['Result', g.result || '*'],
    ['Opening', g.opening || ''],
  ].filter(([, v]) => v);

  let body = '';
  for (const m of analysis.moves) {
    if (m.color === 'w') body += `${m.moveNumber}. `;
    body += m.san;
    // annotate only the moves that carry a lesson
    if (m.tagKind === 'bad' || m.tag === 'Sharp') {
      body += ` {${m.tagLabel || m.tag}: ${m.note}} `;
    } else {
      body += ' ';
    }
  }
  body += g.result || '*';

  const head = headers.map(([k, v]) => `[${k} "${v}"]`).join('\n');
  return `${head}\n\n${body.trim()}\n`;
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function suggestFilename(analysis) {
  const g = analysis.game || {};
  const safe = (s) => (s || 'game').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  return `pawnlens-${safe(g.white)}-vs-${safe(g.black)}-${stamp}.pgn`;
}
