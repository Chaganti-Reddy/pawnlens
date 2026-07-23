// PawnLens mark: a knight glyph (react-icons) inside a gradient "lens" tile.
import { FaChessKnight } from '../ui/icons.js';

export default function Logo({ size = 32 }) {
  return (
    <span className="logo-tile" style={{ width: size, height: size }} aria-label="PawnLens" role="img">
      <FaChessKnight size={size * 0.6} />
    </span>
  );
}
