import { Redis } from '@upstash/redis';

export const config = { runtime: 'edge' };

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.pathname.split('/').filter(Boolean).pop() ?? '';

  const origin = `${url.protocol}//${url.host}`;
  const canonicalUrl = `${origin}/g/${code}`;
  let ogImageUrl = `${origin}/api/og?code=${code}`;

  // Fetch game from Redis
  let title = 'A oneshot game';
  let trackCount = 0;

  if (/^[a-z0-9]{7}$/.test(code)) {
    try {
      const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
      const raw = await redis.get<string>(`game:${code}`);
      if (raw) {
        const game: { title?: string | null; trackIds?: number[] } =
          typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (game.title) title = game.title;
        if (Array.isArray(game.trackIds)) trackCount = game.trackIds.length;
        ogImageUrl = `${origin}/api/og?title=${encodeURIComponent(title)}&count=${trackCount}`;
      }
    } catch {
      // fall through to defaults
    }
  }

  const description = `${trackCount} track${trackCount === 1 ? '' : 's'} · Guess each song from a 1-second clip`;

  // Fetch the built index.html from the CDN
  const htmlRes = await fetch(`${origin}/index.html`);
  const html = await htmlRes.text();

  const ogTags = `
    <meta property="og:title" content="${escHtml(title)}" />
    <meta property="og:description" content="${escHtml(description)}" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escHtml(title)}" />
    <meta name="twitter:description" content="${escHtml(description)}" />
    <meta name="twitter:image" content="${ogImageUrl}" />`;

  // Replace the generic OG tags in index.html with per-game ones
  const injected = html
    .replace(/<meta property="og:title"[^>]*>/g, '')
    .replace(/<meta property="og:description"[^>]*>/g, '')
    .replace(/<meta property="og:type"[^>]*>/g, '')
    .replace(/<meta name="twitter:card"[^>]*>/g, '')
    .replace('</head>', `${ogTags}\n  </head>`);

  return new Response(injected, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
