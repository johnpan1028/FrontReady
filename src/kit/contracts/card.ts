import { z } from 'zod';
import { WidgetTypeSchema } from '../../schema/project';
import {
  AdaptationSourceMetaSchema,
  ControlFamilySchema,
  ExportRendererSpecSchema,
  PropertyGroupDefinitionSchema,
  RuntimeRendererSpecSchema,
  StudioNodeBaseSchema,
  ThemeSupportSchema,
} from './control';
import { InspectorSectionDefinitionSchema } from './inspector';

const KebabCaseTokenSchema = z.string().regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Expected a kebab-case token',
);

export const CardShellTypeSchema = z.enum([
  'card-shell',
  'panel-shell',
  'overlay-shell',
  'custom',
]);

export const CardThemePolicyModeSchema = z.enum([
  'inherited',
  'derived',
  'isolated',
]);

export const CardSlotDefinitionSchema = z.object({
  id: KebabCaseTokenSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().default(false),
  acceptedTypes: z.array(z.string().min(1)).default([]),
  acceptedFamilies: z.array(ControlFamilySchema).default([]),
  minChildren: z.number().int().min(0).default(0),
  maxChildren: z.number().int().positive().optional(),
  defaultChildren: z.array(z.string().min(1)).default([]),
});

export const CardThemePolicySchema = z.object({
  mode: CardThemePolicyModeSchema.default('inherited'),
  allowControlOverrides: z.boolean().default(true),
  aliasTokens: z.array(z.string().min(1)).default([]),
  localPatch: z.record(z.string(), z.unknown()).default({}),
});

export const CardDataContractSchema = z.object({
  expectedBindings: z.array(z.string().min(1)).default([]),
  requiredFields: z.array(z.string().min(1)).default([]),
  emptyContract: z.string().default(''),
  errorContract: z.string().default(''),
});

export const CardDefinitionSchema = z.object({
  base: StudioNodeBaseSchema.extend({
    layer: z.literal('card'),
  }),
  shellType: CardShellTypeSchema,
  widgetType: WidgetTypeSchema.optional(),
  propertyGroups: z.array(PropertyGroupDefinitionSchema).default([]),
  slots: z.array(CardSlotDefinitionSchema).default([]),
  requiredControlFamilies: z.array(ControlFamilySchema).default([]),
  defaultControlIds: z.array(z.string().min(1)).default([]),
  themeSupport: ThemeSupportSchema,
  themePolicy: CardThemePolicySchema,
  dataContract: CardDataContractSchema,
  inspector: z.array(InspectorSectionDefinitionSchema).default([]),
  runtime: RuntimeRendererSpecSchema,
  export: ExportRendererSpecSchema,
  sourceMeta: AdaptationSourceMetaSchema.default({
    adaptationStatus: 'draft',
  }),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export type CardShellType = z.infer<typeof CardShellTypeSchema>;
export type CardThemePolicyMode = z.infer<typeof CardThemePolicyModeSchema>;
export type CardSlotDefinition = z.infer<typeof CardSlotDefinitionSchema>;
export type CardThemePolicy = z.infer<typeof CardThemePolicySchema>;
export type CardDataContract = z.infer<typeof CardDataContractSchema>;
export type CardDefinition = z.infer<typeof CardDefinitionSchema>;
