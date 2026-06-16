import { useEffect, useRef, useState } from 'react';
import type { Track } from '@/types';
import {
  deezerSearchTracks,
  deezerSearchArtists,
  deezerArtistTopTracks,
  deezerArtistRadioTracks,
  deezerGenreTracks,
  DeezerError,
} from '@/lib/deezer';
import type { ArtistResult } from '@/lib/deezer';
import { TrackList, SkeletonList } from './TrackList';

interface SearchPaneProps {
  onAdd: (track: Track) => void;
  addedIds: Set<number>;
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

type DrillKind = 'artist' | 'genre' | 'radio';

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

export function SearchPane({ onAdd, addedIds }: SearchPaneProps) {
  const [query, setQuery] = useState('');
  const [trackResults, setTrackResults] = useState<Track[]>([]);
  const [artistResults, setArtistResults] = useState<ArtistResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [drill, setDrill] = useState<DrillState | null>(null);
  const [genresOpen, setGenresOpen] = useState(false);
  const requestSeq = useRef(0);
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

  const openRadioDrill = async (artist: ArtistResult) => {
    setDrill({
      kind: 'radio',
      label: `${artist.name} Radio`,
      sublabel: 'Similar tracks mix',
      pictureUrl: artist.pictureUrl,
      tracks: [],
      isLoading: true,
      error: null,
    });
    try {
      const tracks = await deezerArtistRadioTracks(artist.id);
      setDrill((prev) => prev ? { ...prev, tracks, isLoading: false } : null);
    } catch {
      setDrill((prev) => prev ? { ...prev, isLoading: false, error: 'Could not load radio. Try again.' } : null);
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
            aria-label="Back to search"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-edge text-ink-muted hover:bg-panel hover:text-ink"
          >
            ←
          </button>
          {drill.pictureUrl ? (
            <img
              src={drill.pictureUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover"
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
                {/* Artist suggestions with Browse + Radio actions */}
                {artistResults.length > 0 && (
                  <ul className="mb-3 space-y-1.5">
                    {artistResults.map((artist) => (
                      <li
                        key={artist.id}
                        className="flex items-center gap-3 rounded-xl border border-edge/40 bg-panel/40 px-3 py-2 transition-colors hover:bg-panel"
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
                        <span className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={() => void openRadioDrill(artist)}
                            className="rounded-lg border border-edge/60 px-2.5 py-1 text-xs text-ink-muted transition-colors hover:bg-panel-hover hover:text-ink"
                          >
                            Radio
                          </button>
                          <button
                            onClick={() => void openArtistDrill(artist)}
                            className="rounded-lg border border-edge/60 px-2.5 py-1 text-xs text-ink-muted transition-colors hover:bg-panel-hover hover:text-ink"
                          >
                            Browse →
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <TrackList tracks={trackResults} addedIds={addedIds} onAdd={onAdd} />
              </>
            )}
          </>
        )}

        {/* Browse by genre (empty state) */}
        {!drill && isEmpty && (
          <div>
            <button
              onClick={() => setGenresOpen((o) => !o)}
              aria-expanded={genresOpen}
              className="mb-3 flex w-full items-center justify-between rounded-xl border border-edge/60 bg-panel/60 px-4 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-panel hover:text-ink"
            >
              <span>Browse by genre</span>
              <span aria-hidden="true" className={`text-ink-faint transition-transform duration-200 ${genresOpen ? 'rotate-180' : ''}`}>
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

function ErrorBanner({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink-muted">
      ⚠ {message}
    </p>
  );
}
