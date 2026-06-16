import { useRef, useState } from 'react';
import type { Track } from '@/types';
import { formatTime } from '@/lib/utils';
import { TrackPreviewButton } from './TrackPreviewButton';

interface PlaylistPaneProps {
  tracks: Track[];
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
}

export function PlaylistPane({ tracks, onRemove, onMove }: PlaylistPaneProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const touchRef = useRef<{ index: number } | null>(null);
  const touchDropRef = useRef<number | null>(null);

  if (tracks.length === 0) {
    return (
      <div className="flex min-h-[10rem] items-center justify-center rounded-2xl border border-dashed border-edge p-8 text-center">
        <div>
          <p aria-hidden="true" className="mb-2 text-2xl">
            🎵
          </p>
          <p className="font-medium text-ink">Your game is empty</p>
          <p className="mt-1 text-sm text-ink-muted">
            <span className="hidden lg:inline">Search for a song on the left</span>
            <span className="lg:hidden">Search above</span>
            {' '}and hit + to add it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ol aria-label="Playlist tracks in game order" className="space-y-2">
      {tracks.map((track, index) => (
        <li
          key={track.id}
          data-track-index={index}
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
          <span
            aria-hidden="true"
            className="touch-none cursor-grab select-none text-ink-faint"
            title="Drag to reorder"
            onTouchStart={() => {
              touchRef.current = { index };
              touchDropRef.current = null;
              setDragIndex(index);
            }}
            onTouchMove={(e) => {
              if (!touchRef.current) return;
              const touch = e.touches[0];
              const el = document.elementFromPoint(touch.clientX, touch.clientY);
              const li = el?.closest('[data-track-index]') as HTMLElement | null;
              if (li) {
                const idx = parseInt(li.dataset.trackIndex ?? '-1', 10);
                if (idx >= 0 && idx !== touchRef.current.index) {
                  touchDropRef.current = idx;
                  setDropIndex(idx);
                }
              }
            }}
            onTouchEnd={() => {
              const from = touchRef.current?.index ?? null;
              const to = touchDropRef.current;
              if (from !== null && to !== null && from !== to) onMove(from, to);
              touchRef.current = null;
              touchDropRef.current = null;
              setDragIndex(null);
              setDropIndex(null);
            }}
          >
            ⋮⋮
          </span>
          <span className="hidden w-6 shrink-0 text-right text-xs text-ink-faint tabular-nums lg:inline">{index + 1}</span>
          {track.artUrl ? (
            <img src={track.artUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover lg:h-14 lg:w-14" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface text-ink-faint lg:h-14 lg:w-14">♪</span>
          )}
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-sm text-ink">{track.title}</span>
            <span className="block truncate text-xs text-ink-muted">{track.artist} · {formatTime(track.durationSec)}</span>
          </span>
          <TrackPreviewButton track={track} />
          <span className="flex shrink-0 items-center gap-1">
            <button
              disabled={index === 0}
              onClick={() => onMove(index, index - 1)}
              aria-label={`Move ${track.title} up`}
              className="hidden h-8 w-8 cursor-pointer items-center justify-center rounded text-ink-muted hover:bg-panel-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 lg:flex"
            >
              ↑
            </button>
            <button
              disabled={index === tracks.length - 1}
              onClick={() => onMove(index, index + 1)}
              aria-label={`Move ${track.title} down`}
              className="hidden h-8 w-8 cursor-pointer items-center justify-center rounded text-ink-muted hover:bg-panel-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 lg:flex"
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
