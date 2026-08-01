# Changelog

All notable changes to PawnLens are documented here. The format is loosely based
on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Game review with Stockfish 18 (WASM), eval bar/graph, best-move arrows.
- Plain-English coach: hanging pieces, forks, pins, skewers, mates, bad trades.
- Move classification (Sharp/Best/Solid/Fine/Loose/Slip/Drop) and accuracy.
- In-review learning: guess-the-move, show-threats, try-the-better-move, free
  explore board, auto-narration.
- Result-aware review (resignation / time / checkmate / draw).
- Train: unified queue of your mistakes + a 3,300-puzzle tactics bank, FSRS
  spaced repetition, adjusting puzzle rating, theme filters.
- Openings trainer (3,807 named lines, bot plays the opponent).
- Endgame trainer (classic technique wins vs the engine).
- Weakness analyzer with per-move evidence and jump-to-position, accuracy trend,
  mistake heatmap, worst openings.
- Themes (light/dark), board themes, selectable piece sets, synthesized sounds,
  full i18n, shareable review links.

### Notes
- Runs entirely client-side; no backend, no login, no tracking.
