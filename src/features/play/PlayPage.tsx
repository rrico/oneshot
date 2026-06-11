import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Track, TrackResult } from '@/types';
import { decodePlaylistParam } from '@/lib/playlist-codec';
import { deezerFetchTrack } from '@/lib/deezer';
import type { AppError } from '@/lib/errors';
import { GameShell } from '@/components/game/GameShell';
import { Round } from '@/components/game/Round';
import { Button } from '@/components/ui/Button';
import { RecapView } from './RecapView';

type LoadedTrack = { id: number; track: Track | null };

type PlayPhase =
  | { kind: 'bad-link'; error: AppError }
  | { kind: 'loading'; total: number }
  | { kind: 'empty' }
  | { kind: 'round'; index: number }
  | { kind: 'unplayable-notice'; index: number }
  | { kind: 'recap'; endedEarly?: boolean };

export function PlayPage() {
  const [searchParams] = useSearchParams();
  const decoded = useMemo(() => decodePlaylistParam(searchParams.get('d')), [searchParams]);

  const [loaded, setLoaded] = useState<LoadedTrack[] | null>(null);
  const [phase, setPhase] = useState<PlayPhase | null>(null);
  const [results, setResults] = useState<TrackResult[]>([]);

  // Hydrate: fetch every track in the playlist (FR9a -> FR9b handoff).
  useEffect(() => {
    if (!decoded.ok) {
      setPhase({ kind: 'bad-link', error: decoded.error });
      return;
    }
    if (decoded.playlist.trackIds.length === 0) {
      setPhase({ kind: 'empty' });
      return;
    }
    let cancelled = false;
    setPhase({ kind: 'loading', total: decoded.playlist.trackIds.length });
    void Promise.all(
      decoded.playlist.trackIds.map(async (id): Promise<LoadedTrack> => {
        try {
          const track = await deezerFetchTrack(id);
          return { id, track: track.previewUrl ? track : null };
        } catch {
          return { id, track: null };
        }
      }),
    ).then((tracks) => {
      if (cancelled) return;
      setLoaded(tracks);
      advanceTo(0, [], tracks);
    });
    return () => {
      cancelled = true;
    };
  }, [decoded]);

  const playlistTitle = decoded.ok ? decoded.playlist.title : undefined;
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
        shareParam={searchParams.get('d') ?? ''}
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
      .map((entry) => ({ trackId: entry.id, outcome: entry.track === null ? 'unplayable' : 'skipped' }));
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
