import { z } from 'zod';
import {
  DataBindingSchema,
  NodeActionSchema,
  WidgetTypeSchema,
} from '../../schema/project';
import { BuilderThemeIdSchema } from '../../theme/schema';
import { InspectorSectionDefinitionSchema } from './inspector';

const KebabCaseTokenSchema = z.string().regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Expected a kebab-case token',
);

export const StudioNodeSourceSchema = z.enum([
  'native',
  'shadcn',
  'react-day-picker',
  'recharts',
  'custom',
]);

export const StudioNodeLayerSchema = z.enum([
  'control',
  'card',
  'kit-shell',
  'slot',
]);

export const ControlFamilySchema = z.enum([
  'textual',
  'action',
  'form',
  'data',
  'structural',
  'composite',
  'custom',
]);

export const AdaptationStatusSchema = z.enum([
  'draft',
  'experimental',
  'review',
  'published',
  'deprecated',
]);

export const StudioNodeBaseSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  layer: StudioNodeLayerSchema,
  name: z.string().min(1),
  source: StudioNodeSourceSchema,
  category: z.string().min(1),
  description: z.string().optional(),
  version: z.string().optional(),
  stableKey: KebabCaseTokenSchema.optional(),
  contractRole: z.string().optional(),
  contractKey: z.string().optional(),
  aiHandover: z.string().optional(),
});

export const PropertyValueKindSchema = z.enum([
  'string',
  'number',
  'boolean',
  'enum',
  'array',
  'object',
  'color-token',
  'theme-token',
  'binding',
  'action',
  'rich-text',
  'unknown',
]);

export const PropertyOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  description: z.string().optional(),
});

export const PropertyDefinitionSchema = z.object({
  id: KebabCaseTokenSchema,
  label: z.string().min(1),
  valueKind: PropertyValueKindSchema,
  path: z.string().min(1),
  required: z.boolean().default(false),
  description: z.string().optional(),
  defaultValue: z.unknown().optional(),
  options: z.array(PropertyOptionSchema).default([]),
  allowOverride: z.boolean().default(true),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export const PropertyGroupDefinitionSchema = z.object({
  id: KebabCaseTokenSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(PropertyDefinitionSchema).default([]),
});

export const ControlLayoutDefaultsSchema = z.object({
  w: z.number().int().positive().optional(),
  h: z.number().int().positive().optional(),
  minW: z.number().int().positive().optional(),
  minH: z.number().int().positive().optional(),
  autoOccupyRow: z.boolean().optional(),
});

export const ThemeSupportSchema = z.object({
  inheritsProjectTokens: z.boolean().default(true),
  supportsGlobalTokens: z.boolean().default(true),
  supportsLocalOverrides: z.boolean().default(true),
  supportedTokenRefs: z.array(z.string().min(1)).default([]),
  defaultThemeId: BuilderThemeIdSchema.optional(),
});

export const RuntimeRendererSpecSchema = z.object({
  rendererKey: z.string().min(1),
  sourceComponent: z.string().min(1),
  importPath: z.string().min(1),
  acceptsChildren: z.boolean().default(false),
  supportsBindings: z.boolean().default(false),
  supportsActions: z.boolean().default(false),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export const ExportRendererSpecSchema = z.object({
  rendererKey: z.string().min(1),
  exportType: z.enum(['control', 'card', 'slot']),
  codegenStrategy: z.enum(['native', 'adapter', 'source-bridge']),
  runtimeComponentKey: z.string().min(1),
  needsAdapterLayer: z.boolean().default(false),
  notes: z.string().default(''),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export const AdaptationSourceMetaSchema = z.object({
  sourceComponentName: z.string().optional(),
  sourceRegistry: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  importedAt: z.string().datetime().optional(),
  adaptationStatus: AdaptationStatusSchema.default('draft'),
});

export const ControlDefinitionSchema = z.object({
  base: StudioNodeBaseSchema.extend({
    layer: z.literal('control'),
  }),
  family: ControlFamilySchema,
  widgetType: WidgetTypeSchema.optional(),
  propertyGroups: z.array(PropertyGroupDefinitionSchema).default([]),
  defaultProps: z.record(z.string(), z.unknown()).default({}),
  layoutDefaults: ControlLayoutDefaultsSchema.default({}),
  bindings: z.array(DataBindingSchema).default([]),
  actions: z.array(NodeActionSchema).default([]),
  inspector: z.array(InspectorSectionDefinitionSchema).default([]),
  themeSupport: ThemeSupportSchema,
  runtime: RuntimeRendererSpecSchema,
  export: ExportRendererSpecSchema,
  sourceMeta: AdaptationSourceMetaSchema.default({
    adaptationStatus: 'draft',
  }),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export type StudioNodeSource = z.infer<typeof StudioNodeSourceSchema>;
export type StudioNodeLayer = z.infer<typeof StudioNodeLayerSchema>;
export type ControlFamily = z.infer<typeof ControlFamilySchema>;
export type AdaptationStatus = z.infer<typeof AdaptationStatusSchema>;
export type StudioNodeBase = z.infer<typeof StudioNodeBaseSchema>;
export type PropertyValueKind = z.infer<typeof PropertyValueKindSchema>;
export type PropertyOption = z.infer<typeof PropertyOptionSchema>;
export type PropertyDefinition = z.infer<typeof PropertyDefinitionSchema>;
export type PropertyGroupDefinition = z.infer<typeof PropertyGroupDefinitionSchema>;
export type ControlLayoutDefaults = z.infer<typeof ControlLayoutDefaultsSchema>;
export type ThemeSupport = z.infer<typeof ThemeSupportSchema>;
export type RuntimeRendererSpec = z.infer<typeof RuntimeRendererSpecSchema>;
export type ExportRendererSpec = z.infer<typeof ExportRendererSpecSchema>;
export type AdaptationSourceMeta = z.infer<typeof AdaptationSourceMetaSchema>;
export type ControlDefinition = z.infer<typeof ControlDefinitionSchema>;
