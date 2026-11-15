import { createExecutionContext, createScheduledController, env, waitOnExecutionContext } from 'cloudflare:test';
import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import worker from '../index';

const BASE = 'https://oneshot.test';
const api = (path: string, init?: RequestInit) => exports.default.fetch(new Request(`${BASE}${path}`, init));
const postJson = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  api(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

const SESSION = '11111111-2222-3333-4444-555555555555';

async function createGame(body: Record<string, unknown> = {}) {
  const res = await postJson('/api/games', {
    trackIds: [101, 202, 303],
    title: 'Road trip',
    tracks: [{ id: 101, title: 'Song A', artist: 'Artist A', artUrl: 'https://img/a' }],
    ...body,
  });
  expect(res.status).toBe(201);
  return (await res.json()) as { code: string; creatorToken: string };
}

describe('POST /api/games', () => {
  it('creates a game with a 7-char code and a creator token', async () => {
    const { code, creatorToken } = await createGame();
    expect(code).toMatch(/^[a-z0-9]{7}$/);
    expect(creatorToken).toMatch(/^[a-z0-9]{32}$/);
  });

  it.each([
    [{ trackIds: [] }],
    [{ trackIds: [1.5] }],
    [{ trackIds: [-1] }],
    [{ trackIds: Array.from({ length: 101 }, (_, i) => i + 1) }],
    [{ trackIds: [1], title: 'x'.repeat(121) }],
    [{}],
  ])('rejects invalid body %j', async (body) => {
    const res = await postJson('/api/games', body);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
  });

  it('drops malformed track metadata instead of failing', async () => {
    const { code, creatorToken } = await createGame({ tracks: [{ id: 'nope' }] });
    const res = await api(`/api/games/${code}/results?token=${creatorToken}`);
    const data = (await res.json()) as { perTrack: Array<{ title: string | null }> };
    expect(data.perTrack.every((t) => t.title === null)).toBe(true);
  });
});

describe('GET /api/games/:code', () => {
  it('returns public game data without server-only fields', async () => {
    const { code } = await createGame();
    const res = await api(`/api/games/${code}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ trackIds: [101, 202, 303], title: 'Road trip', playCount: 0 });
  });

  it('400s on a malformed code and 404s on an unknown one', async () => {
    expect((await api('/api/games/BAD')).status).toBe(400);
    expect((await api('/api/games/zzzzzzz')).status).toBe(404);
  });

  it('treats expired games as missing', async () => {
    const { code } = await createGame();
    await env.DB.prepare('UPDATE games SET expires_at = unixepoch() - 1 WHERE code = ?').bind(code).run();
    expect((await api(`/api/games/${code}`)).status).toBe(404);
  });
});

describe('results', () => {
  const submit = (code: string, perTrack: unknown[], ip = '203.0.113.1') =>
    postJson(`/api/games/${code}/results`, { sessionId: SESSION, perTrack }, { 'CF-Connecting-IP': ip });

  it('records a play and aggregates it for the creator and the player', async () => {
    const { code, creatorToken } = await createGame();
    const res = await submit(code, [
      { trackId: 101, outcome: 'won', attemptsUsed: 2 },
      { trackId: 202, outcome: 'lost', attemptsUsed: 6 },
      { trackId: 303, outcome: 'unplayable', attemptsUsed: 0 },
    ]);
    expect(res.status).toBe(200);

    expect(((await (await api(`/api/games/${code}`)).json()) as { playCount: number }).playCount).toBe(1);

    for (const token of [creatorToken, SESSION]) {
      const r = await api(`/api/games/${code}/results?token=${token}`);
      expect(r.status).toBe(200);
      const data = (await r.json()) as Record<string, unknown>;
      expect(data).toMatchObject({
        gameTitle: 'Road trip',
        trackCount: 3,
        totalPlays: 1,
        avgScore: 0.5,
        scoreDistribution: [{ pct: 50, count: 1 }],
        plays: [{ score: 0.5, wonTracks: 1, playableTracks: 2 }],
      });
      // Hardest first; unplayed tracks last.
      expect(data.perTrack).toEqual([
        { trackId: 202, title: null, artist: null, artUrl: null, winRate: 0, avgAttemptsUsed: null },
        { trackId: 101, title: 'Song A', artist: 'Artist A', artUrl: 'https://img/a', winRate: 1, avgAttemptsUsed: 2 },
        { trackId: 303, title: null, artist: null, artUrl: null, winRate: null, avgAttemptsUsed: null },
      ]);
    }
  });

  it('upserts repeat submissions from the same session', async () => {
    const { code } = await createGame();
    await submit(code, [{ trackId: 101, outcome: 'lost', attemptsUsed: 6 }]);
    await submit(code, [{ trackId: 101, outcome: 'won', attemptsUsed: 1 }]);
    const { playCount } = (await (await api(`/api/games/${code}`)).json()) as { playCount: number };
    expect(playCount).toBe(1);
  });

  it('403s without a valid token', async () => {
    const { code } = await createGame();
    expect((await api(`/api/games/${code}/results`)).status).toBe(403);
    expect((await api(`/api/games/${code}/results?token=wrong`)).status).toBe(403);
  });

  it('validates the submission body and the game', async () => {
    const { code } = await createGame();
    expect((await postJson(`/api/games/${code}/results`, { sessionId: 'x', perTrack: [] })).status).toBe(400);
    expect((await submit(code, [{ trackId: 1, outcome: 'cheated', attemptsUsed: 1 }])).status).toBe(400);
    expect((await submit('zzzzzzz', [{ trackId: 1, outcome: 'won', attemptsUsed: 1 }])).status).toBe(404);
  });

  it('rate limits submissions per IP', async () => {
    const { code } = await createGame();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await submit(code, [{ trackId: 101, outcome: 'won', attemptsUsed: 1 }], '198.51.100.7')).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('GET /g/:code', () => {
  it('injects per-game Open Graph tags into the SPA shell', async () => {
    const { code } = await createGame({ title: 'Quiz <night> & "more"' });
    const res = await api(`/g/${code}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('<meta property="og:title" content="Quiz &lt;night&gt; &amp; &quot;more&quot;" />');
    expect(html).toContain(`<meta property="og:url" content="${BASE}/g/${code}" />`);
    expect(html).toContain('3 tracks · Guess each song');
    expect(html).not.toContain('content="/api/og?title=oneshot"'); // generic tags removed
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html).toContain('<div id="root">');
  });

  it('falls back to generic tags for unknown codes', async () => {
    const html = await (await api('/g/zzzzzzz')).text();
    expect(html).toContain('<meta property="og:title" content="A oneshot game" />');
  });
});

describe('scheduled cleanup', () => {
  it('deletes expired games and their plays, keeping live ones', async () => {
    const live = await createGame();
    const dead = await createGame();
    await postJson(`/api/games/${dead.code}/results`, {
      sessionId: SESSION,
      perTrack: [{ trackId: 101, outcome: 'won', attemptsUsed: 1 }],
    }, { 'CF-Connecting-IP': '192.0.2.50' });
    await env.DB.prepare('UPDATE games SET expires_at = unixepoch() - 1 WHERE code = ?').bind(dead.code).run();

    const ctx = createExecutionContext();
    await worker.scheduled(createScheduledController(), env, ctx);
    await waitOnExecutionContext(ctx);

    const codes = await env.DB.prepare('SELECT code FROM games').all<{ code: string }>();
    expect(codes.results.map((r) => r.code)).toContain(live.code);
    expect(codes.results.map((r) => r.code)).not.toContain(dead.code);
    const plays = await env.DB.prepare('SELECT COUNT(*) AS n FROM plays WHERE game_code = ?').bind(dead.code).first<{ n: number }>();
    expect(plays?.n).toBe(0);
  });
});
