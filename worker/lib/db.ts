import type { PerTrackResult, TrackMeta } from './schemas';

export const GAME_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

export const now = () => Math.floor(Date.now() / 1000);

export type Game = {
  code: string;
  title: string | null;
  creatorToken: string;
  trackIds: number[];
  tracks: TrackMeta[] | null;
  createdAt: number;
  expiresAt: number;
};

export type Play = {
  sessionId: string;
  completedAt: number;
  score: number;
  wonTracks: number;
  playableTracks: number;
  perTrack: PerTrackResult[];
};

type GameRow = {
  code: string;
  title: string | null;
  creator_token: string;
  track_ids: string;
  tracks: string | null;
  created_at: number;
  expires_at: number;
};

type PlayRow = {
  session_id: string;
  completed_at: number;
  score: number;
  won_tracks: number;
  playable_tracks: number;
  per_track: string;
};

const toGame = (r: GameRow): Game => ({
  code: r.code,
  title: r.title,
  creatorToken: r.creator_token,
  trackIds: JSON.parse(r.track_ids) as number[],
  tracks: r.tracks ? (JSON.parse(r.tracks) as TrackMeta[]) : null,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
});

const toPlay = (r: PlayRow): Play => ({
  sessionId: r.session_id,
  completedAt: r.completed_at,
  score: r.score,
  wonTracks: r.won_tracks,
  playableTracks: r.playable_tracks,
  perTrack: JSON.parse(r.per_track) as PerTrackResult[],
});

const selectGame = (db: D1Database, code: string) =>
  db.prepare('SELECT * FROM games WHERE code = ? AND expires_at > unixepoch()').bind(code);

const countPlaysStmt = (db: D1Database, code: string) =>
  db.prepare('SELECT COUNT(*) AS n FROM plays WHERE game_code = ?').bind(code);

/** Fetch a live (non-expired) game, or null. */
export async function getGame(db: D1Database, code: string): Promise<Game | null> {
  const row = await selectGame(db, code).first<GameRow>();
  return row ? toGame(row) : null;
}

/** Fetch a live game together with its play count in one round trip. */
export async function getGameWithPlayCount(
  db: D1Database,
  code: string,
): Promise<{ game: Game; playCount: number } | null> {
  const [gameRes, countRes] = await db.batch([selectGame(db, code), countPlaysStmt(db, code)]);
  const row = (gameRes.results as GameRow[])[0];
  if (!row) return null;
  const playCount = (countRes.results as Array<{ n: number }>)[0]?.n ?? 0;
  return { game: toGame(row), playCount };
}

/** Insert a game. Returns false if the code already exists (caller retries with a new code). */
export async function insertGame(db: D1Database, game: Game): Promise<boolean> {
  const row = await db
    .prepare(
      `INSERT INTO games (code, title, creator_token, track_ids, tracks, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (code) DO NOTHING
       RETURNING code`,
    )
    .bind(
      game.code,
      game.title,
      game.creatorToken,
      JSON.stringify(game.trackIds),
      game.tracks ? JSON.stringify(game.tracks) : null,
      game.createdAt,
      game.expiresAt,
    )
    .first<{ code: string }>();
  return row !== null;
}

export async function countPlays(db: D1Database, code: string): Promise<number> {
  return (await countPlaysStmt(db, code).first<{ n: number }>())?.n ?? 0;
}

/** Insert or replace a player's result for a game (one row per session). */
export async function upsertPlay(db: D1Database, code: string, play: Play): Promise<void> {
  await db
    .prepare(
      `INSERT INTO plays (game_code, session_id, completed_at, score, won_tracks, playable_tracks, per_track)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (game_code, session_id) DO UPDATE SET
         completed_at = excluded.completed_at,
         score = excluded.score,
         won_tracks = excluded.won_tracks,
         playable_tracks = excluded.playable_tracks,
         per_track = excluded.per_track`,
    )
    .bind(
      code,
      play.sessionId,
      play.completedAt,
      play.score,
      play.wonTracks,
      play.playableTracks,
      JSON.stringify(play.perTrack),
    )
    .run();
}

export async function hasPlay(db: D1Database, code: string, sessionId: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 AS x FROM plays WHERE game_code = ? AND session_id = ?')
    .bind(code, sessionId)
    .first();
  return row !== null;
}

export async function listPlays(db: D1Database, code: string): Promise<Play[]> {
  const { results } = await db
    .prepare('SELECT * FROM plays WHERE game_code = ? ORDER BY completed_at DESC')
    .bind(code)
    .all<PlayRow>();
  return results.map(toPlay);
}

/** Delete expired games and their plays. Run from the scheduled handler. */
export async function deleteExpired(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(
      'DELETE FROM plays WHERE game_code IN (SELECT code FROM games WHERE expires_at <= unixepoch())',
    ),
    db.prepare('DELETE FROM games WHERE expires_at <= unixepoch()'),
  ]);
}
