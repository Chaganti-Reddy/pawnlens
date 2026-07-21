# Contributing to PawnLens

Thanks for taking the time to help out! PawnLens is a small, friendly project and
contributions of any size are welcome — bug reports, docs, coach rules, UI polish.

## Getting started

```bash
git clone https://github.com/Chaganti-Reddy/pawnlens.git
cd pawnlens
npm install
npm run dev
```

The whole app runs client-side, so there's no backend to set up. Analysis uses
Stockfish compiled to WebAssembly (`public/engine/`).

## Ground rules

- Keep it **zero-cost and client-side**. No feature should require a paid API or a
  server we have to run. Free, public APIs (chess.com, lichess) and in-browser
  compute only.
- Run `npm run lint` and `npm run build` before opening a PR.
- Match the surrounding code style. No formatter config to fight — just keep it tidy.
- One focused change per PR. Small is easier to review.

## Good first issues

- New rule-based coach explanations (`src/lib/coach.js`) — pins, skewers,
  discovered attacks, overloaded pieces.
- Opening-name coverage and a "book move" tag.
- Accessibility passes on the board and move list.

## Reporting bugs

Open an issue with the steps to reproduce, the game (PGN or a chess.com/lichess
link), and what you expected. Screenshots help.

## Licensing

By contributing you agree your work is licensed under the project's GPL-3.0 license.
