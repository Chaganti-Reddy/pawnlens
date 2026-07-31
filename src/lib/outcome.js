// Human-readable game result from the PGN's Result + Termination tags.
export function outcomeText(game) {
  const result = game?.result || '*';
  const term = (game?.termination || '').trim();
  const winner = result === '1-0' ? 'white' : result === '0-1' ? 'black' : result === '1/2-1/2' ? 'draw' : 'ongoing';

  // A useful Termination tag ("X won by resignation", "won on time", etc.) wins.
  const informative = /resign|checkmate|time|abandon|stalemate|agreement|repetition|insufficient|drawn|won/i.test(term);
  if (informative) return { result, winner, text: term };

  // Otherwise derive a reason keyword if present, else a plain result.
  let reasonKey = null;
  if (/resign/i.test(term)) reasonKey = 'resignation';
  else if (/time|forfeit/i.test(term)) reasonKey = 'time';
  else if (/abandon/i.test(term)) reasonKey = 'abandonment';
  else if (/stalemate/i.test(term)) reasonKey = 'stalemate';

  return { result, winner, reasonKey };
}
