/** Domain track model (camelCase). Deezer DTOs live in lib/deezer/types.ts. */
export interface Track {
  id: number;
  title: string;
  artist: string;
  artistId?: number;
  album: string;
  artUrl: string;
  previewUrl: string;
  durationSec: number;
}

export interface Playlist {
  title?: string;
  trackIds: number[];
}

export type RoundOutcome = 'won' | 'lost' | 'unplayable' | 'skipped';

export interface TrackResult {
  trackId: number;
  outcome: RoundOutcome;
  /** 1-based attempt the round was won on. Only set when outcome === 'won'. */
  winningAttempt?: number;
}
