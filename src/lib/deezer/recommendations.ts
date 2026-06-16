import type { Track } from '@/types';
import { deezerArtistRadioTracks } from './artist';

/**
 * Returns recommended tracks based on artists in the current playlist.
 * Uses Deezer's /artist/{id}/radio endpoint — their smartradio algorithm
 * seeded by the artist — for contextually relevant suggestions in one round-trip.
 */
export async function deezerRecommendedTracks(
  playlistTracks: Track[],
  excludeIds: Set<number>,
): Promise<Track[]> {
  // Collect up to 3 unique artist IDs, preferring recently added tracks
  const seen = new Set<number>();
  const seedArtistIds: number[] = [];
  for (let i = playlistTracks.length - 1; i >= 0 && seedArtistIds.length < 3; i--) {
    const aid = playlistTracks[i].artistId;
    if (aid !== undefined && !seen.has(aid)) {
      seen.add(aid);
      seedArtistIds.push(aid);
    }
  }
  if (seedArtistIds.length === 0) return [];

  // Fetch each seed artist's radio in parallel; failures are non-fatal
  const radioBatches = await Promise.allSettled(seedArtistIds.map(deezerArtistRadioTracks));

  // Interleave results from each radio so every seed artist is represented,
  // then filter out tracks already in the playlist
  const usedIds = new Set(excludeIds);
  const batches = radioBatches
    .filter((r): r is PromiseFulfilledResult<Track[]> => r.status === 'fulfilled')
    .map((r) => r.value);

  const recommendations: Track[] = [];
  const maxPerBatch = Math.ceil(10 / (batches.length || 1));

  for (const batch of batches) {
    let added = 0;
    for (const track of batch) {
      if (added >= maxPerBatch) break;
      if (!usedIds.has(track.id)) {
        usedIds.add(track.id);
        recommendations.push(track);
        added++;
      }
    }
  }

  return recommendations.slice(0, 10);
}
