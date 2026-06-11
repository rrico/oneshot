/**
 * Single keyboard surface (FR23, NFR-A3). Components register bindings
 * through useShortcuts; no component-level keydown listeners.
 * Bindings are suspended while focus is in a text input unless explicitly
 * marked allowInInput.
 */

export interface ShortcutBinding {
  /** Matched against KeyboardEvent.key (case-insensitive for letters). */
  key: string;
  /** Human-readable key label for hint chips and the overlay. */
  label: string;
  description: string;
  handler: (event: KeyboardEvent) => void;
  allowInInput?: boolean;
}

interface Registration {
  scope: string;
  bindings: ShortcutBinding[];
}

const registrations = new Set<Registration>();
let started = false;

function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function matches(binding: ShortcutBinding, event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  return binding.key.toLowerCase() === event.key.toLowerCase();
}

function onKeyDown(event: KeyboardEvent): void {
  const inInput = isTextInput(event.target);
  for (const registration of registrations) {
    for (const binding of registration.bindings) {
      if (inInput && !binding.allowInInput) continue;
      if (matches(binding, event)) {
        event.preventDefault();
        binding.handler(event);
        return;
      }
    }
  }
}

export function registerShortcuts(scope: string, bindings: ShortcutBinding[]): () => void {
  if (!started) {
    window.addEventListener('keydown', onKeyDown);
    started = true;
  }
  const registration: Registration = { scope, bindings };
  registrations.add(registration);
  return () => registrations.delete(registration);
}

/** Active bindings, grouped by scope, for the `?` overlay. */
export function getActiveBindings(): Array<{ scope: string; bindings: ShortcutBinding[] }> {
  const byScope = new Map<string, ShortcutBinding[]>();
  for (const { scope, bindings } of registrations) {
    byScope.set(scope, [...(byScope.get(scope) ?? []), ...bindings]);
  }
  return [...byScope.entries()].map(([scope, bindings]) => ({ scope, bindings }));
}
