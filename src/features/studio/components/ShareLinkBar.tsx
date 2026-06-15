import { useState } from 'react';
import { Button } from '@/components/ui/Button';

type ShareStatus = 'idle' | 'creating' | 'ready' | 'error';

interface ShareLinkBarProps {
  trackCount: number;
  shareStatus: ShareStatus;
  shortUrl: string | null;
  creatorToken: string | null;
  shareCode: string | null;
  awaitingTitleConfirm: boolean;
  onCreateLink: () => Promise<string | null>;
  onTestPlay: () => void;
}

const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

type CopyKey = 'player' | 'creator';

/** Pinned share bar: async short-link creation, copy, and test play. */
export function ShareLinkBar({
  trackCount,
  shareStatus,
  shortUrl,
  creatorToken,
  shareCode,
  awaitingTitleConfirm,
  onCreateLink,
  onTestPlay,
}: ShareLinkBarProps) {
  const [copiedKey, setCopiedKey] = useState<CopyKey | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  const creatorUrl =
    shareCode && creatorToken
      ? `${window.location.origin}/dashboard/${shareCode}?token=${creatorToken}`
      : null;

  const copyText = async (key: CopyKey, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setCopyFailed(false);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      setCopyFailed(true);
    }
  };

  const handleShare = async () => {
    let url = shortUrl;
    if (!url) {
      url = await onCreateLink();
      if (!url) return;
    }

    if (canNativeShare) {
      try {
        await navigator.share({ url });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setCopyFailed(true);
      }
      return;
    }

    await copyText('player', url);
  };

  const handleCopyCreator = async () => {
    if (!creatorUrl) return;
    if (canNativeShare) {
      try {
        await navigator.share({ url: creatorUrl, title: 'Your results link' });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setCopyFailed(true);
      }
      return;
    }
    await copyText('creator', creatorUrl);
  };

  const shareButtonLabel =
    shareStatus === 'creating'
      ? 'Creating…'
      : awaitingTitleConfirm
        ? 'Confirm & share'
        : copiedKey === 'player'
          ? '✓ Copied!'
          : 'Share game';

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
          {awaitingTitleConfirm && (
            <p className="mb-3 text-xs text-ink-muted">
              We've suggested a name above — edit it or confirm to share.
            </p>
          )}
          {shareStatus === 'error' && (
            <p role="alert" className="mb-3 text-xs text-danger">
              Couldn't create link. Check your connection and try again.
            </p>
          )}
          {copyFailed && (
            <p role="alert" className="mb-3 text-xs text-danger">
              Couldn't share — copy the link above manually.
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => void handleShare()}
              disabled={shareStatus === 'creating'}
              className="flex-1"
            >
              {shareButtonLabel}
            </Button>
            <Button onClick={onTestPlay}>Test play</Button>
          </div>

          {creatorUrl && (
            <div className="mt-4 rounded-xl border border-edge bg-surface p-3">
              <p className="mb-1 text-xs font-medium text-ink-muted">Your results link — save this.</p>
              <p className="mb-2 min-w-0 truncate text-xs text-ink-faint" title={creatorUrl}>
                {creatorUrl}
              </p>
              <Button
                onClick={() => void handleCopyCreator()}
                className="w-full text-xs"
              >
                {copiedKey === 'creator' ? '✓ Copied!' : 'Copy results link'}
              </Button>
              <p className="mt-2 text-xs text-ink-faint">
                This link gives access to results. Keep it — we can't recover it.
              </p>
            </div>
          )}
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
