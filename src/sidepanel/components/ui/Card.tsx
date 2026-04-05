import { memo, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Card = memo(
  ({ variant = 'default', padding = 'md', children, className = '', ...props }: CardProps) => {
    const base = 'bg-surface rounded-xl border border-border';

    const variants = {
      default: '',
      interactive:
        'hover:border-border-muted hover:shadow-sm transition-all cursor-pointer',
    };

    const paddings = {
      none: '',
      sm: 'p-2',
      md: 'p-3',
      lg: 'p-4',
    };

    return (
      <div className={cn(base, variants[variant], paddings[padding], className)} {...props}>
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
