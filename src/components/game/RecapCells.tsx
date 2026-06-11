import { cn } from '@/lib/utils';
import type { RoundOutcome } from '@/types';

interface RecapCellsProps {
  outcomes: Array<{ outcome: RoundOutcome; winningAttempt?: number }>;
}

/**
 * Spoiler-free results row: one cell per track (winning attempt, ✕, or ⊘)
 * with no song titles — safe to show people who haven't played yet.
 */
export function RecapCells({ outcomes }: RecapCellsProps) {
  return (
    <ol aria-label="Results per track" className="flex flex-wrap justify-center gap-2">
      {outcomes.map((result, index) => (
        <li
          key={index}
          aria-label={
            result.outcome === 'won'
              ? `Track ${index + 1}: guessed on attempt ${result.winningAttempt}`
              : result.outcome === 'lost'
                ? `Track ${index + 1}: missed`
                : `Track ${index + 1}: unavailable`
          }
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg border text-base font-bold tabular-nums',
            result.outcome === 'won' && 'border-success/60 bg-success/15 text-success',
            result.outcome === 'lost' && 'border-edge bg-surface text-ink-faint',
            result.outcome === 'unplayable' && 'border-edge bg-surface text-warn',
          )}
        >
          <span aria-hidden="true">
            {result.outcome === 'won' ? result.winningAttempt : result.outcome === 'lost' ? '✕' : '⊘'}
          </span>
        </li>
      ))}
    </ol>
  );
}
