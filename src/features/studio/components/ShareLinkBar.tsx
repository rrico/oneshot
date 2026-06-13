import { useState } from 'react';
import { Button } from '@/components/ui/Button';

type ShareStatus = 'idle' | 'creating' | 'ready' | 'error';

interface ShareLinkBarProps {
  trackCount: number;
  shareStatus: ShareStatus;
  shortUrl: string | null;
  onCreateLink: () => Promise<string | null>;
  onTestPlay: () => void;
}

/** Pinned share bar: async short-link creation, copy, and test play. */
export function ShareLinkBar({ trackCount, shareStatus, shortUrl, onCreateLink, onTestPlay }: ShareLinkBarProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const handleCopy = async () => {
    let url = shortUrl;
    if (!url) {
      url = await onCreateLink();
      if (!url) return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  };

  const buttonLabel =
    shareStatus === 'creating'
      ? 'Creating link…'
      : copied
        ? '✓ Link copied'
        : shortUrl
          ? 'Copy link'
          : 'Get link';

  return (
    <div className="shrink-0 rounded-2xl border border-edge bg-panel p-4">
      {trackCount === 0 ? (
        <p className="text-center text-sm text-ink-muted">Add songs to get your game link.</p>
      ) : (
        <>
          {shortUrl && (
            <p
              className="mb-3 min-w-0 truncate rounded-lg bg-surface px-3 py-2 text-xs text-ink-muted"
              title={shortUrl}
            >
              {shortUrl}
            </p>
          )}
          {shareStatus === 'error' && (
            <p role="alert" className="mb-3 text-xs text-danger">
              Couldn't create link. Check your connection and try again.
            </p>
          )}
          {copyFailed && (
            <p role="alert" className="mb-3 text-xs text-danger">
              Couldn't copy — select the link above and copy it manually.
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => void handleCopy()}
              disabled={shareStatus === 'creating'}
              className="flex-1"
            >
              {buttonLabel}
            </Button>
            <Button onClick={onTestPlay}>Test play</Button>
          </div>
        </>
      )}
      {trackCount > 0 && (
        <p className="mt-3 text-center text-xs text-ink-faint">
          {trackCount} track{trackCount === 1 ? '' : 's'} · Anyone with the link can play.
        </p>
      )}
    </div>
  );
}
