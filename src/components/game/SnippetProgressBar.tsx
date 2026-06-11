import { CLIP_SCHEDULE_SECONDS, FULL_CLIP_SECONDS } from '@/lib/round-model';
import { formatTime } from '@/lib/utils';

interface SnippetProgressBarProps {
  /** Seconds played of the current clip. */
  elapsed: number;
  /** Seconds unlocked for the current attempt. */
  unlocked: number;
}

/**
 * Segmented 16s bar divided at the unlock boundaries (1/2/4/7/11/16s).
 * The unlocked span fills with the accent gradient as audio plays; the locked
 * span is dimmed — making "what skipping buys you" visible without copy.
 */
export function SnippetProgressBar({ elapsed, unlocked }: SnippetProgressBarProps) {
  const elapsedPct = (Math.min(elapsed, unlocked) / FULL_CLIP_SECONDS) * 100;
  const unlockedPct = (unlocked / FULL_CLIP_SECONDS) * 100;

  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={unlocked}
        aria-valuenow={Math.min(elapsed, unlocked)}
        aria-valuetext={`${formatTime(elapsed)} of ${formatTime(unlocked)} unlocked`}
        aria-label="Snippet progress"
        className="relative h-3 overflow-hidden rounded-full bg-panel"
      >
        {/* Unlocked region */}
        <div className="absolute inset-y-0 left-0 bg-edge/60" style={{ width: `${unlockedPct}%` }} />
        {/* Played fill */}
        <div className="gradient-accent absolute inset-y-0 left-0" style={{ width: `${elapsedPct}%` }} />
        {/* Stage boundary ticks */}
        {CLIP_SCHEDULE_SECONDS.slice(0, -1).map((seconds) => (
          <span
            key={seconds}
            aria-hidden="true"
            className="absolute inset-y-0 w-px bg-surface"
            style={{ left: `${(seconds / FULL_CLIP_SECONDS) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-ink-muted tabular-nums">
        <span>{formatTime(elapsed)}</span>
        <span>
          {formatTime(unlocked)} <span className="text-ink-faint">unlocked of {formatTime(FULL_CLIP_SECONDS)}</span>
        </span>
      </div>
    </div>
  );
}
