import type { z } from 'zod';
import type { WidgetType } from '../../builder/widgetConfig';
import type { WidgetData } from '../../store/builderStore';
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
          selectField('icon', 'Icon', 'props.icon', [
            { label: 'X', value: 'X' },
            { label: 'Settings', value: 'Settings' },
            { label: 'Trash', value: 'Trash2' },
            { label: 'Plus', value: 'Plus' },
            { label: 'Search', value: 'Search' },
            { label: 'Menu', value: 'Menu' },
          ]),
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
      id: 'control-button',
      type: 'button',
      layer: 'control',
      name: 'Button',
      source: 'native',
      category: 'action',
      description: 'A token-aware action button control.',
      stableKey: 'control-button',
      contractRole: 'control.action.button',
    },
    family: 'action',
    widgetType: 'button',
    defaultProps: {
      text: 'Click Me',
      variant: 'primary',
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
          textField('button-label', 'Label', 'props.text'),
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
