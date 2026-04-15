import { mergeBuilderThemeManifest } from './compiler';
import { BuilderThemeManifestSchema, type BuilderThemeManifest, type BuilderThemeTokenKey } from './schema';

const normalizeHeading = (value: string) => value.trim().toLowerCase();

const parseMarkdownSections = (input: string) => {
  const lines = input.split(/\r?\n/);
  const sections: Array<{ title: string; content: string[] }> = [];
  let currentSection: { title: string; content: string[] } | null = null;

  lines.forEach((line) => {
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      currentSection = {
        title: headingMatch[1].trim(),
        content: [],
      };
      sections.push(currentSection);
      return;
    }

    if (!currentSection) {
      currentSection = {
        title: '__root__',
        content: [],
      };
      sections.push(currentSection);
    }

    currentSection.content.push(line);
  });

  return sections;
};

const getSection = (
  sections: Array<{ title: string; content: string[] }>,
  names: string[],
) => sections.find((section) => names.some((name) => normalizeHeading(section.title).includes(name)));

const parseKeyValueLines = (lines: string[]) => {
  const values = new Map<string, string>();

  lines.forEach((line) => {
    const trimmed = line.trim();
    const match = trimmed.match(/^[-*]?\s*([A-Za-z][A-Za-z0-9._-]*)\s*:\s*(.+)$/);
    if (!match) return;
    values.set(match[1].trim().toLowerCase(), match[2].trim());
  });

  return values;
};

const parseListLines = (lines: string[]) => lines
  .map((line) => line.trim())
  .filter((line) => /^[-*]\s+/.test(line))
  .map((line) => line.replace(/^[-*]\s+/, '').trim())
  .filter(Boolean);

const parseCommaList = (value: string | undefined) => value
  ? value.split(',').map((item) => item.trim()).filter(Boolean)
  : [];

const THEME_TOKEN_KEYS: BuilderThemeTokenKey[] = [
  'bg',
  'panel',
  'border',
  'text',
  'muted',
  'primary',
  'success',
  'danger',
  'warning',
];

const getTokenOverrides = (
  sectionMaps: Map<string, string>[],
) => {
  const overrides: Partial<Record<BuilderThemeTokenKey, string>> = {};

  THEME_TOKEN_KEYS.forEach((tokenKey) => {
    const found = sectionMaps
      .map((map) => map.get(tokenKey))
      .find(Boolean);

    if (found) {
      overrides[tokenKey] = found;
    }
  });

  return overrides;
};

const parseJsonTheme = (input: string): BuilderThemeManifest | null => {
  try {
    const parsed = JSON.parse(input) as unknown;
    const candidate = parsed && typeof parsed === 'object' && 'theme' in (parsed as Record<string, unknown>)
      ? (parsed as Record<string, unknown>).theme
      : parsed;

    return BuilderThemeManifestSchema.parse(candidate);
  } catch {
    return null;
  }
};

const deriveLightness = (hexColor: string) => {
  const normalized = hexColor.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;

  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness >= 160 ? 'light' : 'dark';
};

