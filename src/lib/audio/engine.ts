/**
 * The only owner of audio playback. Components never construct Audio
 * elements; they call the engine and subscribe to its clock.
 * Clip boundaries are enforced with an interval clock check (not a lone
 * setTimeout) so a buffering stall can't leak audio past the unlocked window.
 */

export interface AudioClock {
  /** Seconds of the current clip that have played. */
  elapsed: number;
  isPlaying: boolean;
  isBuffering: boolean;
}

type Listener = (clock: AudioClock) => void;

const VOLUME_STORAGE_KEY = 'oneshot.volume';
const TICK_MS = 50;

class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private limitSeconds = 0;
  private listeners = new Set<Listener>();
  private ticker: number | null = null;
  private buffering = false;

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.volume = this.getVolume();
      this.audio.addEventListener('waiting', () => {
        this.buffering = true;
        this.emit();
      });
      this.audio.addEventListener('playing', () => {
        this.buffering = false;
        this.emit();
      });
    }
    return this.audio;
  }

  /** Play `url` from 0 up to `untilSeconds`, stopping exactly at the boundary. */
  async playClip(url: string, untilSeconds: number): Promise<void> {
    const audio = this.getAudio();
    this.limitSeconds = untilSeconds;
    if (audio.src !== url) {
      audio.src = url;
    }
    audio.currentTime = 0;
    this.buffering = true;
    this.emit();
    try {
      await audio.play();
      this.startTicker();
    } catch (error) {
      this.buffering = false;
      this.emit();
      throw error;
    }
  }

  /**
   * Raise the clip boundary without interrupting playback. If audio is
   * currently playing it simply keeps going into the newly unlocked window.
   */
  extendClip(untilSeconds: number): void {
    if (untilSeconds > this.limitSeconds) this.limitSeconds = untilSeconds;
    this.emit();
  }

  stop(): void {
    const audio = this.audio;
    if (audio && !audio.paused) audio.pause();
    this.buffering = false;
    this.stopTicker();
    this.emit();
  }

  /** Stop playback and zero the clock — call when a new round begins. */
  reset(): void {
    const audio = this.audio;
    if (audio) {
      if (!audio.paused) audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // No source loaded yet — nothing to rewind.
      }
    }
    this.limitSeconds = 0;
    this.buffering = false;
    this.stopTicker();
    this.emit();
  }

  getVolume(): number {
    const stored = Number(localStorage.getItem(VOLUME_STORAGE_KEY));
    return Number.isFinite(stored) && stored >= 0 && stored <= 1 && localStorage.getItem(VOLUME_STORAGE_KEY) !== null
      ? stored
      : 0.85;
  }

  setVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, volume));
    localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
    if (this.audio) this.audio.volume = clamped;
    this.emit();
  }

  getClock(): AudioClock {
    const audio = this.audio;
    return {
      elapsed: audio ? Math.min(audio.currentTime, this.limitSeconds) : 0,
      isPlaying: !!audio && !audio.paused && !audio.ended,
      isBuffering: this.buffering,
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getClock());
    return () => this.listeners.delete(listener);
  }

  private startTicker(): void {
    this.stopTicker();
    this.ticker = window.setInterval(() => {
      const audio = this.audio;
      if (!audio) return;
      if (audio.currentTime >= this.limitSeconds || audio.ended) {
        audio.pause();
        this.stopTicker();
      }
      this.emit();
    }, TICK_MS);
  }

  private stopTicker(): void {
    if (this.ticker !== null) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  private emit(): void {
    const clock = this.getClock();
    for (const listener of this.listeners) listener(clock);
  }
}

export const audioEngine = new AudioEngine();
