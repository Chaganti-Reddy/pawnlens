# Architecture

PawnLens is a single-page React app with **no backend**. Every expensive
operation — chess engine analysis, puzzle scheduling, storage — happens in the
browser. This document explains how the pieces fit together.

## High level

```
Browser
├── React UI (pages + components)
├── ReviewerContext ............ shared state + actions, warms the engine
├── Stockfish 18 (WASM) ........ separate Web Worker, UCI over postMessage
├── chess.js ................... move legality, SAN/FEN, PGN parsing
└── localStorage ............... history, SRS state, settings, puzzle rating
```

Data comes from three free sources, all reachable from the browser:

- **chess.com** and **lichess** public APIs (fetch recent games).
- Bundled open datasets (`src/data/*`): openings, tactics puzzles, endgames, piece art.
- **lichess Masters explorer** (optional, for "how strong players handle this").

## The engine wrapper

`src/engine/engine.js` wraps the Stockfish WASM worker in a promise-based API.
Key detail: **all `analyze()` calls are serialized** through an internal chain, so
overlapping requests (e.g. full-game analysis vs. a lazy multi-PV lookup) can never
interleave and corrupt the UCI stream.

```
engine.analyze(fen, { depth, multipv })
  → position fen … ; go depth …
  → collects `info` lines, resolves on `bestmove`
  → { bestmove, lines: [{ multipv, cp, mate, pv }] }
```

Scores are side-to-move relative (UCI standard); the analysis layer converts them
to White's perspective for the eval bar/graph and to the mover's perspective for
classification.

## Analysis pipeline (`src/lib/analyze.js`)

1. Replay the PGN to get the FEN before every move.
2. Evaluate **each position once** (N+1 evals for N moves).
3. For each move, compare the mover's win% before vs. after:
   - `classify.js` assigns a tag from the win% loss (Best/Solid/…/Drop) and a
     per-move accuracy (logistic curve).
   - `coach.js` turns board facts (captures, hanging pieces, forks/pins/skewers,
     mate threats) into a plain-English note — pure rules, no LLM.
4. Aggregate: game accuracy (**harmonic mean**, so blunders weigh heavily),
   per-phase accuracy, rough rating, move-classification counts, eval series.

## Classification & accuracy

- Win% uses the standard logistic curve on centipawns; mate scores map to large
  magnitudes.
- Per-move accuracy uses the widely-published lichess formula.
- Game accuracy is the **harmonic mean** of per-move accuracies — a few blunders
  drag it down realistically instead of being averaged away.

## Training & scheduling

- `src/lib/srs.js` implements **FSRS-4.5** (stability/difficulty/retrievability,
  0.9 target retention). Puzzles are graded pass/fail (solve = "good", miss = "again").
- `src/lib/progress.js` keeps an Elo-style **puzzle rating** that adjusts against
  each puzzle's own rating, plus a solved set.
- Puzzles come from two sources unified into one queue: the user's own blunders
  (from stored reviews) and the bundled tactics bank.

## State & routing

- `ReviewerContext` holds the engine ref, current analysis, history, and settings
  (board theme, piece set — reactive so changes apply instantly). It warms the
  engine on mount so the first review is fast.
- `react-router` routes: `/`, `/review`, `/train`, `/endgames`, `/openings`,
  `/weaknesses`. Reviews can also be shared via a URL that encodes the PGN.

## Internationalisation

All user-facing copy lives in `src/locales/en.json` and is read through
`react-i18next`. No hardcoded strings in components — adding a language is one JSON
file plus a registration in `src/i18n.js`.

## Cost model

Because analysis runs on the visitor's CPU and data is bundled or fetched from free
public endpoints, hosting is just static files. The app scales to any number of
users at $0 server cost.
