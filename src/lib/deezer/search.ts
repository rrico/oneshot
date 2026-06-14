import type { Track } from '@/types';
import { normalizeForMatch } from '@/lib/utils';
import { jsonpRequest, DeezerError } from './client';
import { isDeezerErrorDto, toTrack, type DeezerSearchResponseDto } from './types';

/**
 * Score how well a track matches a search query using the same tiers as
 * rankByQueryMatch. Returns 0 for no match. Scores >= 100 mean the query
 * string appears directly in the title or artist.
 */
export function scoreTrackForQuery(track: Track, query: string): number {
  const queryNorm = normalizeForMatch(query.trim());
  if (queryNorm === '') return 0;
  const queryTokens = queryNorm.split(/\s+/).filter(Boolean);
  if (queryTokens.length === 0) return 0;

  const titleNorm = normalizeForMatch(track.title);
  const artistNorm = normalizeForMatch(track.artist);
  const titleBase = normalizeForMatch(stripQualifiers(track.title));
  const artistBase = normalizeForMatch(stripQualifiers(track.artist));
  const haystack = `${titleNorm} ${artistNorm}`;
  const haystackTokens = new Set(haystack.split(/\s+/).filter(Boolean));
  const matchedTokens = queryTokens.reduce(
    (count, tok) => count + (haystackTokens.has(tok) ? 1 : 0),
    0,
  );

  let score = matchedTokens;
  if (titleBase === queryNorm || artistBase === queryNorm) score += 1000;
  if (titleNorm.startsWith(queryNorm) || artistNorm.startsWith(queryNorm)) score += 200;
  if (titleNorm.includes(queryNorm) || artistNorm.includes(queryNorm)) score += 100;
  if (haystack.includes(queryNorm)) score += 50;

  return score;
}

const SEARCH_LIMIT = 50;

export async function deezerSearchTracks(query: string): Promise<Track[]> {
  const trimmed = query.trim();
  if (trimmed === '') return [];

  // Fetch two pages in parallel to double the result pool.
  // Deezer's default ranking can bury correct matches (live versions, exact
  // titles behind covers, catalog-restricted artists) when popularity wins.
  const [page1, page2] = await Promise.all([
    jsonpRequest<DeezerSearchResponseDto>('/search', {
      q: trimmed,
      limit: String(SEARCH_LIMIT),
      index: '0',
    }),
    jsonpRequest<DeezerSearchResponseDto>('/search', {
      q: trimmed,
      limit: String(SEARCH_LIMIT),
      index: String(SEARCH_LIMIT),
    }).catch(() => null), // page 2 failing is non-fatal
  ]);

  if (isDeezerErrorDto(page1)) {
    throw new DeezerError('api', page1.error.message ?? 'Deezer search failed');
  }
  if (!Array.isArray(page1.data)) {
    throw new DeezerError('api', 'Unexpected Deezer search response');
  }

  const page2Tracks =
    page2 && !isDeezerErrorDto(page2) && Array.isArray(page2.data) ? page2.data : [];

  // Merge pages, deduplicate by track ID (preserving page-1-first order)
  const seen = new Set<number>();
  const merged = [...page1.data, ...page2Tracks].filter((dto) => {
    if (seen.has(dto.id)) return false;
    seen.add(dto.id);
    return true;
  });

  return rankByQueryMatch(merged.map(toTrack), trimmed);
}

/**
 * Strip parenthetical/bracketed version qualifiers from a title before
 * exact-match scoring. This lets "Night Moves (Live)" match a query of
 * "night moves" the same as an unqualified "Night Moves", so Deezer's own
 * popularity ordering acts as the tiebreaker within equal-score tracks.
 *
 * Examples: "Yesterday (Remastered 2009)" → "Yesterday"
 *           "Twist And Shout (Live At The BBC)" → "Twist And Shout"
 */
function stripQualifiers(s: string): string {
  return s
    .replace(/\s*\([^)]*\)/g, '') // (Live), (Remastered 2011), (Radio Edit) …
    .replace(/\s*\[[^\]]*\]/g, '') // [Deluxe Edition], [Bonus Track] …
    .trim();
}

/**
 * Stable re-rank that surfaces tracks whose title/artist actually matches
 * the user's typed query over unrelated tracks Deezer ranked by popularity.
 *
 * Score tiers (highest wins):
 *   +1000  base title/artist (qualifiers stripped) exactly equals query
 *   +200   title starts with the full query string
 *   +100   title or artist contains the full query string
 *   +50    combined title+artist field contains the query string
 *   +1/tok per matched query token
 *
 * Within a score tier, Deezer's original page order is the tiebreaker,
 * so their relevance/popularity signal still applies among equal matches.
 */
function rankByQueryMatch(tracks: Track[], query: string): Track[] {
  const queryNorm = normalizeForMatch(query);
  if (queryNorm === '') return tracks;
  const queryTokens = queryNorm.split(/\s+/).filter(Boolean);
  if (queryTokens.length === 0) return tracks;

  const scored = tracks.map((track, index) => ({
    track,
    score: scoreTrackForQuery(track, query),
    index,
  }));

  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map((s) => s.track);
}
