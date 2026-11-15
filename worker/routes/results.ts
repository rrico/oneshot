import { createApp } from '../app';
import { countPlays, getGame, hasPlay, listPlays, now, upsertPlay } from '../lib/db';
import { aggregateResults, scorePlay } from '../lib/results';
import { CodeParam, ResultsQuery, SubmitResultsBody } from '../lib/schemas';
import { validate } from '../lib/validate';

const MAX_RESULTS = 1000;

export const results = createApp()
  // POST /api/games/:code/results — record a finished run
  .post(
    '/:code/results',
    validate('param', CodeParam, 'Invalid code'),
    async (c, next) => {
      const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
      const { success } = await c.env.RESULTS_LIMITER.limit({ key: ip });
      if (!success) return c.json({ error: 'Rate limit exceeded' }, 429);
      await next();
    },
    validate('json', SubmitResultsBody, 'Invalid results body'),
    async (c) => {
      const { code } = c.req.valid('param');
      const { sessionId, perTrack } = c.req.valid('json');

      const game = await getGame(c.env.DB, code);
      if (!game) return c.json({ error: 'Game not found' }, 404);

      // At the cap, report success so the player's flow is unaffected.
      if ((await countPlays(c.env.DB, code)) >= MAX_RESULTS && !(await hasPlay(c.env.DB, code, sessionId))) {
        return c.json({ ok: true });
      }

      await upsertPlay(c.env.DB, code, { sessionId, completedAt: now(), perTrack, ...scorePlay(perTrack) });
      return c.json({ ok: true });
    },
  )
  // GET /api/games/:code/results?token= — dashboard, for the creator or a player who finished
  .get(
    '/:code/results',
    validate('param', CodeParam, 'Invalid code'),
    validate('query', ResultsQuery, 'Invalid query'),
    async (c) => {
      const { code } = c.req.valid('param');
      const token = c.req.valid('query').token ?? '';

      const game = await getGame(c.env.DB, code);
      if (!game) return c.json({ error: 'Game not found' }, 404);

      const isCreator = token.length > 0 && token === game.creatorToken;
      const isPlayer = !isCreator && token.length > 0 && (await hasPlay(c.env.DB, code, token));
      if (!isCreator && !isPlayer) return c.json({ error: 'Complete the game to view results.' }, 403);

      return c.json(aggregateResults(game, await listPlays(c.env.DB, code)));
    },
  );
