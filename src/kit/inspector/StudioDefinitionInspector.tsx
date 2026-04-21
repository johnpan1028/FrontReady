import { Fragment, type ReactNode } from 'react';
import {
  InspectorField as InspectorFieldRow,
  InspectorNumberInput,
  InspectorReadonlyValue,
  InspectorSection as InspectorSectionBlock,
  InspectorToggleField,
  inspectorInputClassName,
  inspectorTextareaClassName,
} from '../../components/builder-page/InspectorPrimitives';
import type { LegacyLayoutItem } from '../../core/projectDocument';
import { cn } from '../../utils/cn';
import { getTypographyDefaultsForWidget } from '../../utils/typography';
import type {
  CardDefinition,
  ControlDefinition,
  InspectorFieldDefinition,
  InspectorSectionDefinition,
} from '../contracts';

type StudioWidgetDefinition = ControlDefinition | CardDefinition;

const TYPOGRAPHY_WIDE_FIELD_IDS = new Set([
  'text-align',
  'text-transform',
  'text-decoration',
]);

const INLINE_FOLLOW_FIELD_IDS = new Set([
  'children-follow-font',
  'children-follow-border',
]);

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
  renderBeforeSection?: (section: InspectorSectionDefinition) => ReactNode;
};

const normalizeBorderStyleValue = (value: unknown, fallback: 'solid' | 'transparent' | 'parent' = 'solid') => (
  value === 'transparent' || value === 'parent' || value === 'solid' ? value : fallback
);

