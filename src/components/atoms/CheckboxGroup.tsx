import { cn } from '../../utils/cn';

export interface CheckboxOption {
  label: string;
  value: string;
}

export interface CheckboxGroupProps {
  label?: string;
  mode?: 'checkbox' | 'radio';
  name?: string;
  options?: CheckboxOption[];
  direction?: 'horizontal' | 'vertical';
  disabled?: boolean;
  value?: string[] | string;
  onValueChange?: (value: string[] | string) => void;
}

const DEFAULT_OPTIONS: CheckboxOption[] = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' },
];

export function CheckboxGroup({ label, mode = 'checkbox', name = 'group', options = DEFAULT_OPTIONS, direction = 'vertical', disabled = false, value, onValueChange }: CheckboxGroupProps) {
  const currentValues = Array.isArray(value) ? value : [];
  const currentValue = typeof value === 'string' ? value : '';

  return (
    <div className="flex flex-col gap-2 w-full h-full justify-center">
      {label && <span className="text-xs font-medium text-hr-text">{label}</span>}
      <div className={cn('flex gap-3 flex-wrap', direction === 'vertical' && 'flex-col')}>
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex items-center gap-2 text-sm text-hr-text cursor-pointer select-none',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              type={mode}
              name={name}
              value={opt.value}
              disabled={disabled}
              checked={mode === 'checkbox' ? currentValues.includes(opt.value) : currentValue === opt.value}
              onChange={(event) => {
                if (!onValueChange) return;
                if (mode === 'radio') {
                  onValueChange(event.target.value);
                  return;
                }

                const next = event.target.checked
                  ? [...currentValues, opt.value]
                  : currentValues.filter((item) => item !== opt.value);
                onValueChange(next);
              }}
              className={cn(
                'accent-hr-primary w-4 h-4 rounded border-hr-border',
                mode === 'radio' && 'rounded-full'
              )}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}
