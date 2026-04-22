import type { CSSProperties } from 'react';
import type { WidgetType } from '../builder/widgetConfig';

type CornerPreset = 'square' | 'r1' | 'r2' | 'r3';

const CORNER_PRESET_FACTORS: Record<CornerPreset, string> = {
  square: '0',
  r1: '0.6',
  r2: '1',
  r3: '1.35',
};

const normalizeCornerPreset = (value: unknown): CornerPreset => (
  value === 'square' || value === 'r1' || value === 'r3' ? value : 'r2'
);

const getWidgetCornerToken = (widgetType?: WidgetType | null) => (
  widgetType === 'panel' || widgetType === 'shadcn_login_card'
    ? 'var(--theme-radius-panel)'
    : 'var(--theme-radius-control)'
);

export const getWidgetCornerStyle = (
  props: Record<string, any> | undefined,
  widgetType?: WidgetType | null,
): CSSProperties => {
  const style: CSSProperties = {};
  style['--builder-widget-corner-token' as any] = getWidgetCornerToken(widgetType);
  style['--builder-corner-top-left-factor' as any] = CORNER_PRESET_FACTORS[
    normalizeCornerPreset(props?.cornerTopLeftPreset)
  ];
  style['--builder-corner-top-right-factor' as any] = CORNER_PRESET_FACTORS[
    normalizeCornerPreset(props?.cornerTopRightPreset)
  ];
  style['--builder-corner-bottom-left-factor' as any] = CORNER_PRESET_FACTORS[
    normalizeCornerPreset(props?.cornerBottomLeftPreset)
  ];
  style['--builder-corner-bottom-right-factor' as any] = CORNER_PRESET_FACTORS[
    normalizeCornerPreset(props?.cornerBottomRightPreset)
  ];
  return style;
};

export const getWidgetFrameStyle = (props: Record<string, any> | undefined): CSSProperties => {
  if (!props) return {};

  const style: CSSProperties = {};
  if (props.minWidth) style.minWidth = `${props.minWidth}px`;
  if (props.minHeight) style.minHeight = `${props.minHeight}px`;

  if (props.scaleWithParent === false) {
    if (props.minWidth) style.width = `${props.minWidth}px`;
    if (props.minHeight) style.height = `${props.minHeight}px`;
  }

  return style;
};
