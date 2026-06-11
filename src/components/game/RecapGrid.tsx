import type { Track, TrackResult } from '@/types';
import { cn } from '@/lib/utils';

interface RecapGridProps {
  results: TrackResult[];
  tracksById: Map<number, Track>;
}

/** On-screen run recap. Visually mirrors the emoji grid produced by Copy results. */
export function RecapGrid({ results, tracksById }: RecapGridProps) {
  return (
    <ol aria-label="Results per track" className="space-y-1.5">
      {results.map((result, index) => {
        const track = tracksById.get(result.trackId);
        return (
          <li
            key={`${result.trackId}-${index}`}
            className="flex items-center gap-3 rounded-lg border border-edge/60 bg-panel/60 px-3 py-2"
          >
            <span className="w-6 text-right text-xs text-ink-faint tabular-nums">{index + 1}</span>
            <span
              aria-hidden="true"
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-bold tabular-nums',
                result.outcome === 'won' && 'border-success/60 bg-success/15 text-success',
                result.outcome === 'lost' && 'border-edge bg-surface text-ink-faint',
                result.outcome === 'unplayable' && 'border-edge bg-surface text-warn',
              )}
            >
              {result.outcome === 'won' ? result.winningAttempt : result.outcome === 'lost' ? '✕' : '⊘'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{track?.title ?? 'Unknown track'}</span>
              <span className="block truncate text-xs text-ink-muted">{track?.artist ?? ''}</span>
            </span>
            <span className="shrink-0 text-xs text-ink-muted">
              {result.outcome === 'won'
                ? `attempt ${result.winningAttempt}`
                : result.outcome === 'lost'
                  ? 'missed'
                  : 'unavailable'}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
