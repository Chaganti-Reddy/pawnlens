# Third-party notices

## Bundled open data & assets

- **Openings book** (`src/data/openings.json`) — from lichess-org/chess-openings, CC0.
- **Tactics puzzles** (`src/data/puzzles.json`) — subset of the Lichess puzzle database, CC0.
- **cburnett piece set** (`src/data/pieces-cburnett.json`) — by Colin M.L. Burnett, GPLv2+ (via lichess), used under GPL.

## Stockfish.js (chess engine)

PawnLens runs **Stockfish.js** in the browser for all position analysis.

- Source: https://github.com/nmrugg/stockfish.js
- Upstream engine: https://github.com/official-stockfish/Stockfish
- License: **GNU GPL v3.0**
- Files shipped: `public/engine/stockfish-18-lite-single.js`, `public/engine/stockfish-18-lite-single.wasm`

Because PawnLens distributes the GPLv3 Stockfish engine, **the combined work is
licensed under GPLv3** (see `LICENSE`). If you deploy or distribute PawnLens you must:

1. Keep this notice and the engine's copyright/license intact.
2. Offer the complete corresponding source code of PawnLens to your users.
3. Not add further restrictions on the GPLv3-covered parts.

## Not affiliated

PawnLens is an independent project. It is **not** affiliated with, endorsed by, or
connected to chess.com or lichess.org. Game data is fetched only through those sites'
public, documented APIs. Move-classification names, colors, and UI are original to
PawnLens and do not copy any third party's proprietary review interface.
