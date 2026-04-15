import {
  BUILDER_THEME_TOKEN_KEYS,
  BuilderThemeManifestSchema,
  type BuilderThemeManifest,
  type BuilderThemeGuidance,
  type BuilderThemeImportPolicy,
  type BuilderThemePreset,
  type BuilderThemeShape,
  type BuilderThemeSource,
  type BuilderThemeTokenKey,
  type BuilderThemeTokens,
  type BuilderThemeTypography,
} from './schema';

const normalizeHex = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith('#') ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`;
};

const normalizeThemeTokens = (tokens: BuilderThemeTokens): BuilderThemeTokens => {
  const nextTokens = {} as BuilderThemeTokens;

  BUILDER_THEME_TOKEN_KEYS.forEach((tokenKey: BuilderThemeTokenKey) => {
    nextTokens[tokenKey] = normalizeHex(tokens[tokenKey]);
  });

  return nextTokens;
};

const normalizeTypography = (typography: BuilderThemeTypography): BuilderThemeTypography => ({
  fontFamily: typography.fontFamily.trim(),
  headingWeight: typography.headingWeight,
  bodySize: typography.bodySize,
});

const normalizeShape = (shape: BuilderThemeShape): BuilderThemeShape => ({
  panelRadius: shape.panelRadius,
  controlRadius: shape.controlRadius,
  panelShadow: shape.panelShadow.trim(),
  panelHoverShadow: shape.panelHoverShadow.trim(),
});

type BuilderThemeManifestPatch = {
  id?: string;
  name?: string;
  description?: string;
  category?: BuilderThemeManifest['category'];
  tokens?: Partial<BuilderThemeTokens>;
  typography?: Partial<BuilderThemeTypography>;
  shape?: Partial<BuilderThemeShape>;
  source?: Partial<BuilderThemeSource> & {
    references?: BuilderThemeSource['references'];
    url?: string | null;
  };
  importPolicy?: Partial<BuilderThemeImportPolicy>;
  guidance?: Partial<BuilderThemeGuidance>;
};

const mergeGuidance = (
  current: BuilderThemeGuidance,
  patch?: Partial<BuilderThemeGuidance>,
): BuilderThemeGuidance => ({
  lightness: patch?.lightness ?? current.lightness,
  bestFor: patch?.bestFor ?? current.bestFor,
  avoidFor: patch?.avoidFor ?? current.avoidFor,
});

const mergeSource = (
  current: BuilderThemeSource,
  patch?: BuilderThemeManifestPatch['source'],
): BuilderThemeSource => ({
  kind: patch?.kind ?? current.kind,
  label: patch?.label ?? current.label,
  url: patch?.url === null ? undefined : patch?.url ?? current.url,
  notes: patch?.notes ?? current.notes,
  references: patch?.references ?? current.references,
});

const mergeImportPolicy = (
  current: BuilderThemeImportPolicy,
  patch?: Partial<BuilderThemeImportPolicy>,
): BuilderThemeImportPolicy => ({
  strategy: patch?.strategy ?? current.strategy,
  userFacingBranding: patch?.userFacingBranding ?? current.userFacingBranding,
  notes: patch?.notes ?? current.notes,
});

export const compileBuilderThemePreset = (manifest: BuilderThemeManifest): BuilderThemePreset => {
  const parsed = BuilderThemeManifestSchema.parse(manifest);

  return BuilderThemeManifestSchema.parse({
    ...parsed,
    name: parsed.name.trim(),
    description: parsed.description.trim(),
    source: {
      ...parsed.source,
      label: parsed.source.label.trim(),
      notes: parsed.source.notes.trim(),
      references: parsed.source.references.map((reference) => ({
        ...reference,
        label: reference.label.trim(),
        notes: reference.notes.trim(),
      })),
    },
    importPolicy: {
      ...mergeImportPolicy(parsed.importPolicy),
      notes: parsed.importPolicy.notes.trim(),
    },
    guidance: mergeGuidance(parsed.guidance, {
      bestFor: parsed.guidance.bestFor.map((item) => item.trim()).filter(Boolean),
      avoidFor: parsed.guidance.avoidFor.map((item) => item.trim()).filter(Boolean),
    }),
    tokens: normalizeThemeTokens(parsed.tokens),
    typography: normalizeTypography(parsed.typography),
    shape: normalizeShape(parsed.shape),
  });
};

export const compileBuilderThemePresetCollection = (
  manifests: readonly BuilderThemeManifest[],
): BuilderThemePreset[] => manifests.map(compileBuilderThemePreset);

export const mergeBuilderThemeManifest = (
  baseTheme: BuilderThemeManifest,
  patch: BuilderThemeManifestPatch,
): BuilderThemeManifest => compileBuilderThemePreset({
  ...baseTheme,
  id: patch.id ?? baseTheme.id,
  name: patch.name ?? baseTheme.name,
  description: patch.description ?? baseTheme.description,
  category: patch.category ?? baseTheme.category,
  tokens: {
    ...baseTheme.tokens,
    ...(patch.tokens ?? {}),
  },
  typography: {
    ...baseTheme.typography,
    ...(patch.typography ?? {}),
  },
  shape: {
    ...baseTheme.shape,
    ...(patch.shape ?? {}),
  },
  source: mergeSource(baseTheme.source, patch.source),
  importPolicy: mergeImportPolicy(baseTheme.importPolicy, patch.importPolicy),
  guidance: mergeGuidance(baseTheme.guidance, patch.guidance),
});
