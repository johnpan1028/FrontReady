import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
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

type CornerPreset = 'square' | 'r1' | 'r2' | 'r3';
type CornerPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const CORNER_PRESETS: Array<{ value: CornerPreset; label: string }> = [
  { value: 'square', label: 'Square' },
  { value: 'r1', label: 'R1' },
  { value: 'r2', label: 'R2' },
  { value: 'r3', label: 'R3' },
];

const CORNER_FIELDS: Array<{
  id: string;
  label: string;
  position: CornerPosition;
}> = [
  { id: 'corner-top-left', label: 'Top Left', position: 'top-left' },
  { id: 'corner-top-right', label: 'Top Right', position: 'top-right' },
  { id: 'corner-bottom-left', label: 'Bottom Left', position: 'bottom-left' },
  { id: 'corner-bottom-right', label: 'Bottom Right', position: 'bottom-right' },
];

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
  externalSections?: Array<{
    id: string;
    groupId: string;
    priority?: number;
    node: ReactNode;
  }>;
};

type InspectorGroupId = 'shell' | 'content' | 'layout' | 'appearance' | 'data' | 'logic';

type InspectorGroupItem = {
  id: string;
  groupId: InspectorGroupId;
  priority: number;
  node: ReactNode;
};

const resolveSectionGroupId = (
  definition: StudioWidgetDefinition,
  section: InspectorSectionDefinition,
): InspectorGroupId => {
  const explicitGroupId = typeof section.meta?.groupId === 'string'
    ? section.meta.groupId as InspectorGroupId
    : null;

  if (explicitGroupId) return explicitGroupId;

  const isShellCard = definition.base.type === 'panel';

  if (isShellCard && (section.id === 'header' || section.id === 'footer' || section.id === 'overflow')) {
    return 'shell';
  }

  if (section.id === 'layout' || section.id === 'spacing' || section.id === 'size') {
    return 'layout';
  }

  if (
    section.id === 'typography'
    || section.id === 'frame'
    || section.id === 'corner'
    || section.id === 'style'
  ) {
    return 'appearance';
  }

  if (section.id === 'bindings' || section.id === 'data') {
    return 'data';
  }

  if (section.id === 'actions' || section.id === 'ai-handoff' || section.id === 'pixel-constraints') {
    return 'logic';
  }

  return isShellCard ? 'shell' : 'content';
};

const normalizeBorderStyleValue = (value: unknown, fallback: 'solid' | 'transparent' | 'parent' = 'solid') => (
  value === 'transparent' || value === 'parent' || value === 'solid' ? value : fallback
);

const normalizeCornerPresetValue = (value: unknown): CornerPreset => (
  value === 'square' || value === 'r1' || value === 'r3' ? value : 'r2'
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

    if (
      propKey === 'cornerTopLeftPreset'
      || propKey === 'cornerTopRightPreset'
      || propKey === 'cornerBottomLeftPreset'
      || propKey === 'cornerBottomRightPreset'
    ) {
      return normalizeCornerPresetValue(propValue);
    }

    if (propKey === 'childrenFollowFont' || propKey === 'childrenFollowBorder') {
      return propValue === true;
    }

    if (propKey === 'labelText') {
      return propValue ?? value.props.text;
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
    if (field.path === 'props.labelText') {
      handlers.onUpdateProps({
        labelText: nextValue,
        text: nextValue,
      });
      return;
    }
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
      <span>{field.label}</span>
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
    </label>
  );
}

function InspectorSectionCheckbox({
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
    <label
      className="builder-inspector-section-checkbox"
      title={field.label}
      aria-label={field.label}
    >
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
    </label>
  );
}

const getCornerGlyphPath = (position: CornerPosition, preset: CornerPreset) => {
  const radius = preset === 'square' ? 0 : preset === 'r1' ? 4 : preset === 'r2' ? 7 : 10;

  if (radius === 0) {
    if (position === 'top-left') return 'M19 5H5V19';
    if (position === 'top-right') return 'M5 5H19V19';
    if (position === 'bottom-left') return 'M19 19H5V5';
    return 'M5 19H19V5';
  }

  if (position === 'top-left') return `M19 5H${5 + radius}A${radius} ${radius} 0 0 0 5 ${5 + radius}V19`;
  if (position === 'top-right') return `M5 5H${19 - radius}A${radius} ${radius} 0 0 1 19 ${5 + radius}V19`;
  if (position === 'bottom-left') return `M19 19H${5 + radius}A${radius} ${radius} 0 0 1 5 ${19 - radius}V5`;
  return `M5 19H${19 - radius}A${radius} ${radius} 0 0 0 19 ${19 - radius}V5`;
};

function CornerGlyph({
  position,
  preset,
}: {
  position: CornerPosition;
  preset: CornerPreset;
}) {
  return (
    <svg
      className="builder-inspector-corner-glyph"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={getCornerGlyphPath(position, preset)} />
    </svg>
  );
}

