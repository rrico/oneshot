import { useEffect, useRef, useState } from 'react';
import type { Track } from '@/types';
import { deezerSearchTracks, DeezerError } from '@/lib/deezer';
import { formatTime } from '@/lib/utils';
import { TrackPreviewButton } from './TrackPreviewButton';

interface SearchPaneProps {
  onAdd: (track: Track) => void;
  addedIds: Set<number>;
}

const DEBOUNCE_MS = 300;

export function SearchPane({ onAdd, addedIds }: SearchPaneProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === '') {
      setResults([]);
      setSearchError(null);
      setIsLoadingSearch(false);
      return;
    }
    setIsLoadingSearch(true);
    const seq = ++requestSeq.current;
    const timer = setTimeout(async () => {
      try {
        const tracks = await deezerSearchTracks(trimmed);
        if (seq !== requestSeq.current) return;
        setResults(tracks);
        setSearchError(null);
      } catch (error) {
        if (seq !== requestSeq.current) return;
        setResults([]);
        setSearchError(
          error instanceof DeezerError && error.kind === 'timeout'
            ? 'Search timed out — the catalog may be slow. Try again.'
            : 'Search is unavailable right now. Check your connection and try again.',
        );
      } finally {
        if (seq === requestSeq.current) setIsLoadingSearch(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <section aria-label="Search tracks" className="flex min-h-0 min-w-0 flex-col lg:overflow-hidden">
      <div className="sticky top-0 z-10 mb-4 bg-surface pb-2 lg:static lg:bg-transparent lg:pb-0 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
          }}
          placeholder="Search songs or artists…"
          aria-label="Search Deezer for tracks"
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

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-3">
        {isLoadingSearch && (
          <ul className="space-y-2" aria-label="Loading search results">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="h-14 animate-pulse rounded-xl bg-panel" />
            ))}
          </ul>
        )}

        {!isLoadingSearch && searchError && (
          <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink-muted">
            ⚠ {searchError}
          </p>
        )}

        {!isLoadingSearch && !searchError && query.trim() !== '' && results.length === 0 && (
          <p className="px-1 py-3 text-sm text-ink-muted">No matches — try another title or artist.</p>
        )}

        {!isLoadingSearch && query.trim() === '' && (
          <p className="px-1 py-3 text-sm text-ink-faint">
            Search for a song to start your game. Hover a result to preview it.
          </p>
        )}

        <ul className="space-y-2">
          {!isLoadingSearch &&
            results.map((track) => {
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
      </div>
    </section>
  );
}
