import { createApp } from './app';
import { deleteExpired } from './lib/db';
import { games } from './routes/games';
import { og } from './routes/og';
import { results } from './routes/results';
import { share } from './routes/share';

/*
 * Everything except /api/* and /g/* is served straight from static assets
 * (see `assets.run_worker_first` in wrangler.jsonc), so this app only sees
 * API and share-link requests.
 */
const app = createApp()
  .route('/api/games', games)
  .route('/api/games', results)
  .route('/api/og', og)
  .route('/g', share)
  .notFound((c) =>
    c.req.path.startsWith('/api/') ? c.json({ error: 'Not found' }, 404) : c.env.ASSETS.fetch(c.req.raw),
  )
  .onError((err, c) => {
    console.error(err);
    return c.json({ error: 'Internal error' }, 500);
  });

export default {
  fetch: app.fetch,
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(deleteExpired(env.DB));
  },
} satisfies ExportedHandler<Env>;
