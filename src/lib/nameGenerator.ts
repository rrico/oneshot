import type { Track } from '@/types';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'of', 'on', 'it', 'is', 'my', 'me',
  'you', 'your', 'i', 'and', 'or', 'to', 'at', 'be', 'do',
]);

function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function shortName(artist: string): string {
  const words = artist.trim().split(/\s+/);
  // Use last word if the full name is long (>12 chars)
  return artist.length > 12 && words.length > 1 ? words[words.length - 1] : artist;
}

export function generatePlaylistName(tracks: Track[]): string {
  if (tracks.length === 0) {
    return '0-Track Throwdown';
  }

  // Count artist occurrences
  const artistCounts = new Map<string, number>();
  for (const track of tracks) {
    const artist = track.artist.trim();
    artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
  }

  const sortedArtists = [...artistCounts.entries()].sort((a, b) => b[1] - a[1]);

  // Rule 1: single artist
  if (sortedArtists.length === 1 || sortedArtists[0][1] === tracks.length) {
    return `${toTitleCase(sortedArtists[0][0])} Challenge`;
  }

  // Rule 2: two dominant artists cover ≥70% of tracks
  const top2Count = sortedArtists[0][1] + (sortedArtists[1]?.[1] ?? 0);
  if (sortedArtists.length >= 2 && top2Count / tracks.length >= 0.7) {
    const a1 = shortName(sortedArtists[0][0]);
    const a2 = shortName(sortedArtists[1][0]);
    return `${toTitleCase(a1)} vs ${toTitleCase(a2)}`;
  }

  // Rule 3: most evocative word from track titles
  const words: string[] = [];
  for (const track of tracks) {
    for (const word of track.title.split(/\W+/)) {
      const lower = word.toLowerCase();
      if (lower.length >= 4 && !STOP_WORDS.has(lower) && /^[a-z]+$/i.test(lower)) {
        words.push(lower);
      }
    }
  }

  if (words.length > 0) {
    // Pick the longest word (most distinctive)
    const best = words.reduce((a, b) => (b.length > a.length ? b : a));
    return `The ${toTitleCase(best)} Mix`;
  }

  // Rule 4: fallback
  return `${tracks.length}-Track Throwdown`;
}
