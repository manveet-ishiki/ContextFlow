import { memo, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export const Button = memo(
  ({
    variant = 'secondary',
    size = 'md',
    loading = false,
    icon,
    children,
    disabled,
    className = '',
    ...props
  }: ButtonProps) => {
    const base =
      'rounded-lg font-medium transition-colors duration-150 inline-flex items-center justify-center gap-1.5';

    const variants = {
      primary:
        'bg-primary hover:bg-primary-hover text-white disabled:bg-surface-hover disabled:text-text-muted',
      secondary:
        'bg-surface-hover hover:bg-border text-text-primary disabled:bg-surface disabled:text-text-muted',
      danger:
        'bg-danger hover:bg-danger-hover text-white disabled:bg-surface-hover disabled:text-text-muted',
      ghost:
        'bg-transparent hover:bg-surface-hover/60 text-text-tertiary hover:text-text-secondary disabled:text-text-muted',
    };

    const sizes = {
      sm: 'px-2.5 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
      lg: 'px-4 py-2 text-sm',
    };

    return (
      <button
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            {children}
          </>
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