export const parseDesignMarkdownTheme = (
  input: string,
  baseTheme: BuilderThemeManifest,
): BuilderThemeManifest => {
  const sections = parseMarkdownSections(input);
  const rootSection = getSection(sections, ['__root__']);
  const titleSection = sections.find((section) => section.title !== '__root__' && !/design\.md/i.test(section.title));
  const titleMap = parseKeyValueLines(titleSection?.content ?? []);
  const rootMap = new Map([
    ...parseKeyValueLines(rootSection?.content ?? []).entries(),
    ...titleMap.entries(),
  ]);
  const tokensSection = getSection(sections, ['tokens', 'colors', 'palette']);
  const typographySection = getSection(sections, ['typography', 'font']);
  const shapeSection = getSection(sections, ['shape', 'radius', 'shadow']);
  const sourceSection = getSection(sections, ['source', 'reference']);
  const importSection = getSection(sections, ['import policy', 'import']);
  const bestForSection = getSection(sections, ['best for']);
  const avoidForSection = getSection(sections, ['avoid for']);

  const tokensMap = parseKeyValueLines(tokensSection?.content ?? []);
  const typographyMap = parseKeyValueLines(typographySection?.content ?? []);
  const shapeMap = parseKeyValueLines(shapeSection?.content ?? []);
  const sourceMap = parseKeyValueLines(sourceSection?.content ?? []);
  const importMap = parseKeyValueLines(importSection?.content ?? []);

  const tokenOverrides = getTokenOverrides([tokensMap, rootMap]);
  if (Object.keys(tokenOverrides).length === 0) {
    throw new Error('DESIGN.md import requires a Tokens/Colors section with theme colors.');
  }

  const themeName = rootMap.get('name')
    ?? (titleSection && !/theme studio/i.test(titleSection.title) ? titleSection.title : undefined)
    ?? baseTheme.name;
  const description = rootMap.get('description')
    ?? sections
      .flatMap((section) => section.content.map((line) => line.trim()))
      .find((line) => line && !line.startsWith('-') && !/^[A-Za-z][A-Za-z0-9._-]*\s*:/.test(line))
    ?? baseTheme.description;

  const bgColor = tokenOverrides.bg ?? baseTheme.tokens.bg;
  const bestFor = parseListLines(bestForSection?.content ?? []).length > 0
    ? parseListLines(bestForSection?.content ?? [])
    : parseCommaList(rootMap.get('bestfor'));
  const avoidFor = parseListLines(avoidForSection?.content ?? []).length > 0
    ? parseListLines(avoidForSection?.content ?? [])
    : parseCommaList(rootMap.get('avoidfor'));

  return mergeBuilderThemeManifest(baseTheme, {
    id: rootMap.get('id') ?? baseTheme.id,
    name: themeName,
    category: (rootMap.get('category') as BuilderThemeManifest['category'] | undefined) ?? baseTheme.category,
    description,
    tokens: tokenOverrides,
    typography: {
      fontFamily: typographyMap.get('fontfamily'),
      headingWeight: typographyMap.get('headingweight') ? Number(typographyMap.get('headingweight')) : undefined,
      bodySize: typographyMap.get('bodysize') ? Number(typographyMap.get('bodysize')) : undefined,
    },
    shape: {
      panelRadius: shapeMap.get('panelradius') ? Number(shapeMap.get('panelradius')) : undefined,
      controlRadius: shapeMap.get('controlradius') ? Number(shapeMap.get('controlradius')) : undefined,
      panelShadow: shapeMap.get('panelshadow'),
      panelHoverShadow: shapeMap.get('panelhovershadow'),
    },
    source: {
      kind: (sourceMap.get('kind') as BuilderThemeManifest['source']['kind'] | undefined) ?? baseTheme.source.kind,
      label: sourceMap.get('label') ?? baseTheme.source.label,
      url: sourceSection ? (sourceMap.get('url') ?? null) : baseTheme.source.url,
      notes: sourceMap.get('notes') ?? baseTheme.source.notes,
      references: sourceSection ? [] : baseTheme.source.references,
    },
    importPolicy: {
      strategy: (importMap.get('strategy') as BuilderThemeManifest['importPolicy']['strategy'] | undefined) ?? 'derived',
      userFacingBranding: (importMap.get('userfacingbranding') as BuilderThemeManifest['importPolicy']['userFacingBranding'] | undefined) ?? 'generic',
      notes: importMap.get('notes') ?? baseTheme.importPolicy.notes,
    },
    guidance: {
      lightness: (rootMap.get('lightness') as BuilderThemeManifest['guidance']['lightness'] | undefined) ?? deriveLightness(bgColor),
      bestFor: bestFor.length > 0 ? bestFor : baseTheme.guidance.bestFor,
      avoidFor: avoidFor.length > 0 ? avoidFor : baseTheme.guidance.avoidFor,
    },
  });
};

export const importBuilderThemeFromText = (
  input: string,
  baseTheme: BuilderThemeManifest,
): BuilderThemeManifest => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Theme import content is empty.');
  }

  const jsonTheme = parseJsonTheme(trimmed);
  if (jsonTheme) return jsonTheme;

  return parseDesignMarkdownTheme(trimmed, baseTheme);
};
