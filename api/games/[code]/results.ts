import { Redis } from '@upstash/redis';

export const config = { runtime: 'edge' };

const MAX_RESULTS = 1000;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function extractCode(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  // /api/games/{code}/results → parts = ['api', 'games', '{code}', 'results']
  return parts[parts.length - 2] ?? '';
}

type TrackMeta = { id: number; title: string; artist: string; artUrl: string };

type StoredPlay = {
  sessionId: string;
  completedAt: number;
  score: number;
  wonTracks: number;
  playableTracks: number;
  perTrack: Array<{ trackId: number; outcome: string; attemptsUsed: number }>;
};

type GameRecord = {
  trackIds: number[];
  title?: string | null;
  creatorToken?: string;
  tracks?: TrackMeta[] | null;
};

// --- POST /api/games/:code/results -------------------------------------------

async function handlePost(request: Request, redis: Redis, code: string): Promise<Response> {
  // Rate limit: 10 submissions per IP per hour
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rateLimitKey = `ratelimit:results:${ip}`;
  const count = await redis.incr(rateLimitKey);
  if (count === 1) await redis.expire(rateLimitKey, 3600);
  if (count > 10) return json({ error: 'Rate limit exceeded' }, 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const b = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null;
  if (!b) return json({ error: 'Invalid body' }, 400);

  const { sessionId, perTrack } = b as { sessionId?: unknown; perTrack?: unknown };

  if (typeof sessionId !== 'string' || !/^[0-9a-f-]{36}$/.test(sessionId)) {
    return json({ error: 'Invalid sessionId' }, 400);
  }
  if (!Array.isArray(perTrack) || perTrack.length === 0) {
    return json({ error: 'perTrack must be a non-empty array' }, 400);
  }

  const validOutcomes = new Set(['won', 'lost', 'unplayable', 'skipped']);
  const tracks = perTrack as Array<Record<string, unknown>>;
  const validTracks = tracks.every(
    (t) =>
      typeof t.trackId === 'number' &&
      typeof t.outcome === 'string' &&
      validOutcomes.has(t.outcome) &&
      typeof t.attemptsUsed === 'number',
  );
  if (!validTracks) return json({ error: 'Invalid perTrack entries' }, 400);

  // Verify game exists and get TTL to mirror on results key
  const [gameRaw, gameTtl] = await Promise.all([
    redis.get<string>(`game:${code}`),
    redis.ttl(`game:${code}`),
  ]);
  if (!gameRaw || gameTtl < 0) return json({ error: 'Game not found' }, 404);

  // Enforce cap — reject silently if at limit so the player still sees success
  const currentCount = await redis.hlen(`results:${code}`);
  if (currentCount >= MAX_RESULTS) return json({ ok: true });

  const playable = tracks.filter((t) => t.outcome !== 'unplayable' && t.outcome !== 'skipped');
  const won = playable.filter((t) => t.outcome === 'won');
  const score = playable.length > 0 ? won.length / playable.length : 0;

  const play: StoredPlay = {
    sessionId: sessionId as string,
    completedAt: Math.floor(Date.now() / 1000),
    score,
    wonTracks: won.length,
    playableTracks: playable.length,
    perTrack: tracks.map((t) => ({
      trackId: t.trackId as number,
      outcome: t.outcome as string,
      attemptsUsed: t.attemptsUsed as number,
    })),
  };

  await redis.hset(`results:${code}`, { [sessionId as string]: JSON.stringify(play) });
  await redis.expire(`results:${code}`, gameTtl);

  return json({ ok: true });
}

// --- GET /api/games/:code/results?token=... ----------------------------------

async function handleGet(request: Request, redis: Redis, code: string): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';

  const gameRaw = await redis.get<string>(`game:${code}`);
  if (!gameRaw) return json({ error: 'Game not found' }, 404);

  const game = (typeof gameRaw === 'string' ? JSON.parse(gameRaw) : gameRaw) as GameRecord;

  // Validate token: creator token or valid player sessionId
  const isCreator = token.length > 0 && game.creatorToken === token;
  const isPlayer = !isCreator && token.length > 0 ? (await redis.hexists(`results:${code}`, token)) === 1 : false;

  if (!isCreator && !isPlayer) {
    return json({ error: 'Complete the game to view results.' }, 403);
  }

  // Fetch all play entries
  const rawEntries = await redis.hgetall(`results:${code}`);
  const plays: StoredPlay[] = Object.values(rawEntries ?? {}).map((v) =>
    typeof v === 'string' ? (JSON.parse(v) as StoredPlay) : (v as StoredPlay),
  );

  const totalPlays = plays.length;
  const avgScore = totalPlays > 0 ? plays.reduce((sum, p) => sum + p.score, 0) / totalPlays : 0;

  // Per-track aggregates
  const trackStats = new Map<
    number,
    { wins: number; totalAttempts: number; countWithAttempts: number; plays: number }
  >();
  for (const play of plays) {
    for (const t of play.perTrack) {
      if (t.outcome === 'unplayable' || t.outcome === 'skipped') continue;
      const entry = trackStats.get(t.trackId) ?? { wins: 0, totalAttempts: 0, countWithAttempts: 0, plays: 0 };
      entry.plays++;
      if (t.outcome === 'won') {
        entry.wins++;
        entry.totalAttempts += t.attemptsUsed;
        entry.countWithAttempts++;
      }
      trackStats.set(t.trackId, entry);
    }
  }

  const trackMetaById = new Map<number, TrackMeta>(
    (game.tracks ?? []).map((t) => [t.id, t]),
  );

  const perTrackResult = game.trackIds.map((id) => {
    const stats = trackStats.get(id) ?? { wins: 0, totalAttempts: 0, countWithAttempts: 0, plays: 0 };
    const meta = trackMetaById.get(id);
    return {
      trackId: id,
      title: meta?.title ?? null,
      artist: meta?.artist ?? null,
      artUrl: meta?.artUrl ?? null,
      winRate: stats.plays > 0 ? stats.wins / stats.plays : null,
      avgAttemptsUsed: stats.countWithAttempts > 0 ? stats.totalAttempts / stats.countWithAttempts : null,
    };
  });

  // Sort hardest first (lowest winRate; null winRates go last)
  perTrackResult.sort((a, b) => {
    if (a.winRate === null && b.winRate === null) return 0;
    if (a.winRate === null) return 1;
    if (b.winRate === null) return -1;
    return a.winRate - b.winRate;
  });

  // Score distribution
  const scoreBuckets = new Map<number, number>();
  for (const play of plays) {
    const pct = Math.round(play.score * 100);
    scoreBuckets.set(pct, (scoreBuckets.get(pct) ?? 0) + 1);
  }
  const scoreDistribution = [...scoreBuckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([pct, count]) => ({ pct, count }));

  const gameTtl = await redis.ttl(`game:${code}`);
  const expiresAt = gameTtl > 0 ? Math.floor(Date.now() / 1000) + gameTtl : null;

  const playsResponse = plays
    .sort((a, b) => b.completedAt - a.completedAt)
    .map(({ completedAt, score, wonTracks, playableTracks }) => ({
      completedAt,
      score,
      wonTracks,
      playableTracks,
    }));

  return json({
    gameTitle: game.title ?? null,
    trackCount: game.trackIds.length,
    expiresAt,
    totalPlays,
    avgScore,
    scoreDistribution,
    perTrack: perTrackResult,
    plays: playsResponse,
  });
}

// --- Router ------------------------------------------------------------------

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = extractCode(url);

  if (!/^[a-z0-9]{7}$/.test(code)) {
    return json({ error: 'Invalid code' }, 400);
  }

  const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });

  if (request.method === 'POST') return handlePost(request, redis, code);
  if (request.method === 'GET') return handleGet(request, redis, code);
  return json({ error: 'Method not allowed' }, 405);
}
