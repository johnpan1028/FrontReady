import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: 'default' | 'transparent';
  elevation?: 'default' | 'none';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, surface = 'default', elevation = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-card-surface={surface}
        data-card-elevation={elevation}
        data-select-surface="card"
        className={cn(
          'ui-card overflow-hidden',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";
