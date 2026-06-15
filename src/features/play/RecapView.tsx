import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Track, TrackResult } from '@/types';
import { buildRecapText, scoreLine } from '@/lib/recap';
import { buildResultsUrl } from '@/lib/playlist-codec';
import { setPlayedSessionId } from '@/lib/gameStorage';
import { GameShell } from '@/components/game/GameShell';
import { RecapGrid } from '@/components/game/RecapGrid';
import { Button } from '@/components/ui/Button';

interface RecapViewProps {
  playlistTitle?: string;
  results: TrackResult[];
  tracksById: Map<number, Track>;
  shareParam: string;
  gameCode?: string;
  finishedEarly?: boolean;
}

type CopyKey = 'results' | 'link';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function submitResults(
  code: string,
  sessionId: string,
  results: TrackResult[],
  attempt = 1,
): Promise<void> {
  const perTrack = results.map((r) => ({
    trackId: r.trackId,
    outcome: r.outcome,
    attemptsUsed: r.outcome === 'won' ? (r.winningAttempt ?? 1) : r.outcome === 'lost' ? 6 : 0,
  }));

  try {
    const res = await fetch(`/api/games/${code}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, perTrack }),
    });
    if (!res.ok && res.status !== 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return submitResults(code, sessionId, results, attempt + 1);
    }
  } catch {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return submitResults(code, sessionId, results, attempt + 1);
    }
  }
}

export function RecapView({ playlistTitle, results, tracksById, shareParam, gameCode, finishedEarly }: RecapViewProps) {
  const [copiedKey, setCopiedKey] = useState<CopyKey | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const submitted = useRef(false);

  const won = results.filter((r) => r.outcome === 'won').length;
  const firstTries = results.filter((r) => r.outcome === 'won' && r.winningAttempt === 1).length;

  const resultsUrl = buildResultsUrl(shareParam, results);

  // Submit results once on mount if playing via a game code (not legacy ?d= links)
  useEffect(() => {
    if (!gameCode || submitted.current) return;
    submitted.current = true;

    const id = generateUUID();
    setPlayedSessionId(gameCode, id);
    setSessionId(id);
    void submitResults(gameCode, id, results);
  }, [gameCode, results]);

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

  const everyoneUrl =
    gameCode && sessionId ? `/dashboard/${gameCode}?token=${sessionId}` : null;

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

        {everyoneUrl && (
          <div className="rounded-2xl border border-edge bg-panel p-4 text-center">
            <Link
              to={everyoneUrl}
              className="inline-flex min-h-11 items-center rounded-lg bg-ink px-6 text-sm font-semibold text-surface transition-colors hover:bg-white"
            >
              See how everyone did →
            </Link>
            <p className="mt-2 text-xs text-ink-faint">Compare scores with others who've played.</p>
          </div>
        )}

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
