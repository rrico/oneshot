import { useEffect, useId, useRef, useState } from 'react';
import type { Track } from '@/types';
import { deezerSearchTracks } from '@/lib/deezer';
import { cn } from '@/lib/utils';

interface GuessComboboxProps {
  onSelect: (track: Track) => void;
  /** Tracks to flag as already guessed (still selectable rows, but marked). */
  isAlreadyGuessed?: (track: Track) => boolean;
  /** Called when Space is pressed in an empty input (play/replay affordance). */
  onEmptySpace?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

const DEBOUNCE_MS = 300;

/**
 * Command-palette-style async combobox over Deezer search (FR12, UX-DR8).
 * ArrowUp/Down to highlight, Enter to submit, Esc to clear. Catalog rows only —
 * free text can never be submitted.
 */
export function GuessCombobox({
  onSelect,
  isAlreadyGuessed,
  onEmptySpace,
  placeholder = 'Type a song or artist…',
  autoFocus,
  disabled,
}: GuessComboboxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestSeq = useRef(0);
  const listboxId = useId();

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === '') {
      setResults([]);
      setIsOpen(false);
      setIsLoadingSearch(false);
      setSearchFailed(false);
      return;
    }
    setIsLoadingSearch(true);
    const seq = ++requestSeq.current;
    const timer = setTimeout(async () => {
      try {
        const tracks = await deezerSearchTracks(trimmed);
        if (seq !== requestSeq.current) return;
        setResults(tracks);
        setHighlighted(0);
        setIsOpen(true);
        setSearchFailed(false);
      } catch {
        if (seq !== requestSeq.current) return;
        setResults([]);
        setIsOpen(true);
        setSearchFailed(true);
      } finally {
        if (seq === requestSeq.current) setIsLoadingSearch(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const select = (track: Track) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onSelect(track);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === ' ' && query === '' && onEmptySpace) {
      event.preventDefault();
      onEmptySpace();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length > 0) setHighlighted((h) => (h + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length > 0) setHighlighted((h) => (h - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const track = results[highlighted];
      if (isOpen && track) select(track);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setQuery('');
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen && results[highlighted] ? `${listboxId}-${highlighted}` : undefined}
        aria-autocomplete="list"
        aria-label="Guess the song"
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        className="w-full rounded-xl border border-edge bg-panel px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-accent disabled:opacity-50"
      />
      {isLoadingSearch && (
        <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs text-ink-faint">searching…</span>
      )}
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Song suggestions"
          className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-edge bg-panel shadow-2xl"
        >
          {searchFailed ? (
            <li className="px-4 py-3 text-sm text-ink-muted">
              Search is unavailable right now — check your connection and try again.
            </li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-muted">No matches — try another title or artist.</li>
          ) : (
            results.map((track, index) => {
              const guessed = isAlreadyGuessed?.(track) ?? false;
              return (
                <li
                  key={track.id}
                  id={`${listboxId}-${index}`}
                  role="option"
                  aria-selected={index === highlighted}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    select(track);
                  }}
                  onMouseEnter={() => setHighlighted(index)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-3 py-2.5',
                    index === highlighted && 'bg-panel-hover',
                  )}
                >
                  {track.artUrl ? (
                    <img src={track.artUrl} alt="" className="h-9 w-9 rounded object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded bg-surface text-ink-faint">♪</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{track.title}</span>
                    <span className="block truncate text-xs text-ink-muted">{track.artist}</span>
                  </span>
                  {guessed && <span className="shrink-0 text-xs text-ink-faint">already guessed</span>}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
