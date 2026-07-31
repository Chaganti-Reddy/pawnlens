// Optional piece sets rendered from bundled SVGs. 'default' uses react-chessboard's
// built-in pieces. cburnett is GPLv2+ (Colin M.L. Burnett, via lichess) — see NOTICE.
import cburnett from '../data/pieces-cburnett.json';

const RAW = { cburnett };
export const PIECE_SETS = { default: 'Default', cburnett: 'Classic (cburnett)' };

const cache = {};
const uri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// Returns a react-chessboard `pieces` render object, or undefined for the default set.
export function piecesFor(key) {
  if (key === 'default' || !RAW[key]) return undefined;
  if (cache[key]) return cache[key];
  const obj = {};
  for (const [k, svg] of Object.entries(RAW[key])) {
    const src = uri(svg);
    obj[k] = () => <img alt="" src={src} draggable={false} style={{ width: '100%', height: '100%' }} />;
  }
  cache[key] = obj;
  return obj;
}
