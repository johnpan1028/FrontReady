import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCompactor, GridLayout, ResponsiveGridLayout } from 'react-grid-layout';
import { PROJECT_GRID_BREAKPOINTS, PROJECT_GRID_COLS } from '../builder/responsive';
import { useBuilderWorkspaceScope } from '../builder/workspaceScope';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { useBuilderStore, WidgetType } from '../store/builderStore';
import { WidgetWrapper } from '../builder/WidgetWrapper';
import { cn } from '../utils/cn';
import { getDefaultWidgetSize, isContainerWidget } from '../builder/widgetConfig';
import { createWidgetId } from '../core/projectDocument';

interface NestedCanvasProps {
  id: string;
  className?: string;
  compact?: boolean;
  layoutMode?: 'grid' | 'flex-row' | 'flex-col';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingX?: number;
  paddingY?: number;
  gap?: number;
  scrollable?: boolean;
}

type GridLayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

const KIT_BOARD_HOST_SELECTOR = '[data-kit-board-host="true"]';
const NESTED_CANVAS_HOST_SELECTOR = '[data-nested-canvas-host="true"]';
const ROOT_MASTER_CELL_WIDTH = 28;
const ROOT_CONTROL_ROW_HEIGHT = 18;
const ROOT_NODE_GAP = 12;
const KIT_ROOT_DROP_PREVIEW_EVENT = 'kit-root-drop-preview';
const KIT_ROOT_PREVIEW_ACTIVE_ATTR = 'data-kit-root-preview-active';
const KIT_CROSS_CARD_PREVIEW_EVENT = 'kit-cross-card-drop-preview';
const KIT_CROSS_CARD_PREVIEW_SOURCE_ATTR = 'data-kit-cross-card-preview-source';
const COMPACT_GRID_COMPACTOR = getCompactor('vertical');

type RootBoardWidgetMeta = {
  type: WidgetType;
  props?: Record<string, unknown>;
};

type CrossCardPreviewEventDetail =
  | { action: 'clear' }
  | {
      action: 'show';
      sourceContainerId: string;
      targetContainerId: string;
      sourceParentId?: string | null;
      sourceLayoutItem?: Partial<GridLayoutItem> | null;
      widgetMeta?: { type?: WidgetType; props?: Record<string, unknown> };
    };

