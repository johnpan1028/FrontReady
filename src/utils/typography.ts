import type { CSSProperties } from 'react';

export type TypographyProps = {
  fontFamily?: string;
  fontSize?: string | number;
  fontWeight?: string | number;
  fontStyle?: string;
  lineHeight?: string | number;
  letterSpacing?: string | number;
  textAlign?: string;
  textTransform?: string;
  textDecoration?: string;
};

export const TYPOGRAPHY_FONT_OPTIONS = [
  { label: 'Theme', value: 'theme' },
  { label: 'Parent controlled', value: 'parent' },
  { label: 'Geist', value: 'geist' },
  { label: 'Inter', value: 'inter' },
  { label: 'System', value: 'system' },
  { label: 'Serif', value: 'serif' },
  { label: 'Mono', value: 'mono' },
] as const;

export const TYPOGRAPHY_WEIGHT_OPTIONS = [
  { label: 'Regular', value: 'regular' },
  { label: 'Medium', value: 'medium' },
  { label: 'Semibold', value: 'semibold' },
  { label: 'Bold', value: 'bold' },
] as const;

export const TYPOGRAPHY_STYLE_OPTIONS = [
  { label: 'T', value: 'normal' },
  { label: 'I', value: 'italic' },
] as const;

export const TYPOGRAPHY_ALIGNMENT_OPTIONS = [
  { label: 'L', value: 'left' },
  { label: 'C', value: 'center' },
  { label: 'R', value: 'right' },
] as const;

export const TYPOGRAPHY_CASE_OPTIONS = [
  { label: '—', value: 'none' },
  { label: 'Aa', value: 'capitalize' },
  { label: 'AA', value: 'uppercase' },
  { label: 'aa', value: 'lowercase' },
] as const;

export const TYPOGRAPHY_DECORATION_OPTIONS = [
  { label: '—', value: 'none' },
  { label: 'U', value: 'underline' },
  { label: 'S', value: 'line-through' },
  { label: 'O', value: 'overline' },
] as const;

const FONT_FAMILY_PRESETS: Record<string, string | undefined> = {
  theme: undefined,
  geist: "var(--font-sans, 'Geist Variable', sans-serif)",
  inter: "'Inter', system-ui, sans-serif",
  system: 'system-ui, sans-serif',
  serif: "Georgia, 'Times New Roman', serif",
  mono: "var(--font-mono, 'SFMono-Regular', Consolas, monospace)",
};

const FONT_WEIGHT_PRESETS: Record<string, CSSProperties['fontWeight']> = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

const textValue = (value: unknown) => (
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
);

const cssLengthValue = (
  value: unknown,
  fallback?: string,
  mode: 'size' | 'spacing' | 'line-height' = 'size',
) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return mode === 'line-height' ? String(value) : `${value}px`;
  }

  if (typeof value !== 'string') return fallback;

  const next = value.trim();
  if (!next) return fallback;
  return next;
};

const resolveFontFamily = (value: unknown, fallback?: string) => {
  const next = textValue(value);
  if (!next) return fallback;
  if (Object.prototype.hasOwnProperty.call(FONT_FAMILY_PRESETS, next)) {
    return FONT_FAMILY_PRESETS[next];
  }
  if (next === 'parent') return fallback;
  return next;
};

const resolveFontWeight = (value: unknown, fallback?: CSSProperties['fontWeight']) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const next = textValue(value);
  if (!next) return fallback;
  if (FONT_WEIGHT_PRESETS[next] != null) return FONT_WEIGHT_PRESETS[next];
  if (/^\d+$/.test(next)) return Number(next);
  return next as CSSProperties['fontWeight'];
};

const scaleNumericCssValue = (value: CSSProperties['fontSize'], multiplier: number) => {
  if (typeof value === 'number') return value * multiplier;
  if (typeof value !== 'string') return value;

  const match = value.trim().match(/^(-?\d*\.?\d+)(px|rem|em|%)?$/);
  if (!match) return value;

  const amount = Number(match[1]) * multiplier;
  const unit = match[2] ?? '';
  return `${Number(amount.toFixed(3))}${unit}`;
};

