import type { Track } from '@/types';
import { jsonpRequest, DeezerError } from './client';
import { isDeezerErrorDto, toTrack, type DeezerSearchResponseDto } from './types';

const SEARCH_LIMIT = 10;

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
  return response.data.map(toTrack);
}
