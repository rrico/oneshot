import type { Track } from '@/types';
import { jsonpRequest, DeezerError } from './client';
import { isDeezerErrorDto, toTrack, type DeezerTrackDto } from './types';

export async function deezerFetchTrack(id: number): Promise<Track> {
  const response = await jsonpRequest<DeezerTrackDto>(`/track/${id}`);
  if (isDeezerErrorDto(response)) {
    throw new DeezerError('api', response.error.message ?? `Track ${id} unavailable`);
  }
  return toTrack(response);
}
