-- Games: one row per short link. Expire 90 days after creation.
CREATE TABLE games (
  code          TEXT PRIMARY KEY,
  title         TEXT,
  creator_token TEXT NOT NULL,
  track_ids     TEXT NOT NULL,   -- JSON array of Deezer track ids
  tracks        TEXT,            -- JSON array of {id,title,artist,artUrl}, or NULL
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL
);
CREATE INDEX games_expires_at ON games (expires_at);

-- Plays: one row per (game, player session).
CREATE TABLE plays (
  game_code       TEXT NOT NULL REFERENCES games (code) ON DELETE CASCADE,
  session_id      TEXT NOT NULL,
  completed_at    INTEGER NOT NULL,
  score           REAL NOT NULL,
  won_tracks      INTEGER NOT NULL,
  playable_tracks INTEGER NOT NULL,
  per_track       TEXT NOT NULL,   -- JSON array of {trackId,outcome,attemptsUsed}
  PRIMARY KEY (game_code, session_id)
);
