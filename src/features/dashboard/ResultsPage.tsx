import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

interface TrackStat {
  trackId: number;
  title: string | null;
  artist: string | null;
  artUrl: string | null;
  winRate: number | null;
  avgAttemptsUsed: number | null;
}

interface PlayEntry {
  completedAt: number;
  score: number;
  wonTracks: number;
  playableTracks: number;
}

interface ScoreBucket {
  pct: number;
  count: number;
}

interface ResultsData {
  gameTitle: string | null;
  trackCount: number;
  expiresAt: number | null;
  totalPlays: number;
  avgScore: number;
  scoreDistribution: ScoreBucket[];
  perTrack: TrackStat[];
  plays: PlayEntry[];
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function SkeletonRow() {
  return <div className="h-14 animate-pulse rounded-xl bg-panel" />;
}

export function DashboardResultsPage() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [data, setData] = useState<ResultsData | null>(null);
  const [error, setError] = useState<'403' | '404' | 'unknown' | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/games/${code}/results?token=${encodeURIComponent(token)}`)
      .then((r) => {
        if (r.status === 403) throw new Error('403');
        if (r.status === 404) throw new Error('404');
        if (!r.ok) throw new Error('unknown');
        return r.json() as Promise<ResultsData>;
      })
      .then(setData)
      .catch((e: Error) => {
        setError((e.message as '403' | '404' | 'unknown') ?? 'unknown');
      });
  }, [code, token]);

  const playerUrl = code ? `${window.location.origin}/g/${code}` : '';

  const copyPlayerLink = async () => {
    try {
      await navigator.clipboard.writeText(playerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (error === '403') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface p-6">
        <div className="w-full max-w-md rounded-2xl border border-edge bg-panel p-8 text-center">
          <p className="mb-2 text-lg font-semibold text-ink">Results are locked</p>
          <p className="mb-6 text-sm text-ink-muted">
            You need to complete the game to view these results.
          </p>
          {code && (
            <Link
              to={`/g/${code}`}
              className="inline-flex min-h-11 items-center rounded-lg bg-ink px-6 text-sm font-semibold text-surface transition-colors hover:bg-white"
            >
              Play the game →
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (error === '404') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface p-6">
        <div className="w-full max-w-md rounded-2xl border border-edge bg-panel p-8 text-center">
          <p className="mb-2 text-lg font-semibold text-ink">Game not found</p>
          <p className="mb-6 text-sm text-ink-muted">This game has expired or the link is invalid.</p>
          <Link to="/create" className="text-sm text-accent hover:underline">
            Create a new game →
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface p-6">
        <div className="w-full max-w-md rounded-2xl border border-edge bg-panel p-8 text-center">
          <p className="mb-2 text-lg font-semibold text-ink">Something went wrong</p>
          <p className="mb-6 text-sm text-ink-muted">Couldn't load results. Check your connection and try again.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-edge">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="text-sm font-bold tracking-tight text-ink-muted hover:text-ink">
            oneshot
          </Link>
          {data && (
            <p className="truncate text-sm font-semibold text-ink">{data.gameTitle ?? 'Untitled game'}</p>
          )}
          <Link to="/dashboard" className="text-xs text-ink-muted hover:text-ink">
            My games
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-6">
        {!data ? (
          <>
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)}
            </div>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="rounded-2xl border border-edge bg-panel p-5">
              <p className="text-sm text-ink-muted">
                {data.trackCount} track{data.trackCount === 1 ? '' : 's'}
                {data.expiresAt && (
                  <span className="ml-3 text-ink-faint">
                    Results available until {formatDate(data.expiresAt)}
                  </span>
                )}
              </p>
            </div>

            {/* Hero stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-edge bg-panel p-5 text-center">
                <p className="mb-1 text-xs text-ink-muted">Total plays</p>
                <p className="text-3xl font-bold tabular-nums text-ink">{data.totalPlays}</p>
              </div>
              <div className="rounded-2xl border border-edge bg-panel p-5 text-center">
                <p className="mb-1 text-xs text-ink-muted">Average score</p>
                <p className="text-3xl font-bold tabular-nums text-ink">
                  {data.totalPlays > 0 ? pct(data.avgScore) : '—'}
                </p>
              </div>
            </div>

            {/* Score distribution */}
            {data.scoreDistribution.length > 0 && (
              <div className="rounded-2xl border border-edge bg-panel p-5">
                <h2 className="mb-3 text-sm font-semibold text-ink">Score distribution</h2>
                <ul className="space-y-1.5">
                  {data.scoreDistribution.map(({ pct: p, count }) => (
                    <li key={p} className="flex items-center justify-between text-sm">
                      <span className="text-ink">{p}%</span>
                      <span className="text-ink-muted">
                        {count} {count === 1 ? 'player' : 'players'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-track breakdown */}
            {data.perTrack.length > 0 && (
              <div className="rounded-2xl border border-edge bg-panel p-5">
                <h2 className="mb-3 text-sm font-semibold text-ink">
                  Track breakdown
                  <span className="ml-2 text-xs font-normal text-ink-faint">hardest first</span>
                </h2>
                <ul className="divide-y divide-edge">
                  {data.perTrack.map((track) => (
                    <li key={track.trackId} className="flex items-center gap-3 py-3">
                      {track.artUrl ? (
                        <img
                          src={track.artUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-surface" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {track.title ?? `Track ${track.trackId}`}
                        </p>
                        <p className="truncate text-xs text-ink-muted">{track.artist ?? ''}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm tabular-nums text-ink">
                          {track.winRate !== null ? pct(track.winRate) : '—'}
                        </p>
                        <p className="text-xs text-ink-faint">
                          {track.avgAttemptsUsed !== null
                            ? `${track.avgAttemptsUsed.toFixed(1)} avg tries`
                            : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Zero plays state */}
            {data.totalPlays === 0 && (
              <div className="rounded-2xl border border-edge bg-panel p-8 text-center">
                <p className="mb-1 font-semibold text-ink">No plays yet</p>
                <p className="mb-4 text-sm text-ink-muted">Share your link to get started.</p>
              </div>
            )}

            {/* Share section */}
            <div className="rounded-2xl border border-edge bg-panel p-5">
              <p className="mb-2 text-sm font-semibold text-ink">Share with more friends →</p>
              <p className="mb-3 min-w-0 truncate rounded-lg bg-surface px-3 py-2 text-xs text-ink-muted" title={playerUrl}>
                {playerUrl}
              </p>
              <Button onClick={() => void copyPlayerLink()} className="w-full">
                {copied ? '✓ Copied!' : 'Copy player link'}
              </Button>
            </div>

            {/* Expiry notice */}
            {data.expiresAt && (
              <p className="text-center text-xs text-ink-faint">
                Results expire {formatDate(data.expiresAt)}.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
