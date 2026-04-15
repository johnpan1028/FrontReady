import { compileBuilderThemePresetCollection } from './compiler';
import {
  BUILDER_THEME_IDS,
  DEFAULT_BUILDER_THEME_ID,
  type BuilderThemeId,
  type BuilderThemeManifest,
  type BuilderThemePreset,
} from './schema';

export {
  BUILDER_THEME_IDS,
  DEFAULT_BUILDER_THEME_ID,
} from './schema';

export type {
  BuilderThemeId,
  BuilderPresetThemeId,
  BuilderThemeCategory,
  BuilderThemeGuidance,
  BuilderThemeImportPolicy,
  BuilderThemeManifest,
  BuilderThemePreset,
  BuilderThemeReference,
  BuilderThemeSource,
  BuilderThemeSourceKind,
  BuilderThemeTokenKey,
  BuilderThemeTokens,
} from './schema';

const BUILDER_THEME_MANIFESTS: BuilderThemeManifest[] = [
  {
    id: 'warm-neutral',
    name: 'Warm Neutral',
    category: 'Balanced',
    description: 'Warm and trustworthy, suited for product homepages and general business back offices.',
    tokens: {
      bg: '#EFEBE1',
      panel: '#F8F6F0',
      border: '#E2DCD0',
      text: '#3E3832',
      muted: '#8C857B',
      primary: '#D47253',
      success: '#6B8E6B',
      danger: '#C85A5A',
      warning: '#D9A05B',
    },
    typography: {
      fontFamily: "'Inter', system-ui, sans-serif",
      headingWeight: 700,
      bodySize: 14,
    },
    shape: {
      panelRadius: 16,
      controlRadius: 12,
      panelShadow: '0 2px 8px rgba(62, 56, 50, 0.02)',
      panelHoverShadow: '0 8px 24px rgba(62, 56, 50, 0.08)',
    },
    source: {
      kind: 'handcrafted',
      label: 'Internal Base Preset',
      notes: 'An original neutral preset for homepages, forms, and general business surfaces.',
      references: [],
    },
    importPolicy: {
      strategy: 'derived',
      userFacingBranding: 'generic',
      notes: 'Keeps a reusable product tone without binding the theme to any specific brand.',
    },
    guidance: {
      lightness: 'light',
      bestFor: ['Brand homepage', 'Content page', 'Customer form'],
      avoidFor: ['Ultra-dense monitoring surfaces'],
    },
  },
  {
    id: 'graphite-dashboard',
    name: 'Graphite Dashboard',
    category: 'Dashboard',
    description: 'A dark graphite theme for dashboards, monitoring surfaces, and high-density interfaces.',
    tokens: {
      bg: '#111417',
      panel: '#171C20',
      border: '#273038',
      text: '#EEF2F6',
      muted: '#8D9AA7',
      primary: '#67B2FF',
      success: '#36C78B',
      danger: '#F87171',
      warning: '#F5B14C',
    },
    typography: {
      fontFamily: "'Inter', system-ui, sans-serif",
      headingWeight: 700,
      bodySize: 14,
    },
    shape: {
      panelRadius: 16,
      controlRadius: 12,
      panelShadow: '0 2px 12px rgba(0, 0, 0, 0.22)',
      panelHoverShadow: '0 12px 28px rgba(0, 0, 0, 0.34)',
    },
    source: {
      kind: 'handcrafted',
      label: 'Internal Dashboard Preset',
      notes: 'An original dark data preset focused on density, observability, and high-contrast states.',
      references: [],
    },
    importPolicy: {
      strategy: 'derived',
      userFacingBranding: 'generic',
      notes: 'Keeps a dashboard language without claiming any external brand system.',
    },
    guidance: {
      lightness: 'dark',
      bestFor: ['Ops dashboard', 'Alert monitoring', 'SaaS console'],
      avoidFor: ['Default landing hero', 'Long-form reading'],
    },
  },
  {
    id: 'cobalt-signal',
    name: 'Cobalt Signal',
    category: 'Signal',
    description: 'Cool and high-contrast, suited for technology products, SaaS consoles, and growth pages.',
    tokens: {
      bg: '#0B1220',
      panel: '#13203A',
      border: '#223354',
      text: '#F4F8FF',
      muted: '#8FA7D8',
      primary: '#5B8CFF',
      success: '#2DD4BF',
      danger: '#FB7185',
      warning: '#FBBF24',
    },
    typography: {
      fontFamily: "'Inter', system-ui, sans-serif",
      headingWeight: 700,
      bodySize: 14,
    },
    shape: {
      panelRadius: 18,
      controlRadius: 12,
      panelShadow: '0 4px 16px rgba(11, 18, 32, 0.18)',
      panelHoverShadow: '0 14px 32px rgba(11, 18, 32, 0.28)',
    },
    source: {
      kind: 'handcrafted',
      label: 'Internal Signal Preset',
      notes: 'An original cool-tone preset built for signal, speed, and product-console character.',
      references: [],
    },
    importPolicy: {
      strategy: 'derived',
      userFacingBranding: 'generic',
      notes: 'Works as a technology baseline theme and can later map to official design-system tokens.',
    },
    guidance: {
      lightness: 'dark',
      bestFor: ['Tech product', 'Growth analytics', 'AI tool panel'],
      avoidFor: ['Warm brand storytelling', 'Lifestyle content site'],
    },
  },
  {
    id: 'paper-editorial',
    name: 'Paper Editorial',
    category: 'Editorial',
    description: 'A paper-like light preset for content pages, brand pages, and showcase templates.',
    tokens: {
      bg: '#F5F1E8',
      panel: '#FFFDF8',
      border: '#DDD3C3',
      text: '#2D241F',
      muted: '#7B6B61',
      primary: '#A45A3F',
      success: '#4A7C59',
      danger: '#C25555',
      warning: '#C8923E',
    },
    typography: {
      fontFamily: "'Georgia', 'Times New Roman', serif",
      headingWeight: 700,
      bodySize: 15,
    },
    shape: {
      panelRadius: 18,
      controlRadius: 12,
      panelShadow: '0 2px 10px rgba(45, 36, 31, 0.04)',
      panelHoverShadow: '0 14px 32px rgba(45, 36, 31, 0.10)',
    },
    source: {
      kind: 'handcrafted',
      label: 'Internal Editorial Preset',
      notes: 'An original light editorial preset for websites, portfolios, and showcase pages.',
      references: [],
    },
    importPolicy: {
      strategy: 'derived',
      userFacingBranding: 'generic',
      notes: 'Preserves an editorial, paper-like feel without attaching external brand identity.',
    },
    guidance: {
      lightness: 'light',
      bestFor: ['Landing page', 'Blog', 'Portfolio showcase'],
      avoidFor: ['24/7 monitoring', 'Trading terminal'],
    },
  },
];

