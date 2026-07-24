// One-line "main lesson" for a game — the single most useful takeaway.
import i18n from '../i18n.js';

export function gameTakeaway(analysis, focusColor) {
  const t = (k, o) => i18n.t(k, o);
  const bad = analysis.moves.filter((m) => m.color === focusColor && m.tagKind === 'bad');
  if (bad.length === 0) return t('takeaway.clean');

  // Dominant mistake category.
  const catCounts = {};
  const phaseCounts = { opening: 0, middlegame: 0, endgame: 0 };
  for (const m of bad) {
    const cat = m.category || 'positional-drift';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
    phaseCounts[m.phase] = (phaseCounts[m.phase] || 0) + 1;
  }
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0][0];
  const topPhase = Object.entries(phaseCounts).sort((a, b) => b[1] - a[1])[0];
  const phaseClause = topPhase[1] >= 2 ? t('takeaway.phase', { phase: t(`phase.${topPhase[0]}`).toLowerCase() }) : '';

  return t('takeaway.one', { lesson: t(`lesson.${topCat}`) }) + phaseClause;
}
