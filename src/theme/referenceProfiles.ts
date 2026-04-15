import { mergeBuilderThemeManifest } from './compiler';
import type {
  BuilderThemeCategory,
  BuilderThemeGuidance,
  BuilderThemeManifest,
  BuilderThemeShape,
  BuilderThemeSource,
  BuilderThemeTokens,
  BuilderThemeTypography,
} from './schema';

export type ThemeReferenceProfileId =
  | 'github-product-light'
  | 'carbon-enterprise-light'
  | 'material-expressive-light'
  | 'designmd-studio-warm';

export type ThemeReferenceProfile = {
  id: ThemeReferenceProfileId;
  name: string;
  description: string;
  category: BuilderThemeCategory;
  source: BuilderThemeSource;
  importNotes: string;
  guidance: BuilderThemeGuidance;
  tokens: Partial<BuilderThemeTokens>;
  typography: Partial<BuilderThemeTypography>;
  shape: Partial<BuilderThemeShape>;
};

export const THEME_REFERENCE_PROFILES: ThemeReferenceProfile[] = [
  {
    id: 'github-product-light',
    name: 'GitHub Product Light',
    description: 'A light product-tooling theme for developer tools, project portals, and documentation pages.',
    category: 'Balanced',
    source: {
      kind: 'official-reference',
      label: 'GitHub Brand Toolkit',
      url: 'https://brand.github.com/',
      notes: 'Derived from public brand and product cues, not a replica of any official GitHub theme.',
      references: [
        {
          kind: 'official-reference',
          label: 'GitHub Brand Toolkit',
          url: 'https://brand.github.com/',
          notes: 'Used to extract product tone, color direction, and a clear interface voice.',
        },
      ],
    },
    importNotes: 'Uses the derived strategy by default so user projects are not mislabeled as official GitHub styling.',
    guidance: {
      lightness: 'light',
      bestFor: ['Developer portal', 'Project management', 'Docs homepage'],
      avoidFor: ['Lifestyle brand page', 'High-drama campaign page'],
    },
    tokens: {
      bg: '#F6F8FA',
      panel: '#FFFFFF',
      border: '#D0D7DE',
      text: '#24292F',
      muted: '#57606A',
      primary: '#0969DA',
      success: '#1A7F37',
      danger: '#CF222E',
      warning: '#9A6700',
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      headingWeight: 700,
      bodySize: 14,
    },
    shape: {
      panelRadius: 10,
      controlRadius: 8,
      panelShadow: '0 1px 2px rgba(31, 35, 40, 0.06)',
      panelHoverShadow: '0 8px 24px rgba(31, 35, 40, 0.10)',
    },
  },
  {
    id: 'carbon-enterprise-light',
    name: 'Carbon Enterprise Light',
    description: 'A low-noise enterprise theme for back-office, approval, and data-management products.',
    category: 'Dashboard',
    source: {
      kind: 'official-reference',
      label: 'IBM Carbon Design System',
      url: 'https://carbondesignsystem.com/',
      notes: 'Derived from a public design-system tone without reproducing IBM brand identity.',
      references: [
        {
          kind: 'official-reference',
          label: 'IBM Carbon Design System',
          url: 'https://carbondesignsystem.com/',
          notes: 'Used to extract enterprise information density, blue action color, and restrained UI tone.',
        },
      ],
    },
    importNotes: 'A strong management-console baseline that defaults to a generic derived theme.',
    guidance: {
      lightness: 'light',
      bestFor: ['Enterprise back office', 'Approval flow', 'Data management'],
      avoidFor: ['Brand story page', 'Hard-sell hero'],
    },
    tokens: {
      bg: '#F4F4F4',
      panel: '#FFFFFF',
      border: '#E0E0E0',
      text: '#161616',
      muted: '#525252',
      primary: '#0F62FE',
      success: '#24A148',
      danger: '#DA1E28',
      warning: '#F1C21B',
    },
    typography: {
      fontFamily: "'IBM Plex Sans', 'Inter', system-ui, sans-serif",
      headingWeight: 600,
      bodySize: 14,
    },
    shape: {
      panelRadius: 4,
      controlRadius: 4,
      panelShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
      panelHoverShadow: '0 6px 18px rgba(0, 0, 0, 0.10)',
    },
  },
  {
    id: 'material-expressive-light',
    name: 'Material Expressive Light',
    description: 'A general-purpose light app theme with a mobile flavor, suited for tools and form flows.',
    category: 'Balanced',
    source: {
      kind: 'official-reference',
      label: 'Material Design',
      url: 'https://m3.material.io/',
      notes: 'Derived from public Material Design cues without copying any specific product brand.',
      references: [
        {
          kind: 'official-reference',
          label: 'Material Design',
          url: 'https://m3.material.io/',
          notes: 'Used to extract rounded shapes, color layering, and interaction tone for app-like surfaces.',
        },
      ],
    },
    importNotes: 'A good base for softer, cross-platform product themes.',
    guidance: {
      lightness: 'light',
      bestFor: ['Utility app', 'Form flow', 'Settings page'],
      avoidFor: ['High-density trading terminal', 'Ultra-minimal enterprise console'],
    },
    tokens: {
      bg: '#FFFBFE',
      panel: '#FFFFFF',
      border: '#CAC4D0',
      text: '#1D1B20',
      muted: '#49454F',
      primary: '#6750A4',
      success: '#386A20',
      danger: '#BA1A1A',
      warning: '#7D5700',
    },
    typography: {
      fontFamily: "'Roboto', 'Inter', system-ui, sans-serif",
      headingWeight: 700,
      bodySize: 14,
    },
    shape: {
      panelRadius: 24,
      controlRadius: 20,
      panelShadow: '0 1px 3px rgba(29, 27, 32, 0.08)',
      panelHoverShadow: '0 8px 22px rgba(29, 27, 32, 0.14)',
    },
  },
  {
    id: 'designmd-studio-warm',
    name: 'DESIGN.md Studio Warm',
    description: 'A warm creative theme derived from community DESIGN.md examples, suited for AI blueprint samples.',
    category: 'Editorial',
    source: {
      kind: 'community-reference',
      label: 'DESIGN.md Community Examples',
      url: 'https://github.com/VoltAgent/awesome-design-md',
      notes: 'Used to keep the AI blueprint phase stylistically constrained, not to limit end users.',
      references: [
        {
          kind: 'community-reference',
          label: 'awesome-design-md',
          url: 'https://github.com/VoltAgent/awesome-design-md',
          notes: 'Used to study how markdown-based design constraints are structured.',
        },
      ],
    },
    importNotes: 'Useful as a blueprint-stage reference theme before the user edits and confirms the final result.',
    guidance: {
      lightness: 'light',
      bestFor: ['AI blueprint sample', 'Creator homepage', 'Portfolio showcase'],
      avoidFor: ['Serious finance console', 'Medical compliance system'],
    },
    tokens: {
      bg: '#F7EFE4',
      panel: '#FFF9F0',
      border: '#E7D8C7',
      text: '#31261F',
      muted: '#806F61',
      primary: '#C96F44',
      success: '#607D55',
      danger: '#B24D4D',
      warning: '#B98435',
    },
    typography: {
      fontFamily: "'Inter', 'Avenir Next', system-ui, sans-serif",
      headingWeight: 750,
      bodySize: 15,
    },
    shape: {
      panelRadius: 22,
      controlRadius: 16,
      panelShadow: '0 4px 20px rgba(49, 38, 31, 0.06)',
      panelHoverShadow: '0 18px 40px rgba(49, 38, 31, 0.12)',
    },
  },
];

export const getThemeReferenceProfile = (profileId: string) => (
  THEME_REFERENCE_PROFILES.find((profile) => profile.id === profileId) ?? null
);

export const buildThemeFromReferenceProfile = ({
  profile,
  baseTheme,
  themeId,
}: {
  profile: ThemeReferenceProfile;
  baseTheme: BuilderThemeManifest;
  themeId: string;
}): BuilderThemeManifest => mergeBuilderThemeManifest(baseTheme, {
  id: themeId,
  name: profile.name,
  category: profile.category,
  description: profile.description,
  tokens: profile.tokens,
  typography: profile.typography,
  shape: profile.shape,
  source: profile.source,
  importPolicy: {
    strategy: 'derived',
    userFacingBranding: 'generic',
    notes: profile.importNotes,
  },
  guidance: profile.guidance,
});
