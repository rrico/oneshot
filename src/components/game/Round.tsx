import { useCallback, useEffect, useRef, useState } from 'react';
import type { Track, TrackResult } from '@/types';
import {
  applyGuess,
  applySkip,
  initialRoundState,
  unlockedSeconds,
  winningAttempt,
  FULL_CLIP_SECONDS,
  MAX_ATTEMPTS,
  type RoundState,
} from '@/lib/round-model';
import { audioEngine } from '@/lib/audio/engine';
import { useAudioClock } from '@/lib/audio/useAudioClock';
import { useShortcuts } from '@/lib/shortcuts/useShortcuts';
import { appError, type AppError } from '@/lib/errors';
import { Button } from '@/components/ui/Button';
import { ShortcutHint } from '@/components/shortcuts/ShortcutHint';
import { AttemptLadder } from './AttemptLadder';
import { SnippetProgressBar } from './SnippetProgressBar';
import { MissedGuessesList } from './MissedGuessesList';
import { GuessCombobox } from './GuessCombobox';
import { RevealCard } from './RevealCard';
import { alreadyGuessed } from '@/lib/round-model';

interface RoundProps {
  track: Track;
  /** Label for the post-round primary action (e.g. "Next track", "See results"). */
  nextLabel: string;
  onResolved: (result: TrackResult) => void;
  autoFocusGuess?: boolean;
}

/**
 * One full Heardle round for one track: progressive snippets, guess/skip,
 * reveal, then an explicit advance (FR10-FR19).
 */
export function Round({ track, nextLabel, onResolved, autoFocusGuess = true }: RoundProps) {
  const [round, setRound] = useState<RoundState>(initialRoundState);
  const [playbackError, setPlaybackError] = useState<AppError | null>(null);
  const clock = useAudioClock();
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const unlocked = unlockedSeconds(round);
  const isResolved = round.status !== 'playing';

  // Reset round state and zero the audio clock when the track changes.
  useEffect(() => {
    setRound(initialRoundState());
    setPlaybackError(null);
    audioEngine.reset();
    return () => audioEngine.reset();
  }, [track.id]);

  const playSnippet = useCallback(
    async (seconds?: number) => {
      setPlaybackError(null);
      try {
        await audioEngine.playClip(track.previewUrl, seconds ?? unlockedSeconds(roundRef.current));
      } catch {
        setPlaybackError(
          appError(
            "Can't play this clip",
            'The audio failed to start. Check your connection and retry.',
            'retry',
          ),
        );
      }
    },
    [track.previewUrl],
  );

  // Keep a ref of the round so playSnippet always reads the latest unlock.
  const roundRef = useRef(round);
  roundRef.current = round;

  /**
   * Unlock the next-longer window. If audio is already playing, keep it
   * going and just raise the boundary; otherwise play the longer snippet.
   */
  const advanceSnippet = useCallback(
    (seconds: number) => {
      if (audioEngine.getClock().isPlaying) {
        audioEngine.extendClip(seconds);
      } else {
        void playSnippet(seconds);
      }
    },
    [playSnippet],
  );

  const handleGuess = (guess: Track) => {
    if (isResolved) return;
    const next = applyGuess(round, guess, track);
    setRound(next);
    if (next.status === 'won') {
      // Victory lap: play everything the round had to offer.
      void playSnippet(FULL_CLIP_SECONDS);
    } else if (next.status === 'lost') {
      audioEngine.stop();
    } else if (next.attemptIndex !== round.attemptIndex) {
      advanceSnippet(unlockedSeconds(next));
    }
  };

  const handleSkip = () => {
    if (isResolved) return;
    const next = applySkip(round);
    setRound(next);
    if (next.status === 'playing') {
      advanceSnippet(unlockedSeconds(next));
    } else {
      audioEngine.stop();
    }
  };

  const handleNext = () => {
    audioEngine.stop();
    onResolved({
      trackId: track.id,
      outcome: round.status === 'won' ? 'won' : 'lost',
      winningAttempt: round.status === 'won' ? winningAttempt(round) : undefined,
    });
  };

  useEffect(() => {
    if (isResolved) nextButtonRef.current?.focus();
  }, [isResolved]);

  useShortcuts(
    'play',
    [
      { key: ' ', label: 'Space', description: 'Play / replay the snippet', handler: () => void playSnippet() },
      { key: 's', label: 'S', description: 'Skip (costs one attempt)', handler: handleSkip },
    ],
    !isResolved,
  );

  useShortcuts(
    'reveal',
    [
      { key: 'Enter', label: 'Enter', description: nextLabel, handler: handleNext, allowInInput: true },
      { key: 'ArrowRight', label: '→', description: nextLabel, handler: handleNext },
    ],
    isResolved,
  );

  return (
    <div className="space-y-6">
      <AttemptLadder attemptIndex={round.attemptIndex} status={round.status} />

      <SnippetProgressBar elapsed={clock.elapsed} unlocked={unlocked} />

      {!isResolved && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="primary"
            onClick={() => void playSnippet()}
            disabled={clock.isBuffering}
            className="min-w-44"
            aria-label={clock.isPlaying ? 'Replay snippet' : 'Play snippet'}
          >
            <span aria-hidden="true">{clock.isBuffering ? '…' : '▶'}</span>
            {clock.isBuffering ? 'Buffering' : clock.isPlaying ? 'Playing' : 'Play snippet'}
          </Button>
          <ShortcutHint label="Space" />
        </div>
      )}

      {playbackError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink">⚠ {playbackError.title}</p>
            {playbackError.body && <p className="text-xs text-ink-muted">{playbackError.body}</p>}
          </div>
          <Button onClick={() => void playSnippet()}>Retry</Button>
        </div>
      )}

      <MissedGuessesList guesses={round.missedGuesses} />

      {isResolved ? (
        <div className="space-y-4">
          <RevealCard
            track={track}
            outcome={round.status === 'won' ? 'won' : 'lost'}
            attempt={round.status === 'won' ? winningAttempt(round) : undefined}
          />
          <div className="flex items-center justify-center gap-3">
            <button
              ref={nextButtonRef}
              onClick={handleNext}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-ink px-6 py-2 text-sm font-semibold text-surface transition-colors hover:bg-white"
            >
              {nextLabel}
            </button>
            <ShortcutHint label="Enter" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <GuessCombobox
            onSelect={handleGuess}
            isAlreadyGuessed={(candidate) => alreadyGuessed(round, candidate)}
            onEmptySpace={() => void playSnippet()}
            autoFocus={autoFocusGuess}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-faint">
              {MAX_ATTEMPTS - round.attemptIndex} attempt{MAX_ATTEMPTS - round.attemptIndex === 1 ? '' : 's'} left
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={handleSkip}>
                Skip <span className="text-ink-faint">(+ longer clip)</span>
              </Button>
              <ShortcutHint label="S" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
