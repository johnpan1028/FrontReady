import type { LegacyLayoutItem } from '../../core/projectDocument';
import type {
  CardDefinition,
  ControlDefinition,
  InspectorFieldDefinition,
  InspectorSectionDefinition,
} from '../contracts';

type StudioWidgetDefinition = ControlDefinition | CardDefinition;

const inputClassName = 'w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary';
const textareaClassName = 'min-h-[96px] w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm leading-5 text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary';

type StudioDefinitionInspectorProps = {
  definition: StudioWidgetDefinition;
  value: {
    id: string;
    type: string;
    props: Record<string, unknown>;
  };
  layoutItem: LegacyLayoutItem | null;
  maxCols?: number;
  autoOccupyRow?: boolean;
  onUpdateProps: (props: Record<string, unknown>) => void;
  onUpdateLayout: (updates: Partial<Pick<LegacyLayoutItem, 'x' | 'y' | 'w' | 'h' | 'minW' | 'minH'>>) => void;
  onUpdateAutoOccupyRow?: (checked: boolean) => void;
};

const getPathValue = (
  value: StudioDefinitionInspectorProps['value'],
  layoutItem: LegacyLayoutItem | null,
  path: string,
) => {
  if (path === 'id') return value.id;
  if (path === 'type') return value.type;
  if (path.startsWith('props.')) {
    return value.props[path.slice('props.'.length)];
  }
  if (path.startsWith('layout.')) {
    return layoutItem?.[path.slice('layout.'.length) as keyof LegacyLayoutItem];
  }
  return undefined;
};

const toStringValue = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

const updateFieldValue = (
  field: InspectorFieldDefinition,
  nextValue: unknown,
  handlers: Pick<StudioDefinitionInspectorProps, 'onUpdateProps' | 'onUpdateLayout' | 'onUpdateAutoOccupyRow'>,
) => {
  if (field.path === 'props.autoOccupyRow' && handlers.onUpdateAutoOccupyRow) {
    handlers.onUpdateAutoOccupyRow(Boolean(nextValue));
    return;
  }

  if (field.path.startsWith('props.')) {
    handlers.onUpdateProps({
      [field.path.slice('props.'.length)]: nextValue,
    });
    return;
  }

  if (field.path.startsWith('layout.')) {
    handlers.onUpdateLayout({
      [field.path.slice('layout.'.length)]: nextValue,
    });
  }
};

function InspectorField({
  field,
  value,
  layoutItem,
  maxCols = 48,
  autoOccupyRow = false,
  onUpdateProps,
  onUpdateLayout,
  onUpdateAutoOccupyRow,
}: {
  field: InspectorFieldDefinition;
} & Omit<StudioDefinitionInspectorProps, 'definition'>) {
  const currentValue = getPathValue(value, layoutItem, field.path);
  const disabled = field.readOnly || (field.path === 'layout.w' && autoOccupyRow);
  const commonLabel = (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs font-medium text-hr-text">{field.label}</label>
      {field.supportsInheritMode ? (
        <span className="rounded-full border border-hr-border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-hr-muted">
          inherit
        </span>
      ) : null}
    </div>
  );

  if (field.kind === 'readonly') {
    return (
      <div className="flex flex-col gap-1.5">
        {commonLabel}
        <div className="rounded-lg border border-hr-border bg-hr-bg px-3 py-2 text-[11px] font-mono text-hr-muted">
          {toStringValue(currentValue)}
        </div>
      </div>
    );
  }

  if (field.kind === 'textarea') {
    return (
      <div className="flex flex-col gap-1.5">
        {commonLabel}
        <textarea
          className={textareaClassName}
          placeholder={field.placeholder}
          value={toStringValue(currentValue)}
          onChange={(event) => updateFieldValue(field, event.target.value, { onUpdateProps, onUpdateLayout, onUpdateAutoOccupyRow })}
        />
        {field.description ? <p className="text-[11px] leading-5 text-hr-muted">{field.description}</p> : null}
      </div>
    );
  }

  if (field.kind === 'select' || field.kind === 'segmented') {
    return (
      <div className="flex flex-col gap-1.5">
        {commonLabel}
        <select
          className={inputClassName}
          value={toStringValue(currentValue)}
          disabled={disabled}
          onChange={(event) => updateFieldValue(field, event.target.value, { onUpdateProps, onUpdateLayout, onUpdateAutoOccupyRow })}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {field.description ? <p className="text-[11px] leading-5 text-hr-muted">{field.description}</p> : null}
      </div>
    );
  }

  if (field.kind === 'switch' || field.kind === 'checkbox') {
    return (
      <label className="flex items-start gap-2 text-sm text-hr-text">
        <input
          type="checkbox"
          className="mt-0.5 rounded border-hr-border text-hr-primary focus:ring-hr-primary"
          checked={Boolean(currentValue)}
          disabled={disabled}
          onChange={(event) => updateFieldValue(field, event.target.checked, { onUpdateProps, onUpdateLayout, onUpdateAutoOccupyRow })}
        />
        <span className="flex flex-col gap-0.5">
          <span>{field.label}</span>
          {field.description ? <span className="text-[11px] leading-5 text-hr-muted">{field.description}</span> : null}
        </span>
      </label>
    );
  }

  if (field.kind === 'number') {
    return (
      <div className="flex flex-col gap-1.5">
        {commonLabel}
        <input
          type="number"
          min="1"
          max={field.path === 'layout.w' || field.path === 'layout.minW' ? maxCols : undefined}
          className={inputClassName}
          value={typeof currentValue === 'number' ? currentValue : ''}
          disabled={disabled}
          onChange={(event) => updateFieldValue(field, parseInt(event.target.value, 10) || 1, { onUpdateProps, onUpdateLayout, onUpdateAutoOccupyRow })}
        />
        {field.description ? <p className="text-[11px] leading-5 text-hr-muted">{field.description}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {commonLabel}
      <input
        type={field.kind === 'color' ? 'color' : 'text'}
        className={inputClassName}
        placeholder={field.placeholder}
        value={toStringValue(currentValue)}
        disabled={disabled}
        onChange={(event) => updateFieldValue(field, event.target.value, { onUpdateProps, onUpdateLayout, onUpdateAutoOccupyRow })}
      />
      {field.description ? <p className="text-[11px] leading-5 text-hr-muted">{field.description}</p> : null}
    </div>
  );
}

function InspectorSection({
  section,
  ...props
}: {
  section: InspectorSectionDefinition;
} & Omit<StudioDefinitionInspectorProps, 'definition'>) {
  return (
    <div className="rounded-xl border border-hr-border bg-hr-panel p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hr-muted">{section.title}</div>
          {section.description ? (
            <div className="mt-1 text-[11px] leading-5 text-hr-muted">{section.description}</div>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {section.fields.map((field) => (
          <InspectorField key={field.id} field={field} {...props} />
        ))}
      </div>
    </div>
  );
}

export function StudioDefinitionInspector({
  definition,
  ...props
}: StudioDefinitionInspectorProps) {
  const sections = [...definition.inspector].sort((left, right) => left.priority - right.priority);

  return (
    <>
      {sections.map((section) => (
        <InspectorSection key={section.id} section={section} {...props} />
      ))}
    </>
  );
}
