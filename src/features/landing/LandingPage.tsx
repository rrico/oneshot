import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hasStoredGames } from '@/lib/gameStorage';

const steps = [
  {
    title: 'Build',
    body: 'Search for songs, preview them, and put your playlist together.',
  },
  {
    title: 'Share',
    body: 'Copy one link and drop it in the group chat.',
  },
  {
    title: 'Guess',
    body: 'Friends get six tries per song as longer clips unlock — then share their score back.',
  },
];

export function LandingPage() {
  const [showMyGames, setShowMyGames] = useState(false);

  useEffect(() => {
    setShowMyGames(hasStoredGames());
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          <span className="gradient-text">oneshot</span>
        </h1>
        <p className="mb-10 max-w-xl text-lg text-ink-muted">
          Turn your playlist into a guessing game. Your friends hear one second of each song — can
          they name the whole set?
        </p>
        <Link
          to="/create"
          className="mb-4 inline-flex min-h-12 items-center rounded-xl bg-ink px-8 text-base font-semibold text-surface transition-colors hover:bg-white"
        >
          Create a playlist
        </Link>
        {showMyGames && (
          <Link to="/dashboard" className="mb-12 text-sm text-ink-muted hover:text-ink">
            Made one before? View your games →
          </Link>
        )}
        {!showMyGames && <div className="mb-12" />}

        <div className="grid w-full gap-4 text-left sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-edge bg-panel p-5">
              <p className="mb-1 text-xs font-bold text-ink-faint tabular-nums">{index + 1}</p>
              <h2 className="mb-1.5 font-semibold text-ink">{step.title}</h2>
              <p className="text-sm leading-relaxed text-ink-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </main>
      <footer className="px-6 py-6 text-center text-xs text-ink-faint">Music previews by Deezer.</footer>
    </div>
  );
}
