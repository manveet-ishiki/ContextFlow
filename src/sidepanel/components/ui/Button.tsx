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

/**
 * Reusable button component with variants
 * Follows ContextFlow design system
 */
export const Button = memo(({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) => {
  const baseStyles = 'rounded-md font-medium transition-colors duration-150 inline-flex items-center justify-center gap-2';

  const variantStyles = {
    primary: 'bg-primary hover:bg-primary-hover text-text-primary disabled:bg-surface-hover disabled:text-text-muted',
    secondary: 'bg-surface-hover hover:bg-surface text-text-primary disabled:bg-surface disabled:text-text-muted',
    danger: 'bg-danger hover:bg-danger-hover text-text-primary disabled:bg-surface-hover disabled:text-text-muted',
    ghost: 'bg-transparent hover:bg-surface-hover/50 text-text-tertiary hover:text-text-secondary disabled:text-text-muted'
  };

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          {children}
        </>
      ) : (
        <>
          {icon && icon}
          {children}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';
