import type { Track } from '@/types';
import { formatTime } from '@/lib/utils';
import { TrackPreviewButton } from './TrackPreviewButton';

interface TrackListProps {
  tracks: Track[];
  addedIds: Set<number>;
  onAdd: (track: Track) => void;
}

export function TrackList({ tracks, addedIds, onAdd }: TrackListProps) {
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

export function SkeletonList({ count }: { count: number }) {
  return (
    <ul className="space-y-2" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="h-14 animate-pulse rounded-xl bg-panel" />
      ))}
    </ul>
  );
}
