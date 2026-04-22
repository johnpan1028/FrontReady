import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-select-surface="button"
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          {
            'bg-hr-primary text-white hover:bg-hr-primary/90': variant === 'primary',
            'bg-hr-success text-white hover:bg-hr-success/90': variant === 'secondary',
            'border border-hr-border bg-transparent hover:bg-hr-border/50 text-hr-text': variant === 'outline',
            'hover:bg-hr-border/50 text-hr-text': variant === 'ghost',
            'h-8 px-3 text-xs': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-12 px-8 text-lg': size === 'lg',
          },
          className
        )}
        style={{
          borderTopLeftRadius: 'calc(var(--theme-button-radius) * var(--builder-corner-top-left-factor, 1))',
          borderTopRightRadius: 'calc(var(--theme-button-radius) * var(--builder-corner-top-right-factor, 1))',
          borderBottomLeftRadius: 'calc(var(--theme-button-radius) * var(--builder-corner-bottom-left-factor, 1))',
          borderBottomRightRadius: 'calc(var(--theme-button-radius) * var(--builder-corner-bottom-right-factor, 1))',
          ...style,
        }}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
