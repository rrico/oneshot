import { useEffect, useRef, useState } from 'react';
import type { Track } from '@/types';
import {
  deezerSearchTracks,
  deezerSearchArtists,
  deezerArtistTopTracks,
  deezerGenreTracks,
  deezerRecommendedTracks,
  DeezerError,
} from '@/lib/deezer';
import type { ArtistResult } from '@/lib/deezer';
import { formatTime } from '@/lib/utils';
import { TrackPreviewButton } from './TrackPreviewButton';

interface SearchPaneProps {
  onAdd: (track: Track) => void;
  addedIds: Set<number>;
  playlistTracks: Track[];
}

const DEBOUNCE_MS = 300;

const GENRES = [
  { id: 0,   name: 'Top Charts',  emoji: '🔥' },
  { id: 132, name: 'Pop',         emoji: '🎤' },
  { id: 116, name: 'Hip-Hop',     emoji: '🎧' },
  { id: 152, name: 'Rock',        emoji: '🎸' },
  { id: 113, name: 'Dance',       emoji: '🎛️' },
  { id: 165, name: 'R&B',         emoji: '🎷' },
  { id: 85,  name: 'Alternative', emoji: '🎹' },
  { id: 129, name: 'Jazz',        emoji: '🎺' },
  { id: 84,  name: 'Country',     emoji: '🤠' },
  { id: 169, name: 'Soul & Funk', emoji: '🕺' },
  { id: 98,  name: 'Classical',   emoji: '🎻' },
  { id: 464, name: 'Metal',       emoji: '🤘' },
] as const;

type DrillKind = 'artist' | 'genre';

interface DrillState {
  kind: DrillKind;
  label: string;
  sublabel: string;
  pictureUrl?: string;
  tracks: Track[];
  isLoading: boolean;
  error: string | null;
}

function formatFanCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M fans`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K fans`;
  return `${n} fans`;
}