export const BUILDER_THEME_PRESETS: BuilderThemePreset[] = compileBuilderThemePresetCollection(BUILDER_THEME_MANIFESTS);

export const getBuilderThemePreset = (themeId: string) => BUILDER_THEME_PRESETS.find((theme) => theme.id === themeId) ?? null;

export const isBuiltinBuilderTheme = (themeId: string) => BUILDER_THEME_PRESETS.some((theme) => theme.id === themeId);

export const compileProjectThemePresets = (manifests: BuilderThemeManifest[] = []) => compileBuilderThemePresetCollection(manifests);

export const getBuilderThemeCatalog = (projectThemes: BuilderThemeManifest[] = []) => [
  ...BUILDER_THEME_PRESETS,
  ...compileProjectThemePresets(projectThemes),
];

export const resolveBuilderTheme = (
  themeId: string,
  projectThemes: BuilderThemeManifest[] = [],
) => {
  const compiledProjectThemes = compileProjectThemePresets(projectThemes);
  return compiledProjectThemes.find((theme) => theme.id === themeId)
    ?? BUILDER_THEME_PRESETS.find((theme) => theme.id === themeId)
    ?? BUILDER_THEME_PRESETS.find((theme) => theme.id === DEFAULT_BUILDER_THEME_ID)
    ?? null;
};

const projectTokenPropertyMap = {
  bg: ['--project-bg'],
  panel: ['--project-panel'],
  border: ['--project-border'],
  text: ['--project-text'],
  muted: ['--project-muted'],
  primary: ['--project-primary'],
  success: ['--project-success'],
  danger: ['--project-danger'],
  warning: ['--project-warning'],
} as const;

const projectStyleProperties = [
  '--project-font-family',
  '--project-heading-weight',
  '--project-body-size',
  '--project-radius-panel',
  '--project-radius-control',
  '--project-shadow-panel',
  '--project-shadow-panel-hover',
] as const;

export const applyProjectThemeToElement = (
  element: HTMLElement | null,
  themeId: string,
  projectThemes: BuilderThemeManifest[] = [],
) => {
  const theme = resolveBuilderTheme(themeId, projectThemes);
  if (!theme || !element) return;

  element.dataset.projectTheme = theme.id;

  (Object.entries(projectTokenPropertyMap) as Array<[keyof typeof projectTokenPropertyMap, readonly string[]]>).forEach(([tokenKey, properties]) => {
    const value = theme.tokens[tokenKey];
    properties.forEach((property) => {
      element.style.setProperty(property, value);
    });
  });

  element.style.setProperty('--project-font-family', theme.typography.fontFamily);
  element.style.setProperty('--project-heading-weight', String(theme.typography.headingWeight));
  element.style.setProperty('--project-body-size', `${theme.typography.bodySize}px`);
  element.style.setProperty('--project-radius-panel', `${theme.shape.panelRadius}px`);
  element.style.setProperty('--project-radius-control', `${theme.shape.controlRadius}px`);
  element.style.setProperty('--project-shadow-panel', theme.shape.panelShadow);
  element.style.setProperty('--project-shadow-panel-hover', theme.shape.panelHoverShadow);
};

export const clearProjectThemeFromElement = (element: HTMLElement | null) => {
  if (!element) return;

  delete element.dataset.projectTheme;

  (Object.values(projectTokenPropertyMap) as ReadonlyArray<readonly string[]>).flat().forEach((property) => {
    element.style.removeProperty(property);
  });

  projectStyleProperties.forEach((property) => {
    element.style.removeProperty(property);
  });
};
