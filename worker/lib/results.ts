import type { Game, Play } from './db';
import type { PerTrackResult } from './schemas';

const isPlayable = (t: PerTrackResult) => t.outcome !== 'unplayable' && t.outcome !== 'skipped';

/** Score a submitted run: fraction of playable tracks that were won. */
export function scorePlay(perTrack: PerTrackResult[]) {
  const playable = perTrack.filter(isPlayable);
  const won = playable.filter((t) => t.outcome === 'won');
  return {
    score: playable.length > 0 ? won.length / playable.length : 0,
    wonTracks: won.length,
    playableTracks: playable.length,
  };
}

/** Aggregate all plays of a game into the dashboard response. */
export function aggregateResults(game: Game, plays: Play[]) {
  const totalPlays = plays.length;
  const avgScore = totalPlays > 0 ? plays.reduce((sum, p) => sum + p.score, 0) / totalPlays : 0;

  const trackStats = new Map<number, { wins: number; totalAttempts: number; countWithAttempts: number; plays: number }>();
  for (const play of plays) {
    for (const t of play.perTrack) {
      if (!isPlayable(t)) continue;
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

  const metaById = new Map((game.tracks ?? []).map((t) => [t.id, t]));

  const perTrack = game.trackIds.map((id) => {
    const stats = trackStats.get(id) ?? { wins: 0, totalAttempts: 0, countWithAttempts: 0, plays: 0 };
    const meta = metaById.get(id);
    return {
      trackId: id,
      title: meta?.title ?? null,
      artist: meta?.artist ?? null,
      artUrl: meta?.artUrl ?? null,
      winRate: stats.plays > 0 ? stats.wins / stats.plays : null,
      avgAttemptsUsed: stats.countWithAttempts > 0 ? stats.totalAttempts / stats.countWithAttempts : null,
    };
  });

  // Hardest first (lowest win rate); tracks nobody played go last.
  perTrack.sort((a, b) => {
    if (a.winRate === null && b.winRate === null) return 0;
    if (a.winRate === null) return 1;
    if (b.winRate === null) return -1;
    return a.winRate - b.winRate;
  });

  const buckets = new Map<number, number>();
  for (const play of plays) {
    const pct = Math.round(play.score * 100);
    buckets.set(pct, (buckets.get(pct) ?? 0) + 1);
  }
  const scoreDistribution = [...buckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([pct, count]) => ({ pct, count }));

  return {
    gameTitle: game.title,
    trackCount: game.trackIds.length,
    expiresAt: game.expiresAt,
    totalPlays,
    avgScore,
    scoreDistribution,
    perTrack,
    plays: [...plays]
      .sort((a, b) => b.completedAt - a.completedAt)
      .map(({ completedAt, score, wonTracks, playableTracks }) => ({ completedAt, score, wonTracks, playableTracks })),
  };
}
