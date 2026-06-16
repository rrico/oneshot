import { useEffect, useRef, useState } from 'react';
import type { Track } from '@/types';
import { deezerRecommendedTracks } from '@/lib/deezer';
import { TrackList, SkeletonList } from './TrackList';

interface RecommendationsSectionProps {
  playlistTracks: Track[];
  addedIds: Set<number>;
  onAdd: (track: Track) => void;
}

export function RecommendationsSection({ playlistTracks, addedIds, onAdd }: RecommendationsSectionProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (playlistTracks.length === 0) {
      setTracks([]);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      const recs = await deezerRecommendedTracks(playlistTracks, addedIds);
      if (id !== seq.current) return;
      setTracks(recs);
      setLoading(false);
    }, 600);
    return () => {
      clearTimeout(timer);
      if (id === seq.current) setLoading(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistTracks]);

  if (playlistTracks.length === 0) return null;

  return (
    <div className="border-t border-edge/40 pt-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
        Recommended
      </p>
      {loading && <SkeletonList count={3} />}
      {!loading && tracks.length > 0 && (
        <TrackList tracks={tracks} addedIds={addedIds} onAdd={onAdd} />
      )}
      {!loading && tracks.length === 0 && (
        <p className="px-1 py-2 text-sm text-ink-muted">No recommendations available yet.</p>
      )}
    </div>
  );
}
