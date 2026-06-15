import type { Track } from '@/types';
import { jsonpRequest, DeezerError } from './client';
import { isDeezerErrorDto, toTrack, type DeezerArtistResultDto, type DeezerTrackDto } from './types';

export interface ArtistResult {
  id: number;
  name: string;
  pictureUrl: string;
  nbFan: number;
  nbAlbum: number;
}

interface DeezerArtistSearchResponseDto {
  data: DeezerArtistResultDto[];
  total?: number;
}

function toArtistResult(dto: DeezerArtistResultDto): ArtistResult {
  return {
    id: dto.id,
    name: dto.name,
    pictureUrl: dto.picture_medium ?? dto.picture_big ?? '',
    nbFan: dto.nb_fan ?? 0,
    nbAlbum: dto.nb_album ?? 0,
  };
}

export async function deezerSearchArtists(query: string): Promise<ArtistResult[]> {
  const trimmed = query.trim();
  if (trimmed === '') return [];

  const response = await jsonpRequest<DeezerArtistSearchResponseDto>('/search/artist', {
    q: trimmed,
    limit: '25',
  });

  if (isDeezerErrorDto(response)) {
    throw new DeezerError('api', response.error.message ?? 'Deezer artist search failed');
  }
  if (!Array.isArray(response.data)) {
    throw new DeezerError('api', 'Unexpected Deezer artist search response');
  }

  return response.data.map(toArtistResult);
}

export async function deezerArtistTopTracks(artistId: number): Promise<Track[]> {
  const response = await jsonpRequest<{ data: DeezerTrackDto[] }>(`/artist/${artistId}/top`, {
    limit: '50',
  });

  if (isDeezerErrorDto(response)) {
    throw new DeezerError('api', response.error.message ?? 'Failed to load artist tracks');
  }
  if (!Array.isArray(response.data)) {
    throw new DeezerError('api', 'Unexpected response for artist top tracks');
  }

  return response.data.map(toTrack).filter((t) => t.previewUrl !== '');
}