export function SearchPane({ onAdd, addedIds, playlistTracks }: SearchPaneProps) {
  const [query, setQuery] = useState('');
  const [trackResults, setTrackResults] = useState<Track[]>([]);
  const [artistResults, setArtistResults] = useState<ArtistResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [drill, setDrill] = useState<DrillState | null>(null);
  const [genresOpen, setGenresOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const requestSeq = useRef(0);
  const recSeq = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Unified search: track + artist in parallel
  useEffect(() => {
    if (drill) return;
    const trimmed = query.trim();
    if (trimmed === '') {
      setTrackResults([]);
      setArtistResults([]);
      setSearchError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const seq = ++requestSeq.current;
    const timer = setTimeout(async () => {
      try {
        const [tracks, artists] = await Promise.all([
          deezerSearchTracks(trimmed),
          deezerSearchArtists(trimmed).catch(() => [] as ArtistResult[]),
        ]);
        if (seq !== requestSeq.current) return;
        setTrackResults(tracks);
        setArtistResults(artists.slice(0, 2));
        setSearchError(null);
      } catch (error) {
        if (seq !== requestSeq.current) return;
        setTrackResults([]);
        setArtistResults([]);
        setSearchError(
          error instanceof DeezerError && error.kind === 'timeout'
            ? 'Search timed out — the catalog may be slow. Try again.'
            : 'Search is unavailable right now. Check your connection and try again.',
        );
      } finally {
        if (seq === requestSeq.current) setIsLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, drill]);

  // Fetch recommendations whenever the playlist changes (debounced)
  useEffect(() => {
    if (playlistTracks.length < 1) {
      setRecommendations([]);
      return;
    }
    const seq = ++recSeq.current;
    setRecsLoading(true);
    const timer = setTimeout(async () => {
      const recs = await deezerRecommendedTracks(playlistTracks, addedIds);
      if (seq !== recSeq.current) return;
      setRecommendations(recs);
      setRecsLoading(false);
    }, 600);
    return () => {
      clearTimeout(timer);
      if (seq === recSeq.current) setRecsLoading(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistTracks]);

  const openArtistDrill = async (artist: ArtistResult) => {
    setDrill({
      kind: 'artist',
      label: artist.name,
      sublabel: artist.nbFan > 0 ? formatFanCount(artist.nbFan) : 'Top tracks',
      pictureUrl: artist.pictureUrl,
      tracks: [],
      isLoading: true,
      error: null,
    });
    try {
      const tracks = await deezerArtistTopTracks(artist.id);
      setDrill((prev) => prev ? { ...prev, tracks, isLoading: false } : null);
    } catch {
      setDrill((prev) => prev ? { ...prev, isLoading: false, error: 'Could not load tracks. Try again.' } : null);
    }
  };

  const openGenreDrill = async (genreId: number, genreName: string, emoji: string) => {
    setDrill({
      kind: 'genre',
      label: `${emoji} ${genreName}`,
      sublabel: 'Top tracks',
      tracks: [],
      isLoading: true,
      error: null,
    });
    try {
      const tracks = await deezerGenreTracks(genreId);
      setDrill((prev) => prev ? { ...prev, tracks, isLoading: false } : null);
    } catch {
      setDrill((prev) => prev ? { ...prev, isLoading: false, error: 'Could not load tracks. Try again.' } : null);
    }
  };

  const closeDrill = () => {
    setDrill(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const isEmpty = query.trim() === '';

  return (
    <section aria-label="Search tracks" className="flex min-h-0 min-w-0 flex-col lg:overflow-hidden">
      {/* Search input or drill header */}
      {drill ? (
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={closeDrill}
            aria-label={`Back to ${drill.kind === 'artist' ? 'search' : 'browse'}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-edge text-ink-muted hover:bg-panel hover:text-ink"
          >
            ←
          </button>
          {drill.pictureUrl ? (
            <img
              src={drill.pictureUrl}
              alt=""
              className={`h-10 w-10 shrink-0 object-cover ${drill.kind === 'artist' ? 'rounded-full' : 'rounded'}`}
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel text-xl">
              {drill.label.split(' ')[0]}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{drill.label}</p>
            <p className="text-xs text-ink-muted">{drill.sublabel}</p>
          </div>
        </div>
      ) : (
        <div className="sticky top-0 z-10 mb-4 bg-surface pb-2 lg:static lg:bg-transparent lg:pb-0 relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
            }}
            placeholder="Search songs or artists…"
            aria-label="Search Deezer for tracks or artists"
            autoFocus
            className={`w-full rounded-xl border border-edge bg-panel py-3 text-base text-ink placeholder:text-ink-faint focus:border-accent ${query ? 'pl-4 pr-10' : 'px-4'}`}
          />
          {query && (
            <button
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-sm text-ink-faint hover:bg-panel-hover hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Results / browse area */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-3">

        {/* Drill-down track list */}
        {drill && (
          <>
            {drill.isLoading && <SkeletonList count={8} />}
            {!drill.isLoading && drill.error && <ErrorBanner message={drill.error} />}
            {!drill.isLoading && !drill.error && drill.tracks.length === 0 && (
              <p className="px-1 py-3 text-sm text-ink-muted">No playable tracks found.</p>
            )}
            {!drill.isLoading && <TrackList tracks={drill.tracks} addedIds={addedIds} onAdd={onAdd} />}
          </>
        )}

        {/* Search results (unified tracks + artists) */}
        {!drill && !isEmpty && (
          <>
            {isLoading && <SkeletonList count={5} />}
            {!isLoading && searchError && <ErrorBanner message={searchError} />}
            {!isLoading && !searchError && trackResults.length === 0 && artistResults.length === 0 && (
              <p className="px-1 py-3 text-sm text-ink-muted">No matches — try another title or artist.</p>
            )}
            {!isLoading && !searchError && (
              <>
                {/* Artist suggestions — injected above track results */}
                {artistResults.length > 0 && (
                  <ul className="mb-3 space-y-1.5">
                    {artistResults.map((artist) => (
                      <li key={artist.id}>
                        <button
                          onClick={() => void openArtistDrill(artist)}
                          className="group flex w-full items-center gap-3 rounded-xl border border-edge/40 bg-panel/40 px-3 py-2 text-left transition-colors hover:bg-panel"
                        >
                          {artist.pictureUrl ? (
                            <img src={artist.pictureUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink-faint text-xs">♪</span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{artist.name}</span>
                            <span className="block truncate text-xs text-ink-muted">
                              Artist{artist.nbFan > 0 ? ` · ${formatFanCount(artist.nbFan)}` : ''}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-ink-faint group-hover:text-ink-muted">
                            Browse →
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <TrackList tracks={trackResults} addedIds={addedIds} onAdd={onAdd} />
              </>
            )}
          </>
        )}

        {/* Recommendations (empty state, ≥1 track in playlist) */}
        {!drill && isEmpty && playlistTracks.length >= 1 && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
              Recommended for your playlist
            </p>
            {recsLoading && <SkeletonList count={4} />}
            {!recsLoading && recommendations.length > 0 && (
              <TrackList tracks={recommendations} addedIds={addedIds} onAdd={onAdd} />
            )}
            {!recsLoading && recommendations.length === 0 && (
              <p className="px-1 py-2 text-sm text-ink-muted">No recommendations available yet.</p>
            )}
          </div>
        )}

        {/* Browse by genre (empty state) */}
        {!drill && isEmpty && (
          <div>
            <button
              onClick={() => setGenresOpen((o) => !o)}
              aria-expanded={genresOpen}
              className="mb-3 flex w-full items-center justify-between text-xs font-medium uppercase tracking-wide text-ink-faint hover:text-ink-muted"
            >
              <span>Browse by genre</span>
              <span aria-hidden="true" className={`transition-transform duration-200 ${genresOpen ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>
            {genresOpen && (
              <ul className="grid grid-cols-3 gap-2">
                {GENRES.map((genre) => (
                  <li key={genre.id}>
                    <button
                      onClick={() => void openGenreDrill(genre.id, genre.name, genre.emoji)}
                      className="flex w-full flex-col items-center gap-1 rounded-xl border border-edge/60 bg-panel/60 px-2 py-3 text-center transition-colors hover:bg-panel"
                    >
                      <span className="text-xl leading-none">{genre.emoji}</span>
                      <span className="text-xs text-ink-muted leading-tight">{genre.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function SkeletonList({ count }: { count: number }) {
  return (
    <ul className="space-y-2" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="h-14 animate-pulse rounded-xl bg-panel" />
      ))}
    </ul>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink-muted">
      ⚠ {message}
    </p>
  );
}

interface TrackListProps {
  tracks: Track[];
  addedIds: Set<number>;
  onAdd: (track: Track) => void;
}

function TrackList({ tracks, addedIds, onAdd }: TrackListProps) {
  if (tracks.length === 0) return null;
  return (
    <ul className="space-y-2">
      {tracks.map((track) => {
        const added = addedIds.has(track.id);
        const addable = !added && track.previewUrl !== '';
        return (
          <li
            key={track.id}
            className={`group flex items-center gap-3 rounded-xl border border-edge/60 bg-panel/60 px-3 py-2 transition-opacity hover:bg-panel ${added ? 'opacity-60' : ''}`}
          >
            {track.artUrl ? (
              <img src={track.artUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface text-ink-faint">♪</span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{track.title}</span>
              <span className="block truncate text-xs text-ink-muted">
                {track.artist} · {formatTime(track.durationSec)}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <TrackPreviewButton track={track} />
              <button
                disabled={!addable}
                onClick={() => onAdd(track)}
                aria-label={added ? `${track.title} already added` : `Add ${track.title} to playlist`}
                title={
                  added
                    ? 'Already in your playlist'
                    : track.previewUrl === ''
                      ? 'No preview — cannot be guessed'
                      : undefined
                }
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-base transition-colors ${
                  added
                    ? 'cursor-default border-success/60 text-success'
                    : 'cursor-pointer border-edge text-ink-muted hover:border-success hover:text-success disabled:cursor-not-allowed disabled:opacity-40'
                }`}
              >
                <span aria-hidden="true">{added ? '✓' : '+'}</span>
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
