import type { Track } from '@/types';

/** Boundary DTOs — keep Deezer's field names exactly as the API returns them. */

export interface DeezerArtistDto {
  id: number;
  name: string;
}

export interface DeezerArtistResultDto {
  id: number;
  name: string;
  picture_medium?: string;
  picture_big?: string;
  nb_album?: number;
  nb_fan?: number;
}

export interface DeezerAlbumDto {
  id: number;
  title: string;
  cover_medium?: string;
  cover_big?: string;
}

export interface DeezerTrackDto {
  id: number;
  title: string;
  duration: number;
  preview: string;
  readable?: boolean;
  artist: DeezerArtistDto;
  album: DeezerAlbumDto;
}

export interface DeezerSearchResponseDto {
  data: DeezerTrackDto[];
  total?: number;
}

export interface DeezerErrorDto {
  error: { type?: string; message?: string; code?: number };
}

export function isDeezerErrorDto(value: unknown): value is DeezerErrorDto {
  return typeof value === 'object' && value !== null && 'error' in value;
}

/** Map a boundary DTO to the camelCase domain model. */
export function toTrack(dto: DeezerTrackDto): Track {
  return {
    id: dto.id,
    title: dto.title,
    artist: dto.artist?.name ?? 'Unknown artist',
    artistId: dto.artist?.id,
    album: dto.album?.title ?? '',
    artUrl: dto.album?.cover_medium ?? dto.album?.cover_big ?? '',
    previewUrl: dto.readable === false ? '' : (dto.preview ?? ''),
    durationSec: dto.duration ?? 0,
  };
}
