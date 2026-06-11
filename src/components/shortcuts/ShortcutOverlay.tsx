import { Dialog } from '@/components/ui/Dialog';
import { getActiveBindings } from '@/lib/shortcuts/registry';

interface ShortcutOverlayProps {
  onClose: () => void;
}

const SCOPE_LABELS: Record<string, string> = {
  play: 'During a round',
  reveal: 'After a round',
  global: 'Anywhere',
};

export function ShortcutOverlay({ onClose }: ShortcutOverlayProps) {
  const groups = getActiveBindings();
  return (
    <Dialog title="Keyboard shortcuts" onClose={onClose}>
      <div className="space-y-5">
        {groups.map(({ scope, bindings }) => (
          <section key={scope}>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
              {SCOPE_LABELS[scope] ?? scope}
            </h3>
            <ul className="space-y-1.5">
              {bindings.map((binding) => (
                <li key={`${scope}-${binding.label}-${binding.description}`} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-ink-muted">{binding.description}</span>
                  <kbd className="rounded border border-edge bg-surface px-2 py-0.5 text-xs">{binding.label}</kbd>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="text-xs text-ink-faint">
          Every shortcut also has an on-screen button — keys are never the only way.
        </p>
      </div>
    </Dialog>
  );
}
