# ♞ PawnLens

Free, unlimited chess game review that runs **entirely in your browser**. Paste a
PGN or pull recent games from chess.com / lichess, and get Stockfish analysis,
move classifications, accuracy scores, plain-English explanations of your
mistakes, and a cross-game weakness report — with **zero server cost** and no login.

## Why it exists

chess.com limits free users to ~1 Game Review per day. Several free alternatives
exist (Lichess, Chessigma, Chess It Up…) but they analyze one game at a time and
mostly hand you engine numbers. PawnLens adds the parts they miss:

- **Plain-English coaching** — *why* a move was bad, not just `-3.2`.
- **Cross-game weakness dashboard** — recurring mistake patterns over your last N games.
- **Dead-simple UI.**

## How the "zero cost" works

| Piece            | How                                                 | Server cost |
| ---------------- | --------------------------------------------------- | ----------- |
| Hosting          | Static site (Cloudflare Pages / GitHub Pages)       | $0          |
| Engine           | Stockfish 18 (lite, single-thread) WASM, in-browser | $0          |
| Game fetching    | chess.com + lichess public APIs (from browser)      | $0          |
| History / stats  | Browser localStorage — computed client-side         | $0          |

No backend. Analysis uses the visitor's own CPU, so it scales to any number of
users for free.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```

Deploy the `dist/` folder to any static host.

## Project layout

```
public/engine/          Stockfish 18 lite-single .js + .wasm (GPLv3)
src/engine/engine.js    UCI worker wrapper (promise-based analyze)
src/lib/fetchGames.js   chess.com / lichess / PGN loading
src/lib/classify.js     win% model + move classification + tag set
src/lib/coach.js        rule-based plain-English notes
src/lib/analyze.js      walk game, eval each position once, classify
src/lib/storage.js      local history + weakness aggregation
src/components/         EvalBar, MoveList, Dashboard
src/App.jsx             orchestration + UI
```

## Move tags (our own naming — not chess.com's system)

`Sharp !!` · `Best ✓` · `Solid` · `Fine` · `Loose ?!` · `Slip ?` · `Drop ??`

## License & attribution

GPLv3 (because it bundles Stockfish.js). See `LICENSE` and `NOTICE.md`.
Not affiliated with chess.com or lichess — uses only their public APIs.
