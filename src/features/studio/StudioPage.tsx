import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Track } from '@/types';
import { encodePlaylist, MAX_TITLE_LENGTH, MAX_TRACKS } from '@/lib/playlist-codec';
import { audioEngine } from '@/lib/audio/engine';
import { Dialog } from '@/components/ui/Dialog';
import { Round } from '@/components/game/Round';
import { RevealCard } from '@/components/game/RevealCard';
import { Button } from '@/components/ui/Button';
import { SearchPane } from './components/SearchPane';
import { PlaylistPane } from './components/PlaylistPane';
import { ShareLinkBar } from './components/ShareLinkBar';
import type { TrackResult } from '@/types';

type ShareStatus = 'idle' | 'creating' | 'ready' | 'error';

export function StudioPage() {
  const [title, setTitle] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [testTrack, setTestTrack] = useState<Track | null>(null);
  const [testResult, setTestResult] = useState<TrackResult | null>(null);

  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle');
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareSnapshot, setShareSnapshot] = useState<string>('');

  const addedIds = useMemo(() => new Set(tracks.map((t) => t.id)), [tracks]);

  const currentSnapshot = useMemo(() => {
    if (tracks.length === 0) return '';
    try {
      return encodePlaylist({
        title: title.trim() === '' ? undefined : title.trim(),
        trackIds: tracks.map((t) => t.id),
      });
    } catch {
      return '';
    }
  }, [title, tracks]);

  // Reset share state when the playlist changes after a code was created
  const effectiveShareStatus: ShareStatus =
    shareStatus === 'ready' && shareSnapshot !== currentSnapshot ? 'idle' : shareStatus;
  const shortUrl =
    effectiveShareStatus === 'ready' && shareCode
      ? `${window.location.origin}/g/${shareCode}`
      : null;

  const handleCreateLink = useCallback(async (): Promise<string | null> => {
    // Re-use existing code if the playlist hasn't changed
    if (shareStatus === 'ready' && shareSnapshot === currentSnapshot && shareCode) {
      return `${window.location.origin}/g/${shareCode}`;
    }

    setShareStatus('creating');
    try {
      const playlist = {
        title: title.trim() === '' ? undefined : title.trim(),
        trackIds: tracks.map((t) => t.id),
      };
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlist),
      });
      if (!res.ok) throw new Error('API error');
      const { code } = (await res.json()) as { code: string };
      setShareCode(code);
      setShareSnapshot(currentSnapshot);
      setShareStatus('ready');
      return `${window.location.origin}/g/${code}`;
    } catch {
      setShareStatus('error');
      return null;
    }
  }, [shareStatus, shareSnapshot, shareCode, currentSnapshot, title, tracks]);

  const addTrack = (track: Track) => {
    if (tracks.length >= MAX_TRACKS || addedIds.has(track.id)) return;
    setTracks((current) => [...current, track]);
  };

  const removeTrack = (index: number) => {
    setTracks((current) => current.filter((_, i) => i !== index));
  };

  const moveTrack = (from: number, to: number) => {
    setTracks((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const openTestPlay = () => {
    audioEngine.stop();
    setTestResult(null);
    setTestTrack(tracks[Math.floor(Math.random() * tracks.length)] ?? null);
  };

  const closeTestPlay = () => {
    audioEngine.stop();
    setTestTrack(null);
    setTestResult(null);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-edge">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="shrink-0 text-sm font-bold tracking-tight text-ink-muted hover:text-ink">
            oneshot
          </Link>
          <input
            type="text"
            value={title}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Name your game (optional)…"
            aria-label="Playlist name"
            className="w-full max-w-sm rounded-lg border border-transparent bg-transparent px-3 py-1.5 text-center text-base font-medium text-ink placeholder:text-ink-faint hover:border-edge focus:border-accent"
          />
          <span className="shrink-0 text-xs text-ink-faint tabular-nums">
            {tracks.length}/{MAX_TRACKS}
          </span>
        </div>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 gap-6 px-6 py-6 lg:grid-cols-[2fr_3fr] lg:overflow-hidden">
        <SearchPane onAdd={addTrack} addedIds={addedIds} />

        <section aria-label="Your playlist" className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
          <ShareLinkBar
            trackCount={tracks.length}
            shareStatus={effectiveShareStatus}
            shortUrl={shortUrl}
            onCreateLink={handleCreateLink}
            onTestPlay={openTestPlay}
          />
          <PlaylistPane tracks={tracks} onRemove={removeTrack} onMove={moveTrack} />
        </section>
      </main>

      {testTrack && (
        <Dialog title="Test play" onClose={closeTestPlay} wide>
          {testResult ? (
            <div className="space-y-4">
              <RevealCard
                track={testTrack}
                outcome={testResult.outcome === 'won' ? 'won' : 'lost'}
                attempt={testResult.winningAttempt}
              />
              <p className="text-sm text-ink-muted">
                That's exactly what your friends will play — one round per track.
              </p>
              <div className="flex justify-end gap-3">
                <Button onClick={openTestPlay}>Try another track</Button>
                <Button variant="primary" onClick={closeTestPlay}>
                  Back to building
                </Button>
              </div>
            </div>
          ) : (
            <Round
              track={testTrack}
              nextLabel="Done"
              onResolved={setTestResult}
              autoFocusGuess
            />
          )}
        </Dialog>
      )}
    </div>
  );
}
