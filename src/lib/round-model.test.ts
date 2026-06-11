import { describe, expect, it } from 'vitest';
import type { Track } from '@/types';
import {
  CLIP_SCHEDULE_SECONDS,
  MAX_ATTEMPTS,
  applyGuess,
  applySkip,
  initialRoundState,
  isCorrectGuess,
  unlockedSeconds,
  winningAttempt,
} from './round-model';

const track = (id: number, title = `Song ${id}`, artist = 'Artist'): Track => ({
  id,
  title,
  artist,
  album: 'Album',
  artUrl: '',
  previewUrl: 'https://example.com/p.mp3',
  durationSec: 200,
});

const answer = track(1, 'Bohemian Rhapsody', 'Queen');

describe('round model', () => {
  it('uses the fixed PRD clip ladder', () => {
    expect(CLIP_SCHEDULE_SECONDS).toEqual([1, 2, 4, 7, 11, 16]);
    expect(MAX_ATTEMPTS).toBe(6);
  });

  it('starts at attempt 1 with 1s unlocked', () => {
    const state = initialRoundState();
    expect(state.attemptIndex).toBe(0);
    expect(unlockedSeconds(state)).toBe(1);
  });

  it('skip consumes an attempt and unlocks the next clip without a missed row', () => {
    const state = applySkip(initialRoundState());
    expect(state.attemptIndex).toBe(1);
    expect(unlockedSeconds(state)).toBe(2);
    expect(state.missedGuesses).toHaveLength(0);
    expect(state.status).toBe('playing');
  });

  it('wrong guess consumes an attempt and records the miss', () => {
    const wrong = track(2, 'Radio Ga Ga', 'Queen');
    const state = applyGuess(initialRoundState(), wrong, answer);
    expect(state.attemptIndex).toBe(1);
    expect(state.missedGuesses).toEqual([wrong]);
    expect(state.status).toBe('playing');
  });

  it('correct guess wins immediately and reports the winning attempt', () => {
    let state = applySkip(initialRoundState());
    state = applyGuess(state, answer, answer);
    expect(state.status).toBe('won');
    expect(winningAttempt(state)).toBe(2);
  });

  it('matches catalog duplicates by normalized title + artist', () => {
    const duplicate = track(999, 'Bohemian Rhapsody (Remastered 2011)', 'Queen');
    expect(isCorrectGuess(duplicate, answer)).toBe(true);
  });

  it('loses after six failed attempts', () => {
    let state = initialRoundState();
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      state = i % 2 === 0 ? applySkip(state) : applyGuess(state, track(100 + i), answer);
    }
    expect(state.status).toBe('lost');
    expect(state.attemptIndex).toBe(MAX_ATTEMPTS - 1);
  });

  it('ignores actions after the round resolves', () => {
    let state = applyGuess(initialRoundState(), answer, answer);
    expect(state.status).toBe('won');
    expect(applySkip(state)).toBe(state);
    expect(applyGuess(state, track(5), answer)).toBe(state);
  });
});
