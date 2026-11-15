import { createApp } from '../app';
import { GAME_CODE_RE } from '../lib/codes';
import { getGame } from '../lib/db';

const escAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * GET /g/:code — serve the SPA shell with per-game Open Graph tags so links
 * unfurl nicely in chat apps. The SPA itself handles the route client-side.
 */
export const share = createApp().get('/:code', async (c) => {
  const code = c.req.param('code');
  const origin = new URL(c.req.url).origin;

  let title = 'A oneshot game';
  let trackCount = 0;
  let ogImage = `${origin}/api/og?title=${encodeURIComponent(title)}`;

  if (GAME_CODE_RE.test(code)) {
    const game = await getGame(c.env.DB, code).catch(() => null);
    if (game) {
      if (game.title) title = game.title;
      trackCount = game.trackIds.length;
      ogImage = `${origin}/api/og?title=${encodeURIComponent(title)}&count=${trackCount}`;
    }
  }

  const description = `${trackCount} track${trackCount === 1 ? '' : 's'} · Guess each song from a 1-second clip`;
  const tags: Array<[attr: 'property' | 'name', key: string, value: string]> = [
    ['property', 'og:site_name', 'oneshot'],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:image', ogImage],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['property', 'og:image:type', 'image/png'],
    ['property', 'og:url', `${origin}/g/${code}`],
    ['property', 'og:type', 'website'],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
    ['name', 'twitter:image', ogImage],
    ['name', 'twitter:image:width', '1200'],
    ['name', 'twitter:image:height', '630'],
  ];
  const metaHtml = tags.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escAttr(value)}" />`).join('\n');

  const shell = await c.env.ASSETS.fetch(new URL('/', c.req.url));
  const rewritten = new HTMLRewriter()
    .on('meta[property^="og:"]', { element: (el) => void el.remove() })
    .on('meta[name^="twitter:"]', { element: (el) => void el.remove() })
    .on('head', { element: (el) => void el.append(metaHtml, { html: true }) })
    .transform(shell);

  const headers = new Headers(rewritten.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=60');
  headers.delete('ETag');
  return new Response(rewritten.body, { status: 200, headers });
});
