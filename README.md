# oneshot

Turn any playlist into a Heardle-style music guessing game. Build a playlist from Deezer tracks, share one short link, and send it to friends.

For each song, players get **six attempts** while progressively longer snippets unlock (**1s → 2s → 4s → 7s → 11s → 16s**). Skips and wrong guesses both cost an attempt. Finish the playlist and copy an emoji recap to paste back into the chat.

**Live at:** https://one-shot-chi.vercel.app

## How it works

- **Studio** (`/create`): two-pane editor — search Deezer on the left, your playlist on the right. Preview tracks instantly, drag to reorder, name your game, then hit "Get link" to generate a short shareable URL.
- **Play** (`/g/:code`): open the short link — the game loads from the backend, no account needed.
- **Play (legacy)** (`/play?d=...`): playlist encoded directly in the URL, still supported for old links.
- **Share back**: the end-of-run recap copies an emoji results grid + the game link.

## Tech

- Vite + React + TypeScript, Tailwind CSS v4
- Path-based routing via React Router 7 `createBrowserRouter`
- Deezer public API via JSONP (no key required), preview audio via `HTMLAudioElement`
- Short-link backend: Vercel edge functions + Upstash Redis (via Vercel KV integration)
- Dynamic OG image generation via `@vercel/og`
- Deployed on Vercel

## Architecture

```
/                   → Landing page
/create             → Studio (playlist builder)
/play?d=...         → Play (playlist encoded in URL — legacy / long links)
/g/:code            → Play (short link, loads game from API)
/results?d=&r=...   → Results / recap view

/api/games          POST  Create a game → returns { code }
/api/games/:code    GET   Fetch a game's track list
/api/g/:code        GET   Serve index.html with injected OG tags (for unfurls)
/api/og             GET   Dynamic OG image (1200×630)
```

Short links store `{ trackIds, title }` in Redis with a 90-day TTL. The game data is never stored in a database; the backend holds only track IDs and a title — track metadata (names, artists, previews) is fetched from Deezer at play time.

## Development

```bash
npm install
npm run dev        # local dev server at http://localhost:5173
npm test           # unit tests (codec, round model, recap)
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build locally
```

## Deployment

The project deploys to Vercel automatically on push to `main` (if the GitHub integration is connected), or manually:

```bash
vercel --prod
```

The Vercel project is `one-shot` (linked via `.vercel/project.json`).

### Environment variables

The API functions require Vercel KV credentials. In the Vercel dashboard these are set automatically by the KV integration:

| Variable | Purpose |
|---|---|
| `KV_REST_API_URL` | Upstash Redis REST endpoint |
| `KV_REST_API_TOKEN` | Upstash Redis auth token |

For local API development, add these to `.env.local` (not committed).

The frontend has no environment variables — no secrets ship in the bundle.

## Backward compatibility

Old GitHub Pages links used hash routing (`#/play?d=...`). A redirect shim in `src/main.tsx` catches these and rewrites them to path-based URLs so old shared links still work.
