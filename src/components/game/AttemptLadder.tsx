import { MAX_ATTEMPTS } from '@/lib/round-model';
import { cn } from '@/lib/utils';

interface AttemptLadderProps {
  /** 0-based current attempt index. */
  attemptIndex: number;
  status: 'playing' | 'won' | 'lost';
}

/** Six segments for attempts 1-6. State is conveyed by glyph + shape, not color alone (NFR-A2). */
export function AttemptLadder({ attemptIndex, status }: AttemptLadderProps) {
  return (
    <div
      role="img"
      aria-label={
        status === 'playing'
          ? `Attempt ${attemptIndex + 1} of ${MAX_ATTEMPTS}`
          : status === 'won'
            ? `Won on attempt ${attemptIndex + 1}`
            : 'Out of attempts'
      }
      className="flex items-center justify-center gap-2"
    >
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
        const used = i < attemptIndex || (status === 'lost' && i === attemptIndex);
        const won = status === 'won' && i === attemptIndex;
        const current = status === 'playing' && i === attemptIndex;
        return (
          <span
            key={i}
            className={cn(
              'flex h-7 w-10 items-center justify-center rounded-md border text-xs font-semibold tabular-nums',
              used && 'border-edge bg-surface text-ink-faint',
              won && 'border-success bg-success/15 text-success',
              current && 'border-accent bg-accent/10 text-accent ring-1 ring-accent/40',
              !used && !won && !current && 'border-edge bg-panel text-ink-muted',
            )}
          >
            {used ? '✕' : won ? '✓' : i + 1}
          </span>
        );
      })}
    </div>
  );
}
