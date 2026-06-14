import { Redis } from '@upstash/redis';

export const config = { runtime: 'edge' };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
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
  const raw = await redis.get<string>(`game:${code}`);

  if (!raw) {
    return json({ error: 'Game not found' }, 404);
  }

  const game: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return json(game);
}
