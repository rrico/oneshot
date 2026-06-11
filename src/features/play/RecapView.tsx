import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Track, TrackResult } from '@/types';
import { buildRecapText, scoreLine } from '@/lib/recap';
import { buildResultsUrl } from '@/lib/playlist-codec';
import { GameShell } from '@/components/game/GameShell';
import { RecapGrid } from '@/components/game/RecapGrid';
import { Button } from '@/components/ui/Button';

interface RecapViewProps {
  playlistTitle?: string;
  results: TrackResult[];
  tracksById: Map<number, Track>;
  shareParam: string;
  finishedEarly?: boolean;
}

type CopyKey = 'results' | 'link';

export function RecapView({ playlistTitle, results, tracksById, shareParam, finishedEarly }: RecapViewProps) {
  const [copiedKey, setCopiedKey] = useState<CopyKey | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  const won = results.filter((r) => r.outcome === 'won').length;
  const firstTries = results.filter((r) => r.outcome === 'won' && r.winningAttempt === 1).length;

  // Share the results page rather than the raw game link: it shows the score
  // without spoiling any songs, and has its own "Play this game" button.
  const resultsUrl = buildResultsUrl(shareParam, results);

  const copy = async (key: CopyKey, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setCopyFailed(false);
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2000);
    } catch {
      setCopyFailed(true);
    }
  };

  const played = results.filter((r) => r.outcome === 'won' || r.outcome === 'lost').length;
  const subtitle = finishedEarly
    ? `Ended early — ${played} of ${results.length} tracks played`
    : 'Game complete';

  return (
    <GameShell title={playlistTitle} subtitle={subtitle}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-edge bg-panel p-6 text-center">
          <p className="text-sm text-ink-muted">Final score</p>
          <p className="my-1 text-4xl font-bold tabular-nums">
            <span className="gradient-text">{scoreLine(results)}</span>
          </p>
          <p className="text-sm text-ink-muted">
            {won === 0
              ? 'Brutal playlist. Demand a rematch.'
              : firstTries > 0
                ? `${firstTries} guessed on the first second. Show-off.`
                : 'Solid run — share your score below.'}
          </p>
        </div>

        <RecapGrid results={results} tracksById={tracksById} />

        {copyFailed && (
          <p role="alert" className="text-center text-sm text-danger">
            Couldn't access the clipboard — select and copy your score manually.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="primary"
            onClick={() => void copy('results', buildRecapText({ playlistTitle, results, shareUrl: resultsUrl }))}
          >
            {copiedKey === 'results' ? '✓ Copied' : 'Copy results'}
          </Button>
          <Button onClick={() => void copy('link', resultsUrl)}>
            {copiedKey === 'link' ? '✓ Link copied' : 'Copy results link'}
          </Button>
        </div>
        <p className="text-center text-xs text-ink-faint">
          Shares your score without spoiling the songs — friends can play from the link.
        </p>

        <div className="flex items-center justify-center gap-6 border-t border-edge pt-5">
          <button
            onClick={() => window.location.reload()}
            className="cursor-pointer text-sm text-ink-muted hover:text-ink"
          >
            Play again
          </button>
          <Link to="/create" className="text-sm text-ink-muted hover:text-ink">
            Create your own game →
          </Link>
        </div>
      </div>
    </GameShell>
  );
}
