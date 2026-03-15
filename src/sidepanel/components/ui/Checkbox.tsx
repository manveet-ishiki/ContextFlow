import { memo, type HTMLAttributes, type MouseEvent } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface CheckboxProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable checkbox component
 * Supports checked, unchecked, and indeterminate states
 */
export const Checkbox = memo(
  ({
    checked = false,
    indeterminate = false,
    disabled = false,
    onChange,
    size = 'md',
    className = '',
    onClick,
    ...props
  }: CheckboxProps) => {
    const handleClick = (e: MouseEvent<HTMLDivElement>) => {
      onClick?.(e);
      if (!disabled && onChange) {
        onChange(!checked);
      }
    };

    const sizeStyles = {
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    };

    const iconSize = {
      sm: 10,
      md: 12,
      lg: 14,
    };

    return (
      <div
        onClick={handleClick}
        {...props}
        className={cn(
          'rounded border-2 flex items-center justify-center cursor-pointer transition-all duration-200',
          sizeStyles[size],
          checked || indeterminate
            ? 'bg-primary border-primary scale-100'
            : 'border-border-muted bg-transparent hover:border-text-muted hover:bg-surface/50',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {checked && !indeterminate && (
          <Check size={iconSize[size]} className="text-white" strokeWidth={3} />
        )}
        {indeterminate && <Minus size={iconSize[size]} className="text-white" strokeWidth={3} />}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
