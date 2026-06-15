import { Redis } from '@upstash/redis';

export const config = { runtime: 'edge' };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const code = url.pathname.split('/').filter(Boolean).pop() ?? '';

  if (!/^[a-z0-9]{7}$/.test(code)) {
    return json({ error: 'Invalid code' }, 400);
  }

  const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
  const [raw, playCount] = await Promise.all([
    redis.get<string>(`game:${code}`),
    redis.hlen(`results:${code}`),
  ]);

  if (!raw) {
    return json({ error: 'Game not found' }, 404);
  }

  const game = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, unknown>;
  // Strip server-only fields before returning to players
  const { creatorToken: _ct, tracks: _tr, ...publicGame } = game;
  return json({ ...publicGame, playCount });
}
