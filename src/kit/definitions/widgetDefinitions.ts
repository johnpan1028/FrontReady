import type { z } from 'zod';
import type { WidgetType } from '../../builder/widgetConfig';
import type { WidgetData } from '../../store/builderStore';
import { ICON_LIST } from '../../components/atoms/IconButton';
import {
  TYPOGRAPHY_ALIGNMENT_OPTIONS,
  TYPOGRAPHY_CASE_OPTIONS,
  TYPOGRAPHY_DECORATION_OPTIONS,
  TYPOGRAPHY_FONT_OPTIONS,
  TYPOGRAPHY_STYLE_OPTIONS,
  TYPOGRAPHY_WEIGHT_OPTIONS,
} from '../../utils/typography';
import {
  CardDefinitionSchema,
  ControlDefinitionSchema,
  InspectorFieldDefinitionSchema,
  type CardDefinition,
  type ControlDefinition,
} from '../contracts';

type StudioWidgetDefinition = ControlDefinition | CardDefinition;
type ControlDefinitionInput = z.input<typeof ControlDefinitionSchema>;
type CardDefinitionInput = z.input<typeof CardDefinitionSchema>;
type InspectorFieldInput = z.input<typeof InspectorFieldDefinitionSchema>;

const propertyGroup = (
  id: string,
  title: string,
  description?: string,
) => ({
  id,
  title,
  description,
  fields: [],
});

const textField = (
  id: string,
  label: string,
  path: string,
  options: Partial<InspectorFieldInput> = {},
): InspectorFieldInput => ({
  id,
  label,
  kind: 'text',
  path,
  ...options,
});

const textareaField = (
  id: string,
  label: string,
  path: string,
  options: Partial<InspectorFieldInput> = {},
): InspectorFieldInput => ({
  id,
  label,
  kind: 'textarea',
  path,
  ...options,
});

const selectField = (
  id: string,
  label: string,
  path: string,
  options: InspectorFieldInput['options'],
  fieldOptions: Partial<InspectorFieldInput> = {},
): InspectorFieldInput => ({
  id,
  label,
  kind: 'select',
  path,
  options,
  ...fieldOptions,
});

const switchField = (
  id: string,
  label: string,
  path: string,
  options: Partial<InspectorFieldInput> = {},
): InspectorFieldInput => ({
  id,
  label,
  kind: 'switch',
  path,
  ...options,
});

const numberField = (
  id: string,
  label: string,
  path: string,
  options: Partial<InspectorFieldInput> = {},
): InspectorFieldInput => ({
  id,
  label,
  kind: 'number',
  path,
  ...options,
});

const commonThemeSupport = {
  inheritsProjectTokens: true,
  supportsGlobalTokens: true,
  supportsLocalOverrides: true,
  supportedTokenRefs: [
    '--theme-bg',
    '--theme-panel',
    '--theme-border',
    '--theme-text',
    '--theme-muted',
    '--theme-primary',
    '--theme-font-family',
    '--theme-radius-control',
    '--theme-radius-panel',
  ],
};

const BORDER_STYLE_OPTIONS = [
  { label: 'Solid', value: 'solid' },
  { label: 'None', value: 'transparent' },
  { label: 'Parent controlled', value: 'parent' },
] as const;

const CORNER_PRESET_OPTIONS = [
  { label: 'Square', value: 'square' },
  { label: 'R1', value: 'r1' },
  { label: 'R2', value: 'r2' },
  { label: 'R3', value: 'r3' },
] as const;

const TONE_OPTIONS = [
  { label: 'Neutral', value: 'neutral' },
  { label: 'Primary', value: 'primary' },
  { label: 'Success', value: 'success' },
  { label: 'Warning', value: 'warning' },
  { label: 'Danger', value: 'danger' },
] as const;

const SOFT_SOLID_OPTIONS = [
  { label: 'Soft', value: 'soft' },
  { label: 'Solid', value: 'solid' },
] as const;

const MEDIA_FIT_OPTIONS = [
  { label: 'Cover', value: 'cover' },
  { label: 'Contain', value: 'contain' },
] as const;

const ICON_OPTIONS = ICON_LIST.map((icon) => ({
  label: icon.replace(/2$/, ''),
  value: icon,
}));

const runtime = (rendererKey: string, sourceComponent: string, importPath: string, flags = {}) => ({
  rendererKey,
  sourceComponent,
  importPath,
  ...flags,
});

const exportSpec = (
  rendererKey: string,
  exportType: 'control' | 'card' | 'slot' = 'control',
  codegenStrategy: 'native' | 'adapter' | 'source-bridge' = 'native',
) => ({
  rendererKey,
  exportType,
  codegenStrategy,
  runtimeComponentKey: rendererKey,
  needsAdapterLayer: codegenStrategy !== 'native',
  notes: '',
});

const layoutSection = {
  id: 'layout',
  title: 'Layout',
  scope: ['control' as const, 'card' as const],
  priority: 40,
  fields: [],
};

const typographySection = {
  id: 'typography',
  title: 'Typography',
  scope: ['control' as const, 'card' as const],
  priority: 20,
  fields: [
    selectField('font-family', 'Font', 'props.fontFamily', [...TYPOGRAPHY_FONT_OPTIONS]),
    switchField('children-follow-font', 'Internal follow', 'props.childrenFollowFont'),
    textField('font-size', 'Size', 'props.fontSize', {
      placeholder: '16px',
    }),
    selectField('font-weight', 'Weight', 'props.fontWeight', [...TYPOGRAPHY_WEIGHT_OPTIONS]),
    {
      id: 'font-style',
      label: 'Style',
      kind: 'segmented' as const,
      path: 'props.fontStyle',
      options: [...TYPOGRAPHY_STYLE_OPTIONS],
    },
    {
      id: 'text-align',
      label: 'Alignment',
      kind: 'segmented' as const,
      path: 'props.textAlign',
      options: [...TYPOGRAPHY_ALIGNMENT_OPTIONS],
    },
    {
      id: 'text-transform',
      label: 'Case',
      kind: 'segmented' as const,
      path: 'props.textTransform',
      options: [...TYPOGRAPHY_CASE_OPTIONS],
    },
    {
      id: 'text-decoration',
      label: 'Decoration',
      kind: 'segmented' as const,
      path: 'props.textDecoration',
      options: [...TYPOGRAPHY_DECORATION_OPTIONS],
    },
  ],
};

