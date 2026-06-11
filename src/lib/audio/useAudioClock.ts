import { useEffect, useState } from 'react';
import { audioEngine, type AudioClock } from './engine';

export function useAudioClock(): AudioClock {
  const [clock, setClock] = useState<AudioClock>(() => audioEngine.getClock());
  useEffect(() => audioEngine.subscribe(setClock), []);
  return clock;
}
