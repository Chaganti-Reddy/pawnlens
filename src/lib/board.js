// Tiny board-coordinate helpers for the skill drills (no engine needed).
export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

export const sqToXY = (sq) => [sq.charCodeAt(0) - 97, Number(sq[1]) - 1];
export const xyToSq = (x, y) => FILES[x] + (y + 1);
export const onBoard = (x, y) => x >= 0 && x < 8 && y >= 0 && y < 8;

export const randomSquare = () => xyToSq(Math.floor(Math.random() * 8), Math.floor(Math.random() * 8));

// a1 is dark. (file + rank) even -> dark.
export const isLight = (sq) => {
  const [x, y] = sqToXY(sq);
  return (x + y) % 2 === 1;
};

const KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
export const knightTargets = (sq) => {
  const [x, y] = sqToXY(sq);
  return KNIGHT.map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => onBoard(a, b)).map(([a, b]) => xyToSq(a, b));
};

// Build a FEN with a single piece on a square (piece like 'N', 'n').
export function singlePieceFen(sq, piece) {
  const grid = Array.from({ length: 8 }, () => Array(8).fill(''));
  const [x, y] = sqToXY(sq);
  grid[y][x] = piece;
  const ranks = [];
  for (let r = 7; r >= 0; r--) {
    let row = '';
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      if (grid[r][c]) { if (empty) { row += empty; empty = 0; } row += grid[r][c]; }
      else empty++;
    }
    if (empty) row += empty;
    ranks.push(row);
  }
  return `${ranks.join('/')} w - - 0 1`;
}
