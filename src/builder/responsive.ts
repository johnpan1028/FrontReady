export type GridBreakpointKey = 'xxs' | 'xs' | 'sm' | 'md' | 'lg';

export const PROJECT_GRID_BREAKPOINTS: Record<GridBreakpointKey, number> = {
  xxs: 0,
  xs: 480,
  sm: 768,
  md: 1200,
  lg: 1440,
};

export const PROJECT_GRID_COLS: Record<GridBreakpointKey, number> = {
  xxs: 8,
  xs: 16,
  sm: 24,
  md: 40,
  lg: 48,
};

export const DESKTOP_PAGE_SHELL_WIDTH = 1440;
export const DESKTOP_PAGE_SHELL_HEIGHT = 900;
export const DESKTOP_OVERLAY_SHELL_WIDTH = 960;
export const DESKTOP_OVERLAY_SHELL_HEIGHT = 640;
export const WEB_STAGE_SURFACE_LABEL = 'Desktop Web';
export const WEB_STAGE_CHROME_HEIGHT = 46;
export const WEB_STAGE_BODY_PADDING_X = 20;
export const WEB_STAGE_BODY_PADDING_Y = 20;

const GRID_BREAKPOINT_ORDER: GridBreakpointKey[] = ['lg', 'md', 'sm', 'xs', 'xxs'];

export const resolveGridBreakpointKey = (width: number): GridBreakpointKey => {
  for (const key of GRID_BREAKPOINT_ORDER) {
    if (width >= PROJECT_GRID_BREAKPOINTS[key]) {
      return key;
    }
  }

  return 'xxs';
};

export const fitStageCanvasToShell = (
  availableWidth: number,
  availableHeight: number,
  targetWidth: number,
  targetHeight: number,
  shellPaddingX = 64,
  shellPaddingY = 64,
  bodyInsetX = WEB_STAGE_BODY_PADDING_X,
  bodyInsetY = WEB_STAGE_BODY_PADDING_Y,
) => {
  const maxCanvasWidth = Math.max(
    240,
    Math.floor(availableWidth - shellPaddingX - bodyInsetX * 2),
  );
  const maxCanvasHeight = Math.max(
    280,
    Math.floor(availableHeight - shellPaddingY - WEB_STAGE_CHROME_HEIGHT - bodyInsetY * 2),
  );

  const scale = Math.min(
    1,
    maxCanvasWidth / Math.max(1, targetWidth),
    maxCanvasHeight / Math.max(1, targetHeight),
  );

  return {
    width: Math.max(240, Math.floor(targetWidth * scale)),
    height: Math.max(280, Math.floor(targetHeight * scale)),
    scale,
  };
};

export const resolveWebStageFrameSize = (
  canvasWidth: number,
  canvasHeight: number,
  bodyInsetX = WEB_STAGE_BODY_PADDING_X,
  bodyInsetY = WEB_STAGE_BODY_PADDING_Y,
) => ({
  width: canvasWidth + bodyInsetX * 2,
  height: canvasHeight + bodyInsetY * 2 + WEB_STAGE_CHROME_HEIGHT,
});

export const resolveRuntimeGridSpec = (width: number, compact = false) => {
  if (compact) {
    return {
      breakpoint: 'sm' as GridBreakpointKey,
      cols: 12,
      rowHeight: 18,
    };
  }

  const breakpoint = resolveGridBreakpointKey(width);
  return {
    breakpoint,
    cols: PROJECT_GRID_COLS[breakpoint],
    rowHeight: breakpoint === 'xxs' || breakpoint === 'xs' ? 18 : 20,
  };
};
