import type { Track } from '@/types';
import { cn } from '@/lib/utils';

interface RevealCardProps {
  track: Track;
  outcome: 'won' | 'lost';
  /** 1-based attempt the round was won on. */
  attempt?: number;
}

export function RevealCard({ track, outcome, attempt }: RevealCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl border p-4',
        outcome === 'won' ? 'win-pulse border-success/50 bg-success/10' : 'border-edge bg-panel',
      )}
    >
      {track.artUrl ? (
        <img src={track.artUrl} alt={`Album art for ${track.album}`} className="h-20 w-20 rounded-lg object-cover" />
      ) : (
        <span className="flex h-20 w-20 items-center justify-center rounded-lg bg-surface text-2xl text-ink-faint">♪</span>
      )}
      <div className="min-w-0">
        <p className={cn('text-sm font-medium', outcome === 'won' ? 'text-success' : 'text-ink-muted')}>
          {outcome === 'won'
            ? `Got it on attempt ${attempt}${attempt === 1 ? ' — one shot!' : ''}`
            : 'Out of attempts — it was'}
        </p>
        <p className="truncate text-lg font-semibold text-ink">{track.title}</p>
        <p className="truncate text-sm text-ink-muted">
          {track.artist}
          {track.album ? ` · ${track.album}` : ''}
        </p>
      </div>
    </div>
  );
}
