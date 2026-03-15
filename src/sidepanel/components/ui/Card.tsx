import { memo, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

/**
 * Reusable card component
 * Follows ContextFlow design system
 */
export const Card = memo(
  ({ variant = 'default', padding = 'md', children, className = '', ...props }: CardProps) => {
    const baseStyles = 'bg-surface rounded-lg border border-border';

    const variantStyles = {
      default: '',
      interactive: 'hover:border-border-muted transition-colors cursor-pointer',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-2',
      md: 'p-3',
      lg: 'p-4',
    };

    return (
      <div
        className={cn(baseStyles, variantStyles[variant], paddingStyles[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
