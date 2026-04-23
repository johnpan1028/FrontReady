import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBuilderWorkspaceScope } from './workspaceScope';
import { useBuilderStore } from '../store/builderStore';
import { WidgetRegistry } from './registry';
import { cn } from '../utils/cn';
import { getWidgetCornerStyle, getWidgetFrameStyle } from '../runtime/frameStyle';
import { createWidgetId } from '../core/projectDocument';
import { doesWidgetFollowParentWidth, getDefaultWidgetMinSize, getDefaultWidgetSize, isContainerWidget, type WidgetType } from './widgetConfig';
import { getSlotShellAuthoringLayoutSpan, getSlotShellLayoutSpan } from './slotShell';

interface WidgetWrapperProps {
  id: string;
}

const KIT_BOARD_HOST_SELECTOR = '[data-kit-board-host="true"]';
const KIT_ROOT_DROP_PREVIEW_EVENT = 'kit-root-drop-preview';
const KIT_ROOT_DRAG_SESSION_EVENT = 'kit-root-drag-session';
const KIT_CROSS_CARD_PREVIEW_EVENT = 'kit-cross-card-drop-preview';
const KIT_ROOT_RESIZE_PREVIEW_EVENT = 'kit-root-resize-preview';
const NESTED_CANVAS_HOST_SELECTOR = '[data-nested-canvas-host="true"]';
const ROOT_RESIZE_PREVIEW_HOST_SELECTOR = '.project-theme-scope--inline';
const ROOT_MASTER_CELL_WIDTH = 28;
const ROOT_CONTROL_ROW_HEIGHT = 18;
const ROOT_BOARD_MANAGED_ROW_HEIGHT = 22;
const ROOT_NODE_GAP = 12;
const BORDERABLE_CONTROL_TYPES = new Set<WidgetType>([
  'heading',
  'text',
  'button',
  'icon_button',
  'divider',
  'text_input',
  'number_input',
  'textarea',
  'select',
  'checkbox',
  'radio',
  'image',
  'badge',
  'checkbox_item',
  'media_summary_card',
  'media_list_item',
  'setting_row',
  'choice_chip_group',
  'empty_state_card',
]);
const ROOT_RESIZE_PREVIEW_BORDER_WIDTH = 2;

type LayoutItemShape = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

type ParentStyleWidget = {
  parentId: string;
  props?: Record<string, unknown>;
};

const toGridNumber = (value: unknown, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const normalizeBorderStyleValue = (value: unknown): 'solid' | 'transparent' | 'parent' => (
  value === 'transparent' || value === 'parent' ? value : 'solid'
);

const resolveParentControlBorderStyle = (
  widgets: Record<string, ParentStyleWidget | undefined>,
  parentId: string,
  visited = new Set<string>(),
): 'solid' | 'transparent' => {
  const parentWidget = widgets[parentId];
  if (!parentWidget || visited.has(parentId)) return 'solid';
  visited.add(parentId);

  const parentBorderStyle = normalizeBorderStyleValue(
    parentWidget.props?.controlBorderStyle ?? parentWidget.props?.borderStyle,
  );

  if (parentBorderStyle === 'parent') {
    return parentWidget.parentId === 'root'
      ? 'solid'
      : resolveParentControlBorderStyle(widgets, parentWidget.parentId, visited);
  }

  return parentBorderStyle;
};

const resolveEffectiveWidgetProps = (
  widget: { parentId: string; props?: Record<string, unknown> } | undefined,
  widgets: Record<string, ParentStyleWidget | undefined>,
) => {
  const ownProps = widget?.props ?? {};
  if (!widget || widget.parentId === 'root') return ownProps;

  const parentWidget = widgets[widget.parentId];
  if (!parentWidget) return ownProps;

  const nextProps: Record<string, unknown> = { ...ownProps };
  const parentProps = parentWidget.props ?? {};

  if (
    ownProps.fontFamily === 'parent'
    && parentProps.childrenFollowFont === true
    && typeof parentProps.fontFamily === 'string'
  ) {
    nextProps.fontFamily = parentProps.fontFamily;
  }

  if (ownProps.borderStyle === 'parent' && parentProps.childrenFollowBorder === true) {
    nextProps.borderStyle = resolveParentControlBorderStyle(widgets, widget.parentId);
  }

  return nextProps;
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
    } => target !== null)
    .sort((left, right) => left.area - right.area);

  return fallbackTargets[0] ?? null;
};

const isNestedCanvasEventTarget = (source: EventTarget | Element | null) => (
  source instanceof Element && Boolean(source.closest(NESTED_CANVAS_HOST_SELECTOR))
);

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

const clearKitRootDropPreview = () => {
  window.dispatchEvent(new CustomEvent(KIT_ROOT_DROP_PREVIEW_EVENT, {
    detail: { action: 'clear' },
  }));
};

const clearKitCrossCardPreview = () => {
  window.dispatchEvent(new CustomEvent(KIT_CROSS_CARD_PREVIEW_EVENT, {
    detail: { action: 'clear' },
  }));
};

const showKitCrossCardPreview = (detail: {
  action: 'show';
  sourceContainerId: string;
  targetContainerId: string;
  sourceParentId?: string | null;
  sourceLayoutItem?: { w?: number; h?: number; minW?: number; minH?: number } | null;
  widgetMeta?: { type?: WidgetType; props?: Record<string, unknown> };
  previewWidth?: number;
  previewHeight?: number;
}) => {
  window.dispatchEvent(new CustomEvent(KIT_CROSS_CARD_PREVIEW_EVENT, {
    detail,
  }));
};

const dispatchKitRootDragSession = (
  action: 'start' | 'end',
  widgetId: string,
  widgetType: WidgetType | null,
  size?: { width: number; height: number },
) => {
  const detail = {
    action,
    widgetId,
    widgetType,
    ...(action === 'start' && size ? size : {}),
  };

  (window as any).__kitRootDragSession = action === 'start' ? detail : null;
  window.dispatchEvent(new CustomEvent(KIT_ROOT_DRAG_SESSION_EVENT, {
    detail,
  }));
};

const dispatchKitRootResizePreview = (
  detail:
    | { action: 'update'; widgetId: string; cols: number; rows: number; widthPx?: number; heightPx?: number }
    | { action: 'clear'; widgetId?: string },
) => {
  window.dispatchEvent(new CustomEvent(KIT_ROOT_RESIZE_PREVIEW_EVENT, { detail }));
};

const sortLayoutItems = (items: readonly LayoutItemShape[]) => (
  [...items].sort((left, right) => left.y - right.y || left.x - right.x || left.i.localeCompare(right.i))
);

