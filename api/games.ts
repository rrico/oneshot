import { Redis } from '@upstash/redis';

export const config = { runtime: 'edge' };

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const CODE_TTL = 60 * 60 * 24 * 90; // 90 days

function generateCode(length = 7): string {
  const arr = new Uint8Array(length);
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

  const { trackIds, title, tracks } = body as { trackIds: number[]; title?: unknown; tracks?: unknown };

  if (trackIds.length === 0 || trackIds.length > 100) {
    return json({ error: 'trackIds must have 1–100 entries' }, 400);
  }

  if (title !== undefined && (typeof title !== 'string' || title.length > 120)) {
    return json({ error: 'title must be a string up to 120 characters' }, 400);
  }

  // Validate optional track metadata (used to serve rich results without extra Deezer calls)
  type TrackMeta = { id: number; title: string; artist: string; artUrl: string };
  let trackMeta: TrackMeta[] | null = null;
  if (Array.isArray(tracks)) {
    const valid = (tracks as unknown[]).every(
      (t) =>
        typeof t === 'object' &&
        t !== null &&
        typeof (t as Record<string, unknown>).id === 'number' &&
        typeof (t as Record<string, unknown>).title === 'string' &&
        typeof (t as Record<string, unknown>).artist === 'string' &&
        typeof (t as Record<string, unknown>).artUrl === 'string',
    );
    if (valid) {
      trackMeta = (tracks as TrackMeta[]).map(({ id, title: t, artist, artUrl }) => ({ id, title: t, artist, artUrl }));
    }
  }

  const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
  const code = generateCode(7);
  const creatorToken = generateCode(32);
  const game = { trackIds, title: title ?? null, creatorToken, tracks: trackMeta };

  await redis.set(`game:${code}`, JSON.stringify(game), { ex: CODE_TTL });

  return json({ code, creatorToken });
}
