import { useState } from 'react';
import type { Track } from '@/types';
import { TrackPreviewButton } from './TrackPreviewButton';

interface PlaylistPaneProps {
  tracks: Track[];
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
}

export function PlaylistPane({ tracks, onRemove, onMove }: PlaylistPaneProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  if (tracks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-edge p-8 text-center">
        <div>
          <p aria-hidden="true" className="mb-2 text-2xl">
            🎵
          </p>
          <p className="font-medium text-ink">Your game is empty</p>
          <p className="mt-1 text-sm text-ink-muted">Search for a song on the left and hit + to add it.</p>
        </div>
      </div>
    );
  }

  return (
    <ol aria-label="Playlist tracks in game order" className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
      {tracks.map((track, index) => (
        <li
          key={track.id}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragEnd={() => {
            setDragIndex(null);
            setDropIndex(null);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDropIndex(index);
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (dragIndex !== null && dragIndex !== index) onMove(dragIndex, index);
            setDragIndex(null);
            setDropIndex(null);
          }}
          className={`group flex items-center gap-3 rounded-xl border bg-panel/60 px-3 py-2 ${
            dropIndex === index && dragIndex !== null && dragIndex !== index
              ? 'border-accent'
              : 'border-edge/60 hover:bg-panel'
          }`}
        >
          <span aria-hidden="true" className="cursor-grab text-ink-faint select-none" title="Drag to reorder">
            ⋮⋮
          </span>
          <span className="w-6 text-right text-xs text-ink-faint tabular-nums">{index + 1}</span>
          {track.artUrl ? (
            <img src={track.artUrl} alt="" className="h-10 w-10 rounded object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded bg-surface text-ink-faint">♪</span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-ink">{track.title}</span>
            <span className="block truncate text-xs text-ink-muted">{track.artist}</span>
          </span>
          <TrackPreviewButton track={track} />
          <span className="flex shrink-0 items-center gap-1">
            <button
              disabled={index === 0}
              onClick={() => onMove(index, index - 1)}
              aria-label={`Move ${track.title} up`}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-ink-muted hover:bg-panel-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↑
            </button>
            <button
              disabled={index === tracks.length - 1}
              onClick={() => onMove(index, index + 1)}
              aria-label={`Move ${track.title} down`}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-ink-muted hover:bg-panel-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↓
            </button>
            <button
              onClick={() => onRemove(index)}
              aria-label={`Remove ${track.title} from playlist`}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-ink-faint hover:bg-panel-hover hover:text-danger"
            >
              ✕
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}