const getNonFollowingChildRowSpan = (
  layout: readonly LayoutItemShape[],
  widgets: Record<string, { props?: Record<string, unknown> } | undefined>,
) => {
  const rowSpans = new Map<number, number>();

  layout.forEach((rawItem) => {
    const item = {
      x: Math.max(0, Math.round(toGridNumber(rawItem.x))),
      y: Math.max(0, Math.round(toGridNumber(rawItem.y))),
      w: Math.max(1, Math.round(toGridNumber(rawItem.w, 1))),
      h: Math.max(1, Math.round(toGridNumber(rawItem.h, 1))),
      i: rawItem.i,
    };

    if (doesWidgetFollowParentWidth(widgets[item.i]?.props)) {
      return;
    }

    const span = item.x + item.w;
    for (let rowIndex = item.y; rowIndex < item.y + item.h; rowIndex += 1) {
      rowSpans.set(rowIndex, Math.max(rowSpans.get(rowIndex) ?? 0, span));
    }
  });

  return Array.from(rowSpans.values()).reduce((maxSpan, span) => Math.max(maxSpan, span), 0);
};

const resolvePanelRuntimeMinCols = ({
  layout,
  widgets,
}: {
  layout: readonly LayoutItemShape[];
  widgets: Record<string, { props?: Record<string, unknown> } | undefined>;
}) => {
  if (layout.length === 0) return null;

  const fixedRowSpan = getNonFollowingChildRowSpan(layout, widgets);
  if (fixedRowSpan <= 0) return null;

  return Math.max(1, Math.ceil(fixedRowSpan));
};

const reorderWidgetInSameContainer = (
  widgetId: string,
  parentId: string,
  releaseClientY: number,
  containerElement: HTMLElement,
  layouts: Record<string, LayoutItemShape[]>,
  updateLayout: (parentId: string, layout: LayoutItemShape[], scope?: 'page' | 'kit') => void,
) => {
  const currentLayout = layouts[parentId] ?? [];
  if (currentLayout.length < 2) return false;
  const sourceItem = currentLayout.find((item) => item.i === widgetId);
  if (!sourceItem) return false;

  const childElements = Array.from(containerElement.querySelectorAll<HTMLElement>('[data-builder-parent-id]'))
    .filter((element) => element.getAttribute('data-builder-parent-id') === parentId)
    .filter((element) => currentLayout.some((item) => item.i === element.getAttribute('data-builder-node-id')));

  if (childElements.length < 2) return false;

  const orderedElements = childElements
    .map((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        id: element.getAttribute('data-builder-node-id') ?? '',
        midpointY: bounds.top + bounds.height / 2,
      };
    })
    .filter((entry) => entry.id)
    .sort((left, right) => left.midpointY - right.midpointY);

  const targetIndex = orderedElements.findIndex((entry) => releaseClientY < entry.midpointY);
  const normalizedTargetIndex = targetIndex === -1 ? orderedElements.length : targetIndex;
  const orderedIds = sortLayoutItems(currentLayout).map((item) => item.i);
  const withoutSource = orderedIds.filter((id) => id !== widgetId);
  const insertIndex = Math.max(0, Math.min(normalizedTargetIndex, withoutSource.length));
  const nextIds = [
    ...withoutSource.slice(0, insertIndex),
    widgetId,
    ...withoutSource.slice(insertIndex),
  ];

  if (nextIds.join('\u0000') === orderedIds.join('\u0000')) return false;

  const layoutById = new Map(currentLayout.map((item) => [item.i, item]));
  let nextY = 0;
  const nextLayout = nextIds.flatMap((id) => {
    const item = layoutById.get(id);
    if (!item) return [];
    const nextItem = {
      ...item,
      y: nextY,
    };
    nextY += Math.max(1, Number(item.h ?? 1));
    return [nextItem];
  });

  updateLayout(parentId, nextLayout, 'kit');
  return true;
};

const resolveNestedDropLayoutItem = (
  itemId: string,
  targetParentId: string,
  sourceType: WidgetType,
  sourceLayoutItem: { w?: number; h?: number; minW?: number; minH?: number } | undefined,
  sourceProps: Record<string, unknown> | undefined,
  widgets: Record<string, { parentId: string; type: WidgetType }>,
  layouts: Record<string, Array<{ i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number }>>,
) => {
  const targetParentWidget = widgets[targetParentId];
  if (!targetParentWidget || !isContainerWidget(targetParentWidget.type)) {
    return null;
  }

  const targetParentLayout = layouts[targetParentWidget.parentId] ?? [];
  const targetParentLayoutItem = targetParentLayout.find((item) => item.i === targetParentId);
  const targetChildLayout = layouts[targetParentId] ?? [];
  const targetMaxCols = Math.max(1, Number(targetParentLayoutItem?.w ?? 12));
  const nextChildY = targetChildLayout.reduce(
    (maxY, item) => Math.max(maxY, Number(item.y ?? 0) + Number(item.h ?? 1)),
    0,
  );
  const fallbackSize = getDefaultWidgetSize(sourceType);
  const defaultMinSize = getDefaultWidgetMinSize(sourceType);
  const followParentWidth = doesWidgetFollowParentWidth(sourceProps);
  const width = followParentWidth
    ? targetMaxCols
    : Math.max(1, Number(sourceLayoutItem?.w ?? fallbackSize.w));

  return {
    i: itemId,
    x: 0,
    y: nextChildY,
    w: width,
    h: Math.max(1, Number(sourceLayoutItem?.h ?? fallbackSize.h)),
    minW: sourceLayoutItem?.minW ?? defaultMinSize.minW,
    minH: sourceLayoutItem?.minH ?? defaultMinSize.minH,
  };
};

