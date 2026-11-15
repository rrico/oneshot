import { createApp } from '../app';
import { generateCode } from '../lib/codes';
import { GAME_TTL_SECONDS, getGameWithPlayCount, insertGame, now } from '../lib/db';
import { CodeParam, CreateGameBody, TrackMeta } from '../lib/schemas';
import { validate } from '../lib/validate';

const MAX_CODE_ATTEMPTS = 5;

export const games = createApp()
  // POST /api/games — create a game, returns { code, creatorToken }
  .post(
    '/',
    validate('json', CreateGameBody, 'Invalid playlist: trackIds must be 1–100 positive integers, title up to 120 chars'),
    async (c) => {
      const { trackIds, title, tracks } = c.req.valid('json');
      const meta = TrackMeta.array().safeParse(tracks);
      const createdAt = now();

      for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
        const game = {
          code: generateCode(7),
          creatorToken: generateCode(32),
          title: title ?? null,
          trackIds,
          tracks: meta.success ? meta.data.map(({ id, title, artist, artUrl }) => ({ id, title, artist, artUrl })) : null,
          createdAt,
          expiresAt: createdAt + GAME_TTL_SECONDS,
        };
        if (await insertGame(c.env.DB, game)) {
          return c.json({ code: game.code, creatorToken: game.creatorToken }, 201);
        }
      }
      return c.json({ error: 'Could not allocate a game code' }, 503);
    },
  )
  // GET /api/games/:code — public game data for players
  .get('/:code', validate('param', CodeParam, 'Invalid code'), async (c) => {
    const { code } = c.req.valid('param');
    const found = await getGameWithPlayCount(c.env.DB, code);
    if (!found) return c.json({ error: 'Game not found' }, 404);

    const { game, playCount } = found;
    // creatorToken and track metadata are server-only.
    return c.json(
      { trackIds: game.trackIds, title: game.title, playCount },
      200,
      { 'Cache-Control': 'public, max-age=60' },
    );
  });
