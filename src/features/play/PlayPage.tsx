import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { Track, TrackResult } from '@/types';
import { decodePlaylistParam, encodePlaylist } from '@/lib/playlist-codec';
import { appError } from '@/lib/errors';
import type { AppError } from '@/lib/errors';
import { deezerFetchTrack } from '@/lib/deezer';
import { GameShell } from '@/components/game/GameShell';
import { Round } from '@/components/game/Round';
import { Button } from '@/components/ui/Button';
import { RecapView } from './RecapView';

type LoadedTrack = { id: number; track: Track | null };

type PlayPhase =
  | { kind: 'bad-link'; error: AppError }
  | { kind: 'loading'; total: number }
  | { kind: 'empty' }
  | { kind: 'ready'; playCount?: number }
  | { kind: 'round'; index: number }
  | { kind: 'unplayable-notice'; index: number }
  | { kind: 'recap'; endedEarly?: boolean };

async function hydrateTracks(trackIds: number[]): Promise<LoadedTrack[]> {
  return Promise.all(
    trackIds.map(async (id): Promise<LoadedTrack> => {
      try {
        const track = await deezerFetchTrack(id);
        return { id, track: track.previewUrl ? track : null };
      } catch {
        return { id, track: null };
      }
    }),
  );
}

export function PlayPage() {
  const { code } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const dParam = searchParams.get('d');

  const [playlist, setPlaylist] = useState<{ title?: string; trackIds: number[] } | null>(null);
  const [loaded, setLoaded] = useState<LoadedTrack[] | null>(null);
  const [phase, setPhase] = useState<PlayPhase | null>(null);
  const [results, setResults] = useState<TrackResult[]>([]);

  // Used by RecapView to build results-share URLs
  const shareParam = useMemo(() => {
    if (!playlist) return '';
    try {
      return encodePlaylist(playlist);
    } catch {
      return '';
    }
  }, [playlist]);

  useEffect(() => {
    let cancelled = false;

    if (code) {
      // Load by short code from /g/:code
      setPhase({ kind: 'loading', total: 0 });
      fetch(`/api/games/${code}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(async (data: { title?: string | null; trackIds: number[]; playCount?: number }) => {
          if (cancelled) return;
          const trackIds = data.trackIds ?? [];
          if (trackIds.length === 0) {
            setPhase({ kind: 'empty' });
            return;
          }
          const pl = { title: data.title ?? undefined, trackIds };
          setPlaylist(pl);
          setPhase({ kind: 'loading', total: trackIds.length });
          const tracks = await hydrateTracks(trackIds);
          if (cancelled) return;
          setLoaded(tracks);
          setPhase({ kind: 'ready', playCount: data.playCount });
        })
        .catch(() => {
          if (!cancelled) {
            setPhase({
              kind: 'bad-link',
              error: appError('Game not found', 'This game link is invalid or has expired.', 'copy-link'),
            });
          }
        });
    } else {
      // Load by ?d= param (legacy inline encoding)
      const decoded = decodePlaylistParam(dParam);
      if (!decoded.ok) {
        setPhase({ kind: 'bad-link', error: decoded.error });
        return;
      }
      if (decoded.playlist.trackIds.length === 0) {
        setPhase({ kind: 'empty' });
        return;
      }
      setPlaylist(decoded.playlist);
      setPhase({ kind: 'loading', total: decoded.playlist.trackIds.length });
      void hydrateTracks(decoded.playlist.trackIds).then((tracks) => {
        if (cancelled) return;
        setLoaded(tracks);
        setPhase({ kind: 'ready' });
      });
    }

    return () => {
      cancelled = true;
    };
  }, [code, dParam]);

  const playlistTitle = playlist?.title;
  const total = loaded?.length ?? 0;

  const tracksById = useMemo(() => {
    const map = new Map<number, Track>();
    for (const entry of loaded ?? []) {
      if (entry.track) map.set(entry.id, entry.track);
    }
    return map;
  }, [loaded]);

  /** Advance to playlist position `index`, auto-recording unplayable tracks (FR35). */
  const advanceTo = (index: number, accumulated: TrackResult[], list: LoadedTrack[] | null = loaded) => {
    if (!list) return;
    if (index >= list.length) {
      setResults(accumulated);
      setPhase({ kind: 'recap' });
      return;
    }
    const entry = list[index];
    if (entry.track === null) {
      setResults([...accumulated, { trackId: entry.id, outcome: 'unplayable' }]);
      setPhase({ kind: 'unplayable-notice', index });
      return;
    }
    setResults(accumulated);
    setPhase({ kind: 'round', index });
  };

  // --- Render phases -------------------------------------------------------

  if (!phase || phase.kind === 'loading') {
    return (
      <GameShell title={playlistTitle ?? 'Loading game…'}>
        <div className="space-y-3" aria-label="Loading playlist">
          {Array.from({ length: Math.min(5, phase?.kind === 'loading' ? phase.total : 3) }, (_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-panel" />
          ))}
          <p className="text-center text-sm text-ink-muted">Loading tracks…</p>
        </div>
      </GameShell>
    );
  }

  if (phase.kind === 'bad-link') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface p-6">
        <div className="w-full max-w-md rounded-2xl border border-edge bg-panel p-8 text-center">
          <p aria-hidden="true" className="mb-3 text-3xl">
            🔗
          </p>
          <h1 className="mb-2 text-lg font-semibold text-ink">{phase.error.title}</h1>
          {phase.error.body && <p className="mb-6 text-sm text-ink-muted">{phase.error.body}</p>}
          <Link
            to="/create"
            className="inline-flex min-h-11 items-center rounded-lg border border-edge px-5 text-sm text-ink hover:bg-panel-hover"
          >
            Create your own playlist
          </Link>
        </div>
      </div>
    );
  }

  if (phase.kind === 'empty') {
    return (
      <GameShell title={playlistTitle}>
        <div className="rounded-2xl border border-edge bg-panel p-8 text-center">
          <h2 className="mb-2 font-semibold text-ink">This game has no tracks</h2>
          <p className="mb-6 text-sm text-ink-muted">
            The link is valid but the playlist is empty. Ask the creator to add songs and reshare.
          </p>
          <Link to="/create" className="text-sm text-accent hover:underline">
            Or create your own →
          </Link>
        </div>
      </GameShell>
    );
  }

  if (phase.kind === 'ready') {
    const playCountLabel =
      phase.playCount && phase.playCount > 0
        ? `${phase.playCount} ${phase.playCount === 1 ? 'person has' : 'people have'} played this game`
        : null;

    return (
      <GameShell title={playlistTitle} subtitle={`${total} track${total === 1 ? '' : 's'}`}>
        <div className="rounded-2xl border border-edge bg-panel p-8">
          <p className="text-center text-sm font-semibold tracking-wide text-accent uppercase">
            You've been challenged
          </p>
          <h2 className="mt-2 mb-8 text-center text-2xl font-semibold text-ink">
            Guess each song from a tiny snippet
          </h2>

          <ol className="mx-auto mb-8 max-w-md space-y-5">
            {[
              {
                icon: '▶',
                title: 'Listen',
                body: 'Each track starts as a 1-second clip.',
              },
              {
                icon: '🔍',
                title: 'Guess the song',
                body: 'Search by title or artist and pick a match.',
              },
              {
                icon: '🔓',
                title: 'Stuck? Hear more',
                body: 'Wrong guesses and "Hear more" unlock longer clips — you get 6 tries per track.',
              },
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-edge bg-surface text-base"
                >
                  {step.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{step.title}</span>
                  <span className="block text-sm text-ink-muted">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="text-center">
            <Button variant="primary" onClick={() => advanceTo(0, [])} className="min-w-48">
              Start playing
            </Button>
            <p className="mt-3 text-xs text-ink-faint">Turn your sound on 🔊</p>
            {playCountLabel && (
              <p className="mt-2 text-xs text-ink-faint">{playCountLabel}</p>
            )}
          </div>
        </div>
      </GameShell>
    );
  }

  if (phase.kind === 'unplayable-notice') {
    const entry = loaded![phase.index];
    return (
      <GameShell title={playlistTitle} subtitle={`Track ${phase.index + 1} of ${total}`}>
        <div className="space-y-6 rounded-2xl border border-edge bg-panel p-8 text-center">
          <p aria-hidden="true" className="text-3xl">
            ⊘
          </p>
          <p className="text-ink-muted">
            Track {phase.index + 1} can't be played right now (no preview available
            {entry.track === null ? ' or it failed to load' : ''}). It won't count against your score.
          </p>
          <Button variant="primary" onClick={() => advanceTo(phase.index + 1, results)}>
            Continue
          </Button>
        </div>
      </GameShell>
    );
  }

  if (phase.kind === 'recap') {
    return (
      <RecapView
        playlistTitle={playlistTitle}
        results={results}
        tracksById={tracksById}
        shareParam={shareParam}
        gameCode={code}
        finishedEarly={phase.endedEarly ?? false}
      />
    );
  }

  // Active round
  const entry = loaded![phase.index];
  const track = entry.track!;
  const isLast = phase.index === total - 1;

  /** End the run after the current round: pad unplayed tracks as skipped (or unplayable). */
  const finishEarly = (result: TrackResult) => {
    const remaining: TrackResult[] = loaded!
      .slice(phase.index + 1)
      .map((e) => ({ trackId: e.id, outcome: e.track === null ? 'unplayable' : 'skipped' }));
    setResults([...results, result, ...remaining]);
    setPhase({ kind: 'recap', endedEarly: true });
  };

  return (
    <GameShell title={playlistTitle} subtitle={`Track ${phase.index + 1} of ${total}`}>
      <Round
        track={track}
        nextLabel={isLast ? 'See results' : 'Next track'}
        onResolved={(result) => advanceTo(phase.index + 1, [...results, result])}
        onFinishEarly={isLast ? undefined : finishEarly}
      />
    </GameShell>
  );
}