const toGridNumber = (value: unknown, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const toSpacingNumber = (value: unknown, fallback: number) => Math.max(0, Math.round(toGridNumber(value, fallback)));

const normalizeGridItem = (item: Partial<GridLayoutItem>): GridLayoutItem => ({
  i: String(item.i ?? ''),
  x: Math.max(0, Math.round(toGridNumber(item.x))),
  y: Math.max(0, Math.round(toGridNumber(item.y))),
  w: Math.max(1, Math.round(toGridNumber(item.w, 1))),
  h: Math.max(1, Math.round(toGridNumber(item.h, 1))),
  ...(item.minW != null ? { minW: Math.max(1, Math.round(toGridNumber(item.minW, 1))) } : {}),
  ...(item.minH != null ? { minH: Math.max(1, Math.round(toGridNumber(item.minH, 1))) } : {}),
});

const getCompactContentCols = (cols: number) => Math.max(1, cols);

const sortGridLayout = (layout: readonly GridLayoutItem[]) => (
  [...layout].sort((left, right) => left.y - right.y || left.x - right.x || left.i.localeCompare(right.i))
);

const areGridLayoutsEqual = (left: readonly GridLayoutItem[], right: readonly GridLayoutItem[]) => {
  if (left.length !== right.length) return false;

  const sortedLeft = sortGridLayout(left);
  const sortedRight = sortGridLayout(right);

  return sortedLeft.every((item, index) => {
    const next = sortedRight[index];
    return Boolean(
      next
      && item.i === next.i
      && item.x === next.x
      && item.y === next.y
      && item.w === next.w
      && item.h === next.h
      && item.minW === next.minW
      && item.minH === next.minH
    );
  });
};

const getCompactItemBehavior = (
  widget?: { type?: WidgetType; props?: Record<string, unknown> },
) => {
  const autoOccupyRow = Boolean(widget?.props?.autoOccupyRow);
  const lockToColumn = autoOccupyRow;

  return {
    autoOccupyRow,
    lockToColumn,
  };
};

const clampCompactItem = (
  item: Partial<GridLayoutItem>,
  behavior: { autoOccupyRow: boolean; lockToColumn: boolean },
  parentCols: number,
): GridLayoutItem => {
  const normalized = normalizeGridItem(item);
  const contentCols = getCompactContentCols(parentCols);
  const minH = normalized.minH != null ? Math.max(1, normalized.minH) : undefined;

  if (behavior.autoOccupyRow) {
    return {
      ...normalized,
      x: 0,
      w: contentCols,
      minW: contentCols,
      minH,
    };
  }

  const minW = normalized.minW != null ? Math.min(contentCols, Math.max(1, normalized.minW)) : undefined;
  const width = Math.min(contentCols, Math.max(minW ?? 1, normalized.w));

  return {
    ...normalized,
    x: behavior.lockToColumn
      ? 0
      : Math.max(0, Math.min(normalized.x, Math.max(0, contentCols - width))),
    w: width,
    minW,
    minH,
  };
};

const normalizeCompactLayout = (
  sourceLayout: readonly GridLayoutItem[],
  widgets: Record<string, { type?: WidgetType; props?: Record<string, unknown> }>,
  parentCols: number,
  enabled: boolean,
) => {
  if (!enabled) {
    return sourceLayout.map((item) => ({ ...normalizeGridItem(item) }));
  }

  const clampedLayout = sourceLayout.map((item) => {
    const widget = widgets[item.i];
    return clampCompactItem(item, getCompactItemBehavior(widget), parentCols);
  });

  return COMPACT_GRID_COMPACTOR
    .compact(clampedLayout, parentCols)
    .map((item) => {
      const widget = widgets[item.i];
      return clampCompactItem(item, getCompactItemBehavior(widget), parentCols);
    });
};

const findClosestContainerDropTarget = (source: EventTarget | Element | null) => {
  let current = source instanceof Element ? source : null;

  while (current) {
    const widgetId = current.getAttribute('data-builder-node-id');
    const widgetType = current.getAttribute('data-builder-node-type');

    if (widgetId && widgetType && isContainerWidget(widgetType as WidgetType)) {
      return {
        element: current as HTMLElement,
        widgetId,
        widgetType: widgetType as WidgetType,
      };
    }

    current = current.parentElement;
  }

  return null;
};

const findContainerDropTargetAtPoint = (
  clientX: number,
  clientY: number,
  ignoreWidgetId?: string,
) => {
  const directTarget = findClosestContainerDropTarget(document.elementFromPoint(clientX, clientY));
  if (directTarget && directTarget.widgetId !== ignoreWidgetId) {
    return directTarget;
  }

  const fallbackTargets = Array.from(
    document.querySelectorAll<HTMLElement>('[data-builder-node-id][data-builder-node-type]'),
  )
    .map((element) => {
      const widgetId = element.getAttribute('data-builder-node-id');
      const widgetType = element.getAttribute('data-builder-node-type');
      if (!widgetId || !widgetType || widgetId === ignoreWidgetId || !isContainerWidget(widgetType as WidgetType)) {
        return null;
      }

      if (!isPointInsideElement(element, clientX, clientY)) {
        return null;
      }

      const bounds = element.getBoundingClientRect();
      return {
        element,
        widgetId,
        widgetType: widgetType as WidgetType,
        area: bounds.width * bounds.height,
      };
    })
    .filter((target): target is {
      element: HTMLElement;
      widgetId: string;
      widgetType: WidgetType;
      area: number;
    } => Boolean(target))
    .sort((left, right) => left.area - right.area);

  if (fallbackTargets.length === 0) {
    return null;
  }

  const [{ area: _area, ...target }] = fallbackTargets;
  return target;
};

const parseViewportTransform = (transform: string | null | undefined) => {
  if (!transform || transform === 'none') {
    return { scale: 1, x: 0, y: 0 };
  }

  const matrix3dMatch = transform.match(/matrix3d\((.+)\)/);
  if (matrix3dMatch) {
    const values = matrix3dMatch[1].split(',').map((value) => Number(value.trim()));
    return {
      scale: Number.isFinite(values[0]) && values[0] !== 0 ? values[0] : 1,
      x: Number.isFinite(values[12]) ? values[12] : 0,
      y: Number.isFinite(values[13]) ? values[13] : 0,
    };
  }

  const matrixMatch = transform.match(/matrix\((.+)\)/);
  if (matrixMatch) {
    const values = matrixMatch[1].split(',').map((value) => Number(value.trim()));
    return {
      scale: Number.isFinite(values[0]) && values[0] !== 0 ? values[0] : 1,
      x: Number.isFinite(values[4]) ? values[4] : 0,
      y: Number.isFinite(values[5]) ? values[5] : 0,
    };
  }

  return { scale: 1, x: 0, y: 0 };
};

const screenToKitBoardFlowPosition = (clientX: number, clientY: number) => {
  const boardHost = document.querySelector<HTMLElement>(KIT_BOARD_HOST_SELECTOR);
  if (!boardHost) return null;

  const viewport = boardHost.querySelector<HTMLElement>('.react-flow__viewport');
  const rect = boardHost.getBoundingClientRect();
  const { scale, x, y } = parseViewportTransform(
    viewport ? window.getComputedStyle(viewport).transform : null,
  );

  return {
    x: Math.round((clientX - rect.left - x) / scale),
    y: Math.round((clientY - rect.top - y) / scale),
  };
};

const isBoardManagedRootWidget = (widget?: RootBoardWidgetMeta | null) => {
  if (!widget) return true;
  const publishedMasterName = typeof widget.props?.kitTemplateName === 'string'
    ? widget.props.kitTemplateName.trim()
    : '';

  return isContainerWidget(widget.type) || publishedMasterName.length > 0;
};

const resolveRootNodePixelSize = (
  layoutItem: { w: number; h: number },
  widget?: RootBoardWidgetMeta | null,
) => {
  const width = Math.max(1, layoutItem.w * ROOT_MASTER_CELL_WIDTH);
  const height = Math.max(1, layoutItem.h * (isBoardManagedRootWidget(widget) ? 22 : ROOT_CONTROL_ROW_HEIGHT));

  if (!isBoardManagedRootWidget(widget)) {
    return { width, height };
  }

  return {
    width: Math.max(220, width),
    height: Math.max(140, height),
  };
};

const rectsOverlap = (
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
) => {
  if (left.x + left.width + ROOT_NODE_GAP <= right.x) return false;
  if (right.x + right.width + ROOT_NODE_GAP <= left.x) return false;
  if (left.y + left.height + ROOT_NODE_GAP <= right.y) return false;
  if (right.y + right.height + ROOT_NODE_GAP <= left.y) return false;
  return true;
};

const layoutItemToRootRect = (
  layoutItem: { x: number; y: number; w: number; h: number },
  widget?: RootBoardWidgetMeta | null,
) => {
  const size = resolveRootNodePixelSize(layoutItem, widget);

  return {
    x: Number(layoutItem.x) || 0,
    y: Number(layoutItem.y) || 0,
    width: size.width,
    height: size.height,
  };
};

const findRootLayoutCollision = (
  candidate: { i: string; x: number; y: number; w: number; h: number },
  rootLayout: readonly GridLayoutItem[],
  widgets: Record<string, RootBoardWidgetMeta>,
  candidateWidget: RootBoardWidgetMeta | undefined,
  ignoreId?: string,
) => {
  const candidateRect = layoutItemToRootRect(candidate, candidateWidget);

  for (const item of rootLayout) {
    if (item.i === ignoreId || item.i === candidate.i) continue;
    const widget = widgets[item.i];
    if (!widget) continue;
    const itemRect = layoutItemToRootRect(item, widget);
    if (rectsOverlap(candidateRect, itemRect)) {
      return itemRect;
    }
  }

  return null;
};

const placeRootLayoutItemWithoutOverlap = (
  candidate: { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number },
  rootLayout: readonly GridLayoutItem[],
  widgets: Record<string, RootBoardWidgetMeta>,
  candidateWidget: RootBoardWidgetMeta | undefined,
  ignoreId?: string,
) => {
  let nextItem = { ...candidate };
  let guard = 0;

  while (guard < 200) {
    const collision = findRootLayoutCollision(nextItem, rootLayout, widgets, candidateWidget, ignoreId);
    if (!collision) return nextItem;

    nextItem = {
      ...nextItem,
      y: Math.ceil((collision.y + collision.height + ROOT_NODE_GAP) / ROOT_CONTROL_ROW_HEIGHT) * ROOT_CONTROL_ROW_HEIGHT,
    };
    guard += 1;
  }

  return nextItem;
};

const isPointInsideElement = (
  element: HTMLElement,
  clientX: number,
  clientY: number,
) => {
  const rect = element.getBoundingClientRect();
  return rect.width > 0
    && rect.height > 0
    && clientX >= rect.left
    && clientX <= rect.right
    && clientY >= rect.top
    && clientY <= rect.bottom;
};

const isPointInsideAnyNestedCanvas = (
  clientX: number,
  clientY: number,
) => (
  Array.from(document.querySelectorAll<HTMLElement>(NESTED_CANVAS_HOST_SELECTOR))
    .some((element) => isPointInsideElement(element, clientX, clientY))
);

const copyComputedCustomProperties = (source: HTMLElement, target: HTMLElement) => {
  const computedStyle = window.getComputedStyle(source);

  for (const propertyName of computedStyle) {
    if (!propertyName.startsWith('--')) continue;
    const propertyValue = computedStyle.getPropertyValue(propertyName);
    if (!propertyValue) continue;
    target.style.setProperty(propertyName, propertyValue);
  }
};

const clearKitRootDropPreview = () => {
  window.dispatchEvent(new CustomEvent(KIT_ROOT_DROP_PREVIEW_EVENT, {
    detail: { action: 'clear' },
  }));
};

const clearKitCrossCardPreview = () => {
  window.dispatchEvent(new CustomEvent(KIT_CROSS_CARD_PREVIEW_EVENT, {
    detail: { action: 'clear' } satisfies CrossCardPreviewEventDetail,
  }));
};

const showKitCrossCardPreview = (detail: Extract<CrossCardPreviewEventDetail, { action: 'show' }>) => {
  window.dispatchEvent(new CustomEvent(KIT_CROSS_CARD_PREVIEW_EVENT, {
    detail,
  }));
};

const showKitRootDropPreview = (
  widgetId: string,
  widgetType: WidgetType,
  element: HTMLElement,
  clientX?: number,
  clientY?: number,
) => {
  const bounds = element.getBoundingClientRect();

  window.dispatchEvent(new CustomEvent(KIT_ROOT_DROP_PREVIEW_EVENT, {
    detail: {
      action: 'show',
      widgetId,
      widgetType,
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
      clientX,
      clientY,
    },
  }));
};

const escapeAttributeValue = (value: string) => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }

  return value.replace(/["\\]/g, '\\$&');
};

export const NestedCanvas: React.FC<NestedCanvasProps> = ({
  id,
  className,
  compact = false,
  layoutMode = 'grid',
  paddingLeft,
  paddingRight,
  paddingTop,
  paddingBottom,
  paddingX,
  paddingY,
  gap,
  scrollable = true,
}) => {
  const scope = useBuilderWorkspaceScope();
  const {
    widgets,
    layouts,
    selectedId,
    kitStudioWidgets,
    kitStudioLayouts,
    selectedKitStudioId,
    draggedType,
    setDraggedType,
    addWidget,
    moveWidget,
    updateLayout,
    updateLayoutItem,
  } = useBuilderStore();
  const { width, containerRef, mounted } = useContainerWidth({ trackHeight: false, measureMode: 'layout' });
  const [nativeDropHost, setNativeDropHost] = useState<HTMLDivElement | null>(null);
  const [compactCanvasViewportHeight, setCompactCanvasViewportHeight] = useState(0);
  const [crossCardPreviewItem, setCrossCardPreviewItem] = useState<GridLayoutItem | null>(null);
  const rootPreviewActiveRef = useRef(false);
  const externalDragProxyRef = useRef<HTMLElement | null>(null);
  const scopedWidgets = scope === 'kit' ? kitStudioWidgets : widgets;
  const scopedLayouts = scope === 'kit' ? kitStudioLayouts : layouts;
  const scopedSelectedId = scope === 'kit' ? selectedKitStudioId : selectedId;
  const spacingFallback = compact ? 1 : 0;
  const gapFallback = compact ? 1 : 1;
  const safePaddingLeft = toSpacingNumber(paddingLeft ?? paddingX, spacingFallback);
  const safePaddingRight = toSpacingNumber(paddingRight ?? paddingX, spacingFallback);
  const safePaddingTop = toSpacingNumber(paddingTop ?? paddingY, spacingFallback);
  const safePaddingBottom = toSpacingNumber(paddingBottom ?? paddingY, spacingFallback);
  const safeGap = toSpacingNumber(gap, gapFallback);

  const layout = scopedLayouts[id] || [];
  const containerWidget = scopedWidgets[id];
  const containerLayout = containerWidget ? (scopedLayouts[containerWidget.parentId] || []) : [];
  const containerLayoutItem = containerLayout.find((item) => item.i === id);
  const parentCols = Math.max(1, Number(containerLayoutItem?.w || 8));
  const compactGridRulesEnabled = compact && layoutMode === 'grid';
  const compactCanvasShouldFillHeight = compactGridRulesEnabled && scrollable !== false;
  const compactCols = Math.max(1, parentCols);
  const activeCompactCols = compactCols;
  const activeCompactContentCols = getCompactContentCols(activeCompactCols);
  const gridLayout = useMemo(
    () => normalizeCompactLayout(layout as GridLayoutItem[], scopedWidgets, activeCompactCols, compactGridRulesEnabled),
    [activeCompactCols, compactGridRulesEnabled, layout, scopedWidgets],
  );
  const responsiveLayouts = useMemo(() => ({ lg: gridLayout }), [gridLayout]);
  const canvasWidth = Math.max(width, 120);
  const gridCanvasWidth = Math.max(120, canvasWidth - safePaddingLeft - safePaddingRight);
  const rowHeight = 18;
  const compactDropZoneMinHeight = rowHeight * 4 + 8;
  const layoutMaxY = useMemo(
    () => layout.reduce((maxY, item) => Math.max(maxY, Number(item.y ?? 0) + Number(item.h ?? 1)), 0),
    [layout],
  );
  const compactLayoutContentHeight = layoutMaxY > 0
    ? (layoutMaxY * rowHeight) + (Math.max(0, layoutMaxY - 1) * safeGap)
    : 0;
  const compactGridContentMinHeight = layoutMaxY > 0
    ? compactLayoutContentHeight
    : compactDropZoneMinHeight;
  const compactCanvasMinHeight = compactCanvasShouldFillHeight
    ? Math.max(compactGridContentMinHeight + safePaddingTop + safePaddingBottom, compactCanvasViewportHeight)
    : compactGridContentMinHeight + safePaddingTop + safePaddingBottom;
  const compactGridMinHeight = compactCanvasShouldFillHeight
    ? Math.max(compactGridContentMinHeight, compactCanvasMinHeight - safePaddingTop - safePaddingBottom)
    : compactGridContentMinHeight;
  const cols = compact
    ? {
        lg: activeCompactCols,
        md: activeCompactCols,
        sm: activeCompactCols,
        xs: activeCompactCols,
        xxs: activeCompactCols,
      }
    : PROJECT_GRID_COLS;
  const margin = [safeGap, safeGap];
  const setCanvasHost = useCallback((node: HTMLDivElement | null) => {
    containerRef(node);
    setNativeDropHost(node);
  }, [containerRef]);
  const resolveCompactRowsFromRootRows = useCallback((rows: number) => {
    const rootPixelHeight = Math.max(1, Number(rows || 1)) * ROOT_CONTROL_ROW_HEIGHT;
    return Math.max(1, Math.round((rootPixelHeight + safeGap) / Math.max(1, rowHeight + safeGap)));
  }, [rowHeight, safeGap]);
  const resolveIncomingCompactRows = useCallback((rows: number, sourceParentId?: string | null) => {
    const normalizedRows = Math.max(1, Number(rows || 1));
    return sourceParentId == null || sourceParentId === 'root'
      ? resolveCompactRowsFromRootRows(normalizedRows)
      : normalizedRows;
  }, [resolveCompactRowsFromRootRows]);
  const getCurrentContainerElement = useCallback(() => (
    document.querySelector<HTMLElement>(`[data-builder-node-id="${escapeAttributeValue(id)}"]`)
  ), [id]);

  const setRootPreviewActive = useCallback((active: boolean) => {
    rootPreviewActiveRef.current = active;
    if (!nativeDropHost) return;

    if (active) {
      nativeDropHost.setAttribute(KIT_ROOT_PREVIEW_ACTIVE_ATTR, 'true');
      return;
    }

    nativeDropHost.removeAttribute(KIT_ROOT_PREVIEW_ACTIVE_ATTR);
  }, [nativeDropHost]);

  const setCrossCardPreviewSourceActive = useCallback((active: boolean) => {
    if (!nativeDropHost) return;

    if (active) {
      nativeDropHost.setAttribute(KIT_CROSS_CARD_PREVIEW_SOURCE_ATTR, 'true');
      return;
    }

    nativeDropHost.removeAttribute(KIT_CROSS_CARD_PREVIEW_SOURCE_ATTR);
  }, [nativeDropHost]);

  const clearExternalRootPreview = useCallback(() => {
    setRootPreviewActive(false);
    clearKitRootDropPreview();
  }, [setRootPreviewActive]);

  const clearCrossCardPreview = useCallback(() => {
    setCrossCardPreviewSourceActive(false);
    setCrossCardPreviewItem(null);
    clearKitCrossCardPreview();
  }, [setCrossCardPreviewSourceActive]);

  const cleanupExternalDragProxy = useCallback(() => {
    if (externalDragProxyRef.current?.parentNode) {
      externalDragProxyRef.current.parentNode.removeChild(externalDragProxyRef.current);
    }
    externalDragProxyRef.current = null;
  }, []);

  const updateExternalDragProxy = useCallback((sourceElement: HTMLElement) => {
    const bounds = sourceElement.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    let dragProxy = externalDragProxyRef.current;
    if (!dragProxy) {
      const clonedProxy = sourceElement.cloneNode(true);
      if (!(clonedProxy instanceof HTMLElement)) return;
      dragProxy = clonedProxy;
      copyComputedCustomProperties(sourceElement, dragProxy);
      dragProxy.setAttribute('data-widget-drag-proxy', 'true');
      dragProxy.setAttribute('data-widget-selected', 'false');
      dragProxy.querySelectorAll<HTMLElement>('[data-widget-selected]').forEach((element) => {
        element.setAttribute('data-widget-selected', 'false');
      });
      dragProxy.style.position = 'fixed';
      dragProxy.style.top = '0';
      dragProxy.style.left = '0';
      dragProxy.style.margin = '0';
      dragProxy.style.pointerEvents = 'none';
      dragProxy.style.overflow = 'visible';
      dragProxy.style.zIndex = '9999';
      dragProxy.style.display = 'block';
      dragProxy.style.boxSizing = 'border-box';
      dragProxy.style.transition = 'none';
      document.body.appendChild(dragProxy);
      externalDragProxyRef.current = dragProxy;
    }

    dragProxy.style.width = `${bounds.width}px`;
    dragProxy.style.height = `${bounds.height}px`;
    dragProxy.style.transform = `translate3d(${Math.round(bounds.left)}px, ${Math.round(bounds.top)}px, 0)`;
  }, []);

  const showExternalRootPreview = useCallback((
    widgetId: string,
    widgetType: WidgetType,
    element: HTMLElement,
    clientX: number,
    clientY: number,
  ) => {
    setRootPreviewActive(true);
    showKitRootDropPreview(widgetId, widgetType, element, clientX, clientY);
  }, [setRootPreviewActive]);

  useEffect(() => () => {
    nativeDropHost?.removeAttribute(KIT_ROOT_PREVIEW_ACTIVE_ATTR);
    nativeDropHost?.removeAttribute(KIT_CROSS_CARD_PREVIEW_SOURCE_ATTR);
    cleanupExternalDragProxy();
  }, [cleanupExternalDragProxy, nativeDropHost]);

  useEffect(() => {
    if (!compactCanvasShouldFillHeight) {
      setCompactCanvasViewportHeight(0);
      return;
    }

    const viewportElement = nativeDropHost?.parentElement;
    if (!viewportElement) return;

    const updateViewportHeight = () => {
      const nextHeight = Math.max(0, Math.round(viewportElement.clientHeight));
      setCompactCanvasViewportHeight((currentHeight) => (
        currentHeight === nextHeight ? currentHeight : nextHeight
      ));
    };

    updateViewportHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateViewportHeight);
      return () => window.removeEventListener('resize', updateViewportHeight);
    }

    const observer = new ResizeObserver(() => {
      updateViewportHeight();
    });
    observer.observe(viewportElement);

    return () => observer.disconnect();
  }, [compactCanvasShouldFillHeight, nativeDropHost]);

  useEffect(() => {
    if (!compactGridRulesEnabled) return;
    const normalizedSource = normalizeCompactLayout(layout as GridLayoutItem[], scopedWidgets, parentCols, true);
    const currentSource = (layout as GridLayoutItem[]).map((item) => normalizeGridItem(item));
    if (areGridLayoutsEqual(currentSource, normalizedSource)) return;
    updateLayout(id, normalizedSource as any[], scope);
  }, [compactGridRulesEnabled, id, layout, parentCols, scopedWidgets, scope, updateLayout]);

  useEffect(() => {
    if (!compactGridRulesEnabled || scrollable !== false) return;
    if (containerWidget?.type !== 'panel' || !containerWidget.parentId) return;

    const parentId = containerWidget.parentId;
    const parentLayout = scopedLayouts[parentId] ?? [];
    const selfLayoutItem = parentLayout.find((item) => item.i === id);
    if (!selfLayoutItem) return;

    const contentHeight = (layoutMaxY > 0 ? compactLayoutContentHeight : compactDropZoneMinHeight)
      + safePaddingTop
      + safePaddingBottom;
    const hasHeader = containerWidget.props?.showHeader !== false && Boolean(containerWidget.props?.title);
    const hasFooter = containerWidget.props?.showFooter === true;
    const requiredHeight = contentHeight + (hasHeader ? 32 : 0) + (hasFooter ? 32 : 0) + 2;
    const parentWidget = parentId === 'root' ? null : scopedWidgets[parentId];
    const parentRowHeight = parentId === 'root'
      ? (scope === 'kit' ? 22 : 20)
      : rowHeight;
    const parentGap = parentId === 'root'
      ? (scope === 'kit' ? 0 : 6)
      : toSpacingNumber(parentWidget?.props?.gap, 1);
    const rawTargetHeight = (requiredHeight + parentGap) / (parentRowHeight + parentGap);
    const targetHeight = Math.max(2, Math.ceil(rawTargetHeight));
    const currentMinHeight = selfLayoutItem.minH != null ? Number(selfLayoutItem.minH) : undefined;
    const normalizedCurrentMinHeight = currentMinHeight != null
      ? Math.max(1, Math.ceil(currentMinHeight))
      : undefined;
    const nextMinHeight = normalizedCurrentMinHeight != null && normalizedCurrentMinHeight > targetHeight
      ? targetHeight
      : normalizedCurrentMinHeight;

    if (Number(selfLayoutItem.h) === targetHeight && normalizedCurrentMinHeight === nextMinHeight) return;

    const frame = window.requestAnimationFrame(() => {
      updateLayoutItem(
        id,
        parentId,
        nextMinHeight != null ? { h: targetHeight, minH: nextMinHeight } : { h: targetHeight },
        scope,
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    compactDropZoneMinHeight,
    compactLayoutContentHeight,
    compactGridRulesEnabled,
    containerWidget?.parentId,
    containerWidget?.props?.showFooter,
    containerWidget?.props?.showHeader,
    containerWidget?.props?.title,
    containerWidget?.type,
    id,
    layoutMaxY,
    rowHeight,
    safeGap,
    safePaddingBottom,
    safePaddingTop,
    scopedLayouts,
    scopedWidgets,
    scope,
    scrollable,
    updateLayoutItem,
  ]);

  const canNestExistingWidget = (widgetId: string) => {
    const sourceWidget = scopedWidgets[widgetId];
    if (!sourceWidget) return false;
    if (isContainerWidget(sourceWidget.type)) return false;

    const publishedMasterName = typeof sourceWidget.props?.kitTemplateName === 'string'
      ? sourceWidget.props.kitTemplateName.trim()
      : '';

    if (scope === 'kit' && sourceWidget.parentId === 'root' && publishedMasterName) {
      return false;
    }

    return true;
  };

  const getPlaceholderSize = (type: string | null) => {
    let w = 4;
    let h = 4;
    if (type === 'template') {
      w = 1;
      h = 1;
    } else if (type) {
      const size = getDefaultWidgetSize(type as WidgetType, compact ? activeCompactContentCols : 48);
      w = size.w;
      h = size.h;
    }
    const maxCols = compact ? activeCompactContentCols : 48;
    w = Math.min(w, maxCols);
    return { w, h };
  };

  const resolveCompactIncomingLayout = useCallback((
    item: { x?: number; y?: number; w?: number; h?: number; minW?: number; minH?: number } | null | undefined,
    sourceLayoutItem: { w?: number; h?: number; minW?: number; minH?: number } | null | undefined,
    widgetMeta?: { props?: Record<string, unknown> },
    sourceParentId?: string | null,
  ) => {
    const behavior = getCompactItemBehavior(widgetMeta);
    const fallbackWidth = Math.max(1, Number(sourceLayoutItem?.w ?? item?.w ?? 8));
    const fallbackHeight = Math.max(1, Number(sourceLayoutItem?.h ?? item?.h ?? 6));
    const nextWidth = behavior.autoOccupyRow
      ? activeCompactContentCols
      : Math.min(activeCompactContentCols, fallbackWidth);
    const minHeight = sourceLayoutItem?.minH != null
      ? resolveIncomingCompactRows(Number(sourceLayoutItem.minH), sourceParentId)
      : undefined;

    return {
      x: behavior.autoOccupyRow
        ? 0
        : Math.max(0, Math.min(Math.round(Number(item?.x ?? 0)), Math.max(0, activeCompactContentCols - nextWidth))),
      y: Math.max(0, Math.round(Number(item?.y ?? 0))),
      w: nextWidth,
      h: Math.max(minHeight ?? 1, resolveIncomingCompactRows(fallbackHeight, sourceParentId)),
      minW: behavior.autoOccupyRow
        ? activeCompactContentCols
        : sourceLayoutItem?.minW,
      minH: minHeight,
    };
  }, [activeCompactContentCols, resolveIncomingCompactRows]);

  useEffect(() => {
    const handleCrossCardPreviewEvent = (event: Event) => {
      const detail = (event as CustomEvent<CrossCardPreviewEventDetail>).detail;
      if (!detail || detail.action === 'clear') {
        setCrossCardPreviewItem(null);
        return;
      }

      if (detail.sourceContainerId === id || detail.targetContainerId !== id || layoutMode !== 'grid') {
        setCrossCardPreviewItem(null);
        return;
      }

      const targetChildLayout = scopedLayouts[id] ?? [];
      const nextChildY = targetChildLayout.reduce(
        (maxY, item) => Math.max(maxY, Number(item.y ?? 0) + Number(item.h ?? 1)),
        0,
      );
      const sourceLayoutItem = detail.sourceLayoutItem ?? undefined;
      const fallbackWidth = Math.max(1, Number(sourceLayoutItem?.w ?? 4));
      const fallbackHeight = Math.max(1, Number(sourceLayoutItem?.h ?? 4));

      const nextPreviewItem = compactGridRulesEnabled
        ? {
            i: '__cross-card-preview__',
            ...resolveCompactIncomingLayout(
              {
                x: 0,
                y: nextChildY,
                w: fallbackWidth,
                h: fallbackHeight,
                minW: sourceLayoutItem?.minW,
                minH: sourceLayoutItem?.minH,
              },
              sourceLayoutItem,
              detail.widgetMeta,
              detail.sourceParentId,
            ),
          }
        : normalizeGridItem({
            i: '__cross-card-preview__',
            x: 0,
            y: nextChildY,
            w: fallbackWidth,
            h: fallbackHeight,
            minW: sourceLayoutItem?.minW,
            minH: sourceLayoutItem?.minH,
          });

      setCrossCardPreviewItem(nextPreviewItem);
    };

    window.addEventListener(KIT_CROSS_CARD_PREVIEW_EVENT, handleCrossCardPreviewEvent as EventListener);
    return () => window.removeEventListener(KIT_CROSS_CARD_PREVIEW_EVENT, handleCrossCardPreviewEvent as EventListener);
  }, [compactGridRulesEnabled, id, layoutMode, resolveCompactIncomingLayout, scopedLayouts]);

  const handleDrop = (nextLayout: any[], item: any, e: any) => {
    cleanupExternalDragProxy();
    clearExternalRootPreview();
    clearCrossCardPreview();
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const movedWidgetId = e.dataTransfer?.getData('application/x-widget-id');
    const movedWidgetScope = (e.dataTransfer?.getData('application/x-builder-scope') as 'page' | 'kit' | '') || 'page';
    if (movedWidgetId && item && movedWidgetScope === scope && scopedWidgets[movedWidgetId]) {
      const sourceWidget = scopedWidgets[movedWidgetId];
      if (!canNestExistingWidget(movedWidgetId)) {
        setDraggedType(null);
        return;
      }
      const sourceLayoutItem = scopedLayouts[sourceWidget.parentId]?.find((layoutItem) => layoutItem.i === movedWidgetId);
      const proposedItem = compactGridRulesEnabled
        ? {
          i: movedWidgetId,
            ...resolveCompactIncomingLayout(item, sourceLayoutItem, sourceWidget, sourceWidget.parentId),
          }
        : {
            i: movedWidgetId,
            x: item.x,
            y: item.y,
            w: sourceLayoutItem?.w || item.w || 8,
            h: sourceLayoutItem?.h || item.h || 6,
            minW: sourceLayoutItem?.minW,
            minH: sourceLayoutItem?.minH,
          };
      moveWidget(movedWidgetId, id, proposedItem, scope);
      setDraggedType(null);
      return;
    }

    const type = (e.dataTransfer?.getData('text/plain') || draggedType) as WidgetType | 'template';
    if (!type || !item) return;

    if (type === 'template') {
      setDraggedType(null);
      return;
    }
    if (isContainerWidget(type as WidgetType)) {
      setDraggedType(null);
      return;
    }

    const newId = createWidgetId();
    const { w, h } = getPlaceholderSize(type as WidgetType);
    const proposedItem = compactGridRulesEnabled
      ? {
          i: newId,
          ...resolveCompactIncomingLayout(item, { w, h }, { props: { autoOccupyRow: true } }, 'root'),
        }
      : {
          i: newId,
          x: item.x,
          y: item.y,
          w,
          h,
        };

    addWidget(newId, type as WidgetType, proposedItem, id, undefined, scope);
    setDraggedType(null);
  };

  const resolveNativeDropItem = (
    event: React.DragEvent<HTMLDivElement>,
    sourceItem: Partial<GridLayoutItem>,
    itemId: string,
    widgetMeta?: { props?: Record<string, unknown> },
    sourceParentId?: string | null,
  ): GridLayoutItem => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const activeCols = compact ? activeCompactCols : PROJECT_GRID_COLS.lg;
    const maxCols = compact ? activeCompactContentCols : activeCols;
    const width = Math.min(Math.max(1, Number(sourceItem.w ?? 4)), maxCols);
    const cellWidth = Math.max(1, bounds.width / Math.max(1, activeCols));
    const relativeX = Math.max(0, event.clientX - bounds.left);
    const relativeY = Math.max(0, event.clientY - bounds.top);
    const behavior = getCompactItemBehavior(widgetMeta);
    const incomingHeight = Math.max(1, Number(sourceItem.h ?? 4));
    const incomingMinHeight = sourceItem.minH != null
      ? resolveIncomingCompactRows(Number(sourceItem.minH), sourceParentId)
      : undefined;

    return normalizeGridItem({
      i: itemId,
      x: compactGridRulesEnabled
        ? (behavior.autoOccupyRow
          ? 0
          : Math.max(0, Math.min(Math.floor(relativeX / cellWidth), Math.max(0, maxCols - width))))
        : Math.max(0, Math.min(Math.floor(relativeX / cellWidth), Math.max(0, maxCols - width))),
      y: Math.max(0, Math.floor(relativeY / Math.max(1, rowHeight + margin[1]))),
      w: compactGridRulesEnabled && behavior.autoOccupyRow ? activeCompactContentCols : width,
      h: Math.max(incomingMinHeight ?? 1, compactGridRulesEnabled
        ? resolveIncomingCompactRows(incomingHeight, sourceParentId)
        : incomingHeight),
      minW: compactGridRulesEnabled && behavior.autoOccupyRow ? activeCompactContentCols : sourceItem.minW,
      minH: incomingMinHeight,
    });
  };

  const handleNativeDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    cleanupExternalDragProxy();
    clearExternalRootPreview();
    clearCrossCardPreview();

    const movedWidgetId = event.dataTransfer?.getData('application/x-widget-id');
    const movedWidgetScope = (event.dataTransfer?.getData('application/x-builder-scope') as 'page' | 'kit' | '') || 'page';

    if (movedWidgetId && movedWidgetScope === scope && scopedWidgets[movedWidgetId]) {
      if (!canNestExistingWidget(movedWidgetId)) {
        setDraggedType(null);
        return;
      }

      const sourceWidget = scopedWidgets[movedWidgetId];
      const sourceLayoutItem = scopedLayouts[sourceWidget.parentId]?.find((layoutItem) => layoutItem.i === movedWidgetId);
      const proposedItem = resolveNativeDropItem(
        event,
        sourceLayoutItem ?? { w: 8, h: 6 },
        movedWidgetId,
        sourceWidget,
        sourceWidget.parentId,
      );

      moveWidget(movedWidgetId, id, proposedItem, scope);
      setDraggedType(null);
      return;
    }

    const type = (event.dataTransfer?.getData('text/plain') || draggedType) as WidgetType | 'template';
    if (!type || type === 'template' || isContainerWidget(type as WidgetType)) {
      setDraggedType(null);
      return;
    }

    const newId = createWidgetId();
    const proposedItem = resolveNativeDropItem(
      event,
      getPlaceholderSize(type as WidgetType),
      newId,
      { props: { autoOccupyRow: true } },
      'root',
    );

    addWidget(newId, type as WidgetType, proposedItem, id, undefined, scope);
    setDraggedType(null);
  };

  useEffect(() => {
    if (!nativeDropHost) return;
    if (layoutMode === 'grid') return;

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    };
    const handleDropEvent = (event: DragEvent) => {
      handleNativeDrop(event as unknown as React.DragEvent<HTMLDivElement>);
    };

    nativeDropHost.addEventListener('dragover', handleDragOver);
    nativeDropHost.addEventListener('drop', handleDropEvent);

    return () => {
      nativeDropHost.removeEventListener('dragover', handleDragOver);
      nativeDropHost.removeEventListener('drop', handleDropEvent);
    };
  }, [handleNativeDrop, layoutMode, nativeDropHost]);

  const handleDropDragOver = (e: any) => {
    clearExternalRootPreview();
    clearCrossCardPreview();
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const movedWidgetId = e?.dataTransfer?.getData('application/x-widget-id');
    const movedWidgetScope = (e?.dataTransfer?.getData('application/x-builder-scope') as 'page' | 'kit' | '') || 'page';
    if (movedWidgetId && movedWidgetScope === scope && !canNestExistingWidget(movedWidgetId)) {
      return false;
    }
    if (draggedType === 'template') {
      return false;
    }
    if (draggedType && isContainerWidget(draggedType as WidgetType)) {
      return false;
    }
    const movedWidget = movedWidgetId && movedWidgetScope === scope ? scopedWidgets[movedWidgetId] : undefined;
    const movedLayoutItem = movedWidget
      ? scopedLayouts[movedWidget.parentId]?.find((layoutItem) => layoutItem.i === movedWidgetId)
      : undefined;
    const placeholderSize = (() => {
      if (movedLayoutItem) {
        const behavior = getCompactItemBehavior(movedWidget);
        const height = Math.max(1, Number(movedLayoutItem.h ?? 4));
        const width = Math.min(activeCompactContentCols, Math.max(1, Number(movedLayoutItem.w ?? 4)));
        return {
          w: behavior.autoOccupyRow ? activeCompactContentCols : width,
          h: resolveIncomingCompactRows(height, movedWidget?.parentId),
        };
      }

      const size = getPlaceholderSize(draggedType);
      return compactGridRulesEnabled
        ? {
            ...size,
            h: resolveIncomingCompactRows(size.h, 'root'),
          }
        : size;
    })();

    return placeholderSize;
  };

  const commitSettledLayout = useCallback((nextLayout: any[]) => {
    updateLayout(
      id,
      normalizeCompactLayout(nextLayout as GridLayoutItem[], scopedWidgets, activeCompactCols, compactGridRulesEnabled) as any[],
      scope,
    );
  }, [activeCompactCols, compactGridRulesEnabled, id, scopedWidgets, scope, updateLayout]);

  const syncLayoutStop = (
    currentLayout: any[],
    oldItem: any,
    newItem: any,
    _placeholder?: any,
    event?: Event | MouseEvent,
    element?: HTMLElement,
    interaction: 'drag' | 'resize' = 'drag',
  ) => {
    cleanupExternalDragProxy();
    clearExternalRootPreview();
    clearCrossCardPreview();

    const pointerEvent = event instanceof MouseEvent ? event : null;

    if (interaction === 'drag' && scope === 'kit' && newItem?.i && pointerEvent) {
      const movedWidgetId = String(newItem.i);
      const movedWidget = scopedWidgets[movedWidgetId];
      const targetContainer = findContainerDropTargetAtPoint(
        pointerEvent.clientX,
        pointerEvent.clientY,
        movedWidgetId,
      );
      const currentContainerElement = getCurrentContainerElement();
      const currentCardContainsDrop = currentContainerElement
        ? isPointInsideElement(currentContainerElement, pointerEvent.clientX, pointerEvent.clientY)
        : false;

      if (currentCardContainsDrop) {
        commitSettledLayout(currentLayout);
      }

      if (
        movedWidget
        && targetContainer
        && targetContainer.widgetId !== id
        && targetContainer.widgetId !== movedWidgetId
      ) {
        const targetParentWidget = scopedWidgets[targetContainer.widgetId];
        if (targetParentWidget && isContainerWidget(targetParentWidget.type)) {
          const targetParentLayout = scopedLayouts[targetParentWidget.parentId] ?? [];
          const targetParentLayoutItem = targetParentLayout.find((item) => item.i === targetContainer.widgetId);
          const targetChildLayout = scopedLayouts[targetContainer.widgetId] ?? [];
          const targetMaxCols = Math.max(1, Number(targetParentLayoutItem?.w ?? 12));
          const nextChildY = targetChildLayout.reduce(
            (maxY, item) => Math.max(maxY, Number(item.y ?? 0) + Number(item.h ?? 1)),
            0,
          );
          const fallbackSize = getDefaultWidgetSize(movedWidget.type, targetMaxCols);
          const proposedItem = {
            i: movedWidgetId,
            x: 0,
            y: nextChildY,
            w: Math.min(targetMaxCols, Math.max(1, Number(newItem.w ?? oldItem?.w ?? fallbackSize.w))),
            h: Math.max(1, Number(newItem.h ?? oldItem?.h ?? fallbackSize.h)),
            minW: oldItem?.minW ?? newItem.minW,
            minH: oldItem?.minH ?? newItem.minH,
          };

          moveWidget(movedWidgetId, targetContainer.widgetId, proposedItem, scope);
          setDraggedType(null);
          return;
        }
      }
      if (movedWidget && !currentCardContainsDrop) {
        const bounds = element?.getBoundingClientRect();
        const boardPosition = bounds
          ? screenToKitBoardFlowPosition(bounds.left, bounds.top)
          : screenToKitBoardFlowPosition(pointerEvent.clientX, pointerEvent.clientY);
        if (boardPosition) {
          const rootLayoutWidth = bounds?.width && bounds.width > 0
            ? bounds.width / ROOT_MASTER_CELL_WIDTH
            : Number(newItem.w ?? oldItem?.w ?? 4);
          const rootLayoutHeight = bounds?.height && bounds.height > 0
            ? bounds.height / ROOT_CONTROL_ROW_HEIGHT
            : Number(newItem.h ?? oldItem?.h ?? 4);
          const proposedItem = placeRootLayoutItemWithoutOverlap({
            i: movedWidgetId,
            x: boardPosition.x,
            y: boardPosition.y,
            w: Math.max(1, rootLayoutWidth),
            h: Math.max(1, rootLayoutHeight),
            minW: oldItem?.minW ?? newItem.minW,
            minH: oldItem?.minH ?? newItem.minH,
          }, (scopedLayouts.root ?? []) as GridLayoutItem[], scopedWidgets as Record<string, RootBoardWidgetMeta>, movedWidget, movedWidgetId);

          moveWidget(movedWidgetId, 'root', proposedItem as any, scope);
          setDraggedType(null);
          return;
        }
      }
    }

    if (interaction !== 'drag') {
      commitSettledLayout(currentLayout);
    }
  };

  const handleInternalDrag = (currentLayout: any[], _oldItem: any, newItem: any, _placeholder?: any, event?: MouseEvent, element?: HTMLElement) => {
    if (scope !== 'kit' || !newItem?.i || !event || !element) return;

    const movedWidgetId = String(newItem.i);
    const movedWidget = scopedWidgets[movedWidgetId];
    if (!movedWidget) {
      clearExternalRootPreview();
      clearCrossCardPreview();
      return;
    }

    const currentContainerElement = getCurrentContainerElement();
    const currentCardContainsDrop = currentContainerElement
      ? isPointInsideElement(currentContainerElement, event.clientX, event.clientY)
      : false;
    const pointerInsideNestedCanvas = isPointInsideAnyNestedCanvas(event.clientX, event.clientY);
    const targetContainer = findContainerDropTargetAtPoint(
      event.clientX,
      event.clientY,
      movedWidgetId,
    );

    if (currentCardContainsDrop) {
      cleanupExternalDragProxy();
      clearExternalRootPreview();
      clearCrossCardPreview();
      return;
    }

    if (targetContainer && targetContainer.widgetId !== id) {
      const sourceLayoutItem = scopedLayouts[movedWidget.parentId]?.find((layoutItem) => layoutItem.i === movedWidgetId);
      setCrossCardPreviewSourceActive(true);
      showKitCrossCardPreview({
        action: 'show',
        sourceContainerId: id,
        targetContainerId: targetContainer.widgetId,
        sourceParentId: movedWidget.parentId,
        sourceLayoutItem: {
          w: Number(newItem.w ?? sourceLayoutItem?.w ?? 4),
          h: Number(newItem.h ?? sourceLayoutItem?.h ?? 4),
          minW: sourceLayoutItem?.minW,
          minH: sourceLayoutItem?.minH,
        },
        widgetMeta: {
          type: movedWidget.type,
          props: {
            autoOccupyRow: movedWidget.props?.autoOccupyRow,
          },
        },
      });
      cleanupExternalDragProxy();
      clearExternalRootPreview();
      return;
    }

    if (pointerInsideNestedCanvas || targetContainer) {
      clearCrossCardPreview();
      cleanupExternalDragProxy();
      clearExternalRootPreview();
      return;
    }

    if (screenToKitBoardFlowPosition(event.clientX, event.clientY)) {
      clearCrossCardPreview();
      updateExternalDragProxy(element);
      showExternalRootPreview(movedWidgetId, movedWidget.type, element, event.clientX, event.clientY);
      return;
    }

    clearCrossCardPreview();
    cleanupExternalDragProxy();
    clearExternalRootPreview();
  };

  const crossCardPreviewStyle = useMemo(() => {
    if (!crossCardPreviewItem || layoutMode !== 'grid') return null;

    const previewCols = compactGridRulesEnabled ? activeCompactCols : PROJECT_GRID_COLS.lg;
    if (previewCols <= 0) return null;

    const columnWidth = Math.max(1, (gridCanvasWidth - (Math.max(0, previewCols - 1) * safeGap)) / previewCols);
    const width = (Math.max(1, Number(crossCardPreviewItem.w ?? 1)) * columnWidth)
      + (Math.max(0, Number(crossCardPreviewItem.w ?? 1) - 1) * safeGap);
    const height = (Math.max(1, Number(crossCardPreviewItem.h ?? 1)) * rowHeight)
      + (Math.max(0, Number(crossCardPreviewItem.h ?? 1) - 1) * safeGap);
    const x = Math.max(0, Number(crossCardPreviewItem.x ?? 0)) * (columnWidth + safeGap);
    const y = Math.max(0, Number(crossCardPreviewItem.y ?? 0)) * (rowHeight + safeGap);

    return {
      width,
      height,
      transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
    } as React.CSSProperties;
  }, [activeCompactCols, compactGridRulesEnabled, crossCardPreviewItem, gridCanvasWidth, layoutMode, rowHeight, safeGap]);

  if (layoutMode === 'flex-row' || layoutMode === 'flex-col') {
    const flexDir = layoutMode === 'flex-row' ? 'flex-row' : 'flex-col';
    return (
      <div
        ref={setCanvasHost}
        data-nested-canvas-host="true"
        data-nested-canvas-parent-id={id}
        className={cn(
          'nowheel relative flex h-full w-full group/canvas',
          scrollable === false ? 'overflow-hidden' : 'overflow-auto',
          flexDir,
          className,
        )}
        style={{ gap: safeGap, padding: `${safePaddingTop}px ${safePaddingRight}px ${safePaddingBottom}px ${safePaddingLeft}px` }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleNativeDrop}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {layout.map((item) => {
          const widget = scopedWidgets[item.i];
          if (!widget) return null;
          const isSelected = scopedSelectedId === item.i;
          return (
            <div key={item.i} className={cn('shrink-0', isSelected && 'z-10')}>
              <WidgetWrapper id={item.i} />
            </div>
          );
        })}
        {layout.length === 0 && (
          <div className="flex flex-1 items-center justify-center opacity-0 transition-opacity pointer-events-none group-hover/canvas:opacity-100">
            <p className="text-xs text-hr-muted">Drop widgets here</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      data-nested-canvas-host="true"
      data-nested-canvas-parent-id={id}
      className={cn(
        compactGridRulesEnabled
          ? 'nowheel relative group/canvas w-full'
          : 'nowheel relative group/canvas h-full w-full',
        className,
      )}
      style={{
        padding: `${safePaddingTop}px ${safePaddingRight}px ${safePaddingBottom}px ${safePaddingLeft}px`,
        ...(compactGridRulesEnabled ? { minHeight: compactCanvasMinHeight } : {}),
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        clearExternalRootPreview();
      }}
      onDrop={handleNativeDrop}
      onMouseDown={(e) => e.stopPropagation()}
      ref={setCanvasHost}
    >
      {crossCardPreviewStyle ? (
        <div
          className="kit-cross-card-preview-layer"
          style={{
            left: safePaddingLeft,
            top: safePaddingTop,
            width: gridCanvasWidth,
            minHeight: compactGridContentMinHeight,
          }}
        >
          <div
            className="kit-cross-card-drop-preview react-grid-item react-grid-placeholder nested-grid-item"
            style={crossCardPreviewStyle}
          />
        </div>
      ) : null}
      {mounted && (compactGridRulesEnabled ? (
        <GridLayout
          className={cn(
            'layout nested-layout w-full',
            'min-h-full',
          )}
          style={{ minHeight: compactGridMinHeight }}
          layout={gridLayout as any}
          width={gridCanvasWidth}
          autoSize
          gridConfig={{
            cols: activeCompactCols,
            rowHeight,
            margin: margin as [number, number],
            containerPadding: [0, 0] as [number, number],
          }}
          compactor={COMPACT_GRID_COMPACTOR}
          onDrop={handleDrop as any}
          dropConfig={{
            enabled: draggedType !== 'template',
            defaultItem: getPlaceholderSize(draggedType),
            onDragOver: handleDropDragOver as any,
          }}
          onDrag={handleInternalDrag as any}
          onDragStop={(currentLayout, oldItem, newItem, placeholder, event, element) => syncLayoutStop(
            [...currentLayout],
            oldItem,
            newItem,
            placeholder,
            event,
            element,
            'drag',
          ) as any}
          onResizeStop={(currentLayout, oldItem, newItem, placeholder, event, element) => syncLayoutStop(
            [...currentLayout],
            oldItem,
            newItem,
            placeholder,
            event,
            element,
            'resize',
          ) as any}
          dragConfig={{
            enabled: true,
            handle: scope === 'kit' ? '.external-move-handle' : '.widget-wrapper',
            cancel: '.widget-delete-button, .widget-delete-button *',
            bounded: scope !== 'kit',
          }}
          resizeConfig={{ enabled: true }}
        >
          {gridLayout.map((item) => {
            const widget = scopedWidgets[item.i];
            if (!widget) return <div key={item.i} />;

            const isSelected = scopedSelectedId === item.i;

            return (
              <div
                key={item.i}
                data-grid={{
                  x: item.x,
                  y: item.y,
                  w: item.w,
                  h: item.h,
                  minW: item.minW || 1,
                  minH: item.minH || 1,
                }}
                className={cn('nested-grid-item', isSelected && 'z-10')}
              >
                <WidgetWrapper id={item.i} />
              </div>
            );
          })}
        </GridLayout>
      ) : (
        <ResponsiveGridLayout
          className="layout nested-layout w-full h-full min-h-0"
          layouts={responsiveLayouts}
          width={gridCanvasWidth}
          autoSize={false}
          breakpoints={PROJECT_GRID_BREAKPOINTS}
          cols={cols}
          rowHeight={rowHeight}
          containerPadding={[0, 0]}
          onDrop={handleDrop as any}
          onLayoutChange={(currentLayout: any[], allLayouts: Record<string, any[]>) => {
            commitSettledLayout(allLayouts?.lg ?? currentLayout);
          }}
          dropConfig={{
            enabled: draggedType !== 'template',
            defaultItem: getPlaceholderSize(draggedType),
            onDragOver: handleDropDragOver as any,
          }}
          onDrag={handleInternalDrag as any}
          onDragStop={(currentLayout, oldItem, newItem, placeholder, event, element) => syncLayoutStop(
            [...currentLayout],
            oldItem,
            newItem,
            placeholder,
            event,
            element,
            'drag',
          ) as any}
          onResizeStop={(currentLayout, oldItem, newItem, placeholder, event, element) => syncLayoutStop(
            [...currentLayout],
            oldItem,
            newItem,
            placeholder,
            event,
            element,
            'resize',
          ) as any}
          margin={margin as [number, number]}
          dragConfig={{
            enabled: true,
            handle: scope === 'kit' ? '.external-move-handle' : '.widget-wrapper',
            cancel: '.widget-delete-button, .widget-delete-button *',
            bounded: scope !== 'kit',
          }}
          resizeConfig={{ enabled: true }}
        >
          {gridLayout.map((item) => {
            const widget = scopedWidgets[item.i];
            if (!widget) return <div key={item.i} />;

            const isSelected = scopedSelectedId === item.i;

            return (
              <div
                key={item.i}
                data-grid={{
                  x: item.x,
                  y: item.y,
                  w: item.w,
                  h: item.h,
                  minW: item.minW || 1,
                  minH: item.minH || 1,
                }}
                className={cn('nested-grid-item', isSelected && 'z-10')}
              >
                <WidgetWrapper id={item.i} />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      ))}

      {layout.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity pointer-events-none group-hover/canvas:opacity-100">
          <div className="rounded-xl border border-dashed border-hr-border bg-hr-panel/50 p-4 text-center text-hr-muted backdrop-blur-sm">
            <p className="text-xs">Drop widgets here</p>
          </div>
        </div>
      )}
    </div>
  );
};
