'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Haptic feedback (vibration) utility
const hapticFeedback = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30,
    };
    navigator.vibrate(patterns[style]);
  }
};

export interface MobileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
  fullWidth?: boolean;
}

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      haptic = 'light',
      fullWidth = false,
      disabled,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading && haptic !== 'none') {
        hapticFeedback(haptic);
      }
      onClick?.(e);
    };

    const baseStyles = cn(
      // Base styles
      'relative inline-flex items-center justify-center font-medium transition-all',
      'touch-manipulation select-none outline-none',
      'active:scale-[0.96] active:transition-transform active:duration-100',

      // Disabled state
      'disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',

      // Full width
      fullWidth && 'w-full',

      // Size variants
      size === 'sm' && 'h-10 px-4 text-sm rounded-xl gap-2 min-w-[80px]',
      size === 'md' && 'h-12 px-6 text-base rounded-xl gap-2 min-w-[100px]',
      size === 'lg' && 'h-14 px-8 text-lg rounded-2xl gap-3 min-w-[120px]',
      size === 'icon' && 'h-12 w-12 rounded-xl shrink-0',

      // Variant styles - flat minimalist design
      variant === 'primary' && [
        'bg-white text-black',
        'hover:bg-gray-100',
        'border border-gray-200',
        'shadow-sm',
      ],
      variant === 'secondary' && [
        'bg-[var(--surface)] text-[var(--text)]',
        'hover:bg-[var(--surface2)]',
        'border border-[var(--border)]',
      ],
      variant === 'outline' && [
        'bg-transparent text-[var(--text)]',
        'hover:bg-[var(--surface)]',
        'border border-[var(--border)]',
      ],
      variant === 'ghost' && [
        'bg-transparent text-[var(--text)]',
        'hover:bg-[var(--surface)]',
      ],
      variant === 'icon' && [
        'bg-[var(--surface)] text-[var(--muted)]',
        'hover:bg-[var(--surface2)] hover:text-[var(--text)]',
        'border border-[var(--border)]',
      ],

      className
    );

    return (
      <button
        ref={ref}
        className={baseStyles}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {loading && (
          <Loader2 className="absolute inset-0 m-auto w-5 h-5 animate-spin" />
        )}
        <span className={cn(loading && 'opacity-0')}>{children}</span>
      </button>
    );
  }
);

MobileButton.displayName = 'MobileButton';
