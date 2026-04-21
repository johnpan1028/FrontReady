import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export const inspectorInputClassName = 'builder-inspector-input w-full';
export const inspectorTextareaClassName = 'builder-inspector-textarea w-full';
export const inspectorReadonlyClassName = 'builder-inspector-readonly';
export const inspectorItemClassName = 'builder-inspector-item';

const clampNumberInputValue = (value: number, min?: number, max?: number) => {
  const minValue = typeof min === 'number' ? min : value;
  const withMin = Math.max(minValue, value);
  return typeof max === 'number' ? Math.min(max, withMin) : withMin;
};

export function InspectorNumberInput({
  value,
  min,
  max,
  placeholder,
  disabled = false,
  onChange,
}: {
  value: number | '';
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const currentValue = typeof value === 'number' && Number.isFinite(value)
    ? value
    : (typeof min === 'number' ? min : 0);

  const handleManualChange = (nextRawValue: string) => {
    const parsedValue = Number.parseInt(nextRawValue, 10);
    const fallbackValue = typeof min === 'number' ? min : currentValue;
    onChange(Number.isFinite(parsedValue) ? clampNumberInputValue(parsedValue, min, max) : fallbackValue);
  };

  const handleStep = (delta: number) => {
    onChange(clampNumberInputValue(currentValue + delta, min, max));
  };

  return (
    <div className="builder-inspector-number-input">
      <input
        type="number"
        min={min}
        max={max}
        step="1"
        placeholder={placeholder}
        className={cn(inspectorInputClassName, 'builder-inspector-number-field')}
        value={value}
        disabled={disabled}
        onChange={(event) => handleManualChange(event.target.value)}
      />

      <div className="builder-inspector-number-stepper" aria-hidden="true">
        <button
          type="button"
          className="builder-inspector-number-step"
          tabIndex={-1}
          disabled={disabled || (typeof max === 'number' && currentValue >= max)}
          onClick={() => handleStep(1)}
        >
          <ChevronUp size={8} />
        </button>
        <button
          type="button"
          className="builder-inspector-number-step"
          tabIndex={-1}
          disabled={disabled || (typeof min === 'number' && currentValue <= min)}
          onClick={() => handleStep(-1)}
        >
          <ChevronDown size={8} />
        </button>
      </div>
    </div>
  );
}

export function InspectorSection({
  title,
  badge,
  sideSlot,
  defaultOpen = true,
  collapsible = true,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  badge?: string;
  sideSlot?: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className={cn('builder-inspector-section', className)}>
      {collapsible ? (
        <button
          type="button"
          className="builder-inspector-section-toggle"
          onClick={() => setIsOpen((current) => !current)}
        >
          <div className="builder-inspector-section-header">
            <span className="builder-inspector-section-title">{title}</span>
            {badge ? <span className="builder-inspector-chip">{badge}</span> : null}
            {sideSlot}
          </div>
          <ChevronDown
            size={14}
            className={cn(
              'text-hr-muted transition-transform duration-150',
              isOpen ? 'rotate-0' : '-rotate-90',
            )}
          />
        </button>
      ) : (
        <div className="builder-inspector-section-static">
          <div className="builder-inspector-section-header">
            <span className="builder-inspector-section-title">{title}</span>
            {badge ? <span className="builder-inspector-chip">{badge}</span> : null}
            {sideSlot}
          </div>
        </div>
      )}

      {(!collapsible || isOpen) ? (
        <div className={cn('builder-inspector-section-body', bodyClassName)}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function InspectorField({
  label,
  labelAccessory,
  className,
  children,
}: {
  label: string;
  labelAccessory?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn('builder-inspector-field', className)}>
      <span className="builder-inspector-label-row">
        <span className="builder-inspector-label">{label}</span>
        {labelAccessory}
      </span>
      {children}
    </label>
  );
}

export function InspectorReadonlyValue({
  children,
  monospace = true,
}: {
  children: ReactNode;
  monospace?: boolean;
}) {
  return (
    <div
      className={cn(
        inspectorReadonlyClassName,
        monospace ? 'font-mono text-[11px]' : 'text-sm',
      )}
    >
      {children}
    </div>
  );
}

export function InspectorToggleField({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="builder-inspector-toggle">
      <input
        type="checkbox"
        className="builder-inspector-checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="builder-inspector-toggle-copy">
        <span className="builder-inspector-toggle-title">{label}</span>
        {description ? (
          <span className="builder-inspector-toggle-description">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
