import type { CSSProperties } from 'react';
import { cn } from '../../utils/cn';

export interface TextareaInputProps {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  disabled?: boolean;
  rows?: number;
  hint?: string;
  resize?: 'none' | 'vertical' | 'both';
  labelTextStyle?: CSSProperties;
  inputTextStyle?: CSSProperties;
  hintTextStyle?: CSSProperties;
  onValueChange?: (value: string) => void;
}

export function TextareaInput({
  label,
  placeholder,
  defaultValue,
  value,
  disabled = false,
  rows = 3,
  hint,
  resize = 'vertical',
  labelTextStyle,
  inputTextStyle,
  hintTextStyle,
  onValueChange,
}: TextareaInputProps) {
  const resizeClass = { none: 'resize-none', vertical: 'resize-y', both: 'resize' }[resize];

  return (
    <div className="flex flex-col gap-1.5 w-full h-full">
      {label && <label className="text-xs font-medium text-hr-text" style={labelTextStyle}>{label}</label>}
      <textarea
        data-select-surface="field"
        placeholder={placeholder || 'Enter text...'}
        defaultValue={value == null ? defaultValue : undefined}
        value={value == null ? undefined : value}
        disabled={disabled}
        rows={rows}
        onChange={(event) => onValueChange?.(event.target.value)}
        className={cn(
          'w-full flex-1 min-h-0 px-3 py-2 rounded-md text-sm bg-hr-bg border border-hr-border text-hr-text',
          'placeholder:text-hr-muted',
          'focus:outline-none focus:ring-2 focus:ring-hr-primary/50 focus:border-hr-primary',
          'transition-colors',
          resizeClass,
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={inputTextStyle}
      />
      {hint && <p className="text-xs text-hr-muted" style={hintTextStyle}>{hint}</p>}
    </div>
  );
}
