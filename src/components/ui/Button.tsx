import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-ink text-surface font-semibold hover:bg-white disabled:hover:bg-ink',
  secondary: 'border border-edge bg-panel text-ink hover:bg-panel-hover',
  ghost: 'text-ink-muted hover:text-ink hover:bg-panel',
  danger: 'border border-edge bg-panel text-danger hover:bg-panel-hover',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'secondary', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        variantClasses[variant],
        className,
      )}
      {...rest}
    />
  );
}
