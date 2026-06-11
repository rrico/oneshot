import { useState } from 'react';
import { audioEngine } from '@/lib/audio/engine';

export function VolumeControl() {
  const [volume, setVolume] = useState(() => audioEngine.getVolume());

  return (
    <label className="flex items-center gap-2 text-ink-muted">
      <span aria-hidden="true" className="text-sm">
        {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
      </span>
      <span className="sr-only">Volume</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        aria-label="Volume"
        onChange={(event) => {
          const next = Number(event.target.value);
          setVolume(next);
          audioEngine.setVolume(next);
        }}
        className="volume-slider w-24"
      />
    </label>
  );
}
