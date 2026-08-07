# Deploying PawnLens

PawnLens is a static site (no backend). Any static host works; you only need an
**SPA fallback** so client-side routes (`/review`, `/train`, …) serve `index.html`.
Both configs below are already in the repo.

Build output: `dist/` · Build command: `npm run build` · Node: 20

## Cloudflare Pages (recommended — unlimited bandwidth)

1. Push the repo to GitHub (see below).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Pick the `pawnlens` repo. Settings:
   - Framework preset: **Vite** (or None)
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Deploy. SPA fallback is handled by `public/_redirects` (`/*  /index.html  200`).

## Netlify

1. Push to GitHub.
2. Netlify → **Add new site → Import from Git** → pick `pawnlens`.
3. It auto-detects `netlify.toml` (build + publish + SPA redirect). Deploy.

## First push (SSH remote already set to origin)

```bash
cd pawnlens
git push -u origin main
```

If the GitHub repo doesn't exist yet, create it first (with the GitHub CLI):

```bash
gh repo create pawnlens --public --source=. --remote=origin --push \
  --description "Free, unlimited chess game review in your browser — Stockfish 18 (WASM), plain-English coaching, 11k tactics, FSRS trainer, openings & endgames, weakness analyzer. No server, no login."
gh repo edit --add-topic chess,chess-analysis,game-review,stockfish,chess-engine,wasm,react,vite,client-side,no-backend,tactics-trainer,spaced-repetition,fsrs,lichess,chess-com,opening-trainer,endgame-trainer,open-source,gplv3
```

After the site is live, set the repo homepage: `gh repo edit --homepage "https://<your-url>"`.

## Notes

- COOP/COEP headers are **not** required — PawnLens uses the single-threaded
  Stockfish build on purpose, so no special headers are needed.
- The engine (~7 MB) and data chunks are cached after first load.