const escapeAttributeValue = (value: string) => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }

  return value.replace(/["\\]/g, '\\$&');
};

const copyComputedCustomProperties = (source: HTMLElement, target: HTMLElement) => {
  const computedStyle = window.getComputedStyle(source);

  for (const propertyName of computedStyle) {
    if (!propertyName.startsWith('--')) continue;
    const propertyValue = computedStyle.getPropertyValue(propertyName);
    if (!propertyValue) continue;
    target.style.setProperty(propertyName, propertyValue);
  }
};

const parseTransformScale = (transform: string | null | undefined) => {
  if (!transform || transform === 'none') return 1;

  const matrix3dMatch = transform.match(/matrix3d\((.+)\)/);
  if (matrix3dMatch) {
    const values = matrix3dMatch[1].split(',').map((value) => Number(value.trim()));
    const scale = values[0];
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  const matrixMatch = transform.match(/matrix\((.+)\)/);
  if (matrixMatch) {
    const values = matrixMatch[1].split(',').map((value) => Number(value.trim()));
    const scale = values[0];
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  const scaleMatch = transform.match(/scale\(([^)]+)\)/);
  if (scaleMatch) {
    const scale = Number(scaleMatch[1].split(',')[0]?.trim());
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  return 1;
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

const getKitBoardViewportScale = (source?: HTMLElement | null) => {
  const boardHost = source?.closest(KIT_BOARD_HOST_SELECTOR) ?? document.querySelector(KIT_BOARD_HOST_SELECTOR);
  const viewport = boardHost?.querySelector<HTMLElement>('.react-flow__viewport');
  return parseTransformScale(viewport ? window.getComputedStyle(viewport).transform : null);
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

type RootBoardWidgetMeta = {
  type: WidgetType;
  props?: Record<string, unknown>;
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
  const height = Math.max(1, layoutItem.h * (isBoardManagedRootWidget(widget) ? ROOT_BOARD_MANAGED_ROW_HEIGHT : ROOT_CONTROL_ROW_HEIGHT));

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
  layoutItem: LayoutItemShape,
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
  candidate: LayoutItemShape,
  rootLayout: readonly LayoutItemShape[],
  widgets: Record<string, RootBoardWidgetMeta | undefined>,
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
  candidate: LayoutItemShape,
  rootLayout: readonly LayoutItemShape[],
  widgets: Record<string, RootBoardWidgetMeta | undefined>,
  candidateWidget: RootBoardWidgetMeta | undefined,
  ignoreId?: string,
) => {
  let nextItem = {
    ...candidate,
    x: Math.round(Number(candidate.x) || 0),
    y: Math.round(Number(candidate.y) || 0),
    w: Math.max(1, Math.round(Number(candidate.w) || 1)),
    h: Math.max(1, Math.round(Number(candidate.h) || 1)),
    ...(candidate.minW != null ? { minW: Math.max(1, Math.round(Number(candidate.minW) || 1)) } : {}),
    ...(candidate.minH != null ? { minH: Math.max(1, Math.round(Number(candidate.minH) || 1)) } : {}),
  };
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

const resolveRootLayoutSize = (
  sourceLayoutItem: { w?: number; h?: number; minW?: number; minH?: number } | undefined,
  sourceWidget: RootBoardWidgetMeta,
  draggedSize: { width: number; height: number } | null,
) => {
  if (!isBoardManagedRootWidget(sourceWidget) && draggedSize) {
    return {
      w: Math.max(1, draggedSize.width / ROOT_MASTER_CELL_WIDTH),
      h: Math.max(1, draggedSize.height / ROOT_CONTROL_ROW_HEIGHT),
    };
  }

  return {
    w: sourceLayoutItem?.w ?? 8,
    h: sourceLayoutItem?.h ?? 6,
  };
};

export function WidgetWrapper({ id }: WidgetWrapperProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragProxyRef = useRef<HTMLElement | null>(null);
  const dragProxyOffsetRef = useRef({ x: 0, y: 0 });
  const rightButtonDragAnchorOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const rootResizePreviewHostRef = useRef<HTMLElement | null>(null);
  const childResizePreviewBaseWidthRef = useRef<number | null>(null);
  const rootPointerDragCleanupRef = useRef<(() => void) | null>(null);
  const scope = useBuilderWorkspaceScope();
  const widget = useBuilderStore((state) => (scope === 'kit' ? state.kitStudioWidgets[id] : state.widgets[id]));
  const isSelected = useBuilderStore((state) => (
    scope === 'kit' ? state.selectedKitStudioId === id : state.selectedId === id
  ));
  const selectedSlotShellSlotId = useBuilderStore((state) => (
    scope === 'kit' ? state.selectedKitStudioSlotShellSlotId : state.selectedSlotShellSlotId
  ));
  const selectWidget = useBuilderStore((state) => state.selectWidget);
  const selectSlotShellSlot = useBuilderStore((state) => state.selectSlotShellSlot);
  const draggedType = useBuilderStore((state) => state.draggedType);
  const setDraggedType = useBuilderStore((state) => state.setDraggedType);
  const scopedWidgets = useBuilderStore((state) => (scope === 'kit' ? state.kitStudioWidgets : state.widgets));
  const scopedLayouts = useBuilderStore((state) => (scope === 'kit' ? state.kitStudioLayouts : state.layouts));
  const moveWidget = useBuilderStore((state) => state.moveWidget);
  const addWidget = useBuilderStore((state) => state.addWidget);
  const updateLayout = useBuilderStore((state) => state.updateLayout);
  const updateLayoutItem = useBuilderStore((state) => state.updateLayoutItem);
  const [isDragActive, setIsDragActive] = useState(false);
  const resizeFrameRef = useRef<number | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const resizeSessionRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startWidthPx: number;
    startHeightPx: number;
    minCols: number;
    minRows: number;
    pixelPerCol: number;
    pixelPerRow: number;
    viewportScale: number;
    lastCols: number;
    lastRows: number;
    lastWidthPx: number;
    lastHeightPx: number;
  } | null>(null);

  const showControlsOnHover = true;
  const widgetType = widget?.type ?? null;
  const Component = widgetType ? WidgetRegistry[widgetType] : null;
  const widgetParentId = widget?.parentId ?? 'root';
  const widgetProps = widget?.props ?? {};
  const effectiveWidgetProps = resolveEffectiveWidgetProps(widget, scopedWidgets);
  const isRootKitWidget = scope === 'kit' && widgetParentId === 'root';

  const widgetStyle = getWidgetFrameStyle(effectiveWidgetProps);
  const widgetCornerStyle = getWidgetCornerStyle(effectiveWidgetProps, widgetType);
  const canAcceptChildDrop = widgetType ? isContainerWidget(widgetType) : false;
  const canResizeOnKitBoard = isRootKitWidget && widgetType !== 'slot_shell' && (widgetType === 'panel' || !canAcceptChildDrop);
  const childLayout = scopedLayouts[id] ?? [];
  const targetLayoutItem = scopedLayouts[widgetParentId]?.find((item) => item.i === id);
  const targetMaxCols = Math.max(1, Number(targetLayoutItem?.w ?? 12));
  const nextChildY = childLayout.reduce((maxY, item) => Math.max(maxY, Number(item.y ?? 0) + Number(item.h ?? 1)), 0);

  useEffect(() => {
    if (!widget || widget.type !== 'slot_shell') return;
    const desiredLayout = scope === 'kit' && widgetParentId === 'root'
      ? getSlotShellAuthoringLayoutSpan(widget.props)
      : getSlotShellLayoutSpan(widget.props);

    if (
      targetLayoutItem?.w === desiredLayout.w
      && targetLayoutItem?.h === desiredLayout.h
      && targetLayoutItem?.minW === desiredLayout.minW
      && targetLayoutItem?.minH === desiredLayout.minH
    ) {
      return;
    }

    updateLayoutItem(id, widgetParentId, desiredLayout, scope);
  }, [id, scope, targetLayoutItem?.h, targetLayoutItem?.minH, targetLayoutItem?.minW, targetLayoutItem?.w, updateLayoutItem, widget, widgetParentId]);

  const getNestedDropLayoutItem = (
    itemId: string,
    sourceLayoutItem?: { w?: number; h?: number; minW?: number; minH?: number },
    widgetType?: WidgetType,
    sourceProps?: Record<string, unknown>,
  ) => {
    const fallbackSize = widgetType ? getDefaultWidgetSize(widgetType) : { w: 8, h: 4 };
    const defaultMinSize = widgetType ? getDefaultWidgetMinSize(widgetType) : { minW: 2, minH: 1 };
    const followParentWidth = doesWidgetFollowParentWidth(sourceProps);
    const width = followParentWidth
      ? targetMaxCols
      : Math.max(1, Number(sourceLayoutItem?.w ?? fallbackSize.w));

    return {
      i: itemId,
      x: 0,
      y: nextChildY,
      w: width,
      h: Math.max(1, Number(sourceLayoutItem?.h ?? fallbackSize.h)),
      minW: sourceLayoutItem?.minW ?? defaultMinSize.minW,
      minH: sourceLayoutItem?.minH ?? defaultMinSize.minH,
    };
  };

  const clearRootResizePreviewStyles = useCallback(() => {
    const wrapperNode = wrapperRef.current;
    if (wrapperNode) {
      wrapperNode.style.removeProperty('width');
      wrapperNode.style.removeProperty('min-width');
      wrapperNode.style.removeProperty('height');
      wrapperNode.style.removeProperty('min-height');
    }

    const previewHost = rootResizePreviewHostRef.current;
    if (previewHost) {
      previewHost.style.removeProperty('width');
      previewHost.style.removeProperty('min-width');
      previewHost.style.removeProperty('height');
      previewHost.style.removeProperty('min-height');
    }
    rootResizePreviewHostRef.current = null;
  }, []);

  const clearChildResizePreviewStyles = useCallback(() => {
    childResizePreviewBaseWidthRef.current = null;

    const wrapperNode = wrapperRef.current;
    if (!wrapperNode) return;

    wrapperNode.style.removeProperty('width');
    wrapperNode.style.removeProperty('min-width');
    wrapperNode.style.removeProperty('max-width');
    wrapperNode.style.removeProperty('transform');
    wrapperNode.style.removeProperty('transform-origin');
  }, []);

  const stopRootResize = useCallback(() => {
    if (resizeFrameRef.current != null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = null;
    }

    if (resizeCleanupRef.current) {
      resizeCleanupRef.current();
      resizeCleanupRef.current = null;
    }

    resizeSessionRef.current = null;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  const handleRootResizePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!(scope === 'kit' && widgetParentId === 'root' && (widgetType === 'panel' || !canAcceptChildDrop))) return;
    if (!targetLayoutItem) return;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    rootResizePreviewHostRef.current = wrapper.closest(ROOT_RESIZE_PREVIEW_HOST_SELECTOR) as HTMLElement | null;

    event.preventDefault();
    event.stopPropagation();
    selectWidget(id, scope);

    const bounds = wrapper.getBoundingClientRect();
    const viewportScale = getKitBoardViewportScale(wrapper);
    const startWidthPx = bounds.width / viewportScale;
    const startHeightPx = bounds.height / viewportScale;
    const baseCols = Math.max(1, Number(targetLayoutItem.w ?? 1));
    const defaultMinSize = widgetType ? getDefaultWidgetMinSize(widgetType) : { minW: 2, minH: 1 };
    const runtimeMinCols = canAcceptChildDrop
      ? resolvePanelRuntimeMinCols({
          layout: childLayout,
          widgets: scopedWidgets,
        })
      : null;
    const minCols = Math.max(
      1,
      Number(targetLayoutItem.minW ?? defaultMinSize.minW),
      Number(runtimeMinCols ?? 1),
    );
    const pixelPerCol = Math.max(1, startWidthPx / baseCols);

    resizeSessionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidthPx,
      startHeightPx,
      minCols,
      minRows: Math.max(1, Number(targetLayoutItem.minH ?? defaultMinSize.minH)),
      pixelPerCol,
      pixelPerRow: Math.max(1, startHeightPx / Math.max(1, Number(targetLayoutItem.h ?? 1))),
      viewportScale,
      lastCols: baseCols,
      lastRows: Math.max(1, Number(targetLayoutItem.h ?? 1)),
      lastWidthPx: startWidthPx,
      lastHeightPx: startHeightPx,
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'se-resize';
    dispatchKitRootResizePreview({
      action: 'update',
      widgetId: id,
      cols: baseCols,
      rows: Math.max(1, Number(targetLayoutItem.h ?? 1)),
      widthPx: Math.max(1, Math.round(startWidthPx) - ROOT_RESIZE_PREVIEW_BORDER_WIDTH),
      heightPx: Math.max(1, Math.round(startHeightPx) - ROOT_RESIZE_PREVIEW_BORDER_WIDTH),
    });

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const session = resizeSessionRef.current;
      if (!session || moveEvent.pointerId !== session.pointerId) return;

      moveEvent.preventDefault();
      const currentScale = getKitBoardViewportScale(wrapperRef.current ?? wrapper);
      session.viewportScale = currentScale;
      const deltaX = (moveEvent.clientX - session.startX) / currentScale;
      const deltaY = (moveEvent.clientY - session.startY) / currentScale;
      const nextWidthPx = Math.max(session.minCols * session.pixelPerCol, session.startWidthPx + deltaX);
      const nextHeightPx = Math.max(session.minRows * session.pixelPerRow, session.startHeightPx + deltaY);
      const nextCols = Math.max(session.minCols, Math.round(nextWidthPx / session.pixelPerCol));
      const nextRows = Math.max(session.minRows, Math.round(nextHeightPx / session.pixelPerRow));
      session.lastWidthPx = nextWidthPx;
      session.lastHeightPx = nextHeightPx;

      const nextWidthStyle = `${Math.round(nextWidthPx)}px`;
      const nextHeightStyle = `${Math.round(nextHeightPx)}px`;
      const previewHost = rootResizePreviewHostRef.current;
      const previewChanged = nextCols !== session.lastCols || nextRows !== session.lastRows;
      if (
        !previewChanged
        && wrapperRef.current?.style.width === nextWidthStyle
        && wrapperRef.current?.style.height === nextHeightStyle
        && (!previewHost || (
          previewHost.style.width === nextWidthStyle
          && previewHost.style.height === nextHeightStyle
        ))
      ) return;
      session.lastCols = nextCols;
      session.lastRows = nextRows;

      if (resizeFrameRef.current != null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
      }

      resizeFrameRef.current = window.requestAnimationFrame(() => {
        const wrapperNode = wrapperRef.current;
        const previewHostNode = rootResizePreviewHostRef.current;
        if (wrapperNode) {
          wrapperNode.style.width = nextWidthStyle;
          wrapperNode.style.minWidth = nextWidthStyle;
          wrapperNode.style.height = nextHeightStyle;
          wrapperNode.style.minHeight = nextHeightStyle;
        }
        if (previewHostNode) {
          previewHostNode.style.width = nextWidthStyle;
          previewHostNode.style.minWidth = nextWidthStyle;
          previewHostNode.style.height = nextHeightStyle;
          previewHostNode.style.minHeight = nextHeightStyle;
        }
        dispatchKitRootResizePreview({
          action: 'update',
          widgetId: id,
          cols: nextCols,
          rows: nextRows,
          widthPx: Math.max(1, Math.round(nextWidthPx) - ROOT_RESIZE_PREVIEW_BORDER_WIDTH),
          heightPx: Math.max(1, Math.round(nextHeightPx) - ROOT_RESIZE_PREVIEW_BORDER_WIDTH),
        });
        resizeFrameRef.current = null;
      });
    };

    const handlePointerEnd = (endEvent: PointerEvent) => {
      const session = resizeSessionRef.current;
      if (!session || endEvent.pointerId !== session.pointerId) return;
      const wrapperNode = wrapperRef.current;
      const currentScale = getKitBoardViewportScale(wrapperNode ?? wrapper);
      const finalWidthPx = wrapperNode
        ? wrapperNode.getBoundingClientRect().width / currentScale
        : session.lastWidthPx;
      const finalHeightPx = wrapperNode
        ? wrapperNode.getBoundingClientRect().height / currentScale
        : session.lastHeightPx;
      const nextCols = Math.max(session.minCols, Math.round(finalWidthPx / session.pixelPerCol));
      const nextRows = Math.max(session.minRows, Math.round(finalHeightPx / session.pixelPerRow));
      updateLayoutItem(id, 'root', { w: nextCols, h: nextRows }, 'kit');
      window.setTimeout(() => {
        clearRootResizePreviewStyles();
        dispatchKitRootResizePreview({ action: 'clear', widgetId: id });
      }, 0);
      stopRootResize();
    };

    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', handlePointerEnd, true);
    window.addEventListener('pointercancel', handlePointerEnd, true);
    resizeCleanupRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerEnd, true);
      window.removeEventListener('pointercancel', handlePointerEnd, true);
    };
  }, [
    id,
    clearRootResizePreviewStyles,
    scope,
    selectWidget,
    stopRootResize,
    targetLayoutItem,
    updateLayoutItem,
    widgetParentId,
    widgetType,
    canAcceptChildDrop,
  ]);

  const updateDragProxyPosition = useCallback((clientX: number, clientY: number) => {
    const dragProxy = dragProxyRef.current;
    if (!dragProxy || (clientX <= 0 && clientY <= 0)) return;

    const left = Math.round(clientX - dragProxyOffsetRef.current.x);
    const top = Math.round(clientY - dragProxyOffsetRef.current.y);
    dragProxy.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    const dragProxyBounds = dragProxy.getBoundingClientRect();
    const anchorX = Math.round(dragProxyBounds.left);
    const anchorY = Math.round(dragProxyBounds.top);

    const targetContainer = scope === 'kit'
      ? findContainerDropTargetAtPoint(anchorX, anchorY, id)
      : null;
    if (
      scope === 'kit'
      && isRootKitWidget
      && widgetType
      && targetContainer
      && targetContainer.widgetId !== id
    ) {
      clearKitRootDropPreview();
      return;
    }

    if (!isRootKitWidget) {
      clearKitCrossCardPreview();
    }

    const boardHost = document.querySelector<HTMLElement>(KIT_BOARD_HOST_SELECTOR);
    if (
      scope !== 'kit'
      || !isRootKitWidget
      || !widgetType
      || !boardHost
      || !isPointInsideElement(boardHost, anchorX, anchorY)
    ) {
      clearKitRootDropPreview();
      return;
    }

    window.dispatchEvent(new CustomEvent(KIT_ROOT_DROP_PREVIEW_EVENT, {
      detail: {
        action: 'show',
        widgetId: id,
        widgetType,
        left,
        top,
        width: dragProxy.offsetWidth || dragProxy.getBoundingClientRect().width,
        height: dragProxy.offsetHeight || dragProxy.getBoundingClientRect().height,
        clientX: anchorX,
        clientY: anchorY,
      },
    }));
  }, [id, isRootKitWidget, scope, widgetType]);

  const cleanupDragProxy = useCallback(() => {
    if (dragProxyRef.current?.parentNode) {
      dragProxyRef.current.parentNode.removeChild(dragProxyRef.current);
    }
    dragProxyRef.current = null;
    clearKitRootDropPreview();
    clearKitCrossCardPreview();
  }, []);

  const createDragProxy = useCallback((clientX: number, clientY: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return null;

    const bounds = wrapper.getBoundingClientRect();
    const dragProxy = wrapper.cloneNode(true);
    if (!(dragProxy instanceof HTMLElement)) return null;
    copyComputedCustomProperties(wrapper, dragProxy);

    dragProxyOffsetRef.current = {
      x: Math.max(0, clientX > 0 ? clientX - bounds.left : 0),
      y: Math.max(0, clientY > 0 ? clientY - bounds.top : 0),
    };

    dragProxy.setAttribute('data-widget-drag-proxy', 'true');
    dragProxy.setAttribute('data-widget-selected', 'false');
    dragProxy.setAttribute('data-widget-dragging', 'false');
    dragProxy.classList.remove('drag-over');
    dragProxy.querySelectorAll<HTMLElement>('[data-widget-selected]').forEach((element) => {
      element.setAttribute('data-widget-selected', 'false');
    });
    dragProxy.style.width = `${bounds.width}px`;
    dragProxy.style.height = `${bounds.height}px`;
    dragProxy.style.position = 'fixed';
    dragProxy.style.top = '0';
    dragProxy.style.left = '0';
    dragProxy.style.margin = '0';
    dragProxy.style.pointerEvents = 'none';
    dragProxy.style.overflow = 'visible';
    dragProxy.style.zIndex = '9999';
    dragProxy.style.display = 'block';
    dragProxy.style.boxSizing = 'border-box';
    dragProxy.style.transform = 'translate3d(-2000px, -2000px, 0)';
    document.body.appendChild(dragProxy);
    dragProxyRef.current = dragProxy;
    updateDragProxyPosition(clientX, clientY);
    return bounds;
  }, [updateDragProxyPosition]);

  const handleLiveReorder = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (scope !== 'kit') return;

    const movedWidgetId = event.dataTransfer?.getData('application/x-widget-id');
    const movedWidgetScope = event.dataTransfer?.getData('application/x-builder-scope');
    if (!movedWidgetId || movedWidgetScope !== 'kit') return;

    const latestState = useBuilderStore.getState();
    const sourceWidget = latestState.kitStudioWidgets[movedWidgetId];
    if (!sourceWidget) return;

    const reorderParentId = canAcceptChildDrop ? id : widgetParentId;
    if (sourceWidget.parentId !== reorderParentId) return;

    const containerElement = canAcceptChildDrop
      ? wrapperRef.current
      : document.querySelector<HTMLElement>(`[data-builder-node-id="${escapeAttributeValue(reorderParentId)}"]`);

    if (!containerElement) return;

    reorderWidgetInSameContainer(
      movedWidgetId,
      reorderParentId,
      Number(event.clientY ?? 0),
      containerElement,
      latestState.kitStudioLayouts as Record<string, LayoutItemShape[]>,
      updateLayout,
    );
  }, [canAcceptChildDrop, id, scope, updateLayout, widgetParentId]);

  const handleContainerDropCapture = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!canAcceptChildDrop) return;
    if (isNestedCanvasEventTarget(event.target)) return;

    const movedWidgetId = event.dataTransfer?.getData('application/x-widget-id');
    const movedWidgetScope = event.dataTransfer?.getData('application/x-builder-scope');

    if (movedWidgetId && movedWidgetScope === scope && scopedWidgets[movedWidgetId]) {
      const sourceWidget = scopedWidgets[movedWidgetId];
      if (sourceWidget.id === id || sourceWidget.parentId === id || isContainerWidget(sourceWidget.type)) {
        return;
      }

      const sourcePublishedMasterName = typeof sourceWidget.props?.kitTemplateName === 'string'
        ? sourceWidget.props.kitTemplateName.trim()
        : '';
      if (scope === 'kit' && sourceWidget.parentId === 'root' && sourcePublishedMasterName) {
        return;
      }

      const sourceLayoutItem = scopedLayouts[sourceWidget.parentId]?.find((item) => item.i === movedWidgetId);
      event.preventDefault();
      event.stopPropagation();
      moveWidget(
        movedWidgetId,
        id,
        getNestedDropLayoutItem(movedWidgetId, sourceLayoutItem, sourceWidget.type, sourceWidget.props),
        scope,
      );
      setDraggedType(null);
      return;
    }

    const type = (event.dataTransfer?.getData('text/plain') || draggedType) as WidgetType | 'template';
    if (!type || type === 'template' || !getDefaultWidgetSize(type as WidgetType) || isContainerWidget(type as WidgetType)) {
      return;
    }

    const nextId = createWidgetId();
    event.preventDefault();
    event.stopPropagation();
    addWidget(
      nextId,
      type as WidgetType,
      getNestedDropLayoutItem(nextId, undefined, type as WidgetType),
      id,
      undefined,
      scope,
    );
    setDraggedType(null);
  }, [
    addWidget,
    canAcceptChildDrop,
    draggedType,
    getNestedDropLayoutItem,
    id,
    moveWidget,
    scope,
    scopedLayouts,
    scopedWidgets,
    setDraggedType,
  ]);

  const handleSmartDragEnd = useCallback((dropPoint: { clientX: number; clientY: number }) => {
    if (scope !== 'kit') {
      setDraggedType(null);
      return;
    }

    const currentX = Math.round(Number(dropPoint.clientX ?? 0));
    const currentY = Math.round(Number(dropPoint.clientY ?? 0));
    if (currentX <= 0 && currentY <= 0) {
      setDraggedType(null);
      return;
    }

    const { kitStudioWidgets, kitStudioLayouts, updateLayout } = useBuilderStore.getState();
    const latestWidget = kitStudioWidgets[id];
    if (!latestWidget) {
      setDraggedType(null);
      return;
    }

    const latestParentElement = latestWidget.parentId !== 'root'
      ? document.querySelector<HTMLElement>(`[data-builder-node-id="${escapeAttributeValue(latestWidget.parentId)}"]`)
      : null;
    const isInsideLatestParent = latestParentElement
      ? isPointInsideElement(latestParentElement, currentX, currentY)
      : false;

    let targetContainer = isContainerWidget(latestWidget.type)
      ? null
      : findContainerDropTargetAtPoint(currentX, currentY, id);

    if (
      latestWidget.parentId !== 'root'
      && !isInsideLatestParent
      && targetContainer?.widgetId === latestWidget.parentId
    ) {
      targetContainer = null;
    }
    const boardPosition = screenToKitBoardFlowPosition(currentX, currentY);
    (window as any).__kitRightDragDecision = {
      id,
      currentX,
      currentY,
      latestParentId: latestWidget.parentId,
      isInsideLatestParent,
      targetContainerId: targetContainer?.widgetId ?? null,
      boardPosition,
    };

    if (targetContainer && latestWidget.id !== targetContainer.widgetId) {
      if (latestWidget.parentId === targetContainer.widgetId) {
        reorderWidgetInSameContainer(
          id,
          targetContainer.widgetId,
          currentY,
          targetContainer.element,
          kitStudioLayouts as Record<string, LayoutItemShape[]>,
          updateLayout,
        );
        setDraggedType(null);
        return;
      }

      const latestSourceLayoutItem = (kitStudioLayouts[latestWidget.parentId] ?? []).find((item) => item.i === id);
      const proposedItem = resolveNestedDropLayoutItem(
        id,
        targetContainer.widgetId,
        latestWidget.type,
        latestSourceLayoutItem,
        latestWidget.props,
        kitStudioWidgets as Record<string, { parentId: string; type: WidgetType }>,
        kitStudioLayouts as Record<string, Array<{ i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number }>>,
      );

      if (proposedItem) {
        moveWidget(id, targetContainer.widgetId, proposedItem, 'kit');
        setDraggedType(null);
        return;
      }
    }

    if (boardPosition) {
      const latestSourceLayoutItem = (kitStudioLayouts[latestWidget.parentId] ?? []).find((item) => item.i === id);
      const dragProxyBounds = dragProxyRef.current?.getBoundingClientRect();
      const rootLayoutSize = resolveRootLayoutSize(
        latestSourceLayoutItem,
        latestWidget,
        dragProxyBounds && dragProxyBounds.width > 0 && dragProxyBounds.height > 0
          ? { width: dragProxyBounds.width, height: dragProxyBounds.height }
          : null,
      );
      const proposedItem = placeRootLayoutItemWithoutOverlap({
        i: id,
        x: boardPosition.x,
        y: boardPosition.y,
        w: rootLayoutSize.w,
        h: rootLayoutSize.h,
        minW: latestSourceLayoutItem?.minW,
        minH: latestSourceLayoutItem?.minH,
      }, (kitStudioLayouts.root ?? []) as LayoutItemShape[], kitStudioWidgets, latestWidget, id);

      moveWidget(id, 'root', proposedItem, 'kit');
    }
    setDraggedType(null);
  }, [id, moveWidget, scope, setDraggedType]);

  const clearWidgetDragArm = useCallback(() => {
    wrapperRef.current?.removeAttribute('data-widget-drag-armed');
  }, []);

  const armWidgetDrag = useCallback(() => {
    wrapperRef.current?.setAttribute('data-widget-drag-armed', 'true');
  }, []);

  const stopRootPointerDragSession = useCallback((
    endPoint: { clientX: number; clientY: number },
    shouldDrop = true,
  ) => {
    const cleanup = rootPointerDragCleanupRef.current;
    rootPointerDragCleanupRef.current = null;
    cleanup?.();

    const dragProxyBounds = dragProxyRef.current?.getBoundingClientRect();
    const dropPoint = dragProxyBounds && dragProxyBounds.width > 0 && dragProxyBounds.height > 0
      ? {
          clientX: Math.round(dragProxyBounds.left),
          clientY: Math.round(dragProxyBounds.top),
        }
      : endPoint;

    dispatchKitRootDragSession('end', id, widgetType);
    cleanupDragProxy();
    clearWidgetDragArm();
    setIsDragActive(false);
    if (shouldDrop) {
      handleSmartDragEnd(dropPoint);
    } else {
      setDraggedType(null);
    }
  }, [cleanupDragProxy, clearWidgetDragArm, handleSmartDragEnd, id, setDraggedType, widgetType]);

  const handleRootRightMouseDragStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!(scope === 'kit' && isRootKitWidget && widgetType)) return false;
    if (event.button !== 2) return false;
    if (event.target instanceof Element && event.target.closest('.react-resizable-handle')) {
      return false;
    }
    if (event.target instanceof Element) {
      const targetWidget = event.target.closest('[data-builder-node-id]');
      if (targetWidget?.getAttribute('data-builder-node-id') !== id) {
        return false;
      }
    }

    event.preventDefault();
    event.stopPropagation();
    selectWidget(id, scope);
    clearWidgetDragArm();

    if (rootPointerDragCleanupRef.current) {
      stopRootPointerDragSession({ clientX: event.clientX, clientY: event.clientY }, false);
    }

    const bounds = createDragProxy(event.clientX, event.clientY);
    dispatchKitRootDragSession('start', id, widgetType, bounds
      ? { width: bounds.width, height: bounds.height }
      : undefined);
    setDraggedType(widgetType);
    setIsDragActive(true);

    let latestPoint = { clientX: event.clientX, clientY: event.clientY };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      latestPoint = { clientX: moveEvent.clientX, clientY: moveEvent.clientY };
      moveEvent.preventDefault();
      updateDragProxyPosition(moveEvent.clientX, moveEvent.clientY);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      latestPoint = { clientX: upEvent.clientX, clientY: upEvent.clientY };
      upEvent.preventDefault();
      stopRootPointerDragSession(latestPoint);
    };

    const handleContextMenu = (contextEvent: MouseEvent) => {
      contextEvent.preventDefault();
    };

    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };

    rootPointerDragCleanupRef.current = cleanup;
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    updateDragProxyPosition(event.clientX, event.clientY);

    return true;
  }, [
    clearWidgetDragArm,
    createDragProxy,
    id,
    isRootKitWidget,
    scope,
    selectWidget,
    setDraggedType,
    stopRootPointerDragSession,
    updateDragProxyPosition,
    widgetType,
  ]);

  const handleRightMouseDragArm = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 2) return;
    if (event.target instanceof Element && event.target.closest('.react-resizable-handle')) {
      return;
    }
    if (event.target instanceof Element) {
      const targetWidget = event.target.closest('[data-builder-node-id]');
      if (targetWidget?.getAttribute('data-builder-node-id') !== id) {
        return;
      }
    }

    if (handleRootRightMouseDragStart(event)) {
      return;
    }

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    event.preventDefault();
    event.stopPropagation();
    selectWidget(id, scope);
    armWidgetDrag();
    const bounds = wrapper.getBoundingClientRect();
    rightButtonDragAnchorOffsetRef.current = {
      x: Math.max(0, event.clientX - bounds.left),
      y: Math.max(0, event.clientY - bounds.top),
    };

    const syntheticMouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY,
      button: 0,
      buttons: 1,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
    });
    wrapper.dispatchEvent(syntheticMouseDown);
  }, [armWidgetDrag, handleRootRightMouseDragStart, id, scope, selectWidget]);

  useEffect(() => {
    if (!isDragActive) return;

    const handleDocumentDragOver = (event: DragEvent) => {
      updateDragProxyPosition(Number(event.clientX ?? 0), Number(event.clientY ?? 0));
    };

    const handleDocumentDrag = (event: DragEvent) => {
      updateDragProxyPosition(Number(event.clientX ?? 0), Number(event.clientY ?? 0));
    };

    document.addEventListener('dragover', handleDocumentDragOver, true);
    document.addEventListener('drag', handleDocumentDrag, true);

    return () => {
      document.removeEventListener('dragover', handleDocumentDragOver, true);
      document.removeEventListener('drag', handleDocumentDrag, true);
    };
  }, [isDragActive, updateDragProxyPosition]);

  useEffect(() => cleanupDragProxy, [cleanupDragProxy]);

  const finalizeArmedRightDrag = useCallback((event?: MouseEvent | Event) => {
    if (
      scope === 'kit'
      && widgetParentId !== 'root'
      && wrapperRef.current?.hasAttribute('data-widget-drag-armed')
    ) {
      const bounds = wrapperRef.current.getBoundingClientRect();
      const anchorOffset = rightButtonDragAnchorOffsetRef.current;
      const fallbackDropPoint = {
        clientX: Math.round(
          event instanceof MouseEvent && anchorOffset
            ? event.clientX - anchorOffset.x
            : bounds.left,
        ),
        clientY: Math.round(
          event instanceof MouseEvent && anchorOffset
            ? event.clientY - anchorOffset.y
            : bounds.top,
        ),
      };
      (window as any).__kitRightDragFallback = {
        id,
        scope,
        widgetParentId,
        fallbackDropPoint,
      };
      window.setTimeout(() => {
        const latestState = useBuilderStore.getState();
        const latestWidget = scope === 'kit'
          ? latestState.kitStudioWidgets[id]
          : latestState.widgets[id];
        if (!latestWidget || latestWidget.parentId !== widgetParentId) {
          return;
        }
        handleSmartDragEnd({
          clientX: fallbackDropPoint.clientX,
          clientY: fallbackDropPoint.clientY,
        });
      }, 32);
    }
    rightButtonDragAnchorOffsetRef.current = null;
    clearWidgetDragArm();
  }, [clearWidgetDragArm, handleSmartDragEnd, id, scope, widgetParentId]);

  useEffect(() => {
    const handleMouseUp = (event?: MouseEvent | Event) => {
      finalizeArmedRightDrag(event);
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (!wrapperRef.current?.hasAttribute('data-widget-drag-armed')) return;
      event.preventDefault();
      finalizeArmedRightDrag(event);
    };

    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('dragend', handleMouseUp, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('blur', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('dragend', handleMouseUp, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('blur', handleMouseUp);
    };
  }, [finalizeArmedRightDrag]);

  useEffect(() => () => {
    rootPointerDragCleanupRef.current?.();
    rootPointerDragCleanupRef.current = null;
    dispatchKitRootDragSession('end', id, widgetType);
    stopRootResize();
    rightButtonDragAnchorOffsetRef.current = null;
    clearWidgetDragArm();
    cleanupDragProxy();
    clearRootResizePreviewStyles();
    clearChildResizePreviewStyles();
  }, [cleanupDragProxy, clearChildResizePreviewStyles, clearRootResizePreviewStyles, clearWidgetDragArm, id, stopRootResize, widgetType]);

  useEffect(() => {
    const shouldStabilizeChildWidth = (
      scope === 'kit'
      && widgetParentId !== 'root'
      && widgetType != null
      && !isContainerWidget(widgetType)
      && !doesWidgetFollowParentWidth(widgetProps)
    );

    if (!shouldStabilizeChildWidth) {
      clearChildResizePreviewStyles();
      return;
    }

    const handleRootResizePreview = (event: Event) => {
      const detail = (event as CustomEvent<
        | { action: 'clear'; widgetId?: string }
        | { action: 'update'; widgetId: string; cols: number; rows: number; widthPx?: number; heightPx?: number }
      >).detail;
      if (!detail) return;

      if (detail.action === 'clear') {
        if (!detail.widgetId || detail.widgetId === widgetParentId) {
          clearChildResizePreviewStyles();
        }
        return;
      }

      if (detail.widgetId !== widgetParentId) return;

      const wrapperNode = wrapperRef.current;
      if (!wrapperNode) return;

      if (childResizePreviewBaseWidthRef.current == null) {
        const baseWidth = Math.max(1, wrapperNode.getBoundingClientRect().width || wrapperNode.offsetWidth);
        childResizePreviewBaseWidthRef.current = baseWidth > 0 ? baseWidth : null;
      }

      const baseWidth = childResizePreviewBaseWidthRef.current;
      if (!baseWidth || baseWidth <= 0) return;

      const lockedWidth = `${baseWidth}px`;
      wrapperNode.style.width = lockedWidth;
      wrapperNode.style.minWidth = lockedWidth;
      wrapperNode.style.maxWidth = lockedWidth;
      wrapperNode.style.removeProperty('transform');
      wrapperNode.style.removeProperty('transform-origin');
    };

    window.addEventListener(KIT_ROOT_RESIZE_PREVIEW_EVENT, handleRootResizePreview as EventListener);
    return () => {
      window.removeEventListener(KIT_ROOT_RESIZE_PREVIEW_EVENT, handleRootResizePreview as EventListener);
      clearChildResizePreviewStyles();
    };
  }, [clearChildResizePreviewStyles, scope, widgetParentId, widgetProps, widgetType]);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;

    // Container widgets (cards/panels) need to accept drops from children
    if (canAcceptChildDrop) {
      const handleDragOver = (event: DragEvent) => {
        if (isNestedCanvasEventTarget(event.target)) {
          node.classList.remove('drag-over');
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move';
        }
        // Add visual feedback
        node.classList.add('drag-over');
      };
      const handleDragLeave = (event: DragEvent) => {
        if (isNestedCanvasEventTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        node.classList.remove('drag-over');
      };
      const handleDrop = (event: DragEvent) => {
        if (isNestedCanvasEventTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        node.classList.remove('drag-over');
        handleContainerDropCapture(event as unknown as React.DragEvent<HTMLDivElement>);
      };

      node.addEventListener('dragover', handleDragOver);
      node.addEventListener('dragleave', handleDragLeave);
      node.addEventListener('drop', handleDrop);

      return () => {
        node.removeEventListener('dragover', handleDragOver);
        node.removeEventListener('dragleave', handleDragLeave);
        node.removeEventListener('drop', handleDrop);
      };
    }

    // Non-container widgets need to allow their parent to capture the drop
    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    };

    node.addEventListener('dragover', handleDragOver);

    return () => {
      node.removeEventListener('dragover', handleDragOver);
    };
  }, [canAcceptChildDrop, handleContainerDropCapture]);

  if (!widget || !Component) {
    return null;
  }

  return (
    <div 
      ref={wrapperRef}
      data-builder-node-id={widget.id}
      data-builder-node-type={widget.type}
      data-builder-parent-id={widget.parentId}
      data-widget-border-style={typeof effectiveWidgetProps.borderStyle === 'string'
        ? (effectiveWidgetProps.borderStyle === 'transparent' ? 'transparent' : 'solid')
        : (BORDERABLE_CONTROL_TYPES.has(widget.type) ? 'solid' : 'transparent')}
      data-widget-selected={isSelected ? 'true' : 'false'}
      data-widget-dragging={isDragActive ? 'true' : 'false'}
      className={cn(
        'widget-wrapper nopan relative group w-full h-full overflow-visible'
      )}
      style={widgetCornerStyle}
      onDragOverCapture={(e) => {
        handleLiveReorder(e);
        if (!canAcceptChildDrop) return;
        if (isNestedCanvasEventTarget(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDropCapture={handleContainerDropCapture}
      onMouseDownCapture={handleRightMouseDragArm}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
      onClick={(e) => {
        e.stopPropagation();
        selectWidget(id, scope);
      }}
    >
      <div className="w-full h-full" style={widgetStyle}>
        {canResizeOnKitBoard ? (
          <span
            className={cn(
              "react-resizable-handle react-resizable-handle-se absolute z-20 transition-opacity",
              isSelected
                ? "pointer-events-auto opacity-100"
                : showControlsOnHover
                  ? "pointer-events-none opacity-0 group-hover:opacity-100"
                  : "pointer-events-none opacity-0",
            )}
            style={{ pointerEvents: isSelected ? 'auto' : 'none' }}
            onPointerDown={handleRootResizePointerDown}
            title={widgetType === 'panel' ? 'Resize card' : 'Resize control'}
          />
        ) : null}
        <Component
          id={widget.id}
          {...effectiveWidgetProps}
          {...(widgetType === 'slot_shell' ? {
            interactive: true,
            selectedSlotId: isSelected ? selectedSlotShellSlotId : null,
            onSelectSlot: (slotId: string) => selectSlotShellSlot(id, slotId, scope),
          } : {})}
        />
      </div>
    </div>
  );
}
