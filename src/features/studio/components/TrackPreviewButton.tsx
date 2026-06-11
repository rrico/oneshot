import { useEffect, useState } from 'react';
import type { Track } from '@/types';
import { audioEngine } from '@/lib/audio/engine';
import { useAudioClock } from '@/lib/audio/useAudioClock';

/** Module-level so only one preview plays at a time across both panes. */
let activePreviewId: number | null = null;
const previewListeners = new Set<() => void>();

function setActivePreview(id: number | null) {
  activePreviewId = id;
  for (const listener of previewListeners) listener();
}

const PREVIEW_SECONDS = 30;

interface TrackPreviewButtonProps {
  track: Track;
}

export function TrackPreviewButton({ track }: TrackPreviewButtonProps) {
  const clock = useAudioClock();
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    previewListeners.add(listener);
    return () => {
      previewListeners.delete(listener);
    };
  }, []);

  const isActive = activePreviewId === track.id && clock.isPlaying;

  if (!track.previewUrl) {
    return (
      <span className="w-16 text-center text-[11px] text-ink-faint" title="No preview available for this track">
        no preview
      </span>
    );
  }

  return (
    <button
      aria-label={isActive ? `Stop preview of ${track.title}` : `Preview ${track.title}`}
      onClick={(event) => {
        event.stopPropagation();
        if (isActive) {
          audioEngine.stop();
          setActivePreview(null);
        } else {
          setActivePreview(track.id);
          void audioEngine.playClip(track.previewUrl, PREVIEW_SECONDS).catch(() => setActivePreview(null));
        }
      }}
      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-edge text-xs text-ink-muted opacity-100 transition-colors hover:border-accent hover:text-accent sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
    >
      <span aria-hidden="true">{isActive ? '■' : '▶'}</span>
    </button>
  );
}
