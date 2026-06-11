import type { Track } from '@/types';
import { normalizeForMatch } from '@/lib/utils';

/**
 * Pure round state machine (FR10-FR18). Fixed Heardle ladder — not configurable.
 * UI and audio both read from this single source of truth.
 */

export const CLIP_SCHEDULE_SECONDS = [1, 2, 4, 7, 11, 16] as const;
export const MAX_ATTEMPTS = CLIP_SCHEDULE_SECONDS.length;
export const FULL_CLIP_SECONDS = CLIP_SCHEDULE_SECONDS[MAX_ATTEMPTS - 1];

export type RoundStatus = 'playing' | 'won' | 'lost';

export interface RoundState {
  /** 0-based index of the current attempt (0..5). */
  attemptIndex: number;
  missedGuesses: Track[];
  status: RoundStatus;
}

export function initialRoundState(): RoundState {
  return { attemptIndex: 0, missedGuesses: [], status: 'playing' };
}

/** Seconds of audio unlocked for the current attempt. */
export function unlockedSeconds(state: RoundState): number {
  if (state.status !== 'playing') return FULL_CLIP_SECONDS;
  return CLIP_SCHEDULE_SECONDS[state.attemptIndex];
}

/** Correct when catalog IDs match, or when normalized title + artist match (catalog duplicates). */
export function isCorrectGuess(guess: Track, answer: Track): boolean {
  if (guess.id === answer.id) return true;
  return (
    normalizeForMatch(guess.title) === normalizeForMatch(answer.title) &&
    normalizeForMatch(guess.artist) === normalizeForMatch(answer.artist)
  );
}

function consumeAttempt(state: RoundState): Pick<RoundState, 'attemptIndex' | 'status'> {
  const isLastAttempt = state.attemptIndex >= MAX_ATTEMPTS - 1;
  return isLastAttempt
    ? { attemptIndex: state.attemptIndex, status: 'lost' }
    : { attemptIndex: state.attemptIndex + 1, status: 'playing' };
}

export function applyGuess(state: RoundState, guess: Track, answer: Track): RoundState {
  if (state.status !== 'playing') return state;
  if (isCorrectGuess(guess, answer)) {
    return { ...state, status: 'won' };
  }
  return { ...state, ...consumeAttempt(state), missedGuesses: [...state.missedGuesses, guess] };
}

export function applySkip(state: RoundState): RoundState {
  if (state.status !== 'playing') return state;
  return { ...state, ...consumeAttempt(state) };
}

/** 1-based attempt number the round was won on. */
export function winningAttempt(state: RoundState): number {
  return state.attemptIndex + 1;
}

export function alreadyGuessed(state: RoundState, candidate: Track): boolean {
  return state.missedGuesses.some((g) => isCorrectGuess(g, candidate));
}
