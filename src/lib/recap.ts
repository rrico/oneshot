import type { TrackResult } from '@/types';

/** Pure run-results -> share text (FR21-FR22). Mirrors the on-screen RecapGrid. */

const ATTEMPT_KEYCAPS = ['1\uFE0F\u20E3', '2\uFE0F\u20E3', '3\uFE0F\u20E3', '4\uFE0F\u20E3', '5\uFE0F\u20E3', '6\uFE0F\u20E3'];

export function resultCell(result: TrackResult): string {
  if (result.outcome === 'won' && result.winningAttempt) {
    return ATTEMPT_KEYCAPS[result.winningAttempt - 1] ?? '\u2705';
  }
  if (result.outcome === 'unplayable') return '\u{1F6AB}'; // 🚫
  return '\u274C'; // ❌
}

export function scoreLine(results: TrackResult[]): string {
  const won = results.filter((r) => r.outcome === 'won').length;
  const playable = results.filter((r) => r.outcome !== 'unplayable').length;
  return `${won}/${playable}`;
}

export function buildRecapText(options: {
  playlistTitle?: string;
  results: TrackResult[];
  shareUrl: string;
}): string {
  const { playlistTitle, results, shareUrl } = options;
  const name = playlistTitle ? ` \u2014 ${playlistTitle}` : '';
  const grid = results.map(resultCell).join('');
  return `oneshot${name} ${scoreLine(results)}\n${grid}\n${shareUrl}`;
}
