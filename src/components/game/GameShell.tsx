import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { VolumeControl } from './VolumeControl';
import { ShortcutOverlay } from '@/components/shortcuts/ShortcutOverlay';
import { useShortcuts } from '@/lib/shortcuts/useShortcuts';

interface GameShellProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

/** Centered play column (max ~660px) with the game header: title, progress, volume, shortcuts. */
export function GameShell({ title, subtitle, children }: GameShellProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useShortcuts('global', [
    { key: '?', label: '?', description: 'Show keyboard shortcuts', handler: () => setShowShortcuts((v) => !v) },
  ]);

  return (
    <div className="min-h-dvh bg-surface">
      <main className="mx-auto w-full max-w-2xl px-6 py-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Link to="/" className="text-sm font-bold tracking-tight text-ink-muted hover:text-ink">
              oneshot
            </Link>
            {title && <h1 className="truncate text-xl font-semibold text-ink">{title}</h1>}
            {subtitle && <p className="text-sm text-ink-muted tabular-nums">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <VolumeControl />
            <button
              onClick={() => setShowShortcuts(true)}
              aria-label="Keyboard shortcuts"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-edge text-sm text-ink-muted hover:text-ink"
            >
              ?
            </button>
          </div>
        </header>
        {children}
      </main>
      {showShortcuts && <ShortcutOverlay onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
