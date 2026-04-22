import type { CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectInputProps {
  label?: string;
  placeholder?: string;
  options?: SelectOption[];
  defaultValue?: string;
  value?: string;
  disabled?: boolean;
  hint?: string;
  labelTextStyle?: CSSProperties;
  inputTextStyle?: CSSProperties;
  hintTextStyle?: CSSProperties;
  onValueChange?: (value: string) => void;
}

const DEFAULT_OPTIONS: SelectOption[] = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' },
];

export function SelectInput({
  label,
  placeholder,
  options = DEFAULT_OPTIONS,
  defaultValue,
  value,
  disabled = false,
  hint,
  labelTextStyle,
  inputTextStyle,
  hintTextStyle,
  onValueChange,
}: SelectInputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full h-full justify-center">
      {label && <label className="text-xs font-medium text-hr-text" style={labelTextStyle}>{label}</label>}
      <div className="relative w-full">
        <select
          data-select-surface="field"
          defaultValue={value == null ? defaultValue : undefined}
          value={value == null ? undefined : value}
          disabled={disabled}
          onChange={(event) => onValueChange?.(event.target.value)}
          className={cn(
            'w-full appearance-none px-3 py-2 pr-8 rounded-md text-sm bg-hr-bg border border-hr-border text-hr-text',
            'focus:outline-none focus:ring-2 focus:ring-hr-primary/50 focus:border-hr-primary',
            'transition-colors cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed',
            !(value ?? defaultValue) && 'text-hr-muted'
          )}
          style={inputTextStyle}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-hr-muted pointer-events-none" />
      </div>
      {hint && <p className="text-xs text-hr-muted" style={hintTextStyle}>{hint}</p>}
    </div>
  );
}