const getPathValue = (
  value: StudioDefinitionInspectorProps['value'],
  layoutItem: LegacyLayoutItem | null,
  path: string,
) => {
  if (path === 'id') return value.id;
  if (path === 'type') return value.type;
  if (path.startsWith('props.')) {
    const propKey = path.slice('props.'.length);
    const propValue = value.props[propKey];
    const typographyDefaults = getTypographyDefaultsForWidget(value.type, value.props);

    if (propKey === 'borderStyle' || propKey === 'controlBorderStyle') {
      return normalizeBorderStyleValue(propValue);
    }

    if (propKey === 'childrenFollowFont' || propKey === 'childrenFollowBorder') {
      return propValue === true;
    }

    if (propKey === 'paddingLeft' || propKey === 'paddingRight') {
      return propValue ?? value.props.paddingX ?? 16;
    }

    if (propKey === 'paddingTop' || propKey === 'paddingBottom') {
      return propValue ?? value.props.paddingY ?? 16;
    }

    if (propKey === 'linkHorizontalPadding' || propKey === 'linkVerticalPadding') {
      return propValue ?? true;
    }

    if (propKey in typographyDefaults) {
      return propValue ?? typographyDefaults[propKey as keyof typeof typographyDefaults];
    }

    return propValue;
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

const renderSegmentedOptionContent = (
  field: InspectorFieldDefinition,
  option: InspectorFieldDefinition['options'][number],
) => {
  if (field.id === 'text-align') {
    return (
      <span className="builder-inspector-align-glyph" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    );
  }

  if (field.id === 'text-decoration') {
    return (
      <span
        className={cn(
          'builder-inspector-decoration-glyph',
          option.value !== 'none' && `is-${option.value}`,
        )}
        aria-hidden="true"
      >
        {option.value === 'none' ? '—' : 'A'}
      </span>
    );
  }

  if (field.id === 'text-transform') {
    return (
      <span className="builder-inspector-case-glyph" aria-hidden="true">
        {option.label}
      </span>
    );
  }

  return option.label;
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

function InspectorInlineToggle({
  field,
  value,
  layoutItem,
  onUpdateProps,
  onUpdateLayout,
  onUpdateAutoOccupyRow,
}: {
  field: InspectorFieldDefinition;
} & Omit<StudioDefinitionInspectorProps, 'definition'>) {
  const currentValue = getPathValue(value, layoutItem, field.path);

  return (
    <label className="builder-inspector-inline-toggle">
      <input
        type="checkbox"
        className="builder-inspector-inline-checkbox"
        checked={Boolean(currentValue)}
        onChange={(event) => updateFieldValue(
          field,
          event.target.checked,
          { onUpdateProps, onUpdateLayout, onUpdateAutoOccupyRow },
        )}
      />
      <span>{field.label}</span>
    </label>
  );
}

function InspectorField({
  field,
  labelAccessory: explicitLabelAccessory,
  value,
  layoutItem,
  maxCols = 48,
  autoOccupyRow = false,
  onUpdateProps,
  onUpdateLayout,
  onUpdateAutoOccupyRow,
}: {
  field: InspectorFieldDefinition;
  labelAccessory?: ReactNode;
} & Omit<StudioDefinitionInspectorProps, 'definition'>) {
  const currentValue = getPathValue(value, layoutItem, field.path);
  const disabled = field.readOnly || (field.path === 'layout.w' && autoOccupyRow);
  const inheritLabelAccessory = field.supportsInheritMode ? (
    <span className="builder-inspector-chip">Inherit</span>
  ) : null;
  const labelAccessory = explicitLabelAccessory || inheritLabelAccessory;

  if (field.kind === 'readonly') {
    return (
      <InspectorFieldRow label={field.label} labelAccessory={labelAccessory}>
        <InspectorReadonlyValue>
          {toStringValue(currentValue)}
        </InspectorReadonlyValue>
      </InspectorFieldRow>
    );
  }

  if (field.kind === 'textarea') {
    return (
      <InspectorFieldRow label={field.label} labelAccessory={labelAccessory}>
        <textarea
          className={inspectorTextareaClassName}
          placeholder={field.placeholder}
          value={toStringValue(currentValue)}
          disabled={disabled}
          onChange={(event) => updateFieldValue(field, event.target.value, { onUpdateProps, onUpdateLayout, onUpdateAutoOccupyRow })}
        />
      </InspectorFieldRow>
    );
  }

  if (field.kind === 'segmented') {
    return (
      <InspectorFieldRow label={field.label} labelAccessory={labelAccessory}>
        <div className="builder-inspector-segmented-field">
          {field.options.map((option) => {
            const isActive = toStringValue(currentValue) === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className={isActive ? 'builder-inspector-segmented-option is-active' : 'builder-inspector-segmented-option'}
                data-field-id={field.id}
                data-option-value={option.value}
                aria-label={option.label}
                title={option.label}
                disabled={disabled}
                onClick={() => updateFieldValue(field, option.value, { onUpdateProps, onUpdateLayout, onUpdateAutoOccupyRow })}
              >
                {renderSegmentedOptionContent(field, option)}
              </button>
            );
          })}
        </div>
      </InspectorFieldRow>
    );
  }

  if (field.kind === 'select') {
    return (
      <InspectorFieldRow label={field.label} labelAccessory={labelAccessory}>
        <select
          className={inspectorInputClassName}
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
      </InspectorFieldRow>
    );
  }

  if (field.kind === 'switch' || field.kind === 'checkbox') {
    return (
      <InspectorToggleField
        label={field.label}
        description={undefined}
        checked={Boolean(currentValue)}
        disabled={disabled}
        onChange={(checked) => updateFieldValue(field, checked, { onUpdateProps, onUpdateLayout, onUpdateAutoOccupyRow })}
      />
    );
  }

  if (field.kind === 'number') {
    const minValue = typeof field.meta?.min === 'number' ? field.meta.min : 1;
    const maxValue = typeof field.meta?.max === 'number'
      ? field.meta.max
      : field.path === 'layout.w' || field.path === 'layout.minW'
        ? maxCols
        : undefined;

    return (
      <InspectorFieldRow label={field.label} labelAccessory={labelAccessory}>
        <InspectorNumberInput
          min={minValue}
          max={maxValue}
          value={typeof currentValue === 'number' ? currentValue : ''}
          disabled={disabled}
          onChange={(nextValue) => {
            updateFieldValue(
              field,
              Number.isFinite(nextValue) ? Math.max(minValue, nextValue) : minValue,
              { onUpdateProps, onUpdateLayout, onUpdateAutoOccupyRow },
            );
          }}
        />
      </InspectorFieldRow>
    );
  }

  return (
    <InspectorFieldRow label={field.label} labelAccessory={labelAccessory}>
      <input
        type={field.kind === 'color' ? 'color' : 'text'}
        className={inspectorInputClassName}
        placeholder={field.placeholder}
        value={toStringValue(currentValue)}
        disabled={disabled}
        onChange={(event) => updateFieldValue(field, event.target.value, { onUpdateProps, onUpdateLayout, onUpdateAutoOccupyRow })}
      />
    </InspectorFieldRow>
  );
}

function InspectorSection({
  section,
  ...props
}: {
  section: InspectorSectionDefinition;
} & Omit<StudioDefinitionInspectorProps, 'definition'>) {
  const isTypographySection = section.id === 'typography';
  const isSpacingSection = section.id === 'spacing' && props.value.type === 'panel';
  const isPanelWidget = props.value.type === 'panel';
  const isPanelBorderSection = isPanelWidget && section.id === 'frame';

  if (isSpacingSection) {
    const getField = (fieldId: string) => section.fields.find((field) => field.id === fieldId);
    const renderField = (fieldId: string) => {
      const field = getField(fieldId);
      if (!field) return null;
      return <InspectorField key={field.id} field={field} {...props} />;
    };

    return (
      <InspectorSectionBlock
        title={section.title}
        defaultOpen={section.defaultOpen !== false}
        className="builder-inspector-section-spacing"
      >
        <div className="builder-inspector-spacing-grid">
          <div className="builder-inspector-spacing-card">
            {renderField('padding-horizontal-link')}
            {renderField('padding-left')}
            {renderField('padding-right')}
          </div>

          <div className="builder-inspector-spacing-card">
            {renderField('padding-vertical-link')}
            {renderField('padding-top')}
            {renderField('padding-bottom')}
          </div>
        </div>

        {renderField('gap')}
      </InspectorSectionBlock>
    );
  }

  if (isPanelBorderSection) {
    const followField = section.fields.find((field) => field.id === 'children-follow-border');

    return (
      <InspectorSectionBlock
        title={section.title}
        defaultOpen={section.defaultOpen !== false}
      >
        <div className="flex flex-col gap-3">
          {section.fields
            .filter((field) => field.id !== 'children-follow-border')
            .map((field) => (
              <InspectorField
                key={field.id}
                field={field}
                labelAccessory={field.id === 'control-border-style' && followField ? (
                  <InspectorInlineToggle field={followField} {...props} />
                ) : undefined}
                {...props}
              />
            ))}
        </div>
      </InspectorSectionBlock>
    );
  }

  return (
    <InspectorSectionBlock
      title={section.title}
      defaultOpen={section.defaultOpen !== false}
      className={isTypographySection ? 'builder-inspector-section-typography' : undefined}
    >
      <div className={isTypographySection ? 'builder-inspector-typography-grid' : 'flex flex-col gap-3'}>
        {section.fields.map((field) => {
          if (INLINE_FOLLOW_FIELD_IDS.has(field.id)) return null;

          const followField = isTypographySection && isPanelWidget && field.id === 'font-family'
            ? section.fields.find((sectionField) => sectionField.id === 'children-follow-font')
            : null;
          const fieldNode = (
            <InspectorField
              key={field.id}
              field={field}
              labelAccessory={followField ? <InspectorInlineToggle field={followField} {...props} /> : undefined}
              {...props}
            />
          );

          if (!isTypographySection) return fieldNode;

          return (
            <div
              key={field.id}
              className={TYPOGRAPHY_WIDE_FIELD_IDS.has(field.id) ? 'builder-inspector-typography-wide' : undefined}
            >
              {fieldNode}
            </div>
          );
        })}
      </div>
    </InspectorSectionBlock>
  );
}

export function StudioDefinitionInspector({
  definition,
  renderBeforeSection,
  ...props
}: StudioDefinitionInspectorProps) {
  const sections = [...definition.inspector]
    .filter((section) => section.fields.length > 0)
    .sort((left, right) => left.priority - right.priority);

  return (
    <>
      {sections.map((section) => (
        <Fragment key={section.id}>
          {renderBeforeSection?.(section)}
          <InspectorSection section={section} {...props} />
        </Fragment>
      ))}
    </>
  );
}