const controlFrameSection = {
  id: 'frame',
  title: 'Border',
  scope: ['control' as const],
  priority: 25,
  fields: [
    selectField('border-style', 'Border', 'props.borderStyle', [...BORDER_STYLE_OPTIONS]),
  ],
};

const cardFrameSection = {
  id: 'frame',
  title: 'Border',
  scope: ['card' as const],
  priority: 25,
  fields: [
    selectField('control-border-style', 'Border', 'props.controlBorderStyle', [...BORDER_STYLE_OPTIONS]),
    switchField('children-follow-border', 'Internal follow', 'props.childrenFollowBorder'),
  ],
};

const controlCornerSection = {
  id: 'corner',
  title: 'Corner',
  scope: ['control' as const],
  priority: 26,
  defaultOpen: false,
  fields: [
    switchField('link-corners', 'Sync corners', 'props.linkCornerPresets'),
    selectField('corner-top-left', 'Top Left', 'props.cornerTopLeftPreset', [...CORNER_PRESET_OPTIONS]),
    selectField('corner-top-right', 'Top Right', 'props.cornerTopRightPreset', [...CORNER_PRESET_OPTIONS]),
    selectField('corner-bottom-left', 'Bottom Left', 'props.cornerBottomLeftPreset', [...CORNER_PRESET_OPTIONS]),
    selectField('corner-bottom-right', 'Bottom Right', 'props.cornerBottomRightPreset', [...CORNER_PRESET_OPTIONS]),
  ],
};

const cardCornerSection = {
  id: 'corner',
  title: 'Corner',
  scope: ['card' as const],
  priority: 26,
  defaultOpen: false,
  fields: [
    switchField('link-corners', 'Sync corners', 'props.linkCornerPresets'),
    selectField('corner-top-left', 'Top Left', 'props.cornerTopLeftPreset', [...CORNER_PRESET_OPTIONS]),
    selectField('corner-top-right', 'Top Right', 'props.cornerTopRightPreset', [...CORNER_PRESET_OPTIONS]),
    selectField('corner-bottom-left', 'Bottom Left', 'props.cornerBottomLeftPreset', [...CORNER_PRESET_OPTIONS]),
    selectField('corner-bottom-right', 'Bottom Right', 'props.cornerBottomRightPreset', [...CORNER_PRESET_OPTIONS]),
  ],
};

const handoffSection = {
  id: 'ai-handoff',
  title: 'Handoff',
  scope: ['control' as const, 'card' as const],
  priority: 90,
  fields: [
    textareaField('ai-handover', 'Handoff Notes', 'props.aiHandover', {
      placeholder: 'Describe what AI coding should mount, fetch, or connect here.',
    }),
  ],
};

const CONTROL_PROPERTY_GROUPS = [
  propertyGroup('content', 'Content', 'Business content and visible copy.'),
  propertyGroup('layout', 'Layout', 'Sizing, spacing, and parent-layout constraints.'),
  propertyGroup('appearance', 'Appearance', 'Typography, border, corner, and surface styling.'),
  propertyGroup('data', 'Data', 'Bindings, state keys, and field mapping.'),
  propertyGroup('logic', 'Logic', 'Actions, handoff, and runtime constraints.'),
];

const SHELL_PROPERTY_GROUPS = [
  propertyGroup('shell', 'Shell', 'Header, footer, overflow, and shell-level rules.'),
  propertyGroup('layout', 'Layout', 'Size, padding, gap, and auto-height behavior.'),
  propertyGroup('appearance', 'Appearance', 'Typography, border, corner, and child-follow styling.'),
  propertyGroup('data', 'Data', 'Slot policy and shell-level data contract.'),
  propertyGroup('logic', 'Logic', 'Actions, handoff, and shell constraints.'),
];

const control = (definition: ControlDefinitionInput): ControlDefinition => (
  ControlDefinitionSchema.parse({
    ...definition,
    propertyGroups: definition.propertyGroups?.length ? definition.propertyGroups : CONTROL_PROPERTY_GROUPS,
  })
);

const card = (definition: CardDefinitionInput): CardDefinition => (
  CardDefinitionSchema.parse({
    ...definition,
    propertyGroups: definition.propertyGroups?.length
      ? definition.propertyGroups
      : definition.base?.type === 'panel'
        ? SHELL_PROPERTY_GROUPS
        : CONTROL_PROPERTY_GROUPS,
  })
);

