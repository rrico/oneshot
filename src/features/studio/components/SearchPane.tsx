import { useEffect, useRef, useState } from 'react';
import type { Track } from '@/types';
import { deezerSearchTracks, deezerSearchArtists, deezerArtistTopTracks, DeezerError } from '@/lib/deezer';
import type { ArtistResult } from '@/lib/deezer';
import { formatTime } from '@/lib/utils';
import { TrackPreviewButton } from './TrackPreviewButton';

interface SearchPaneProps {
  onAdd: (track: Track) => void;
  addedIds: Set<number>;
}

const DEBOUNCE_MS = 300;

type SearchTab = 'tracks' | 'artists';

interface ArtistDrillState {
  artist: ArtistResult;
  tracks: Track[];
  isLoading: boolean;
  error: string | null;
}

function formatFanCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M fans`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K fans`;
  return `${n} fans`;
}

export function SearchPane({ onAdd, addedIds }: SearchPaneProps) {
  const [tab, setTab] = useState<SearchTab>('tracks');
  const [query, setQuery] = useState('');

  // Track search state
  const [trackResults, setTrackResults] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Artist search state
  const [artistResults, setArtistResults] = useState<ArtistResult[]>([]);
  const [isLoadingArtists, setIsLoadingArtists] = useState(false);
  const [artistError, setArtistError] = useState<string | null>(null);

  // Artist drill-down state (null = showing artist list)
  const [drill, setDrill] = useState<ArtistDrillState | null>(null);

  const requestSeq = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset drill-down when switching tabs or clearing query
  useEffect(() => {
    setDrill(null);
  }, [tab]);

  // Track search effect
  useEffect(() => {
    if (tab !== 'tracks') return;
    const trimmed = query.trim();
    if (trimmed === '') {
      setTrackResults([]);
      setTrackError(null);
      setIsLoadingTracks(false);
      return;
    }
    setIsLoadingTracks(true);
    const seq = ++requestSeq.current;
    const timer = setTimeout(async () => {
      try {
        const tracks = await deezerSearchTracks(trimmed);
        if (seq !== requestSeq.current) return;
        setTrackResults(tracks);
        setTrackError(null);
      } catch (error) {
        if (seq !== requestSeq.current) return;
        setTrackResults([]);
        setTrackError(
          error instanceof DeezerError && error.kind === 'timeout'
            ? 'Search timed out — the catalog may be slow. Try again.'
            : 'Search is unavailable right now. Check your connection and try again.',
        );
      } finally {
        if (seq === requestSeq.current) setIsLoadingTracks(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, tab]);

  // Artist search effect
  useEffect(() => {
    if (tab !== 'artists') return;
    if (drill) return; // don't re-search while in drill-down
    const trimmed = query.trim();
    if (trimmed === '') {
      setArtistResults([]);
      setArtistError(null);
      setIsLoadingArtists(false);
      return;
    }
    setIsLoadingArtists(true);
    const seq = ++requestSeq.current;
    const timer = setTimeout(async () => {
      try {
        const artists = await deezerSearchArtists(trimmed);
        if (seq !== requestSeq.current) return;
        setArtistResults(artists);
        setArtistError(null);
      } catch (error) {
        if (seq !== requestSeq.current) return;
        setArtistResults([]);
        setArtistError(
          error instanceof DeezerError && error.kind === 'timeout'
            ? 'Search timed out. Try again.'
            : 'Search is unavailable right now. Check your connection and try again.',
        );
      } finally {
        if (seq === requestSeq.current) setIsLoadingArtists(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, tab, drill]);

  const openArtistDrill = async (artist: ArtistResult) => {
    setDrill({ artist, tracks: [], isLoading: true, error: null });
    try {
      const tracks = await deezerArtistTopTracks(artist.id);
      setDrill({ artist, tracks, isLoading: false, error: null });
    } catch {
      setDrill((prev) => prev ? { ...prev, isLoading: false, error: 'Could not load tracks. Try again.' } : null);
    }
  };

  const closeDrill = () => {
    setDrill(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const switchTab = (next: SearchTab) => {
    setTab(next);
    setQuery('');
    setTrackResults([]);
    setArtistResults([]);
    setTrackError(null);
    setArtistError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const isLoading = tab === 'tracks' ? isLoadingTracks : isLoadingArtists;
  const error = tab === 'tracks' ? trackError : artistError;

  return (
    <section aria-label="Search tracks" className="flex min-h-0 min-w-0 flex-col lg:overflow-hidden">
      {/* Tab bar */}
      <div className="mb-3 flex gap-1 rounded-xl bg-panel p-1">
        {(['tracks', 'artists'] as const).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t === 'tracks' ? 'Tracks' : 'Artists'}
          </button>
        ))}
      </div>

      {/* Artist drill-down header */}
      {drill ? (
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={closeDrill}
            aria-label="Back to artist search"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-edge text-ink-muted hover:bg-panel hover:text-ink"
          >
            ←
          </button>
          {drill.artist.pictureUrl ? (
            <img src={drill.artist.pictureUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel text-ink-faint">♪</span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{drill.artist.name}</p>
            <p className="text-xs text-ink-muted">Top tracks</p>
          </div>
        </div>
      ) : (
        /* Search input */
        <div className="sticky top-0 z-10 mb-4 bg-surface pb-2 lg:static lg:bg-transparent lg:pb-0 relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
            }}
            placeholder={tab === 'tracks' ? 'Search songs or artists…' : 'Search artists…'}
            aria-label={tab === 'tracks' ? 'Search Deezer for tracks' : 'Search Deezer for artists'}
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

      {/* Results area */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-3">
        {/* Artist drill-down track list */}
        {drill && (
          <>
            {drill.isLoading && (
              <ul className="space-y-2" aria-label="Loading artist tracks">
                {Array.from({ length: 8 }, (_, i) => (
                  <li key={i} className="h-14 animate-pulse rounded-xl bg-panel" />
                ))}
              </ul>
            )}
            {!drill.isLoading && drill.error && (
              <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink-muted">
                ⚠ {drill.error}
              </p>
            )}
            {!drill.isLoading && !drill.error && drill.tracks.length === 0 && (
              <p className="px-1 py-3 text-sm text-ink-muted">No playable tracks found for this artist.</p>
            )}
            <TrackList tracks={drill.tracks} addedIds={addedIds} onAdd={onAdd} />
          </>
        )}

        {/* Track search results */}
        {!drill && tab === 'tracks' && (
          <>
            {isLoading && (
              <ul className="space-y-2" aria-label="Loading search results">
                {Array.from({ length: 5 }, (_, i) => (
                  <li key={i} className="h-14 animate-pulse rounded-xl bg-panel" />
                ))}
              </ul>
            )}
            {!isLoading && error && (
              <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink-muted">
                ⚠ {error}
              </p>
            )}
            {!isLoading && !error && query.trim() !== '' && trackResults.length === 0 && (
              <p className="px-1 py-3 text-sm text-ink-muted">No matches — try another title or artist.</p>
            )}
            {!isLoading && <TrackList tracks={trackResults} addedIds={addedIds} onAdd={onAdd} />}
          </>
        )}

        {/* Artist search results */}
        {!drill && tab === 'artists' && (
          <>
            {isLoading && (
              <ul className="space-y-2" aria-label="Loading artist results">
                {Array.from({ length: 5 }, (_, i) => (
                  <li key={i} className="h-14 animate-pulse rounded-xl bg-panel" />
                ))}
              </ul>
            )}
            {!isLoading && error && (
              <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink-muted">
                ⚠ {error}
              </p>
            )}
            {!isLoading && !error && query.trim() !== '' && artistResults.length === 0 && (
              <p className="px-1 py-3 text-sm text-ink-muted">No artists found — try another name.</p>
            )}
            {!isLoading && !error && query.trim() === '' && (
              <p className="px-1 py-3 text-sm text-ink-muted">Type an artist name to browse their top tracks.</p>
            )}
            {!isLoading && (
              <ul className="space-y-2">
                {artistResults.map((artist) => (
                  <li key={artist.id}>
                    <button
                      onClick={() => void openArtistDrill(artist)}
                      className="group flex w-full items-center gap-3 rounded-xl border border-edge/60 bg-panel/60 px-3 py-2 text-left transition-colors hover:bg-panel"
                    >
                      {artist.pictureUrl ? (
                        <img src={artist.pictureUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink-faint">♪</span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{artist.name}</span>
                        {artist.nbFan > 0 && (
                          <span className="block truncate text-xs text-ink-muted">{formatFanCount(artist.nbFan)}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-ink-faint group-hover:text-ink-muted">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
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
