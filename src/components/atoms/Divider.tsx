import type { CSSProperties } from 'react';
import { cn } from '../../utils/cn';

export interface DividerProps {
  direction?: 'horizontal' | 'vertical';
  label?: string;
  color?: 'default' | 'subtle' | 'strong';
  labelTextStyle?: CSSProperties;
}

const colorMap = {
  default: 'border-hr-border',
  subtle: 'border-hr-border/40',
  strong: 'border-hr-text/40',
};

export function Divider({ direction = 'horizontal', label, color = 'default', labelTextStyle }: DividerProps) {
  if (direction === 'vertical') {
    return (
      <div className={cn('self-stretch w-px border-l my-1', colorMap[color])} />
    );
  }

  if (label) {
    return (
      <div className="flex items-center gap-3 w-full">
        <div className={cn('flex-1 border-t', colorMap[color])} />
        <span className="text-xs text-hr-muted whitespace-nowrap" style={labelTextStyle}>{label}</span>
        <div className={cn('flex-1 border-t', colorMap[color])} />
      </div>
    );
  }

  return <div className={cn('w-full border-t', colorMap[color])} />;
}