function InspectorCornerSection({
  section,
  value,
  layoutItem,
  onUpdateProps,
  onUpdateLayout,
  onUpdateAutoOccupyRow,
}: {
  section: InspectorSectionDefinition;
} & Omit<StudioDefinitionInspectorProps, 'definition'>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [activeCornerId, setActiveCornerId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCornerId) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setActiveCornerId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [activeCornerId]);

  const linkCornersField = section.fields.find((field) => field.id === 'link-corners') ?? null;
  const linkCornersEnabled = linkCornersField
    ? Boolean(getPathValue(value, layoutItem, linkCornersField.path))
    : false;
  const cornerItems = CORNER_FIELDS
    .map((config) => ({
      ...config,
      field: section.fields.find((field) => field.id === config.id),
    }))
    .filter((item): item is typeof item & { field: InspectorFieldDefinition } => Boolean(item.field));

  const activeCorner = cornerItems.find((item) => item.id === activeCornerId) ?? null;
  const primaryCornerPreset = cornerItems[0]
    ? normalizeCornerPresetValue(getPathValue(value, layoutItem, cornerItems[0].field.path))
    : 'r2';

  const updateCornerPreset = (field: InspectorFieldDefinition, preset: CornerPreset) => {
    if (linkCornersEnabled) {
      onUpdateProps({
        cornerTopLeftPreset: preset,
        cornerTopRightPreset: preset,
        cornerBottomLeftPreset: preset,
        cornerBottomRightPreset: preset,
      });
      return;
    }

    updateFieldValue(
      field,
      preset,
      { onUpdateProps, onUpdateLayout, onUpdateAutoOccupyRow },
    );
  };

  const updateLinkCorners = (checked: boolean) => {
    if (!linkCornersField) return;

    if (checked) {
      onUpdateProps({
        linkCornerPresets: true,
        cornerTopLeftPreset: primaryCornerPreset,
        cornerTopRightPreset: primaryCornerPreset,
        cornerBottomLeftPreset: primaryCornerPreset,
        cornerBottomRightPreset: primaryCornerPreset,
      });
      return;
    }

    updateFieldValue(
      linkCornersField,
      false,
      { onUpdateProps, onUpdateLayout, onUpdateAutoOccupyRow },
    );
  };

  return (
    <InspectorSectionBlock
      title={section.title}
      defaultOpen={section.defaultOpen !== false}
      collapsible={section.collapsible !== false}
      className="builder-inspector-section-corner"
      bodyClassName="builder-inspector-corner-body"
    >
      <div ref={rootRef} className="builder-inspector-corner-grid">
        {linkCornersField ? (
          <label className="builder-inspector-corner-link">
            <span>{linkCornersField.label}</span>
            <input
              type="checkbox"
              className="builder-inspector-inline-checkbox"
              checked={linkCornersEnabled}
              onChange={(event) => updateLinkCorners(event.target.checked)}
            />
          </label>
        ) : null}

        {cornerItems.map((item) => {
          const currentPreset = normalizeCornerPresetValue(getPathValue(value, layoutItem, item.field.path));
          const isActive = activeCornerId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                'builder-inspector-corner-trigger',
                isActive && 'is-active',
              )}
              title={item.label}
              aria-label={item.label}
              aria-pressed={isActive}
              onClick={() => setActiveCornerId((current) => (current === item.id ? null : item.id))}
            >
              <CornerGlyph position={item.position} preset={currentPreset} />
            </button>
          );
        })}

        {activeCorner ? (
          <div className="builder-inspector-corner-popover" role="listbox" aria-label={`${activeCorner.label} corner`}>
            {CORNER_PRESETS.map((preset) => {
              const currentPreset = normalizeCornerPresetValue(getPathValue(value, layoutItem, activeCorner.field.path));
              const isActive = currentPreset === preset.value;

              return (
                <button
                  key={preset.value}
                  type="button"
                  className={cn(
                    'builder-inspector-corner-option',
                    isActive && 'is-active',
                  )}
                  role="option"
                  aria-selected={isActive}
                  title={preset.label}
                  onClick={() => {
                    updateCornerPreset(activeCorner.field, preset.value);
                    setActiveCornerId(null);
                  }}
                >
                  <CornerGlyph position={activeCorner.position} preset={preset.value} />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </InspectorSectionBlock>
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
  const visibleFields = section.fields;
  const toggleFieldId = typeof section.meta?.toggleFieldId === 'string'
    ? section.meta.toggleFieldId
    : null;
  const sectionToggleField = toggleFieldId
    ? visibleFields.find((field) => field.id === toggleFieldId)
    : null;
  const isCompactToggleSection = section.id === 'header' || section.id === 'footer' || section.id === 'overflow';
  const sectionToggleChecked = sectionToggleField
    ? Boolean(getPathValue(props.value, props.layoutItem, sectionToggleField.path))
    : true;
  const sectionSideSlot = sectionToggleField && !isCompactToggleSection
    ? <InspectorInlineToggle field={sectionToggleField} {...props} />
    : undefined;
  const sectionRightSlot = sectionToggleField && isCompactToggleSection
    ? <InspectorSectionCheckbox field={sectionToggleField} {...props} />
    : undefined;
  const contentFields = sectionToggleField
    ? visibleFields.filter((field) => field.id !== sectionToggleField.id)
    : visibleFields;
  const isTypographySection = section.id === 'typography';
  const isSpacingSection = section.id === 'spacing' && props.value.type === 'panel';
  const isPanelWidget = props.value.type === 'panel';
  const isPanelBorderSection = isPanelWidget && section.id === 'frame';

  if (section.id === 'corner') {
    return (
      <InspectorCornerSection
        section={section}
        {...props}
      />
    );
  }

  if (isSpacingSection) {
    const getField = (fieldId: string) => contentFields.find((field) => field.id === fieldId);
    const renderField = (fieldId: string) => {
      const field = getField(fieldId);
      if (!field) return null;
      return <InspectorField key={field.id} field={field} {...props} />;
    };

    return (
      <InspectorSectionBlock
        title={section.title}
        defaultOpen={section.defaultOpen !== false}
        collapsible={section.collapsible !== false}
        sideSlot={sectionSideSlot}
        className="builder-inspector-section-spacing"
      >
        {sectionToggleChecked ? (
          <>
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
          </>
        ) : null}
      </InspectorSectionBlock>
    );
  }

  if (sectionToggleField) {
    return (
      <InspectorSectionBlock
        title={section.title}
        defaultOpen={section.defaultOpen !== false}
        collapsible={section.collapsible !== false}
        sideSlot={sectionSideSlot}
        rightSlot={sectionRightSlot}
        className={isCompactToggleSection ? 'builder-inspector-section-compact-toggle' : undefined}
        bodyClassName={isCompactToggleSection ? 'builder-inspector-section-compact-toggle-body' : undefined}
        hideEmptyBody={isCompactToggleSection}
      >
        {sectionToggleChecked && contentFields.length > 0 ? (
          <div className="flex flex-col gap-3">
            {contentFields.map((field) => (
              <InspectorField
                key={field.id}
                field={field}
                {...props}
              />
            ))}
          </div>
        ) : null}
      </InspectorSectionBlock>
    );
  }

  if (isPanelBorderSection) {
    const followField = contentFields.find((field) => field.id === 'children-follow-border');

    return (
      <InspectorSectionBlock
        title={section.title}
        defaultOpen={section.defaultOpen !== false}
      >
        <div className="flex flex-col gap-3">
          {contentFields
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
        {contentFields.map((field) => {
          if (INLINE_FOLLOW_FIELD_IDS.has(field.id)) return null;

          const followField = isTypographySection && isPanelWidget && field.id === 'font-family'
            ? contentFields.find((sectionField) => sectionField.id === 'children-follow-font')
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
  externalSections = [],
  ...props
}: StudioDefinitionInspectorProps) {
  const sections = [...definition.inspector]
    .filter((section) => section.fields.length > 0)
    .sort((left, right) => left.priority - right.priority);

  const groupItems: InspectorGroupItem[] = sections.flatMap((section) => {
    const groupId = resolveSectionGroupId(definition, section);
    const beforeNode = renderBeforeSection?.(section);
    const items: InspectorGroupItem[] = [];

    if (beforeNode) {
      items.push({
        id: `before-${section.id}`,
        groupId,
        priority: section.priority - 0.1,
        node: beforeNode,
      });
    }

    items.push({
      id: section.id,
      groupId,
      priority: section.priority,
      node: <InspectorSection section={section} {...props} />,
    });

    return items;
  });

  externalSections.forEach((section) => {
    groupItems.push({
      id: section.id,
      groupId: section.groupId as InspectorGroupId,
      priority: section.priority ?? 100,
      node: section.node,
    });
  });

  const orderedGroups = definition.propertyGroups
    .filter((group) => group.id === 'shell' || group.id === 'content' || group.id === 'layout' || group.id === 'appearance' || group.id === 'data' || group.id === 'logic')
    .map((group) => ({
      ...group,
      groupId: group.id as InspectorGroupId,
    }))
    .filter((group) => groupItems.some((item) => item.groupId === group.groupId));

  return (
    <>
      {orderedGroups.map((group) => (
        <section key={group.groupId} className="builder-inspector-group">
          <div className="builder-inspector-group-header">
            <span className="builder-inspector-group-title">{group.title}</span>
          </div>
          <div className="builder-inspector-group-body">
            {groupItems
              .filter((item) => item.groupId === group.groupId)
              .sort((left, right) => left.priority - right.priority)
              .map((item) => (
                <Fragment key={item.id}>
                  {item.node}
                </Fragment>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
