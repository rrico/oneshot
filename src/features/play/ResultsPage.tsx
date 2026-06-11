import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { decodePlaylistParam, decodeResultsParam } from '@/lib/playlist-codec';
import { scoreLine } from '@/lib/recap';
import { RecapCells } from '@/components/game/RecapCells';
import type { TrackResult } from '@/types';

/**
 * Shared results page (#/results?d=...&r=...): shows how a player did —
 * without spoiling the songs — and invites the viewer to play or create.
 */
export function ResultsPage() {
  const [searchParams] = useSearchParams();
  const playlistParam = searchParams.get('d');
  const decoded = useMemo(() => decodePlaylistParam(playlistParam), [playlistParam]);
  const results = useMemo(
    () =>
      decoded.ok
        ? decodeResultsParam(searchParams.get('r'), decoded.playlist.trackIds.length)
        : null,
    [decoded, searchParams],
  );

  if (!decoded.ok || !results || !results.ok) {
    const error = !decoded.ok ? decoded.error : results && !results.ok ? results.error : null;
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface p-6">
        <div className="w-full max-w-md rounded-2xl border border-edge bg-panel p-8 text-center">
          <p aria-hidden="true" className="mb-3 text-3xl">
            🔗
          </p>
          <h1 className="mb-2 text-lg font-semibold text-ink">{error?.title ?? "This link doesn't work"}</h1>
          {error?.body && <p className="mb-6 text-sm text-ink-muted">{error.body}</p>}
          <Link
            to="/create"
            className="inline-flex min-h-11 items-center rounded-lg border border-edge px-5 text-sm text-ink hover:bg-panel-hover"
          >
            Create your own game
          </Link>
        </div>
      </div>
    );
  }

  const outcomes: TrackResult[] = results.outcomes.map((o, i) => ({
    trackId: decoded.playlist.trackIds[i],
    ...o,
  }));
  const playUrl = `/play?d=${playlistParam}`;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface p-6">
      <main className="w-full max-w-lg text-center">
        <Link to="/" className="text-sm font-bold tracking-tight text-ink-muted hover:text-ink">
          oneshot
        </Link>
        <h1 className="mt-2 mb-1 truncate text-2xl font-semibold text-ink">
          {decoded.playlist.title ?? 'A song-guessing game'}
        </h1>
        <p className="mb-8 text-sm text-ink-muted">Here's how your friend did</p>

        <div className="mb-8 rounded-2xl border border-edge bg-panel p-8">
          <p className="mb-1 text-sm text-ink-muted">Their score</p>
          <p className="mb-6 text-5xl font-bold tabular-nums">
            <span className="gradient-text">{scoreLine(outcomes)}</span>
          </p>
          <RecapCells outcomes={results.outcomes} />
          <p className="mt-4 text-xs text-ink-faint">
            Each square is one song — the number is the attempt they guessed it on.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to={playUrl}
            className="inline-flex min-h-12 items-center rounded-xl bg-ink px-8 text-base font-semibold text-surface transition-colors hover:bg-white"
          >
            Play this game
          </Link>
          <Link
            to="/create"
            className="inline-flex min-h-12 items-center rounded-xl border border-edge px-6 text-base text-ink hover:bg-panel-hover"
          >
            Create your own
          </Link>
        </div>
      </main>
    </div>
  );
}
