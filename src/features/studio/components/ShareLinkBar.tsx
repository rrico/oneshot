import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ShareLinkBarProps {
  shareUrl: string | null;
  trackCount: number;
  onTestPlay: () => void;
}

const WARN_LENGTH = 1500;
const DANGER_LENGTH = 1900;

/** Pinned share bar: live URL, length meter, test play, copy (UX-DR10). */
export function ShareLinkBar({ shareUrl, trackCount, onTestPlay }: ShareLinkBarProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const length = shareUrl?.length ?? 0;
  const lengthState = length >= DANGER_LENGTH ? 'danger' : length >= WARN_LENGTH ? 'warn' : 'ok';

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <div className="rounded-2xl border border-edge bg-panel p-4">
      {shareUrl ? (
        <>
          <div className="mb-3 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2 text-xs text-ink-muted" title={shareUrl}>
              {shareUrl}
            </p>
            <span
              className={`shrink-0 text-xs tabular-nums ${
                lengthState === 'danger' ? 'text-danger' : lengthState === 'warn' ? 'text-warn' : 'text-ink-faint'
              }`}
            >
              {length} chars
            </span>
          </div>
          {lengthState !== 'ok' && (
            <p className="mb-3 text-xs text-warn">
              {lengthState === 'danger'
                ? '⚠ This link is very long and may get cut off by some chat apps. Consider fewer tracks or a shorter name.'
                : 'Heads up: long links can get truncated by some platforms.'}
            </p>
          )}
          {copyFailed && (
            <p role="alert" className="mb-3 text-xs text-danger">
              Couldn't access the clipboard — select the link above and copy it manually.
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={() => void copy()} className="flex-1">
              {copied ? '✓ Link copied' : 'Copy link'}
            </Button>
            <Button onClick={onTestPlay}>Test play</Button>
          </div>
        </>
      ) : (
        <p className="text-center text-sm text-ink-muted">Add songs to get your game link.</p>
      )}
      {trackCount > 0 && (
        <p className="mt-3 text-center text-xs text-ink-faint">
          {trackCount} track{trackCount === 1 ? '' : 's'} · Anyone with the link can play.
        </p>
      )}
    </div>
  );
}
