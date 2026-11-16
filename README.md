# oneshot

Turn any playlist into a Heardle-style music guessing game. Build a playlist from Deezer tracks, share one short link, and send it to friends.

For each song, players get **six attempts** while progressively longer snippets unlock (**1s → 2s → 4s → 7s → 11s → 16s**). Skips and wrong guesses both cost an attempt. Finish the playlist and copy an emoji recap to paste back into the chat.

**Live at:** https://play.oneshot.workers.dev (Cloudflare Workers)

## How it works

- **Studio** (`/create`): two-pane editor — search Deezer on the left, your playlist on the right. Preview tracks instantly, drag to reorder, name your game, then hit "Get link" to generate a short shareable URL.
- **Play** (`/g/:code`): open the short link — the game loads from the backend, no account needed.
- **Play (legacy)** (`/play?d=...`): playlist encoded directly in the URL, still supported for old links.
- **Share back**: the end-of-run recap copies an emoji results grid + the game link.

## Tech

- Vite + React + TypeScript, Tailwind CSS v4
- Path-based routing via React Router 7 `createBrowserRouter`
- Deezer public API via JSONP (no key required), preview audio via `HTMLAudioElement`
- **Cloudflare Workers** with Static Assets: one Worker serves the SPA and the API
- **Hono** router with **zod** request validation (`worker/`)
- **D1** (SQLite) for games and results, **Workers Rate Limiting** for result submissions, a daily **Cron Trigger** to purge expired games
- Dynamic OG images via `@cf-wasm/og` (Satori + resvg, WASM), edge-cached with the Cache API
- `@cloudflare/vite-plugin` runs the Worker in `workerd` during `vite dev` and builds both halves on `vite build`

## Architecture

```
/                   → Landing page
/create             → Studio (playlist builder)
/play?d=...         → Play (playlist encoded in URL)
/g/:code            → Play (short link, loads game from API)
/results?d=&r=...   → Results / recap view
/dashboard          → My games (creator's games, from localStorage)
/dashboard/:code    → Creator results dashboard

/api/games                POST  Create a game → { code, creatorToken }
/api/games/:code          GET   Public game data → { trackIds, title, playCount }
/api/games/:code/results  POST  Submit a finished run (rate limited per IP)
/api/games/:code/results  GET   Aggregated results (?token= creator token or player session)
/api/og                   GET   Dynamic OG image (1200×630 PNG)
/g/:code                  GET   SPA shell with per-game OG tags injected (HTMLRewriter)
```

Only `/api/*` and `/g/*` invoke the Worker (`assets.run_worker_first` in `wrangler.jsonc`); every other path is served directly from static assets, with unknown paths falling back to `index.html`.

```
worker/
  index.ts          Hono app + scheduled() cleanup handler
  routes/           games, results, og, share (/g/:code)
  lib/db.ts         D1 queries
  lib/results.ts    scoring + dashboard aggregation
  lib/schemas.ts    zod request schemas
  test/             integration tests (run inside workerd)
migrations/         D1 schema migrations
```

### Data

Two D1 tables (`migrations/0001_init.sql`):

- `games`: code, title, creator token, track ids, optional track metadata, `expires_at` (90 days after creation)
- `plays`: one row per (game, player session) with the score and per-track outcomes; capped at 1000 per game

Expired games are hidden from every query immediately and deleted (with their plays) by the daily cron.

## Development

```bash
npm install
npm run db:migrate:local   # create the local D1 schema (once, and after new migrations)
npm run dev                # Vite + Worker (in workerd) at http://localhost:5173
npm test                   # app unit tests (Node) + Worker integration tests (workerd)
npm run typecheck
npm run build              # production build to dist/ (client assets + Worker)
npm run preview            # serve the production build locally in workerd
```

After changing bindings in `wrangler.jsonc`, run `npm run cf-typegen` to regenerate `worker-configuration.d.ts`.

To add a schema change: `npx wrangler d1 migrations create oneshot <name>`, edit the SQL file, then apply it locally and remotely.

## Deployment

The app needs **no secrets or environment variables**. All bindings (D1, rate limiter, assets, cron) are declared in `wrangler.jsonc`.

### First deploy

```bash
npx wrangler login
npm run deploy             # builds and deploys; the D1 database is created on first deploy
npm run db:migrate:remote  # create the schema in the remote database
```

Optionally pin the database: run `npx wrangler d1 create oneshot` first and add the printed `database_id` to the `d1_databases` entry in `wrangler.jsonc`.

### Continuous deployment

Connect the GitHub repository in the Cloudflare dashboard (**Workers & Pages → oneshot → Settings → Builds**):

- Build command: `npm run build && npm run db:migrate:remote`
- Deploy command: `npx wrangler deploy`

Non-production branches get preview URLs automatically.

### Custom domain

Add a route to `wrangler.jsonc` and redeploy:

```jsonc
"routes": [{ "pattern": "oneshot.example.com", "custom_domain": true }]
```
