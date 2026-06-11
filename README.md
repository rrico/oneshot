# oneshot

Turn any playlist into a Heardle-style music guessing game. Build a playlist from Deezer tracks, copy one link, and send it to friends — **no accounts, no logins, no backend**.

For each song, players get **six attempts** while progressively longer snippets unlock (**1s → 2s → 4s → 7s → 11s → 16s**). Skips and wrong guesses both cost an attempt. Finish the playlist and copy an emoji recap to paste back into the chat.

## How it works

- **Create** (`#/create`): two-pane studio — search Deezer on the left, your playlist on the right. Preview tracks instantly, drag to reorder, name your game, copy the link.
- **Play** (`#/play?d=...`): the playlist is encoded entirely in the URL. Opening the link hydrates the game; nothing is stored anywhere.
- **Share back**: the end-of-run recap copies an emoji results grid + the game link.

## Tech

- Vite + React + TypeScript, Tailwind CSS
- Hash routing (deep links survive reloads on GitHub Pages — no server rewrites needed)
- Deezer public API via JSONP (no key required), preview audio via `HTMLAudioElement`
- Zero backend: hosted as a static site on GitHub Pages

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (codec, round model, recap)
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build locally
```

## Deployment

The site is published to classic GitHub Pages from the `gh-pages` branch. `main` stays source-only; the built `dist/` is never committed to it.

One-time setup: repository **Settings → Pages → Source: Deploy from a branch → Branch: `gh-pages` / `/ (root)`** (the branch is created by the first deploy below).

To publish the current `main` to GitHub Pages:

```bash
npm run deploy
```

This runs the tests, builds to `dist/`, and force-pushes the build output to the `gh-pages` branch on `origin` (via the [`gh-pages`](https://www.npmjs.com/package/gh-pages) package). After pushing changes to `main`, run it again to update the live site.

The Vite `base` is relative (`./`), so the build works at any Pages URL (user or project site) without configuration.

## No environment variables

The MVP needs none (see `.env.example`). No secrets ship in the bundle.
