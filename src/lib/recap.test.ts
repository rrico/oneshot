import { describe, expect, it } from 'vitest';
import { buildRecapText, scoreLine } from './recap';
import type { TrackResult } from '@/types';

const results: TrackResult[] = [
  { trackId: 1, outcome: 'won', winningAttempt: 1 },
  { trackId: 2, outcome: 'lost' },
  { trackId: 3, outcome: 'won', winningAttempt: 4 },
  { trackId: 4, outcome: 'unplayable' },
];

describe('recap', () => {
  it('scores wins out of playable tracks only', () => {
    expect(scoreLine(results)).toBe('2/3');
  });

  it('builds a paste-ready recap with grid and link', () => {
    const text = buildRecapText({
      playlistTitle: 'roadtrip rejects',
      results,
      shareUrl: 'https://example.com/#/play?d=x',
    });
    const lines = text.split('\n');
    expect(lines[0]).toBe('oneshot — roadtrip rejects 2/3');
    expect(lines[1]).toBe('1️⃣❌4️⃣🚫');
    expect(lines[2]).toBe('https://example.com/#/play?d=x');
  });

  it('omits the title dash when unnamed', () => {
    const text = buildRecapText({ results, shareUrl: 'u' });
    expect(text.startsWith('oneshot 2/3')).toBe(true);
  });
});