export const getTypographyDefaultsForWidget = (
  widgetType: string,
  props: Record<string, unknown> = {},
): Required<TypographyProps> => {
  const headingSize = typeof props.size === 'string' ? props.size : 'md';
  const textSize = typeof props.size === 'string' ? props.size : 'sm';
  const headingWeight = typeof props.weight === 'string' ? props.weight : 'bold';
  const align = typeof props.align === 'string' ? props.align : 'left';

  switch (widgetType) {
    case 'heading':
      return {
        fontFamily: 'theme',
        fontSize: headingSize === 'sm' ? '16px' : headingSize === 'lg' ? '30px' : headingSize === 'xl' ? '24px' : '20px',
        fontWeight: headingWeight,
        fontStyle: 'normal',
        lineHeight: '1.2em',
        letterSpacing: '-0.02em',
        textAlign: align,
        textTransform: 'none',
        textDecoration: 'none',
      };
    case 'text':
      return {
        fontFamily: 'theme',
        fontSize: textSize === 'xs' ? '12px' : textSize === 'md' ? '16px' : '14px',
        fontWeight: 'regular',
        fontStyle: 'normal',
        lineHeight: textSize === 'xs' ? '1.55em' : '1.6em',
        letterSpacing: '0em',
        textAlign: align,
        textTransform: 'none',
        textDecoration: 'none',
      };
    case 'button':
      return {
        fontFamily: 'theme',
        fontSize: '14px',
        fontWeight: 'medium',
        fontStyle: 'normal',
        lineHeight: '1.2em',
        letterSpacing: '0em',
        textAlign: 'center',
        textTransform: 'none',
        textDecoration: 'none',
      };
    case 'select':
    case 'checkbox':
    case 'radio':
    case 'text_input':
    case 'number_input':
    case 'textarea':
      return {
        fontFamily: 'theme',
        fontSize: '14px',
        fontWeight: 'regular',
        fontStyle: 'normal',
        lineHeight: '1.4em',
        letterSpacing: '0em',
        textAlign: 'left',
        textTransform: 'none',
        textDecoration: 'none',
      };
    case 'divider':
      return {
        fontFamily: 'theme',
        fontSize: '12px',
        fontWeight: 'regular',
        fontStyle: 'normal',
        lineHeight: '1.2em',
        letterSpacing: '0em',
        textAlign: 'center',
        textTransform: 'none',
        textDecoration: 'none',
      };
    case 'panel':
      return {
        fontFamily: 'theme',
        fontSize: '11px',
        fontWeight: 'semibold',
        fontStyle: 'normal',
        lineHeight: '1.2em',
        letterSpacing: '0.12em',
        textAlign: 'left',
        textTransform: 'uppercase',
        textDecoration: 'none',
      };
    case 'stat':
    case 'chart':
    case 'calendar':
    case 'shadcn_login_card':
      return {
        fontFamily: 'theme',
        fontSize: '14px',
        fontWeight: 'regular',
        fontStyle: 'normal',
        lineHeight: '1.45em',
        letterSpacing: '0em',
        textAlign: 'left',
        textTransform: 'none',
        textDecoration: 'none',
      };
    default:
      return {
        fontFamily: 'theme',
        fontSize: '14px',
        fontWeight: 'regular',
        fontStyle: 'normal',
        lineHeight: '1.45em',
        letterSpacing: '0em',
        textAlign: 'left',
        textTransform: 'none',
        textDecoration: 'none',
      };
  }
};

export const buildTypographyStyle = (
  props: TypographyProps | Record<string, unknown>,
  fallback: Partial<TypographyProps> = {},
): CSSProperties => {
  const source = props as Record<string, unknown>;

  const fontFamily = resolveFontFamily(source.fontFamily, resolveFontFamily(fallback.fontFamily));
  const fontSize = cssLengthValue(source.fontSize, cssLengthValue(fallback.fontSize, '14px', 'size'), 'size');
  const fontWeight = resolveFontWeight(source.fontWeight, resolveFontWeight(fallback.fontWeight, 400));
  const fontStyle = textValue(source.fontStyle) ?? textValue(fallback.fontStyle) ?? 'normal';
  const lineHeight = cssLengthValue(source.lineHeight, cssLengthValue(fallback.lineHeight, '1.45', 'line-height'), 'line-height');
  const letterSpacing = cssLengthValue(source.letterSpacing, cssLengthValue(fallback.letterSpacing, '0em', 'spacing'), 'spacing');
  const rawTextAlign = textValue(source.textAlign) ?? textValue(fallback.textAlign) ?? 'left';
  const textAlign = rawTextAlign === 'justify' ? 'left' : rawTextAlign;
  const textTransform = textValue(source.textTransform) ?? textValue(fallback.textTransform) ?? 'none';
  const textDecoration = textValue(source.textDecoration) ?? textValue(fallback.textDecoration) ?? 'none';

  return {
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle: fontStyle as CSSProperties['fontStyle'],
    lineHeight,
    letterSpacing,
    textAlign: textAlign as CSSProperties['textAlign'],
    textTransform: textTransform as CSSProperties['textTransform'],
    textDecoration: textDecoration as CSSProperties['textDecoration'],
  };
};

export const getWidgetTypographyStyle = (
  widgetType: string,
  props: TypographyProps | Record<string, unknown>,
) => buildTypographyStyle(props, getTypographyDefaultsForWidget(widgetType, props as Record<string, unknown>));

export const scaleTypographyStyle = (
  style: CSSProperties,
  options: {
    fontSizeMultiplier?: number;
    fontWeight?: CSSProperties['fontWeight'];
    lineHeight?: CSSProperties['lineHeight'];
    letterSpacing?: CSSProperties['letterSpacing'];
    textTransform?: CSSProperties['textTransform'];
    textDecoration?: CSSProperties['textDecoration'];
  } = {},
) => {
  const next: CSSProperties = { ...style };

  if (options.fontSizeMultiplier && next.fontSize) {
    next.fontSize = scaleNumericCssValue(next.fontSize, options.fontSizeMultiplier);
  }

  if (options.fontWeight != null) next.fontWeight = options.fontWeight;
  if (options.lineHeight != null) next.lineHeight = options.lineHeight;
  if (options.letterSpacing != null) next.letterSpacing = options.letterSpacing;
  if (options.textTransform != null) next.textTransform = options.textTransform;
  if (options.textDecoration != null) next.textDecoration = options.textDecoration;

  return next;
};

export const getTypographyJustifyClass = (textAlign?: string) => (
  textAlign === 'center'
    ? 'justify-center'
    : textAlign === 'right'
      ? 'justify-end'
      : 'justify-start'
);
