import { z } from 'zod';

export const BUILDER_THEME_IDS = [
  'warm-neutral',
  'graphite-dashboard',
  'cobalt-signal',
  'paper-editorial',
] as const;

export const BUILDER_THEME_CATEGORIES = [
  'Balanced',
  'Dashboard',
  'Signal',
  'Editorial',
] as const;

export const BUILDER_THEME_TOKEN_KEYS = [
  'bg',
  'panel',
  'border',
  'text',
  'muted',
  'primary',
  'success',
  'danger',
  'warning',
] as const;

export type BuilderPresetThemeId = (typeof BUILDER_THEME_IDS)[number];
export type BuilderThemeId = string;
export type BuilderThemeCategory = (typeof BUILDER_THEME_CATEGORIES)[number];
export type BuilderThemeTokenKey = (typeof BUILDER_THEME_TOKEN_KEYS)[number];

export const DEFAULT_BUILDER_THEME_ID: BuilderPresetThemeId = 'warm-neutral';

const HexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, 'Expected a hex color');

export const BuilderThemeIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a kebab-case theme id');
export const BuilderThemeCategorySchema = z.enum(BUILDER_THEME_CATEGORIES);
export const BuilderThemeSourceKindSchema = z.enum([
  'handcrafted',
  'official-reference',
  'community-reference',
]);
export const BuilderThemeLightnessSchema = z.enum(['light', 'dark']);
export const BuilderThemeImportStrategySchema = z.enum(['direct', 'derived']);

export const BuilderThemeTokensSchema = z.object({
  bg: HexColorSchema,
  panel: HexColorSchema,
  border: HexColorSchema,
  text: HexColorSchema,
  muted: HexColorSchema,
  primary: HexColorSchema,
  success: HexColorSchema,
  danger: HexColorSchema,
  warning: HexColorSchema,
});

export const BuilderThemeTypographySchema = z.object({
  fontFamily: z.string().min(1),
  headingWeight: z.number().int().min(400).max(900),
  bodySize: z.number().min(12).max(20),
});

export const BuilderThemeShapeSchema = z.object({
  panelRadius: z.number().min(0).max(32),
  controlRadius: z.number().min(0).max(32),
  panelShadow: z.string().min(1),
  panelHoverShadow: z.string().min(1),
});

export const BuilderThemeReferenceSchema = z.object({
  kind: BuilderThemeSourceKindSchema,
  label: z.string().min(1),
  url: z.string().url().optional(),
  notes: z.string().default(''),
});

export const BuilderThemeSourceSchema = z.object({
  kind: BuilderThemeSourceKindSchema,
  label: z.string().min(1),
  url: z.string().url().optional(),
  notes: z.string().default(''),
  references: z.array(BuilderThemeReferenceSchema).default([]),
});

export const BuilderThemeImportPolicySchema = z.object({
  strategy: BuilderThemeImportStrategySchema.default('derived'),
  userFacingBranding: z.enum(['generic', 'official']).default('generic'),
  notes: z.string().default(''),
});

export const BuilderThemeGuidanceSchema = z.object({
  lightness: BuilderThemeLightnessSchema,
  bestFor: z.array(z.string().min(1)).default([]),
  avoidFor: z.array(z.string().min(1)).default([]),
});

export const BuilderThemeManifestSchema = z.object({
  id: BuilderThemeIdSchema,
  name: z.string().min(1),
  category: BuilderThemeCategorySchema,
  description: z.string().min(1),
  tokens: BuilderThemeTokensSchema,
  typography: BuilderThemeTypographySchema,
  shape: BuilderThemeShapeSchema,
  source: BuilderThemeSourceSchema,
  importPolicy: BuilderThemeImportPolicySchema.default({
    strategy: 'derived',
    userFacingBranding: 'generic',
    notes: '',
  }),
  guidance: BuilderThemeGuidanceSchema,
});

export type BuilderThemeTokens = z.infer<typeof BuilderThemeTokensSchema>;
export type BuilderThemeTypography = z.infer<typeof BuilderThemeTypographySchema>;
export type BuilderThemeShape = z.infer<typeof BuilderThemeShapeSchema>;
export type BuilderThemeSourceKind = z.infer<typeof BuilderThemeSourceKindSchema>;
export type BuilderThemeReference = z.infer<typeof BuilderThemeReferenceSchema>;
export type BuilderThemeSource = z.infer<typeof BuilderThemeSourceSchema>;
export type BuilderThemeImportPolicy = z.infer<typeof BuilderThemeImportPolicySchema>;
export type BuilderThemeGuidance = z.infer<typeof BuilderThemeGuidanceSchema>;
export type BuilderThemeManifest = z.infer<typeof BuilderThemeManifestSchema>;
export type BuilderThemePreset = BuilderThemeManifest;