export const CONTROL_DEFINITIONS = [
  control({
    base: {
      id: 'control-heading',
      type: 'heading',
      layer: 'control',
      name: 'Heading',
      source: 'native',
      category: 'textual',
      description: 'A token-aware heading control.',
      stableKey: 'control-heading',
      contractRole: 'control.text.heading',
    },
    family: 'textual',
    widgetType: 'heading',
    defaultProps: {
      text: 'New Heading',
      size: 'md',
    },
    layoutDefaults: {
      w: 16,
      h: 3,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('heading-text', 'Heading', 'props.text'),
          selectField('heading-size', 'Size', 'props.size', [
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
            { label: 'Large', value: 'lg' },
          ]),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('heading', 'WidgetRegistry.heading', 'src/builder/registry.tsx'),
    export: exportSpec('heading'),
  }),
  control({
    base: {
      id: 'control-text',
      type: 'text',
      layer: 'control',
      name: 'Text',
      source: 'native',
      category: 'textual',
      description: 'A paragraph or helper text control.',
      stableKey: 'control-text',
      contractRole: 'control.text.paragraph',
    },
    family: 'textual',
    widgetType: 'text',
    defaultProps: {
      text: 'Enter your text here...',
    },
    layoutDefaults: {
      w: 16,
      h: 5,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textareaField('paragraph-content', 'Content', 'props.text'),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('text', 'WidgetRegistry.text', 'src/builder/registry.tsx'),
    export: exportSpec('text'),
  }),
  control({
    base: {
      id: 'control-text-input',
      type: 'text_input',
      layer: 'control',
      name: 'Text Input',
      source: 'native',
      category: 'form',
      description: 'A text input control with label, placeholder, and state key.',
      stableKey: 'control-text-input',
      contractRole: 'control.form.input',
    },
    family: 'form',
    widgetType: 'text_input',
    defaultProps: {
      label: 'Label',
      placeholder: 'Enter text...',
      chrome: 'ghost',
    },
    layoutDefaults: {
      w: 12,
      h: 4,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('field-label', 'Label', 'props.label'),
          textField('placeholder', 'Placeholder', 'props.placeholder'),
          textField('state-key', 'State Key', 'props.stateKey', {
            placeholder: 'form.contact.email',
          }),
        ],
      },
      {
        id: 'style',
        title: 'Style',
        scope: ['control'],
        priority: 30,
        fields: [
          selectField('chrome', 'Chrome', 'props.chrome', [
            { label: 'Ghost', value: 'ghost' },
            { label: 'Field', value: 'field' },
          ]),
          selectField('input-type', 'Type', 'props.type', [
            { label: 'Text', value: 'text' },
            { label: 'Email', value: 'email' },
            { label: 'Password', value: 'password' },
            { label: 'Search', value: 'search' },
          ]),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('text_input', 'WidgetRegistry.text_input', 'src/builder/registry.tsx', {
      supportsBindings: true,
      supportsActions: true,
    }),
    export: exportSpec('text_input'),
  }),
  control({
    base: {
      id: 'control-number-input',
      type: 'number_input',
      layer: 'control',
      name: 'Number Input',
      source: 'native',
      category: 'form',
      description: 'A numeric input control with label and state binding.',
      stableKey: 'control-number-input',
      contractRole: 'control.form.number-input',
    },
    family: 'form',
    widgetType: 'number_input',
    defaultProps: {
      label: 'Number',
      placeholder: '0',
      chrome: 'ghost',
    },
    layoutDefaults: {
      w: 12,
      h: 4,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('field-label', 'Label', 'props.label'),
          textField('placeholder', 'Placeholder', 'props.placeholder'),
          textField('state-key', 'State Key', 'props.stateKey', {
            placeholder: 'form.order.quantity',
          }),
        ],
      },
      {
        id: 'style',
        title: 'Style',
        scope: ['control'],
        priority: 30,
        fields: [
          selectField('chrome', 'Chrome', 'props.chrome', [
            { label: 'Ghost', value: 'ghost' },
            { label: 'Field', value: 'field' },
          ]),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('number_input', 'WidgetRegistry.number_input', 'src/builder/registry.tsx', {
      supportsBindings: true,
      supportsActions: true,
    }),
    export: exportSpec('number_input'),
  }),
  control({
    base: {
      id: 'control-textarea',
      type: 'textarea',
      layer: 'control',
      name: 'Textarea',
      source: 'native',
      category: 'form',
      description: 'A multiline text area control.',
      stableKey: 'control-textarea',
      contractRole: 'control.form.textarea',
    },
    family: 'form',
    widgetType: 'textarea',
    defaultProps: {
      label: 'Description',
      placeholder: 'Enter description...',
    },
    layoutDefaults: {
      w: 16,
      h: 6,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('field-label', 'Label', 'props.label'),
          textField('placeholder', 'Placeholder', 'props.placeholder'),
          textField('state-key', 'State Key', 'props.stateKey', {
            placeholder: 'form.feedback.notes',
          }),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('textarea', 'WidgetRegistry.textarea', 'src/builder/registry.tsx', {
      supportsBindings: true,
      supportsActions: true,
    }),
    export: exportSpec('textarea'),
  }),
  control({
    base: {
      id: 'control-select',
      type: 'select',
      layer: 'control',
      name: 'Select',
      source: 'native',
      category: 'form',
      description: 'A select control with label, placeholder, and state binding.',
      stableKey: 'control-select',
      contractRole: 'control.form.select',
    },
    family: 'form',
    widgetType: 'select',
    defaultProps: {
      label: 'Select',
      placeholder: 'Choose...',
    },
    layoutDefaults: {
      w: 12,
      h: 4,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('select-label', 'Label', 'props.label'),
          textField('select-placeholder', 'Placeholder', 'props.placeholder'),
          textField('state-key', 'State Key', 'props.stateKey', {
            placeholder: 'form.profile.role',
          }),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('select', 'WidgetRegistry.select', 'src/builder/registry.tsx', {
      supportsBindings: true,
      supportsActions: true,
    }),
    export: exportSpec('select'),
  }),
  control({
    base: {
      id: 'control-checkbox',
      type: 'checkbox',
      layer: 'control',
      name: 'Checkbox',
      source: 'native',
      category: 'form',
      description: 'A checkbox group control with label and options.',
      stableKey: 'control-checkbox',
      contractRole: 'control.form.checkbox',
    },
    family: 'form',
    widgetType: 'checkbox',
    defaultProps: {
      label: 'Choose options',
      direction: 'vertical',
    },
    layoutDefaults: {
      w: 12,
      h: 6,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('checkbox-label', 'Label', 'props.label'),
          textField('state-key', 'State Key', 'props.stateKey', {
            placeholder: 'form.preferences.channels',
          }),
        ],
      },
      {
        id: 'style',
        title: 'Style',
        scope: ['control'],
        priority: 30,
        fields: [
          selectField('direction', 'Direction', 'props.direction', [
            { label: 'Vertical', value: 'vertical' },
            { label: 'Horizontal', value: 'horizontal' },
          ]),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('checkbox', 'WidgetRegistry.checkbox', 'src/builder/registry.tsx', {
      supportsBindings: true,
      supportsActions: true,
    }),
    export: exportSpec('checkbox'),
  }),
  control({
    base: {
      id: 'control-radio',
      type: 'radio',
      layer: 'control',
      name: 'Radio',
      source: 'native',
      category: 'form',
      description: 'A radio group control with label and options.',
      stableKey: 'control-radio',
      contractRole: 'control.form.radio',
    },
    family: 'form',
    widgetType: 'radio',
    defaultProps: {
      label: 'Select one',
      direction: 'vertical',
    },
    layoutDefaults: {
      w: 12,
      h: 6,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('radio-label', 'Label', 'props.label'),
          textField('state-key', 'State Key', 'props.stateKey', {
            placeholder: 'form.plan.interval',
          }),
        ],
      },
      {
        id: 'style',
        title: 'Style',
        scope: ['control'],
        priority: 30,
        fields: [
          selectField('direction', 'Direction', 'props.direction', [
            { label: 'Vertical', value: 'vertical' },
            { label: 'Horizontal', value: 'horizontal' },
          ]),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('radio', 'WidgetRegistry.radio', 'src/builder/registry.tsx', {
      supportsBindings: true,
      supportsActions: true,
    }),
    export: exportSpec('radio'),
  }),
  control({
    base: {
      id: 'control-slot-shell',
      type: 'slot_shell',
      layer: 'control',
      name: 'Slot Shell',
      source: 'native',
      category: 'shell',
      description: 'The universal composition shell. Build rows, slots, and embed text / graphic / object atoms inside it.',
      stableKey: 'control-slot-shell',
      contractRole: 'control.shell.slot-shell',
    },
    family: 'structural',
    widgetType: 'slot_shell',
    defaultProps: {
      structureMode: 'single',
      shellShape: 'rect',
      shellBorderMode: 'solid',
      shellPaddingX: 12,
      shellPaddingY: 10,
      rowGap: 8,
      slotGap: 8,
    },
    layoutDefaults: {
      w: 12,
      h: 4,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      typographySection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('slot_shell', 'WidgetRegistry.slot_shell', 'src/builder/registry.tsx', {
      supportsBindings: true,
      supportsActions: true,
    }),
    export: exportSpec('slot_shell'),
    meta: {
      componentLayer: 'core-shell',
      compositionModel: 'slot-shell',
      p0Atoms: ['text', 'graphic', 'object'],
    },
  }),
  control({
    base: {
      id: 'control-icon',
      type: 'icon',
      layer: 'control',
      name: 'Icon',
      source: 'native',
      category: 'primitive',
      description: 'A P0 icon primitive that can be embedded into shells or card chrome.',
      stableKey: 'control-icon',
      contractRole: 'control.primitive.icon',
    },
    family: 'structural',
    widgetType: 'icon',
    defaultProps: {
      icon: 'Star',
      size: 'md',
      tone: 'default',
      strokeWidth: 2,
    },
    layoutDefaults: {
      w: 4,
      h: 3,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          selectField('icon', 'Icon', 'props.icon', [...ICON_OPTIONS]),
        ],
      },
      {
        id: 'style',
        title: 'Style',
        scope: ['control'],
        priority: 30,
        fields: [
          selectField('icon-size', 'Size', 'props.size', [
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
            { label: 'Large', value: 'lg' },
          ]),
          selectField('icon-tone', 'Tone', 'props.tone', [
            { label: 'Default', value: 'default' },
            { label: 'Muted', value: 'muted' },
            { label: 'Primary', value: 'primary' },
            { label: 'Success', value: 'success' },
            { label: 'Warning', value: 'warning' },
            { label: 'Danger', value: 'danger' },
          ]),
          numberField('icon-stroke-width', 'Stroke', 'props.strokeWidth', {
            meta: { min: 1, max: 3 },
          }),
        ],
      },
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('icon', 'WidgetRegistry.icon', 'src/builder/registry.tsx'),
    export: exportSpec('icon'),
    meta: {
      componentLayer: 'P0',
    },
  }),
  control({
    base: {
      id: 'control-icon-button',
      type: 'icon_button',
      layer: 'control',
      name: 'Icon Button',
      source: 'native',
      category: 'action',
      description: 'An icon-only action button.',
      stableKey: 'control-icon-button',
      contractRole: 'control.action.icon-button',
    },
    family: 'action',
    widgetType: 'icon_button',
    defaultProps: {
      icon: 'X',
      size: 'md',
      variant: 'ghost',
      tooltip: 'Close',
    },
    layoutDefaults: {
      w: 4,
      h: 3,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          selectField('icon', 'Icon', 'props.icon', [...ICON_OPTIONS]),
          textField('tooltip', 'Tooltip', 'props.tooltip'),
        ],
      },
      {
        id: 'style',
        title: 'Style',
        scope: ['control'],
        priority: 30,
        fields: [
          selectField('size', 'Size', 'props.size', [
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
            { label: 'Large', value: 'lg' },
          ]),
          selectField('variant', 'Variant', 'props.variant', [
            { label: 'Ghost', value: 'ghost' },
            { label: 'Outline', value: 'outline' },
            { label: 'Solid', value: 'solid' },
            { label: 'Danger', value: 'danger' },
          ]),
        ],
      },
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('icon_button', 'WidgetRegistry.icon_button', 'src/builder/registry.tsx', {
      supportsActions: true,
    }),
    export: exportSpec('icon_button'),
  }),
  control({
    base: {
      id: 'control-divider',
      type: 'divider',
      layer: 'control',
      name: 'Divider',
      source: 'native',
      category: 'structural',
      description: 'A structural divider with optional label.',
      stableKey: 'control-divider',
      contractRole: 'control.structure.divider',
    },
    family: 'structural',
    widgetType: 'divider',
    defaultProps: {
      direction: 'horizontal',
      color: 'default',
    },
    layoutDefaults: {
      w: 12,
      h: 2,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Divider',
        scope: ['control'],
        priority: 10,
        fields: [
          selectField('direction', 'Direction', 'props.direction', [
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Vertical', value: 'vertical' },
          ]),
          textField('label', 'Label', 'props.label'),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('divider', 'WidgetRegistry.divider', 'src/builder/registry.tsx'),
    export: exportSpec('divider'),
  }),
  control({
    base: {
      id: 'control-image',
      type: 'image',
      layer: 'control',
      name: 'Image',
      source: 'native',
      category: 'media',
      description: 'A single image or media placeholder control.',
      stableKey: 'control-image',
      contractRole: 'control.media.image',
    },
    family: 'structural',
    widgetType: 'image',
    defaultProps: {
      imageUrl: '',
      alt: 'Image',
      placeholder: 'Image',
      caption: '',
      fit: 'cover',
    },
    layoutDefaults: {
      w: 12,
      h: 8,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('image-url', 'Image URL', 'props.imageUrl'),
          textField('image-alt', 'Alt', 'props.alt'),
          textField('image-placeholder', 'Placeholder', 'props.placeholder'),
          textField('image-caption', 'Caption', 'props.caption'),
        ],
      },
      {
        id: 'style',
        title: 'Style',
        scope: ['control'],
        priority: 30,
        fields: [
          selectField('fit', 'Fit', 'props.fit', [...MEDIA_FIT_OPTIONS]),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('image', 'ImageWidget', 'src/components/patterns/PatternWidgets.tsx'),
    export: exportSpec('image'),
    meta: {
      componentLayer: 'P1',
      patternFamily: 'media',
    },
  }),
  control({
    base: {
      id: 'control-badge',
      type: 'badge',
      layer: 'control',
      name: 'Badge',
      source: 'native',
      category: 'state',
      description: 'A compact status or tag badge.',
      stableKey: 'control-badge',
      contractRole: 'control.state.badge',
    },
    family: 'structural',
    widgetType: 'badge',
    defaultProps: {
      text: 'Active',
      tone: 'primary',
      variant: 'soft',
    },
    layoutDefaults: {
      w: 5,
      h: 2,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('badge-text', 'Text', 'props.text'),
        ],
      },
      {
        id: 'style',
        title: 'Style',
        scope: ['control'],
        priority: 30,
        fields: [
          selectField('tone', 'Tone', 'props.tone', [...TONE_OPTIONS]),
          selectField('variant', 'Variant', 'props.variant', [...SOFT_SOLID_OPTIONS]),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('badge', 'BadgeWidget', 'src/components/patterns/PatternWidgets.tsx'),
    export: exportSpec('badge'),
    meta: {
      componentLayer: 'P1',
      patternFamily: 'state',
    },
  }),
  control({
    base: {
      id: 'control-checkbox-item',
      type: 'checkbox_item',
      layer: 'control',
      name: 'Checkbox Item',
      source: 'native',
      category: 'form',
      description: 'A single checkbox option as a P1 atomic control.',
      stableKey: 'control-checkbox-item',
      contractRole: 'control.form.checkbox-item',
    },
    family: 'form',
    widgetType: 'checkbox_item',
    defaultProps: {
      label: 'Accept terms',
      checked: true,
    },
    layoutDefaults: {
      w: 10,
      h: 3,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('checkbox-label', 'Label', 'props.label'),
          switchField('checked', 'Checked', 'props.checked'),
          textField('state-key', 'State Key', 'props.stateKey', {
            placeholder: 'form.acceptedTerms',
          }),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('checkbox_item', 'CheckboxItemWidget', 'src/components/patterns/PatternWidgets.tsx', {
      supportsBindings: true,
    }),
    export: exportSpec('checkbox_item'),
    meta: {
      componentLayer: 'P1',
      patternFamily: 'form',
    },
  }),
  control({
    base: {
      id: 'control-media-summary-card',
      type: 'media_summary_card',
      layer: 'control',
      name: 'Media Summary Card',
      source: 'native',
      category: 'media',
      description: 'A P2 thumbnail, title, description, and meta summary block.',
      stableKey: 'control-media-summary-card',
      contractRole: 'control.pattern.media-summary-card',
    },
    family: 'composite',
    widgetType: 'media_summary_card',
    defaultProps: {
      title: 'New product launch',
      description: 'A compact media summary with thumbnail, copy, and source metadata.',
      meta: 'Product · 4 min',
      thumbnailUrl: '',
      thumbnailLabel: 'Media',
      thumbnailFit: 'cover',
      mediaPosition: 'top',
    },
    layoutDefaults: {
      w: 16,
      h: 10,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('title', 'Title', 'props.title'),
          textareaField('description', 'Description', 'props.description'),
          textField('meta', 'Meta', 'props.meta'),
          textField('thumbnail-label', 'Thumbnail Label', 'props.thumbnailLabel'),
        ],
      },
      {
        id: 'media',
        title: 'Media',
        scope: ['control'],
        priority: 18,
        fields: [
          textField('thumbnail-url', 'Thumbnail URL', 'props.thumbnailUrl'),
          selectField('thumbnail-fit', 'Fit', 'props.thumbnailFit', [...MEDIA_FIT_OPTIONS]),
          selectField('media-position', 'Position', 'props.mediaPosition', [
            { label: 'Top', value: 'top' },
            { label: 'Left', value: 'left' },
          ]),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('media_summary_card', 'MediaSummaryCardWidget', 'src/components/patterns/PatternWidgets.tsx', {
      supportsBindings: true,
    }),
    export: exportSpec('media_summary_card'),
    meta: {
      componentLayer: 'P2',
      patternFamily: 'media',
    },
  }),
  control({
    base: {
      id: 'control-media-list-item',
      type: 'media_list_item',
      layer: 'control',
      name: 'Media List Item',
      source: 'native',
      category: 'media',
      description: 'A P2 horizontal media row with thumbnail, copy, and trailing action text.',
      stableKey: 'control-media-list-item',
      contractRole: 'control.pattern.media-list-item',
    },
    family: 'composite',
    widgetType: 'media_list_item',
    defaultProps: {
      title: 'Design systems in practice',
      secondaryText: '12 min · Updated today',
      trailingText: 'Open',
      thumbnailUrl: '',
      thumbnailLabel: 'Item',
      thumbnailFit: 'cover',
    },
    layoutDefaults: {
      w: 18,
      h: 5,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('title', 'Title', 'props.title'),
          textField('secondary-text', 'Secondary', 'props.secondaryText'),
          textField('trailing-text', 'Trailing', 'props.trailingText'),
          textField('thumbnail-label', 'Thumbnail Label', 'props.thumbnailLabel'),
        ],
      },
      {
        id: 'media',
        title: 'Media',
        scope: ['control'],
        priority: 18,
        fields: [
          textField('thumbnail-url', 'Thumbnail URL', 'props.thumbnailUrl'),
          selectField('thumbnail-fit', 'Fit', 'props.thumbnailFit', [...MEDIA_FIT_OPTIONS]),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('media_list_item', 'MediaListItemWidget', 'src/components/patterns/PatternWidgets.tsx', {
      supportsBindings: true,
      supportsActions: true,
    }),
    export: exportSpec('media_list_item'),
    meta: {
      componentLayer: 'P2',
      patternFamily: 'media',
    },
  }),
  control({
    base: {
      id: 'control-setting-row',
      type: 'setting_row',
      layer: 'control',
      name: 'Setting Row',
      source: 'native',
      category: 'setting',
      description: 'A P2 settings row with label, helper text, and compact trailing control.',
      stableKey: 'control-setting-row',
      contractRole: 'control.pattern.setting-row',
    },
    family: 'composite',
    widgetType: 'setting_row',
    defaultProps: {
      title: 'Email notifications',
      description: 'Send product and account updates.',
      controlKind: 'switch',
      enabled: true,
      value: 'On',
      actionLabel: 'Edit',
      tone: 'primary',
    },
    layoutDefaults: {
      w: 18,
      h: 5,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('title', 'Title', 'props.title'),
          textareaField('description', 'Description', 'props.description'),
          textField('value', 'Value', 'props.value'),
          textField('action-label', 'Action Label', 'props.actionLabel'),
        ],
      },
      {
        id: 'style',
        title: 'Style',
        scope: ['control'],
        priority: 30,
        fields: [
          selectField('control-kind', 'Trailing', 'props.controlKind', [
            { label: 'Switch', value: 'switch' },
            { label: 'Badge', value: 'badge' },
            { label: 'Button', value: 'button' },
          ]),
          switchField('enabled', 'Enabled', 'props.enabled'),
          selectField('tone', 'Tone', 'props.tone', [...TONE_OPTIONS]),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('setting_row', 'SettingRowWidget', 'src/components/patterns/PatternWidgets.tsx', {
      supportsBindings: true,
      supportsActions: true,
    }),
    export: exportSpec('setting_row'),
    meta: {
      componentLayer: 'P2',
      patternFamily: 'setting',
    },
  }),
  control({
    base: {
      id: 'control-choice-chip-group',
      type: 'choice_chip_group',
      layer: 'control',
      name: 'Choice Chip Group',
      source: 'native',
      category: 'selection',
      description: 'A P2 chip group for compact option selection.',
      stableKey: 'control-choice-chip-group',
      contractRole: 'control.pattern.choice-chip-group',
    },
    family: 'composite',
    widgetType: 'choice_chip_group',
    defaultProps: {
      label: 'Plan',
      optionsText: 'Starter, Pro, Enterprise',
      activeValue: 'Pro',
    },
    layoutDefaults: {
      w: 16,
      h: 5,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('label', 'Label', 'props.label'),
          textareaField('options', 'Options', 'props.optionsText', {
            placeholder: 'Starter, Pro, Enterprise',
          }),
          textField('active-value', 'Active Value', 'props.activeValue'),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('choice_chip_group', 'ChoiceChipGroupWidget', 'src/components/patterns/PatternWidgets.tsx', {
      supportsBindings: true,
      supportsActions: true,
    }),
    export: exportSpec('choice_chip_group'),
    meta: {
      componentLayer: 'P2',
      patternFamily: 'selection',
    },
  }),
  control({
    base: {
      id: 'control-empty-state-card',
      type: 'empty_state_card',
      layer: 'control',
      name: 'Empty State Card',
      source: 'native',
      category: 'state',
      description: 'A P2 empty-state block with icon, copy, and optional CTA.',
      stableKey: 'control-empty-state-card',
      contractRole: 'control.pattern.empty-state-card',
    },
    family: 'composite',
    widgetType: 'empty_state_card',
    defaultProps: {
      title: 'No results found',
      description: 'Try adjusting filters or create a new item.',
      actionLabel: 'Create item',
      iconLabel: '∅',
    },
    layoutDefaults: {
      w: 16,
      h: 10,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('title', 'Title', 'props.title'),
          textareaField('description', 'Description', 'props.description'),
          textField('action-label', 'Action Label', 'props.actionLabel'),
          textField('icon-label', 'Icon Label', 'props.iconLabel'),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('empty_state_card', 'EmptyStateCardWidget', 'src/components/patterns/PatternWidgets.tsx', {
      supportsBindings: true,
      supportsActions: true,
    }),
    export: exportSpec('empty_state_card'),
    meta: {
      componentLayer: 'P2',
      patternFamily: 'state',
    },
  }),
  control({
    base: {
      id: 'control-button',
      type: 'button',
      layer: 'control',
      name: 'Inline Shell',
      source: 'native',
      category: 'shell',
      description: 'A slot-based shell for icon, label, separator, and trailing content.',
      stableKey: 'control-button',
      contractRole: 'control.action.button',
    },
    family: 'action',
    widgetType: 'button',
    defaultProps: {
      labelText: 'Click Me',
      text: 'Click Me',
      variant: 'primary',
      leadingKind: 'none',
      leadingIcon: 'Plus',
      trailingKind: 'none',
      trailingText: 'STARTER',
      trailingIcon: 'ChevronRight',
      trailingTone: 'primary',
      layoutPreset: 'label-only',
      separatorStyle: 'none',
      slotGap: 8,
    },
    layoutDefaults: {
      w: 8,
      h: 3,
      minW: 2,
      minH: 1,
    },
    propertyGroups: [],
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['control'],
        priority: 10,
        fields: [
          textField('button-label', 'Label', 'props.labelText'),
        ],
      },
      {
        id: 'slots',
        title: 'Slots',
        scope: ['control'],
        priority: 20,
        fields: [
          selectField('layout-preset', 'Preset', 'props.layoutPreset', [
            { label: 'Label only', value: 'label-only' },
            { label: 'Icon + Label', value: 'leading-label' },
            { label: 'Label + Icon', value: 'label-leading' },
            { label: 'Label + Trailing', value: 'label-trailing' },
            { label: 'Icon + Label + Trailing', value: 'leading-label-trailing' },
            { label: 'Icon only', value: 'icon-only' },
          ]),
          selectField('leading-kind', 'Leading', 'props.leadingKind', [
            { label: 'None', value: 'none' },
            { label: 'Icon', value: 'icon' },
          ]),
          selectField('leading-icon', 'Leading Icon', 'props.leadingIcon', [...ICON_OPTIONS]),
          selectField('trailing-kind', 'Trailing', 'props.trailingKind', [
            { label: 'None', value: 'none' },
            { label: 'Text', value: 'text' },
            { label: 'Badge', value: 'badge' },
            { label: 'Icon', value: 'icon' },
          ]),
          textField('trailing-text', 'Trailing Text', 'props.trailingText'),
          selectField('trailing-icon', 'Trailing Icon', 'props.trailingIcon', [...ICON_OPTIONS]),
          selectField('trailing-tone', 'Trailing Tone', 'props.trailingTone', [...TONE_OPTIONS]),
          numberField('slot-gap', 'Slot Gap', 'props.slotGap', {
            meta: { min: 0, max: 24 },
          }),
        ],
      },
      {
        id: 'style',
        title: 'Style',
        scope: ['control'],
        priority: 30,
        fields: [
          selectField('variant', 'Variant', 'props.variant', [
            { label: 'Primary', value: 'primary' },
            { label: 'Secondary', value: 'secondary' },
            { label: 'Outline', value: 'outline' },
            { label: 'Ghost', value: 'ghost' },
          ]),
        ],
      },
      {
        id: 'separator',
        title: 'Separator',
        scope: ['control'],
        priority: 35,
        fields: [
          selectField('separator-style', 'Mode', 'props.separatorStyle', [
            { label: 'None', value: 'none' },
            { label: 'Pipe', value: 'pipe' },
            { label: 'Dot', value: 'dot' },
            { label: 'Slash', value: 'slash' },
          ]),
        ],
      },
      typographySection,
      controlFrameSection,
      controlCornerSection,
      layoutSection,
      handoffSection,
    ],
    themeSupport: commonThemeSupport,
    runtime: runtime('button', 'WidgetRegistry.button', 'src/builder/registry.tsx', {
      supportsActions: true,
    }),
    export: exportSpec('button'),
    meta: {
      componentLayer: 'P1',
      slotModel: 'leading-label-trailing',
    },
  }),
] satisfies ControlDefinition[];

export const CARD_DEFINITIONS = [
  card({
    base: {
      id: 'card-stat',
      type: 'stat',
      layer: 'card',
      name: 'Stat Card',
      source: 'native',
      category: 'data',
      description: 'A metric card for KPI display.',
      stableKey: 'card-stat',
      contractRole: 'card.data.stat',
    },
    shellType: 'card-shell',
    widgetType: 'stat',
    propertyGroups: [],
    slots: [],
    requiredControlFamilies: ['data'],
    defaultControlIds: [],
    themeSupport: commonThemeSupport,
    themePolicy: {
      mode: 'inherited',
      allowControlOverrides: true,
      aliasTokens: ['--theme-panel', '--theme-primary', '--theme-text'],
      localPatch: {},
    },
    dataContract: {
      expectedBindings: ['title', 'value', 'trend'],
      requiredFields: ['title', 'value'],
      emptyContract: 'Show a placeholder metric label and muted empty value.',
      errorContract: 'Show metric loading or error state without breaking card layout.',
    },
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['card'],
        priority: 10,
        fields: [
          textField('title', 'Title', 'props.title'),
          textField('value', 'Value', 'props.value'),
          textField('trend', 'Trend', 'props.trend'),
        ],
      },
      typographySection,
      handoffSection,
    ],
    runtime: runtime('stat', 'WidgetRegistry.stat', 'src/builder/registry.tsx'),
    export: exportSpec('stat', 'card'),
  }),
  card({
    base: {
      id: 'card-chart',
      type: 'chart',
      layer: 'card',
      name: 'Chart Card',
      source: 'recharts',
      category: 'data',
      description: 'A time-series or trend chart card.',
      stableKey: 'card-chart',
      contractRole: 'card.data.chart',
    },
    shellType: 'card-shell',
    widgetType: 'chart',
    propertyGroups: [],
    slots: [],
    requiredControlFamilies: ['data'],
    defaultControlIds: [],
    themeSupport: commonThemeSupport,
    themePolicy: {
      mode: 'derived',
      allowControlOverrides: true,
      aliasTokens: ['--theme-panel', '--theme-primary', '--theme-text'],
      localPatch: {},
    },
    dataContract: {
      expectedBindings: ['title', 'value', 'trend', 'series'],
      requiredFields: ['title', 'series'],
      emptyContract: 'Show an empty chart placeholder when no data is bound.',
      errorContract: 'Show chart fetch errors inside the card without collapsing layout.',
    },
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['card'],
        priority: 10,
        fields: [
          textField('title', 'Title', 'props.title'),
          textField('value', 'Value', 'props.value'),
          textField('trend', 'Trend', 'props.trend'),
          selectField('variant', 'Chart Style', 'props.variant', [
            { label: 'Line', value: 'line' },
            { label: 'Area', value: 'area' },
          ]),
        ],
      },
      typographySection,
      handoffSection,
    ],
    runtime: runtime('chart', 'WidgetRegistry.chart', 'src/builder/registry.tsx', {
      supportsBindings: true,
    }),
    export: exportSpec('chart', 'card', 'source-bridge'),
  }),
  card({
    base: {
      id: 'card-calendar',
      type: 'calendar',
      layer: 'card',
      name: 'Calendar Card',
      source: 'react-day-picker',
      category: 'content',
      description: 'A calendar surface for archive or scheduling flows.',
      stableKey: 'card-calendar',
      contractRole: 'card.content.calendar',
    },
    shellType: 'card-shell',
    widgetType: 'calendar',
    propertyGroups: [],
    slots: [],
    requiredControlFamilies: ['data'],
    defaultControlIds: [],
    themeSupport: commonThemeSupport,
    themePolicy: {
      mode: 'derived',
      allowControlOverrides: true,
      aliasTokens: ['--theme-panel', '--theme-border', '--theme-text'],
      localPatch: {},
    },
    dataContract: {
      expectedBindings: ['month', 'selectedDate'],
      requiredFields: ['month'],
      emptyContract: 'Show the current month view when there is no bound date state.',
      errorContract: 'Show calendar loading or parsing errors without crashing the card.',
    },
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['card'],
        priority: 10,
        fields: [
          textField('title', 'Title', 'props.title'),
          textField('subtitle', 'Subtitle', 'props.subtitle'),
          textField('month', 'Month', 'props.month', {
            placeholder: '2026-04-01',
          }),
          textField('selected-date', 'Selected Date', 'props.selectedDate', {
            placeholder: '2026-04-14',
          }),
        ],
      },
      typographySection,
      handoffSection,
    ],
    runtime: runtime('calendar', 'WidgetRegistry.calendar', 'src/builder/registry.tsx', {
      supportsBindings: true,
      supportsActions: true,
    }),
    export: exportSpec('calendar', 'card', 'source-bridge'),
  }),
  card({
    base: {
      id: 'card-panel-shell',
      type: 'panel',
      layer: 'card',
      name: 'Card Shell',
      source: 'native',
      category: 'foundation',
      description: 'A card shell with header and nested slot content.',
      stableKey: 'card-panel-shell',
      contractRole: 'card.shell',
    },
    shellType: 'card-shell',
    widgetType: 'panel',
    propertyGroups: [],
    slots: [
      {
        id: 'content',
        label: 'Content',
        required: false,
        acceptedFamilies: ['textual', 'action', 'form', 'data', 'structural', 'composite'],
      },
    ],
    requiredControlFamilies: [],
    defaultControlIds: [],
    themeSupport: commonThemeSupport,
    themePolicy: {
      mode: 'inherited',
      allowControlOverrides: true,
      aliasTokens: ['--theme-panel', '--theme-border', '--theme-radius-panel'],
    },
    dataContract: {
      expectedBindings: [],
      requiredFields: [],
      emptyContract: '',
      errorContract: '',
    },
    inspector: [
      {
        id: 'header',
        title: 'Header',
        scope: ['card'],
        priority: 10,
        collapsible: false,
        meta: {
          toggleFieldId: 'show-header',
        },
        fields: [
          switchField('show-header', 'Show Header', 'props.showHeader'),
          textField('title', 'Header Text', 'props.title'),
        ],
      },
      {
        id: 'footer',
        title: 'Footer',
        scope: ['card'],
        priority: 11,
        collapsible: false,
        meta: {
          toggleFieldId: 'show-footer',
        },
        fields: [
          switchField('show-footer', 'Show Footer', 'props.showFooter'),
          textField('footer-text', 'Footer Text', 'props.footerText'),
        ],
      },
      typographySection,
      cardFrameSection,
      cardCornerSection,
      {
        id: 'overflow',
        title: 'Overflow',
        scope: ['card'],
        priority: 20,
        collapsible: false,
        meta: {
          toggleFieldId: 'scrollbar',
        },
        fields: [
          switchField('scrollbar', 'Enable Scrollbar', 'props.scrollable', {
            description: 'Off means the card shell grows with its inner content instead of scrolling.',
          }),
        ],
      },
      {
        id: 'spacing',
        title: 'Spacing',
        scope: ['card'],
        priority: 30,
        fields: [
          switchField('padding-horizontal-link', 'Horizontal Same', 'props.linkHorizontalPadding', {
            description: 'Keep left and right padding in sync.',
          }),
          numberField('padding-left', 'Padding Left', 'props.paddingLeft', {
            description: 'Left inner padding in px.',
            meta: { min: 0 },
          }),
          numberField('padding-right', 'Padding Right', 'props.paddingRight', {
            description: 'Right inner padding in px.',
            meta: { min: 0 },
          }),
          switchField('padding-vertical-link', 'Vertical Same', 'props.linkVerticalPadding', {
            description: 'Keep top and bottom padding in sync.',
          }),
          numberField('padding-top', 'Padding Top', 'props.paddingTop', {
            description: 'Top inner padding in px.',
            meta: { min: 0 },
          }),
          numberField('padding-bottom', 'Padding Bottom', 'props.paddingBottom', {
            description: 'Bottom inner padding in px.',
            meta: { min: 0 },
          }),
          numberField('gap', 'Gap', 'props.gap', {
            description: 'Spacing between controls in px.',
            meta: { min: 0 },
          }),
        ],
      },
      handoffSection,
    ],
    runtime: runtime('panel', 'WidgetRegistry.panel', 'src/builder/registry.tsx', {
      acceptsChildren: true,
    }),
    export: exportSpec('panel', 'card'),
  }),
  card({
    base: {
      id: 'card-shadcn-login',
      type: 'shadcn_login_card',
      layer: 'card',
      name: 'Login Card',
      source: 'shadcn',
      category: 'form',
      description: 'A shadcn-inspired login card adapted into the platform card contract.',
      stableKey: 'card-shadcn-login',
      contractRole: 'card.auth.login',
      aiHandover: 'Map this login card to a real auth provider, validation flow, and post-login route.',
    },
    shellType: 'card-shell',
    widgetType: 'shadcn_login_card',
    propertyGroups: [],
    slots: [],
    requiredControlFamilies: ['form', 'action'],
    defaultControlIds: [],
    themeSupport: commonThemeSupport,
    themePolicy: {
      mode: 'derived',
      allowControlOverrides: true,
      aliasTokens: ['--theme-panel', '--theme-border', '--theme-primary', '--theme-radius-panel'],
    },
    dataContract: {
      expectedBindings: ['email', 'password'],
      requiredFields: ['email', 'password'],
      emptyContract: 'Show validation messages for required email and password fields.',
      errorContract: 'Show auth errors in the card body without browser alert dialogs.',
    },
    inspector: [
      {
        id: 'content',
        title: 'Content',
        scope: ['card'],
        priority: 10,
        fields: [
          textField('title', 'Title', 'props.title'),
          textareaField('description', 'Description', 'props.description'),
          textField('primary-action', 'Primary Action', 'props.actionLabel'),
          textField('secondary-action', 'Secondary Action', 'props.secondaryActionLabel'),
          textField('alternate-action', 'Alternate Action', 'props.alternateActionLabel'),
        ],
      },
      typographySection,
      handoffSection,
    ],
    runtime: runtime('shadcn_login_card', 'ShadcnLoginCardWidget', 'src/components/community/ShadcnLoginCardWidget.tsx', {
      supportsActions: true,
    }),
    export: exportSpec('shadcn_login_card', 'card', 'source-bridge'),
    sourceMeta: {
      sourceComponentName: 'Card login example',
      sourceRegistry: 'shadcn/ui',
      sourceUrl: 'https://ui.shadcn.com/docs/components/card',
      adaptationStatus: 'experimental',
    },
  }),
] satisfies CardDefinition[];

const widgetDefinitions = [...CONTROL_DEFINITIONS, ...CARD_DEFINITIONS] as const;

const isShadcnLoginCompositeWidget = (
  widget: Pick<WidgetData, 'type' | 'props'>,
) => (
  widget.type === 'shadcn_login_card'
  || widget.props?.contractKey === 'shadcn.card.login.v1'
  || widget.props?.sourceTemplateId === 'card_shadcn_login'
  || widget.props?.kitTemplateName === 'Shadcn Login Card'
  || widget.props?.sourceTemplateName === 'Shadcn Login Card'
);

export const getStudioWidgetDefinition = (
  widget: Pick<WidgetData, 'type' | 'props'> | WidgetType | string,
): StudioWidgetDefinition | null => {
  if (typeof widget === 'string') {
    return widgetDefinitions.find((definition) => definition.base.type === widget) ?? null;
  }

  if (isShadcnLoginCompositeWidget(widget)) {
    return widgetDefinitions.find((definition) => definition.base.type === 'shadcn_login_card') ?? null;
  }

  return widgetDefinitions.find((definition) => definition.base.type === widget.type) ?? null;
};

export type { StudioWidgetDefinition };
