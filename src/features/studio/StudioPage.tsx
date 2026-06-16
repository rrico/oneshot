import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Track } from '@/types';
import { encodePlaylist, MAX_TITLE_LENGTH, MAX_TRACKS } from '@/lib/playlist-codec';
import { generatePlaylistName } from '@/lib/nameGenerator';
import { saveStoredGame, hasStoredGames } from '@/lib/gameStorage';
import { audioEngine } from '@/lib/audio/engine';
import { Dialog } from '@/components/ui/Dialog';
import { Round } from '@/components/game/Round';
import { RevealCard } from '@/components/game/RevealCard';
import { Button } from '@/components/ui/Button';
import { SearchPane } from './components/SearchPane';
import { PlaylistPane } from './components/PlaylistPane';
import { RecommendationsSection } from './components/RecommendationsSection';
import { ShareLinkBar } from './components/ShareLinkBar';
import type { TrackResult } from '@/types';

type ShareStatus = 'idle' | 'creating' | 'ready' | 'error';

const DRAFT_KEY = 'oneshot:studio:draft';

function loadDraft(): { title: string; tracks: Track[] } {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { title: '', tracks: [] };
    const data = JSON.parse(raw) as { title?: unknown; tracks?: unknown };
    const tracks = Array.isArray(data.tracks)
      ? data.tracks.filter(
          (t): t is Track =>
            typeof t === 'object' &&
            t !== null &&
            typeof (t as Track).id === 'number' &&
            typeof (t as Track).title === 'string' &&
            typeof (t as Track).artist === 'string',
        )
      : [];
    return { title: typeof data.title === 'string' ? data.title : '', tracks };
  } catch {
    return { title: '', tracks: [] };
  }
}

export function StudioPage() {
  const [title, setTitle] = useState(() => loadDraft().title);
  const [tracks, setTracks] = useState<Track[]>(() => loadDraft().tracks);
  const [testTrack, setTestTrack] = useState<Track | null>(null);
  const [testResult, setTestResult] = useState<TrackResult | null>(null);

  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle');
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [creatorToken, setCreatorToken] = useState<string | null>(null);
  const [shareSnapshot, setShareSnapshot] = useState<string>('');
  const [awaitingTitleConfirm, setAwaitingTitleConfirm] = useState(false);
  const [showMyGames, setShowMyGames] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Check localStorage for existing games to show "My games" link
  useEffect(() => {
    setShowMyGames(hasStoredGames());
  }, []);

  // Persist draft on every change; clear when playlist is empty.
  useEffect(() => {
    try {
      if (tracks.length === 0) {
        localStorage.removeItem(DRAFT_KEY);
      } else {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, tracks }));
      }
    } catch {}
  }, [title, tracks]);

  const handleNewPlaylist = () => {
    setTitle('');
    setTracks([]);
    setAwaitingTitleConfirm(false);
  };

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
  const effectiveCreatorToken = effectiveShareStatus === 'ready' ? creatorToken : null;

  // Reset awaitingTitleConfirm when playlist changes after prompting
  useEffect(() => {
    if (awaitingTitleConfirm && effectiveShareStatus === 'idle') {
      setAwaitingTitleConfirm(false);
    }
  }, [awaitingTitleConfirm, effectiveShareStatus]);

  const handleCreateLink = useCallback(async (): Promise<string | null> => {
    // Re-use existing code if the playlist hasn't changed
    if (shareStatus === 'ready' && shareSnapshot === currentSnapshot && shareCode) {
      return `${window.location.origin}/g/${shareCode}`;
    }

    // If no title and not yet awaiting confirmation: inject a generated name and prompt
    if (title.trim() === '' && !awaitingTitleConfirm) {
      const generated = generatePlaylistName(tracks);
      setTitle(generated);
      setAwaitingTitleConfirm(true);
      // Scroll title input into view and focus it
      setTimeout(() => {
        titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 50);
      return null;
    }

    setAwaitingTitleConfirm(false);
    setShareStatus('creating');
    try {
      const playlist = {
        title: title.trim() === '' ? undefined : title.trim(),
        trackIds: tracks.map((t) => t.id),
        tracks: tracks.map(({ id, title: t, artist, artUrl }) => ({ id, title: t, artist, artUrl })),
      };
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlist),
      });
      if (!res.ok) throw new Error('API error');
      const { code, creatorToken: token } = (await res.json()) as { code: string; creatorToken: string };
      setShareCode(code);
      setCreatorToken(token);
      setShareSnapshot(currentSnapshot);
      setShareStatus('ready');

      // Persist to localStorage for the My Games dashboard
      saveStoredGame({
        code,
        creatorToken: token,
        title: title.trim() || 'Untitled game',
        trackCount: tracks.length,
        createdAt: Math.floor(Date.now() / 1000),
      });
      setShowMyGames(true);

      return `${window.location.origin}/g/${code}`;
    } catch {
      setShareStatus('error');
      return null;
    }
  }, [shareStatus, shareSnapshot, shareCode, currentSnapshot, title, tracks, awaitingTitleConfirm]);

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
            ref={titleInputRef}
            type="text"
            value={title}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(event) => {
              setTitle(event.target.value);
              if (awaitingTitleConfirm) setAwaitingTitleConfirm(true); // keep flag while editing
            }}
            placeholder="Name your game (optional)…"
            aria-label="Playlist name"
            className="w-full max-w-sm rounded-lg border border-transparent bg-transparent px-3 py-1.5 text-center text-base font-medium text-ink placeholder:text-ink-faint hover:border-edge focus:border-accent"
          />
          <div className="flex shrink-0 items-center gap-3">
            {showMyGames && (
              <Link to="/dashboard" className="text-xs text-ink-muted hover:text-ink">
                My games
              </Link>
            )}
            {tracks.length > 0 && (
              <button
                onClick={handleNewPlaylist}
                className="text-xs text-ink-muted hover:text-ink"
              >
                <span className="hidden sm:inline">New playlist</span>
                <span className="sm:hidden">New</span>
              </button>
            )}
            <span className="text-xs text-ink-faint tabular-nums">
              {tracks.length}/{MAX_TRACKS}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-6xl gap-4 px-6 py-4 lg:flex-1 lg:grid-cols-[2fr_3fr] lg:gap-6 lg:overflow-hidden lg:py-6">
        <SearchPane onAdd={addTrack} addedIds={addedIds} />

        <section aria-label="Your playlist" className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
          <ShareLinkBar
            trackCount={tracks.length}
            shareStatus={effectiveShareStatus}
            shortUrl={shortUrl}
            creatorToken={effectiveCreatorToken}
            shareCode={shareCode}
            awaitingTitleConfirm={awaitingTitleConfirm}
            onCreateLink={handleCreateLink}
            onTestPlay={openTestPlay}
          />
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <PlaylistPane tracks={tracks} onRemove={removeTrack} onMove={moveTrack} />
            <RecommendationsSection
              playlistTracks={tracks}
              addedIds={addedIds}
              onAdd={addTrack}
            />
          </div>
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
