import { Redis } from '@upstash/redis';

export const config = { runtime: 'edge' };

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const CODE_TTL = 60 * 60 * 24 * 90; // 90 days

function generateCode(): string {
  const arr = new Uint8Array(7);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => CHARS[b % CHARS.length]).join('');
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const bodyObj = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null;
  const rawIds = bodyObj?.trackIds;
  if (
    !bodyObj ||
    !Array.isArray(rawIds) ||
    !(rawIds as unknown[]).every((id) => typeof id === 'number' && Number.isInteger(id) && id > 0)
  ) {
    return json({ error: 'Invalid playlist: trackIds must be a non-empty array of positive integers' }, 400);
  }

  const { trackIds, title } = body as { trackIds: number[]; title?: unknown };

  if (trackIds.length === 0 || trackIds.length > 100) {
    return json({ error: 'trackIds must have 1–100 entries' }, 400);
  }

  if (title !== undefined && (typeof title !== 'string' || title.length > 120)) {
    return json({ error: 'title must be a string up to 120 characters' }, 400);
  }

  const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
  const code = generateCode();
  const game = { trackIds, title: title ?? null };

  await redis.set(`game:${code}`, JSON.stringify(game), { ex: CODE_TTL });

  return json({ code });
}
