// Vertical evaluation bar. evalWhite is from White's perspective: { cp } or { mate }.
export default function EvalBar({ evalWhite, orientation = 'white' }) {
  let whiteWin;
  let label;
  if (evalWhite?.mate != null) {
    whiteWin = evalWhite.mate > 0 ? 100 : 0;
    label = `M${Math.abs(evalWhite.mate)}`;
  } else {
    const cp = evalWhite?.cp ?? 0;
    const chances = 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;
    whiteWin = 50 + 50 * chances;
    const pawns = cp / 100;
    label = (pawns >= 0 ? '+' : '') + pawns.toFixed(1);
  }
  const flip = orientation === 'black';
  const whiteHeight = flip ? 100 - whiteWin : whiteWin;
  const labelTop = whiteWin < 50; // put text on the bigger (dark) side

  return (
    <div className="evalbar" title={`White win chance ${whiteWin.toFixed(0)}%`}>
      <div className="evalbar-fill" style={{ height: `${whiteHeight}%` }} />
      <span className={`evalbar-label ${labelTop ? 'top' : 'bottom'} ${whiteWin < 50 ? 'on-dark' : 'on-light'}`}>
        {label}
      </span>
    </div>
  );
}
