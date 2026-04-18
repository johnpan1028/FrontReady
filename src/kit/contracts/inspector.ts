import { z } from 'zod';

const KebabCaseTokenSchema = z.string().regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Expected a kebab-case token',
);

export const InspectorContextScopeSchema = z.enum([
  'workspace',
  'card',
  'control',
  'slot',
  'adapter',
]);

export const InspectorFieldKindSchema = z.enum([
  'text',
  'textarea',
  'number',
  'select',
  'segmented',
  'switch',
  'checkbox',
  'color',
  'token',
  'json',
  'binding-list',
  'action-list',
  'readonly',
]);

export const InspectorFieldValueModeSchema = z.enum([
  'inherit',
  'default',
  'custom',
]);

export const InspectorVisibilityOperatorSchema = z.enum([
  'equals',
  'not-equals',
  'in',
  'not-in',
  'truthy',
  'falsy',
]);

export const InspectorFieldOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  description: z.string().optional(),
});

export const InspectorVisibilityConditionSchema = z.object({
  path: z.string().min(1),
  operator: InspectorVisibilityOperatorSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
  ]).optional(),
});

export const InspectorFieldDefinitionSchema = z.object({
  id: KebabCaseTokenSchema,
  label: z.string().min(1),
  kind: InspectorFieldKindSchema,
  path: z.string().min(1),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  readOnly: z.boolean().default(false),
  supportsInheritMode: z.boolean().default(false),
  defaultMode: InspectorFieldValueModeSchema.optional(),
  options: z.array(InspectorFieldOptionSchema).default([]),
  visibility: z.array(InspectorVisibilityConditionSchema).default([]),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export const InspectorSectionDefinitionSchema = z.object({
  id: KebabCaseTokenSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  scope: z.array(InspectorContextScopeSchema).min(1),
  priority: z.number().int().min(0).default(100),
  collapsible: z.boolean().default(true),
  defaultOpen: z.boolean().default(true),
  fields: z.array(InspectorFieldDefinitionSchema).default([]),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export type InspectorContextScope = z.infer<typeof InspectorContextScopeSchema>;
export type InspectorFieldKind = z.infer<typeof InspectorFieldKindSchema>;
export type InspectorFieldValueMode = z.infer<typeof InspectorFieldValueModeSchema>;
export type InspectorFieldOption = z.infer<typeof InspectorFieldOptionSchema>;
export type InspectorVisibilityCondition = z.infer<typeof InspectorVisibilityConditionSchema>;
export type InspectorFieldDefinition = z.infer<typeof InspectorFieldDefinitionSchema>;
export type InspectorSectionDefinition = z.infer<typeof InspectorSectionDefinitionSchema>;
