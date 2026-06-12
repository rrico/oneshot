import type { Track } from '@/types';
import { normalizeForMatch } from '@/lib/utils';
import { jsonpRequest, DeezerError } from './client';
import { isDeezerErrorDto, toTrack, type DeezerSearchResponseDto } from './types';

/**
 * Pull a wide page from Deezer so a correct title+artist match is never
 * stranded outside the window. Deezer's default relevance can bury the exact
 * track behind covers, remixes, or more-popular look-alikes, so we cast a
 * wide net and let the client-side re-rank surface the user's typed match.
 */
const SEARCH_LIMIT = 50;

export async function deezerSearchTracks(query: string): Promise<Track[]> {
  const trimmed = query.trim();
  if (trimmed === '') return [];

  const response = await jsonpRequest<DeezerSearchResponseDto>('/search', {
    q: trimmed,
    limit: String(SEARCH_LIMIT),
  });

  if (isDeezerErrorDto(response)) {
    throw new DeezerError('api', response.error.message ?? 'Deezer search failed');
  }
  if (!Array.isArray(response.data)) {
    throw new DeezerError('api', 'Unexpected Deezer search response');
  }
  const tracks = response.data.map(toTrack);
  return rankByQueryMatch(tracks, trimmed);
}

/**
 * Stable re-rank that guarantees tracks whose title or artist actually
 * contains the user's typed tokens surface above unrelated tracks Deezer
 * may have ranked higher on global popularity. Order within a score tier is
 * preserved, so users still get Deezer's relevance signal as the tiebreaker.
 */
function rankByQueryMatch(tracks: Track[], query: string): Track[] {
  const queryNorm = normalizeForMatch(query);
  if (queryNorm === '') return tracks;
  const queryTokens = queryNorm.split(/\s+/).filter(Boolean);
  if (queryTokens.length === 0) return tracks;

  const scored = tracks.map((track, index) => {
    const titleNorm = normalizeForMatch(track.title);
    const artistNorm = normalizeForMatch(track.artist);
    const haystack = `${titleNorm} ${artistNorm}`;
    const haystackTokens = new Set(haystack.split(/\s+/).filter(Boolean));
    const matchedTokens = queryTokens.reduce(
      (count, tok) => count + (haystackTokens.has(tok) ? 1 : 0),
      0,
    );

    let score = matchedTokens;
    if (titleNorm === queryNorm || artistNorm === queryNorm) score += 1000;
    if (titleNorm.includes(queryNorm) || artistNorm.includes(queryNorm)) score += 100;
    if (haystack.includes(queryNorm)) score += 50;

    return { track, score, index };
  });

  scored.sort((a, b) => (b.score - a.score) || (a.index - b.index));
  return scored.map((s) => s.track);
}
