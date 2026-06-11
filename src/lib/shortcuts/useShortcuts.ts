import { useEffect, useRef } from 'react';
import { registerShortcuts, type ShortcutBinding } from './registry';

/**
 * Register shortcuts for the lifetime of the component. Handlers stay fresh
 * via a ref so callers don't need to memoize them; keys/labels are assumed
 * stable for a given scope.
 */
export function useShortcuts(scope: string, bindings: ShortcutBinding[], enabled = true): void {
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    if (!enabled) return;
    const stable: ShortcutBinding[] = bindingsRef.current.map((binding, index) => ({
      ...binding,
      handler: (event: KeyboardEvent) => bindingsRef.current[index]?.handler(event),
    }));
    return registerShortcuts(scope, stable);
  }, [scope, enabled]);
}
