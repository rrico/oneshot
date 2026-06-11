import type { Track } from '@/types';
import { highlightSharedWords } from '@/lib/utils';

interface MissedGuessesListProps {
  guesses: Track[];
  answer: Track;
}

/** Append-only wrong picks for the current round. Shared words vs the answer are highlighted. */
export function MissedGuessesList({ guesses, answer }: MissedGuessesListProps) {
  if (guesses.length === 0) return null;
  return (
    <ul aria-label="Wrong guesses this round" className="max-h-44 space-y-1.5 overflow-y-auto">
      {guesses.map((guess, index) => (
        <li
          key={`${guess.id}-${index}`}
          className="flex items-center gap-3 rounded-lg border border-edge/60 bg-panel/60 px-3 py-2 text-sm"
        >
          <span aria-hidden="true" className="text-ink-faint">
            ✕
          </span>
          <span className="truncate text-ink-muted">
            <span className="text-ink/80">{highlightSharedWords(guess.title, answer.title)}</span>
            <span className="text-ink-faint"> — {highlightSharedWords(guess.artist, answer.artist)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
