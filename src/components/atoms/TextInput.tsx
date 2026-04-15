import { useId } from 'react';
import { cn } from '../../utils/cn';

export interface TextInputProps {
  label?: string;
  labelAside?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string | number;
  type?: 'text' | 'number' | 'email' | 'password' | 'search';
  chrome?: 'ghost' | 'field';
  disabled?: boolean;
  hint?: string;
  labelSize?: 'xs' | 'sm';
  onValueChange?: (value: string) => void;
}

export function TextInput({
  label,
  labelAside,
  placeholder,
  defaultValue,
  value,
  type = 'text',
  chrome = 'ghost',
  disabled = false,
  hint,
  labelSize = 'xs',
  onValueChange,
}: TextInputProps) {
  const isField = chrome === 'field';
  const inputId = useId();

  return (
    <div className="flex flex-col gap-1.5 w-full h-full justify-center">
      {label ? (
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={inputId} className={cn('font-medium text-hr-text', labelSize === 'sm' ? 'text-sm' : 'text-xs')}>{label}</label>
          {labelAside ? (
            <span className="text-xs font-normal text-hr-muted">{labelAside}</span>
          ) : null}
        </div>
      ) : null}
      <input
        id={inputId}
        data-select-surface={isField ? 'field' : 'ghost-field'}
        type={type}
        placeholder={placeholder || 'Enter value...'}
        defaultValue={value == null ? defaultValue : undefined}
        value={value == null ? undefined : value}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
        className={cn(
          'h-10 w-full border text-sm text-hr-text',
          'placeholder:text-hr-muted',
          'focus:outline-none transition-[color,border-color,background-color,box-shadow]',
          isField
            ? 'focus:ring-2 focus:ring-hr-primary/18 focus:border-hr-primary'
            : 'focus:ring-0 focus:border-transparent focus:bg-transparent',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{
          ['--builder-input-shadow' as any]: isField ? 'var(--theme-field-shadow)' : 'var(--theme-input-shadow)',
          backgroundColor: isField ? 'var(--theme-field-bg)' : 'var(--theme-input-bg)',
          borderColor: isField ? 'var(--theme-field-border)' : 'var(--theme-input-border)',
          borderRadius: isField ? 'var(--theme-field-radius)' : 'var(--theme-input-radius)',
          boxShadow: 'var(--builder-input-shadow)',
          paddingLeft: isField ? 'var(--theme-field-padding-x)' : 'var(--theme-input-padding-x)',
          paddingRight: isField ? 'var(--theme-field-padding-x)' : 'var(--theme-input-padding-x)',
        }}
      />
      {hint && <p className="text-xs text-hr-muted">{hint}</p>}
    </div>
  );
}
