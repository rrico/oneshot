interface ShortcutHintProps {
  label: string;
}

/** Inline keyboard chip rendered beside controls (NFR-A3). */
export function ShortcutHint({ label }: ShortcutHintProps) {
  return (
    <kbd
      aria-hidden="true"
      className="hidden rounded border border-edge bg-surface px-1.5 py-0.5 font-sans text-[11px] text-ink-faint sm:inline-block"
    >
      {label}
    </kbd>
  );
}
